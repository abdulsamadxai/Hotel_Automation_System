import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { loginSchema, signupSchema } from '../validation/schemas.js';
import { publicUser } from '../lib/serialize.js';
import { authenticate, signToken, type AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login {email, password, hotel_code?}
 * Manager / housekeeping / staff must present their hotel's access code
 * (mirrors mockStore.auth.signIn). super_admin / owner are exempt.
 * Wrong password or code -> 401 with a generic message.
 */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const passwordOk = await bcrypt.compare(body.password, user.password_hash);
    if (!passwordOk) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (
      user.role === 'manager' ||
      user.role === 'housekeeping' ||
      user.role === 'staff'
    ) {
      // The hotel comes from the linked staff record first, then the user.
      const staffRecord = await prisma.staffMember.findFirst({
        where: { user_id: user.id },
      });
      const hotelId = staffRecord?.hotel_id ?? user.hotel_id;
      const hotel = hotelId
        ? await prisma.hotel.findUnique({ where: { id: hotelId } })
        : null;
      if (!hotel || !body.hotel_code || body.hotel_code !== hotel.access_code) {
        throw new ApiError(401, 'Invalid email, password or hotel code');
      }
    }

    const payload = publicUser(user);
    const token = signToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      hotel_id: user.hotel_id,
    });
    res.json({ token, user: payload });
  }),
);

/**
 * POST /api/auth/signup {full_name, email, password, role, hotel_code}
 * Only manager / housekeeping / staff may self-register, and only with a
 * valid hotel access code. Creates the login user AND a linked
 * StaffMember record (mirrors mockStore.auth.signUp).
 */
authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const body = parseBody(signupSchema, req.body);
    const hotel = await prisma.hotel.findFirst({
      where: { access_code: body.hotel_code },
    });
    if (!hotel) {
      throw new ApiError(400, 'Invalid hotel access code');
    }
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      throw new ApiError(409, 'User already exists');
    }
    const password_hash = await bcrypt.hash(body.password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email,
          password_hash,
          full_name: body.full_name,
          role: body.role,
          hotel_id: hotel.id,
        },
      });
      await tx.staffMember.create({
        data: {
          hotel_id: hotel.id,
          user_id: created.id,
          full_name: created.full_name,
          email: created.email,
          phone: null,
          role: body.role,
          status: 'active',
        },
      });
      return created;
    });
    ok(res, { user: publicUser(user) }, 201);
  }),
);

/** GET /api/auth/me — the current user, no password material. */
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = (req as AuthRequest).user;
    if (!user) throw new ApiError(401, 'Authentication required');
    const full = await prisma.user.findUnique({ where: { id: user.id } });
    if (!full) throw new ApiError(401, 'Invalid or expired token');
    ok(res, publicUser(full));
  }),
);
