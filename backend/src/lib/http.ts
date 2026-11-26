import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from './errors.js';

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/** Wrap an async route handler so rejections reach the error handler. */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}

/** Validate a request body against a Zod schema; 400 with details on failure. */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, 'Validation failed', result.error.flatten());
  }
  return result.data;
}

/** Validate request query params against a Zod schema; 400 on failure. */
export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new ApiError(400, 'Validation failed', result.error.flatten());
  }
  return result.data;
}

/** Standard success envelope: {data}. */
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

/** Parse an optional ?limit= query param, clamped to 1..500 (default 100). */
export function parseLimit(query: unknown): number {
  const raw =
    typeof query === 'object' && query !== null
      ? (query as Record<string, unknown>).limit
      : undefined;
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return 100;
  return Math.min(500, Math.max(1, n));
}
