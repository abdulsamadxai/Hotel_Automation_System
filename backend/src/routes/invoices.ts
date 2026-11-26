import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { invoiceCreateSchema, invoiceUpdateSchema, payInvoiceSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { serializeInvoice } from '../lib/serialize.js';
import { logActivity } from '../services/activity.js';
import { createInvoiceRecord } from '../services/invoices.js';
import { evaluateAutomations } from '../services/automationEngine.js';
import { roundMoney } from '../lib/dates.js';

export const invoicesRouter = Router();

const MANAGE_ROLES = ['manager', 'owner', 'super_admin'] as const;

/** GET /api/invoices (?status=, ?guest_id=, ?booking_id=) */
invoicesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.status === 'string') where.status = req.query.status;
    if (typeof req.query.guest_id === 'string') where.guest_id = req.query.guest_id;
    if (typeof req.query.booking_id === 'string') where.booking_id = req.query.booking_id;
    const invoices = await prisma.invoice.findMany({
      where,
      include: { line_items: true, guest: true, booking: { include: { room: true } } },
      orderBy: { created_at: 'desc' },
    });
    ok(
      res,
      invoices.map((inv) => ({
        ...serializeInvoice(inv),
        guest: inv.guest
          ? { id: inv.guest.id, name: inv.guest.name, email: inv.guest.email }
          : null,
        booking: inv.booking
          ? {
              id: inv.booking.id,
              room: inv.booking.room
                ? { number: inv.booking.room.number }
                : null,
            }
          : null,
      })),
    );
  }),
);

/** POST /api/invoices — manual invoice with line_items (tax defaults to 10%). */
invoicesRouter.post(
  '/',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(invoiceCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await createInvoiceRecord(tx, hotelId, {
        guest_id: body.guest_id ?? null,
        booking_id: body.booking_id ?? null,
        amount: body.amount,
        due_date: body.due_date ?? null,
        status: body.status,
        line_items: body.line_items,
        payment_method: body.payment_method,
        notes: body.notes,
      });
      // An explicit tax overrides the settings-derived one; total stays
      // authoritative (total = amount + tax).
      if (body.tax !== undefined) {
        const fixed = await tx.invoice.update({
          where: { id: created.id },
          data: {
            tax: roundMoney(body.tax),
            total: roundMoney(created.amount + body.tax),
          },
          include: { line_items: true },
        });
        return fixed;
      }
      return created;
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'invoice_created',
      details: `Created invoice ${invoice.invoice_number} for $${invoice.total.toFixed(2)}`,
      entity_type: 'invoice',
      entity_id: invoice.id,
    });
    await evaluateAutomations(prisma, {
      type: 'invoice.created',
      hotelId,
      invoice,
      actorId: user.id,
      actorName: user.full_name,
    });
    const full = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { line_items: true },
    });
    ok(res, full ? serializeInvoice(full) : serializeInvoice(invoice), 201);
  }),
);

/** GET /api/invoices/:id */
invoicesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { line_items: true, guest: true, booking: { include: { room: true } } },
    });
    if (!invoice) throw new ApiError(404, 'Invoice not found');
    assertInScope(req as AuthRequest, invoice.hotel_id);
    ok(res, {
      ...serializeInvoice(invoice),
      guest: invoice.guest
        ? { id: invoice.guest.id, name: invoice.guest.name, email: invoice.guest.email }
        : null,
      booking: invoice.booking
        ? {
            id: invoice.booking.id,
            room: invoice.booking.room
              ? { number: invoice.booking.room.number }
              : null,
          }
        : null,
    });
  }),
);

/**
 * PATCH /api/invoices/:id — edit line items / amount / tax / due date /
 * payment method / notes (the Billing page's Save button). `total` is
 * always recomputed as amount + tax. A paid, refunded or cancelled
 * invoice is final and cannot be edited (409); paying goes through /pay.
 */
