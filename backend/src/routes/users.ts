import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { changePasswordSchema, createUserSchema, userPatchSchema } from '../validation/schemas.js';
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
 * POST /api/users — super_admin only. Creates a login user with any role,
 * including owner (which self-registration deliberately forbids). For
 * manager / housekeeping / staff a linked StaffMember record is created
 * too, mirroring signup, so their hotel-code login and roster entry work.
 * hotel_id is required for every role except super_admin and must be an
 * existing hotel.
 */
usersRouter.post(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const body = parseBody(createUserSchema, req.body);
    let hotelId: string | null = null;
    if (body.role !== 'super_admin') {
      if (!body.hotel_id) {
        throw new ApiError(400, 'hotel_id is required for this role');
      }
      const hotel = await prisma.hotel.findUnique({
        where: { id: body.hotel_id },
      });
      if (!hotel) throw new ApiError(404, 'Hotel not found');
      hotelId = hotel.id;
    }
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) throw new ApiError(409, 'User already exists');
    const password_hash = await bcrypt.hash(body.password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email,
          password_hash,
          full_name: body.full_name,
          role: body.role,
          hotel_id: hotelId,
        },
      });
      if (
        hotelId &&
        (body.role === 'manager' ||
          body.role === 'housekeeping' ||
          body.role === 'staff')
      ) {
        await tx.staffMember.create({
          data: {
            hotel_id: hotelId,
            user_id: created.id,
            full_name: created.full_name,
            email: created.email,
            phone: null,
            role: body.role,
            status: 'active',
          },
        });
      }
      return created;
    });
    ok(res, { user: publicUser(user) }, 201);
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
