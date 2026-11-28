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

/** Known placeholder / publicly-known secrets that must never sign tokens. */
const KNOWN_WEAK_SECRETS = new Set([
  'change-me-in-production',
  'demo-password-change-me',
  'changeme',
  'secret',
  'password',
  'dev-only-insecure-secret-change-me',
]);

/**
 * JWT secret. Fails loudly at boot when unset or set to a known placeholder
 * — a publicly-known secret would let anyone forge tokens, so there is no
 * development fallback. Set a long random JWT_SECRET in backend/.env.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start without one — set a long random value in backend/.env.',
    );
  }
  if (KNOWN_WEAK_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is set to a known placeholder value. Refusing to start — set a long random value in backend/.env.',
    );
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
