import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { ApiError } from '../lib/errors.js';
import { requireAuth, type AuthRequest } from './auth.js';

/** Allow only the listed roles (mirrors ProtectedRoute allowedRoles). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new ApiError(403, 'Forbidden: insufficient role'));
      return;
    }
    next();
  };
}

/**
 * Resolve the hotel scope for a read.
 * - super_admin may pass ?hotel_id= to scope to one hotel; without it they
 *   see all hotels (returns null).
 * - Everyone else is pinned to their own hotel_id; passing a different
 *   ?hotel_id= is rejected with 403.
 */
export function resolveScope(req: AuthRequest): { hotelId: string | null } {
  const user = requireAuth(req);
  const requested =
    typeof req.query.hotel_id === 'string' ? req.query.hotel_id : undefined;
  if (user.role === 'super_admin') {
    return { hotelId: requested ?? null };
  }
  if (requested && requested !== user.hotel_id) {
    throw new ApiError(403, 'Cannot access another hotel');
  }
  return { hotelId: user.hotel_id };
}

/**
 * Hotel id a write must target. super_admin must supply it (body hotel_id
 * or ?hotel_id=); everyone else uses their own hotel and may not pass a
 * different one.
 */
export function resolveWriteHotel(
  req: AuthRequest,
  bodyHotelId?: string | null,
): string {
  const user = requireAuth(req);
  if (user.role === 'super_admin') {
    const id =
      bodyHotelId ??
      (typeof req.query.hotel_id === 'string' ? req.query.hotel_id : undefined);
    if (!id) throw new ApiError(400, 'hotel_id is required');
    return id;
  }
  if (bodyHotelId && bodyHotelId !== user.hotel_id) {
    throw new ApiError(403, 'Cannot write to another hotel');
  }
  if (!user.hotel_id) {
    throw new ApiError(403, 'No hotel assigned to this user');
  }
  return user.hotel_id;
}

/** Reject access to a record that lives in another hotel. */
export function assertInScope(req: AuthRequest, recordHotelId: string): void {
  const { hotelId } = resolveScope(req);
  if (hotelId && recordHotelId !== hotelId) {
    throw new ApiError(403, 'Access denied');
  }
}
