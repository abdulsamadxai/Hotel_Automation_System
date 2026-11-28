import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { roomCreateSchema, roomUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { logActivity } from '../services/activity.js';
import { evaluateAutomations } from '../services/automationEngine.js';

export const roomsRouter = Router();

/** GET /api/rooms (?status=, ?type=) */
roomsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.status === 'string') where.status = req.query.status;
    if (typeof req.query.type === 'string') where.type = req.query.type;
    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
    ok(res, rooms);
  }),
);

/** POST /api/rooms — manager / owner / super_admin. */
roomsRouter.post(
  '/',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(roomCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const clash = await prisma.room.findUnique({
      where: { hotel_id_number: { hotel_id: hotelId, number: body.number } },
    });
    if (clash) {
      throw new ApiError(409, `Room ${body.number} already exists in this hotel`);
    }
    const room = await prisma.room.create({
      data: {
        hotel_id: hotelId,
        number: body.number,
        type: body.type,
        floor: body.floor,
        status: body.status ?? 'available',
        price_per_night: body.price_per_night,
        capacity: body.capacity,
        amenities: body.amenities ?? [],
      },
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'room_created',
      details: `Created room ${room.number}`,
      entity_type: 'room',
      entity_id: room.id,
    });
    ok(res, room, 201);
  }),
);

/** GET /api/rooms/:id */
roomsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw new ApiError(404, 'Room not found');
    assertInScope(req as AuthRequest, room.hotel_id);
    ok(res, room);
  }),
);

/** PATCH /api/rooms/:id — manager / owner / super_admin. Emits room.updated. */
roomsRouter.patch(
  '/:id',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(roomUpdateSchema, req.body);
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw new ApiError(404, 'Room not found');
    assertInScope(req as AuthRequest, room.hotel_id);
    if (body.number && body.number !== room.number) {
      const clash = await prisma.room.findUnique({
        where: {
          hotel_id_number: { hotel_id: room.hotel_id, number: body.number },
        },
      });
      if (clash) {
        throw new ApiError(409, `Room ${body.number} already exists in this hotel`);
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.room.update({
        where: { id: room.id },
        data: body,
      });
      await logActivity(tx, {
        hotel_id: next.hotel_id,
        user_id: user.id,
        user_name: user.full_name,
        action: 'room_updated',
        details: `Updated room ${next.number} (status: ${next.status})`,
        entity_type: 'room',
        entity_id: next.id,
      });
      await evaluateAutomations(tx, {
        type: 'room.updated',
        hotelId: next.hotel_id,
        room: next,
        actorId: user.id,
        actorName: user.full_name,
      });
      return next;
    });
    ok(res, updated);
  }),
);

/** DELETE /api/rooms/:id — owner / super_admin. */
roomsRouter.delete(
  '/:id',
  requireRole('owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw new ApiError(404, 'Room not found');
    assertInScope(req as AuthRequest, room.hotel_id);
    const activeBooking = await prisma.booking.findFirst({
      where: {
        room_id: room.id,
        status: { in: ['confirmed', 'checked_in'] },
      },
    });
    if (activeBooking) {
      throw new ApiError(
        409,
        `Room ${room.number} has an active booking and cannot be deleted`,
      );
    }
    await prisma.room.delete({ where: { id: room.id } });
    await logActivity(prisma, {
      hotel_id: room.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'room_deleted',
      details: `Deleted room ${room.number}`,
      entity_type: 'room',
      entity_id: room.id,
    });
    ok(res, { id: room.id });
  }),
);
