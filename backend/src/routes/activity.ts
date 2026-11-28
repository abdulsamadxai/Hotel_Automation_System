import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseLimit } from '../lib/http.js';
import type { AuthRequest } from '../middleware/auth.js';
import { assertInScope, resolveScope } from '../middleware/rbac.js';

export const activityRouter = Router();

/** GET /api/activity — newest first, ?limit= (default 100, max 500). */
activityRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const logs = await prisma.activityLog.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      orderBy: { created_at: 'desc' },
      take: parseLimit(req.query),
    });
    ok(res, logs);
  }),
);

/** DELETE /api/activity/:id */
activityRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const log = await prisma.activityLog.findUnique({
      where: { id: req.params.id },
    });
    if (!log) throw new ApiError(404, 'Activity log not found');
    assertInScope(req as AuthRequest, log.hotel_id);
    await prisma.activityLog.delete({ where: { id: log.id } });
    ok(res, { id: log.id });
  }),
);
