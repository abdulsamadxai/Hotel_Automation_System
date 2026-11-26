import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { staffCreateSchema, staffUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { logActivity } from '../services/activity.js';

export const staffRouter = Router();

const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/** GET /api/staff — includes the hotel name + saas_role like the frontend. */
staffRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const staff = await prisma.staffMember.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      include: { hotel: { select: { name: true } } },
      orderBy: { created_at: 'asc' },
    });
    ok(
      res,
      staff.map((s) => ({
        ...s,
        saas_role: s.role,
        hotels: s.hotel ? { name: s.hotel.name } : null,
      })),
    );
  }),
);

/** POST /api/staff — creates a staff record only (no login user). */
staffRouter.post(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(staffCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    if (body.user_id) {
      const linked = await prisma.user.findUnique({
        where: { id: body.user_id },
      });
      if (!linked) throw new ApiError(404, 'Linked user not found');
    }
    const member = await prisma.staffMember.create({
      data: {
        hotel_id: hotelId,
        user_id: body.user_id ?? null,
        full_name: body.full_name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        role: body.role,
        status: body.status ?? 'active',
        shift: body.shift ?? null,
        hire_date: body.hire_date ? new Date(body.hire_date) : null,
      },
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'staff_created',
      details: `Added staff member ${member.full_name} (${member.role})`,
      entity_type: 'staff',
      entity_id: member.id,
    });
    ok(res, member, 201);
  }),
);

/** PATCH /api/staff/:id */
staffRouter.patch(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(staffUpdateSchema, req.body);
    const member = await prisma.staffMember.findUnique({
      where: { id: req.params.id },
    });
    if (!member) throw new ApiError(404, 'Staff member not found');
    assertInScope(req as AuthRequest, member.hotel_id);
    const data: Record<string, unknown> = { ...body };
    if (body.hire_date !== undefined) {
      data.hire_date = body.hire_date ? new Date(body.hire_date) : null;
    }
    const updated = await prisma.staffMember.update({
      where: { id: member.id },
      data,
    });
    await logActivity(prisma, {
      hotel_id: updated.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'staff_updated',
      details: `Updated staff member ${updated.full_name}`,
      entity_type: 'staff',
      entity_id: updated.id,
    });
    ok(res, updated);
  }),
);

/** DELETE /api/staff/:id */
staffRouter.delete(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const member = await prisma.staffMember.findUnique({
      where: { id: req.params.id },
    });
    if (!member) throw new ApiError(404, 'Staff member not found');
    assertInScope(req as AuthRequest, member.hotel_id);
    await prisma.staffMember.delete({ where: { id: member.id } });
    await logActivity(prisma, {
      hotel_id: member.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'staff_deleted',
      details: `Removed staff member ${member.full_name}`,
      entity_type: 'staff',
      entity_id: member.id,
    });
    ok(res, { id: member.id });
  }),
);
