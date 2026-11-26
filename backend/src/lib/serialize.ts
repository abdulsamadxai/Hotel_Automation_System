import type {
  Booking,
  Guest,
  Invoice,
  InvoiceLineItem,
  User,
} from '@prisma/client';

/** Public shape of a user: never includes password_hash. */
export function publicUser(user: User): Omit<User, 'password_hash'> {
  const { password_hash: _password_hash, ...rest } = user;
  return rest;
}

/** Invoice with its line items flattened into the `line_items` array the
 * frontend expects (types.ts Invoice.line_items). */
export function serializeInvoice(
  invoice: Invoice & { line_items: InvoiceLineItem[] },
): Invoice & {
  line_items: Array<{
    description: string;
    amount: number;
    quantity: number;
    type: string;
  }>;
} {
  const { line_items, ...rest } = invoice;
  return {
    ...rest,
    line_items: (line_items ?? []).map((item) => ({
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      type: item.type,
    })),
  };
}

/** Booking with the guest / room joins the frontend's BookingWithJoins has. */
export function serializeBooking(
  booking: Booking & {
    guest?: { id: string; name: string; email: string | null; tags: unknown } | null;
    room?: { id: string; number: string; type: string } | null;
  },
): Record<string, unknown> {
  const { guest, room, ...rest } = booking;
  return {
    ...rest,
    guest: guest
      ? {
          id: guest.id,
          name: guest.name,
          email: guest.email,
          tags: (guest as Guest).tags ?? [],
        }
      : null,
    room: room ? { id: room.id, number: room.number, type: room.type } : null,
  };
}

/** Housekeeping task with the room / assignee joins the frontend has. */
export function serializeTask(
  task: Record<string, unknown> & {
    room?: { id: string; number: string; type: string } | null;
    assignee?: { id: string; full_name: string } | null;
  },
): Record<string, unknown> {
  const { room, assignee, ...rest } = task;
  return {
    ...rest,
    room: room ? { id: room.id, number: room.number, type: room.type } : null,
    assignee: assignee
      ? { id: assignee.id, full_name: assignee.full_name }
      : null,
  };
}
