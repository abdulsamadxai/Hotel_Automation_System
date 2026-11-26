import { roundMoney } from '../lib/dates.js';
import type { DbClient } from './counters.js';
import { nextNumber } from './counters.js';

export interface LineItemInput {
  description: string;
  amount: number;
  quantity?: number;
  type?: 'charge' | 'service' | 'tax' | 'discount';
}

export interface InvoiceCreateInput {
  guest_id: string | null;
  booking_id: string | null;
  /** Pre-tax amount. Tax is computed from the hotel's tax_rate. */
  amount: number;
  nights?: number;
  due_date?: string | null;
  status?: 'pending' | 'partially_paid' | 'paid' | 'refunded' | 'cancelled';
  line_items?: LineItemInput[];
  payment_method?: string;
  notes?: string;
}

/** The hotel's tax rate (HotelSettings), default 0.10 like the frontend. */
export async function getTaxRate(db: DbClient, hotelId: string): Promise<number> {
  const settings = await db.hotelSettings.findUnique({
    where: { hotel_id: hotelId },
  });
  return settings?.tax_rate ?? 0.1;
}

/**
 * Create an invoice: number from the counter, tax from the hotel settings,
 * total = amount + tax (authoritative, like the frontend). Line items are
 * stored in InvoiceLineItem rows and serialised back as `line_items`.
 */
export async function createInvoiceRecord(
  db: DbClient,
  hotelId: string,
  input: InvoiceCreateInput,
) {
  const amount = Number.isFinite(input.amount) ? input.amount : 0;
  const taxRate = await getTaxRate(db, hotelId);
  const tax = roundMoney(amount * taxRate);
  const nights = input.nights ?? 1;
  const invoiceNumber = await nextNumber(db, hotelId, 'invoice');
  const items: LineItemInput[] = input.line_items ?? [
    {
      description: `Room charge (${nights} night${nights === 1 ? '' : 's'})`,
      amount,
      quantity: 1,
      type: 'charge',
    },
  ];
  const lineItemRows = items.map((item) => ({
    description: item.description,
    amount: item.amount,
    quantity: item.quantity ?? 1,
    type: item.type ?? 'charge',
  }));
  return db.invoice.create({
    data: {
      hotel_id: hotelId,
      invoice_number: invoiceNumber,
      guest_id: input.guest_id,
      booking_id: input.booking_id,
      amount,
      tax,
      total: roundMoney(amount + tax),
      amount_paid: 0,
      status: input.status ?? 'pending',
      due_date: input.due_date ? new Date(input.due_date) : null,
      paid_date: null,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      line_items: { create: lineItemRows },
    },
    include: { line_items: true },
  });
}
