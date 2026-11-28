import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import {
  automationCreateSchema,
  automationUpdateSchema,
} from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { logActivity } from '../services/activity.js';

export const automationsRouter = Router();

// The frontend's Automations page is super_admin-only, but rules are
// per-hotel and hotel owners/managers run their own property, so the API
// allows owner / manager too (always hotel-scoped).
const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/** GET /api/automations/executions — newest first. (Before /:id.) */
automationsRouter.get(
  '/executions',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const executions = await prisma.automationExecution.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      include: { automation: { select: { name: true, trigger: true, action: true } } },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    ok(res, executions);
  }),
);

/** GET /api/automations */
automationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const automations = await prisma.automation.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      orderBy: { created_at: 'asc' },
    });
    ok(res, automations);
  }),
);

/** POST /api/automations */
automationsRouter.post(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(automationCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const automation = await prisma.automation.create({
      data: {
        hotel_id: hotelId,
        name: body.name,
        description: body.description ?? '',
        trigger: body.trigger,
        action: body.action,
        enabled: body.enabled ?? true,
        config: (body.config ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'automation_created',
      details: `Created automation "${automation.name}"`,
      entity_type: 'automation',
      entity_id: automation.id,
    });
    ok(res, automation, 201);
  }),
);

/** PATCH /api/automations/:id */
automationsRouter.patch(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(automationUpdateSchema, req.body);
    const automation = await prisma.automation.findUnique({
      where: { id: req.params.id },
    });
    if (!automation) throw new ApiError(404, 'Automation not found');
    assertInScope(req as AuthRequest, automation.hotel_id);
    const updated = await prisma.automation.update({
      where: { id: automation.id },
      data: {
        ...body,
        config: (body.config ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await logActivity(prisma, {
      hotel_id: updated.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'automation_updated',
      details: `Updated automation "${updated.name}"`,
      entity_type: 'automation',
      entity_id: updated.id,
    });
    ok(res, updated);
  }),
);

/** DELETE /api/automations/:id */
automationsRouter.delete(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const automation = await prisma.automation.findUnique({
      where: { id: req.params.id },
    });
    if (!automation) throw new ApiError(404, 'Automation not found');
    assertInScope(req as AuthRequest, automation.hotel_id);
    await prisma.automation.delete({ where: { id: automation.id } });
    await logActivity(prisma, {
      hotel_id: automation.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'automation_deleted',
      details: `Deleted automation "${automation.name}"`,
      entity_type: 'automation',
      entity_id: automation.id,
    });
    ok(res, { id: automation.id });
  }),
);
