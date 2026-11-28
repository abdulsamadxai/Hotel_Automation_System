import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { expenseCreateSchema, expenseUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';

export const expensesRouter = Router();

// Expenses are owner / super_admin only (mirrors App.tsx route roles).
const EXPENSE_ROLES = ['owner', 'super_admin'] as const;

/** GET /api/expenses */
expensesRouter.get(
  '/',
  requireRole(...EXPENSE_ROLES),
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const expenses = await prisma.expense.findMany({
      where: hotelId ? { hotel_id: hotelId } : {},
      orderBy: { date: 'desc' },
    });
    ok(res, expenses);
  }),
);

/** POST /api/expenses */
expensesRouter.post(
  '/',
  requireRole(...EXPENSE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(expenseCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const expense = await prisma.expense.create({
      data: {
        hotel_id: hotelId,
        amount: body.amount,
        category: body.category,
        description: body.description,
        date: new Date(body.date),
        vendor: body.vendor ?? null,
        created_by: body.created_by ?? user.id,
      },
    });
    ok(res, expense, 201);
  }),
);

/** PATCH /api/expenses/:id */
expensesRouter.patch(
  '/:id',
  requireRole(...EXPENSE_ROLES),
  asyncHandler(async (req, res) => {
    const body = parseBody(expenseUpdateSchema, req.body);
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!expense) throw new ApiError(404, 'Expense not found');
    assertInScope(req as AuthRequest, expense.hotel_id);
    const data: Record<string, unknown> = { ...body };
    if (body.date !== undefined) data.date = new Date(body.date);
    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data,
    });
    ok(res, updated);
  }),
);

/** DELETE /api/expenses/:id */
expensesRouter.delete(
  '/:id',
  requireRole(...EXPENSE_ROLES),
  asyncHandler(async (req, res) => {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
    });
    if (!expense) throw new ApiError(404, 'Expense not found');
    assertInScope(req as AuthRequest, expense.hotel_id);
    await prisma.expense.delete({ where: { id: expense.id } });
    ok(res, { id: expense.id });
  }),
);
