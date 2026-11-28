import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { bookingCreateSchema, bookingUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { serializeBooking } from '../lib/serialize.js';
import { logActivity } from '../services/activity.js';
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  createBooking,
  updateBooking,
} from '../services/bookingService.js';

export const bookingsRouter = Router();

const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/**
 * GET /api/bookings (?status=, ?date=, ?room_id=, ?guest_id=)
 * ?date= matches bookings staying on that calendar day (check_in day <=
 * date < check_out day).
 */
bookingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.status === 'string') where.status = req.query.status;
    if (typeof req.query.room_id === 'string') where.room_id = req.query.room_id;
    if (typeof req.query.guest_id === 'string') where.guest_id = req.query.guest_id;
    if (typeof req.query.date === 'string') {
      const day = req.query.date;
      const start = new Date(`${day}T00:00:00.000Z`);
      const end = new Date(`${day}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime())) {
        where.check_in = { lte: end };
        where.check_out = { gt: start };
      }
    }
    const bookings = await prisma.booking.findMany({
      where,
      include: { guest: true, room: true },
      orderBy: { check_in: 'asc' },
    });
    ok(res, bookings.map((b) => serializeBooking(b)));
  }),
);

/** POST /api/bookings — validates dates, blocked guest, room overlap (409). */
bookingsRouter.post(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(bookingCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const booking = await createBooking(body, hotelId, {
      id: user.id,
      full_name: user.full_name,
    });
    const full = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { guest: true, room: true },
    });
    ok(res, serializeBooking(full ?? booking), 201);
  }),
);

/** GET /api/bookings/:id */
bookingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { guest: true, room: true },
    });
    if (!booking) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, booking.hotel_id);
    ok(res, serializeBooking(booking));
  }),
);

/** PATCH /api/bookings/:id — re-validates overlap on edit, excluding itself. */
bookingsRouter.patch(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(bookingUpdateSchema, req.body);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, existing.hotel_id);
    const updated = await updateBooking(req.params.id, body, existing.hotel_id, {
      id: user.id,
      full_name: user.full_name,
    });
    ok(res, updated ? serializeBooking(updated) : updated);
  }),
);

/** POST /api/bookings/:id/check-in — confirmed -> checked_in; room occupied. */
bookingsRouter.post(
  '/:id/check-in',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, existing.hotel_id);
    const updated = await checkInBooking(req.params.id, existing.hotel_id, {
      id: user.id,
      full_name: user.full_name,
    });
    ok(res, updated ? serializeBooking(updated) : updated);
  }),
);

/**
 * POST /api/bookings/:id/check-out — checked_in -> checked_out; room dirty;
 * final invoice + checkout cleaning task + guest lifetime stats.
 */
bookingsRouter.post(
  '/:id/check-out',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, existing.hotel_id);
    const updated = await checkOutBooking(req.params.id, existing.hotel_id, {
      id: user.id,
      full_name: user.full_name,
    });
    ok(res, updated ? serializeBooking(updated) : updated);
  }),
);

/**
 * POST /api/bookings/:id/cancel — frees the room, cancels unpaid invoices,
 * removes pending housekeeping tasks for the booking.
 */
bookingsRouter.post(
  '/:id/cancel',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, existing.hotel_id);
    const updated = await cancelBooking(req.params.id, existing.hotel_id, {
      id: user.id,
      full_name: user.full_name,
    });
    ok(res, updated ? serializeBooking(updated) : updated);
  }),
);

/**
 * DELETE /api/bookings/:id — owner / manager / super_admin. A `pending`,
 * `confirmed` or `cancelled` booking may be deleted; checked-in / checked-out
 * bookings are financial history and cannot be deleted (409). Deleting a
 * confirmed booking cancels its unpaid invoices and drops its pending
 * housekeeping tasks (the cancel flow's cleanup, minus room changes — a
 * confirmed booking's room is still available).
 */
bookingsRouter.delete(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Booking not found');
    assertInScope(req as AuthRequest, existing.hotel_id);
    if (
      existing.status !== 'pending' &&
      existing.status !== 'confirmed' &&
      existing.status !== 'cancelled'
    ) {
      throw new ApiError(
        409,
        `Only a pending, confirmed or cancelled booking can be deleted (current status: ${existing.status})`,
      );
    }
    await prisma.$transaction(async (tx) => {
      if (existing.status === 'confirmed') {
        await tx.invoice.updateMany({
          where: {
            booking_id: existing.id,
            status: { in: ['pending', 'partially_paid'] },
          },
          data: { status: 'cancelled' },
        });
        await tx.housekeepingTask.deleteMany({
          where: { booking_id: existing.id, status: 'pending' },
        });
      }
      await tx.booking.delete({ where: { id: existing.id } });
    });
    await logActivity(prisma, {
      hotel_id: existing.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'booking_deleted',
      details: `Deleted booking ${existing.booking_number}`,
      entity_type: 'booking',
      entity_id: existing.id,
    });
    ok(res, { id: existing.id });
  }),
);