invoicesRouter.patch(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(invoiceUpdateSchema, req.body);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { line_items: true },
    });
    if (!invoice) throw new ApiError(404, 'Invoice not found');
    assertInScope(req as AuthRequest, invoice.hotel_id);
    if (
      invoice.status === 'paid' ||
      invoice.status === 'refunded' ||
      invoice.status === 'cancelled'
    ) {
      throw new ApiError(
        409,
        `Cannot edit a ${invoice.status} invoice`,
      );
    }
    const amount =
      body.amount !== undefined ? roundMoney(body.amount) : invoice.amount;
    const tax = body.tax !== undefined ? roundMoney(body.tax) : invoice.tax;
    const updated = await prisma.$transaction(async (tx) => {
      if (body.line_items !== undefined) {
        await tx.invoiceLineItem.deleteMany({
          where: { invoice_id: invoice.id },
        });
        await tx.invoiceLineItem.createMany({
          data: body.line_items.map((item) => ({
            invoice_id: invoice.id,
            description: item.description,
            amount: item.amount,
            quantity: item.quantity,
            type: item.type,
          })),
        });
      }
      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amount,
          tax,
          total: roundMoney(amount + tax),
          due_date:
            body.due_date !== undefined
              ? body.due_date
                ? new Date(body.due_date)
                : null
              : undefined,
          payment_method: body.payment_method,
          notes: body.notes,
        },
        include: { line_items: true },
      });
    });
    await logActivity(prisma, {
      hotel_id: invoice.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'invoice_updated',
      details: `Updated invoice ${updated.invoice_number}`,
      entity_type: 'invoice',
      entity_id: updated.id,
    });
    ok(res, serializeInvoice(updated));
  }),
);

/** POST /api/invoices/:id/pay {amount, payment_method} — amount_paid +=
 * amount; status becomes paid once amount_paid >= total; paid_date set.
 */
invoicesRouter.post(
  '/:id/pay',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(payInvoiceSchema, req.body);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { line_items: true },
    });
    if (!invoice) throw new ApiError(404, 'Invoice not found');
    assertInScope(req as AuthRequest, invoice.hotel_id);
    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      throw new ApiError(409, `Cannot pay a ${invoice.status} invoice`);
    }
    const amountPaid = roundMoney(invoice.amount_paid + body.amount);
    const paidInFull = amountPaid >= invoice.total;
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amount_paid: amountPaid,
          status: paidInFull
            ? 'paid'
            : amountPaid > 0
              ? 'partially_paid'
              : invoice.status,
          paid_date:
            paidInFull && !invoice.paid_date
              ? new Date()
              : invoice.paid_date,
          payment_method: body.payment_method ?? invoice.payment_method,
        },
        include: { line_items: true },
      });
      await logActivity(tx, {
        hotel_id: invoice.hotel_id,
        user_id: user.id,
        user_name: user.full_name,
        action: 'invoice_updated',
        details: `Updated invoice ${next.invoice_number} (status: ${next.status})`,
        entity_type: 'invoice',
        entity_id: next.id,
      });
      if (paidInFull && invoice.status !== 'paid') {
        await evaluateAutomations(tx, {
          type: 'invoice.paid',
          hotelId: invoice.hotel_id,
          invoice: next,
          actorId: user.id,
          actorName: user.full_name,
        });
      }
      return next;
    });
    ok(res, serializeInvoice(updated));
  }),
);

/** POST /api/invoices/:id/cancel */
invoicesRouter.post(
  '/:id/cancel',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { line_items: true },
    });
    if (!invoice) throw new ApiError(404, 'Invoice not found');
    assertInScope(req as AuthRequest, invoice.hotel_id);
    if (invoice.status === 'paid') {
      throw new ApiError(409, 'Cannot cancel a paid invoice');
    }
    if (invoice.status === 'cancelled') {
      throw new ApiError(409, 'Invoice is already cancelled');
    }
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'cancelled' },
      include: { line_items: true },
    });
    await logActivity(prisma, {
      hotel_id: invoice.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'invoice_updated',
      details: `Updated invoice ${updated.invoice_number} (status: cancelled)`,
      entity_type: 'invoice',
      entity_id: updated.id,
    });
    ok(res, serializeInvoice(updated));
  }),
);

/**
 * DELETE /api/invoices/:id — a paid invoice is a financial record and
 * cannot be deleted (409); anything else may be removed.
 */
invoicesRouter.delete(
  '/:id',
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!invoice) throw new ApiError(404, 'Invoice not found');
    assertInScope(req as AuthRequest, invoice.hotel_id);
    if (invoice.status === 'paid') {
      throw new ApiError(409, 'Cannot delete a paid invoice');
    }
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await logActivity(prisma, {
      hotel_id: invoice.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'invoice_deleted',
      details: `Deleted invoice ${invoice.invoice_number}`,
      entity_type: 'invoice',
      entity_id: invoice.id,
    });
    ok(res, { id: invoice.id });
  }),
);
