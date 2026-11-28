import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { hotelCreateSchema, hotelUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireRole, resolveScope } from '../middleware/rbac.js';
import { logActivity } from '../services/activity.js';

export const hotelsRouter = Router();

/** GET /api/hotels — super_admin sees all; everyone else only their hotel. */
hotelsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const hotels = await prisma.hotel.findMany({
      where: hotelId ? { id: hotelId } : {},
      orderBy: { created_at: 'asc' },
    });
    ok(res, hotels);
  }),
);

/** GET /api/hotels/:id */
hotelsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    if (hotelId && hotelId !== req.params.id) {
      throw new ApiError(403, 'Access denied');
    }
    const hotel = await prisma.hotel.findUnique({ where: { id: req.params.id } });
    if (!hotel) throw new ApiError(404, 'Hotel not found');
    ok(res, hotel);
  }),
);

/** POST /api/hotels — super_admin only. */
hotelsRouter.post(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const body = parseBody(hotelCreateSchema, req.body);
    const existing = await prisma.hotel.findUnique({
      where: { code: body.code },
    });
    if (existing) {
      throw new ApiError(409, 'A hotel with this code already exists');
    }
    const hotel = await prisma.hotel.create({
      data: {
        name: body.name,
        code: body.code,
        access_code: body.access_code,
        location: body.location ?? '',
        logo_url: body.logo_url ?? '',
        owner_name: body.owner_name ?? '',
      },
    });
    // Defaults so the hotel works immediately: settings + counters at 0.
    await prisma.hotelSettings.create({
      data: { hotel_id: hotel.id },
    });
    ok(res, hotel, 201);
  }),
);

/** PATCH /api/hotels/:id — the hotel's owner or super_admin. */
hotelsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const isOwner =
      user.role === 'owner' && user.hotel_id === req.params.id;
    if (!isOwner && user.role !== 'super_admin') {
      throw new ApiError(403, 'Only the hotel owner or a super admin can edit this hotel');
    }
    const body = parseBody(hotelUpdateSchema, req.body);
    const hotel = await prisma.hotel.findUnique({
      where: { id: req.params.id },
    });
    if (!hotel) throw new ApiError(404, 'Hotel not found');
    if (body.code && body.code !== hotel.code) {
      const clash = await prisma.hotel.findUnique({ where: { code: body.code } });
      if (clash) throw new ApiError(409, 'A hotel with this code already exists');
    }
    const updated = await prisma.hotel.update({
      where: { id: req.params.id },
      data: body,
    });
    await logActivity(prisma, {
      hotel_id: updated.id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'hotel_updated',
      details: `Updated hotel ${updated.name}`,
      entity_type: 'hotel',
      entity_id: updated.id,
    });
    ok(res, updated);
  }),
);
