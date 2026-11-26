import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { messageCreateSchema, messageUpdateSchema } from '../validation/schemas.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
export const messagesRouter = Router();

const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/** GET /api/messages (?guest_id=) — newest first. */
messagesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.guest_id === 'string') {
      where.guest_id = req.query.guest_id;
    }
    const messages = await prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    ok(res, messages);
  }),
);

/** POST /api/messages */
messagesRouter.post(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(messageCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const guest = await prisma.guest.findUnique({ where: { id: body.guest_id } });
    if (!guest || guest.hotel_id !== hotelId) {
      throw new ApiError(404, 'Guest not found');
    }
    const message = await prisma.message.create({
      data: {
        hotel_id: hotelId,
        guest_id: body.guest_id,
        guest_name: body.guest_name ?? guest.name,
        guest_email: body.guest_email ?? guest.email,
        guest_phone: body.guest_phone ?? guest.phone,
        subject: body.subject ?? null,
        message: body.message,
        direction: body.direction ?? 'outbound',
        channel: body.channel ?? null,
        status: body.status ?? 'sent',
        priority: body.priority ?? null,
        assigned_to: body.assigned_to ?? null,
      },
    });
    ok(res, message, 201);
  }),
);

/** PATCH /api/messages/:id (status, assigned_to). */
messagesRouter.patch(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(messageUpdateSchema, req.body);
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });
    if (!message) throw new ApiError(404, 'Message not found');
    assertInScope(req as AuthRequest, message.hotel_id);
    const updated = await prisma.message.update({
      where: { id: message.id },
      data: body,
    });
    ok(res, updated);
  }),
);

/** DELETE /api/messages/:id — manager / owner / super_admin. */
messagesRouter.delete(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });
    if (!message) throw new ApiError(404, 'Message not found');
    assertInScope(req as AuthRequest, message.hotel_id);
    await prisma.message.delete({ where: { id: message.id } });
    ok(res, { id: message.id });
  }),
);
