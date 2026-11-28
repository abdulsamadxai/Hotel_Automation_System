import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok } from '../lib/http.js';
import type { AuthRequest } from '../middleware/auth.js';
import { assertInScope, resolveScope } from '../middleware/rbac.js';

export const notificationsRouter = Router();

/** GET /api/notifications — newest first. */
notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const notifications = await prisma.notification.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      orderBy: { created_at: 'desc' },
    });
    ok(res, notifications);
  }),
);

/** PATCH /api/notifications/:id/read */
notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!notification) throw new ApiError(404, 'Notification not found');
    assertInScope(req as AuthRequest, notification.hotel_id);
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { is_read: true },
    });
    ok(res, updated);
  }),
);

/** POST /api/notifications/read-all */
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const result = await prisma.notification.updateMany({
      where: {
        ...(hotelId ? { hotel_id: hotelId } : {}),
        is_read: false,
      },
      data: { is_read: true },
    });
    ok(res, { updated: result.count });
  }),
);

/** DELETE /api/notifications/:id */
notificationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!notification) throw new ApiError(404, 'Notification not found');
    assertInScope(req as AuthRequest, notification.hotel_id);
    await prisma.notification.delete({ where: { id: notification.id } });
    ok(res, { id: notification.id });
  }),
);
