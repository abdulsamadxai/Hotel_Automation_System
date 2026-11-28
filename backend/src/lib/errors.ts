import type { NextFunction, Request, Response } from 'express';

/** Error carrying an HTTP status, rendered as {error:{message,details?}}. */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Express error handler: ApiError -> its status, everything else -> 500. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res
      .status(err.status)
      .json({ error: { message: err.message, details: err.details } });
    return;
  }
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}

/** 404 for unknown /api routes (and anything else not matched). */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Not found' } });
}
