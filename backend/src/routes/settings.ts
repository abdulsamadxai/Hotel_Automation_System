import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { settingsPatchSchema } from '../validation/schemas.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole, resolveScope } from '../middleware/rbac.js';

export const settingsRouter = Router();

const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/**
 * GET /api/settings — per-hotel settings (currency, tax_rate default
 * 0.10, check-in/out times). Auto-creates the row with defaults when a
 * hotel has none yet. super_admin must pass ?hotel_id=.
 */
settingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    if (!hotelId) {
      throw new ApiError(400, 'hotel_id is required');
    }
    const settings = await prisma.hotelSettings.upsert({
      where: { hotel_id: hotelId },
      update: {},
      create: { hotel_id: hotelId },
    });
    ok(res, settings);
  }),
);

/** PATCH /api/settings — upserts the scoped hotel's settings. */
settingsRouter.patch(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(settingsPatchSchema, req.body);
    const { hotelId } = resolveScope(req as AuthRequest);
    if (!hotelId) {
      throw new ApiError(400, 'hotel_id is required');
    }
    const settings = await prisma.hotelSettings.upsert({
      where: { hotel_id: hotelId },
      update: body,
      create: { hotel_id: hotelId, ...body },
    });
    ok(res, settings);
  }),
);
