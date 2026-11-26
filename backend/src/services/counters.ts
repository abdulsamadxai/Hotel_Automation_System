import type { Prisma, PrismaClient } from '@prisma/client';

/** A Prisma client or a transaction client — services accept either so the
 * automation engine can run inside the caller's transaction. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export type CounterKind = 'booking' | 'invoice' | 'task';

const PREFIX: Record<CounterKind, string> = {
  booking: 'BK',
  invoice: 'INV',
  task: 'TSK',
};

/**
 * Allocate the next number for a hotel (BK-0006, INV-0003, TSK-0004, ...).
 * The upsert + increment is atomic inside the surrounding transaction, so
 * two concurrent bookings can never receive the same number.
 */
export async function nextNumber(
  db: DbClient,
  hotelId: string,
  kind: CounterKind,
): Promise<string> {
  const counter = await db.counter.upsert({
    where: { hotel_id_kind: { hotel_id: hotelId, kind } },
    update: { value: { increment: 1 } },
    create: { hotel_id: hotelId, kind, value: 1 },
  });
  return `${PREFIX[kind]}-${String(counter.value).padStart(4, '0')}`;
}
