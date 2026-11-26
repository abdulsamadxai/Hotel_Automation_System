import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { guestCreateSchema, guestUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { logActivity } from '../services/activity.js';

export const guestsRouter = Router();

/** GET /api/guests (?q= search by name / email / phone) */
guestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const q = req.query.q.trim();
      // Case-insensitive search on PostgreSQL; SQLite has no insensitive
      // mode, so the dev-only SQLite build falls back to case-sensitive.
      const insensitive =
        (process.env.DATABASE_URL ?? '').startsWith('postgres');
      const match = (field: string) =>
        insensitive
          ? { [field]: { contains: q, mode: 'insensitive' as const } }
          : { [field]: { contains: q } };
      where.OR = [match('name'), match('email'), match('phone')];
    }
    const guests = await prisma.guest.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    ok(res, guests);
  }),
);

/** POST /api/guests — manager / owner / super_admin. */
guestsRouter.post(
  '/',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(guestCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const guest = await prisma.guest.create({
      data: {
        hotel_id: hotelId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        nationality: body.nationality ?? null,
        id_number: body.id_number ?? null,
        notes: body.notes ?? null,
        tags: body.tags ?? [],
      },
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'guest_created',
      details: `Created guest ${guest.name}`,
      entity_type: 'guest',
      entity_id: guest.id,
    });
    ok(res, guest, 201);
  }),
);

/** GET /api/guests/:id */
guestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const guest = await prisma.guest.findUnique({ where: { id: req.params.id } });
    if (!guest) throw new ApiError(404, 'Guest not found');
    assertInScope(req as AuthRequest, guest.hotel_id);
    ok(res, guest);
  }),
);

/**
 * DELETE /api/guests/:id — owner / manager / super_admin. Refused (409)
 * while the guest has an active booking (confirmed / checked_in) so a
 * stay in progress is never orphaned. The guest's messages are removed
 * with them (onDelete: Cascade); their bookings and invoices keep the
 * record with guest_id set to null.
 */
guestsRouter.delete(
  '/:id',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const guest = await prisma.guest.findUnique({ where: { id: req.params.id } });
    if (!guest) throw new ApiError(404, 'Guest not found');
    assertInScope(req as AuthRequest, guest.hotel_id);
    const activeBooking = await prisma.booking.findFirst({
      where: {
        guest_id: guest.id,
        status: { in: ['confirmed', 'checked_in'] },
      },
    });
    if (activeBooking) {
      throw new ApiError(
        409,
        `Guest ${guest.name} has an active booking (${activeBooking.booking_number}) and cannot be deleted`,
      );
    }
    await prisma.guest.delete({ where: { id: guest.id } });
    await logActivity(prisma, {
      hotel_id: guest.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'guest_deleted',
      details: `Deleted guest ${guest.name}`,
      entity_type: 'guest',
      entity_id: guest.id,
    });
    ok(res, { id: guest.id });
  }),
);
/**
 * PATCH /api/guests/:id — manager / owner / super_admin. Tags included:
 * blocking a guest is tags containing 'blocked'.
 */
guestsRouter.patch(
  '/:id',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(guestUpdateSchema, req.body);
    const guest = await prisma.guest.findUnique({ where: { id: req.params.id } });
    if (!guest) throw new ApiError(404, 'Guest not found');
    assertInScope(req as AuthRequest, guest.hotel_id);
    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: body,
    });
    await logActivity(prisma, {
      hotel_id: updated.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'guest_updated',
      details: `Updated guest ${updated.name}`,
      entity_type: 'guest',
      entity_id: updated.id,
    });
    ok(res, updated);
  }),
);
