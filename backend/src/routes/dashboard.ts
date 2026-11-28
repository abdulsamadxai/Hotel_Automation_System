import { Router } from 'express';
import { asyncHandler, ok } from '../lib/http.js';
import type { AuthRequest } from '../middleware/auth.js';
import { resolveScope } from '../middleware/rbac.js';
import { getDashboardSummary } from '../services/dashboard.js';

export const dashboardRouter = Router();

/** GET /api/dashboard/summary */
dashboardRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const summary = await getDashboardSummary(hotelId);
    ok(res, summary);
  }),
);
