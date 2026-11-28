import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { changePasswordSchema, userPatchSchema } from '../validation/schemas.js';
import { publicUser } from '../lib/serialize.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireRole, resolveScope } from '../middleware/rbac.js';

export const usersRouter = Router();

/** GET /api/users — hotel-scoped; super_admin may pass ?hotel_id= or see all. */
usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const users = await prisma.user.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      orderBy: { created_at: 'asc' },
    });
    ok(res, users.map(publicUser));
  }),
);

/**
 * POST /api/users/:id/change-password {current_password?, new_password}
 * Self-service requires the current password; an owner / super_admin /
 * manager of the same hotel may reset someone else's without it.
 */
usersRouter.post(
  '/:id/change-password',
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(changePasswordSchema, req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, 'User not found');

    const isSelf = user.id === target.id;
    const isHotelAdmin =
      (user.role === 'owner' || user.role === 'super_admin' || user.role === 'manager') &&
      (user.role === 'super_admin' || user.hotel_id === target.hotel_id);
    if (!isSelf && !isHotelAdmin) {
      throw new ApiError(403, 'Cannot change this user\u2019s password');
    }
    if (isSelf) {
      if (!body.current_password) {
        throw new ApiError(400, 'current_password is required');
      }
      const matches = await bcrypt.compare(
        body.current_password,
        target.password_hash,
      );
      if (!matches) {
        throw new ApiError(401, 'Current password is incorrect');
      }
    }
    await prisma.user.update({
      where: { id: target.id },
      data: { password_hash: await bcrypt.hash(body.new_password, 10) },
    });
    ok(res, { id: target.id, email: target.email });
  }),
);

/**
 * PATCH /api/users/:id — owner / super_admin may change role or name.
 * Nobody may promote a user to super_admin except a super_admin.
 */
usersRouter.patch(
  '/:id',
  requireRole('owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(userPatchSchema, req.body);
    if (body.role === 'super_admin' && user.role !== 'super_admin') {
      throw new ApiError(403, 'Only a super admin can grant the super_admin role');
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, 'User not found');
    if (
      user.role !== 'super_admin' &&
      target.hotel_id !== user.hotel_id
    ) {
      throw new ApiError(403, 'Cannot edit a user from another hotel');
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: body,
    });
    ok(res, publicUser(updated));
  }),
);
