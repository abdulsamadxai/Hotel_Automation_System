import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export interface AuthUserPayload {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hotel_id: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

/**
 * JWT secret. Fails loudly at boot in production when unset; in
 * development a clearly-marked insecure fallback is used so the demo can
 * boot without a secret on disk.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET is not set. Refusing to start in production without one.',
      );
    }
    console.warn(
      '[auth] JWT_SECRET is not set — using an insecure development secret. Never use this in production.',
    );
    return 'dev-only-insecure-secret-change-me';
  }
  return secret;
}

export function signToken(user: AuthUserPayload): string {
  return jwt.sign(
    { sub: user.id, role: user.role, hotel_id: user.hotel_id },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
}

/** Verify the Bearer token and attach the current user to req.user. */
export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }
  const token = header.slice('Bearer '.length);
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, getJwtSecret()) as { sub: string };
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    next(new ApiError(401, 'Invalid or expired token'));
    return;
  }
  req.user = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    hotel_id: user.hotel_id,
  };
  next();
}

/** The authenticated user, or 401 when there is none. */
export function requireAuth(req: AuthRequest): AuthUserPayload {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user;
}
