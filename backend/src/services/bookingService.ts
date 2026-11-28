// Booking business logic, mirroring src/lib/mockStore.ts:
// - totals come from room.price_per_night * nights (never NaN)
// - check-out must be after check-in; no overlapping booking per room
// - blocked guests cannot book; numbers come from persisted counters
// - check-in occupies the room, check-out dirties it + final invoice +
//   cleaning task + guest lifetime stats, cancel frees the room and
//   cancels unpaid invoices / pending tasks for the booking.
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { Booking, Room } from '@prisma/client';
import type { DbClient } from './counters.js';
import { nextNumber } from './counters.js';
import { logActivity } from './activity.js';
import { createInvoiceRecord } from './invoices.js';
import { evaluateAutomations, type EngineResult } from './automationEngine.js';

export interface Actor {
  id: string;
  full_name: string;
}

const ACTIVE_OVERLAP_EXCLUDED = 'cancelled';

async function assertNoOverlap(
  db: DbClient,
  hotelId: string,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeId?: string,
): Promise<void> {
  const clash = await db.booking.findFirst({
    where: {
      hotel_id: hotelId,
      room_id: roomId,
      status: { not: ACTIVE_OVERLAP_EXCLUDED },
      check_in: { lt: checkOut },
      check_out: { gt: checkIn },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (clash) {
    throw new ApiError(
      409,
      'Room is already booked for the selected dates',
    );
  }
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export interface BookingCreateInput {
  guest_id: string;
  room_id?: string | null;
  guest_type?: 'national' | 'international';
  check_in: string;
  check_out: string;
  notes?: string | null;
  status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  payment_status?: 'pending' | 'partially_paid' | 'paid' | 'refunded';
  deposit_amount?: number;
  total_amount?: number;
}

export async function createBooking(
  input: BookingCreateInput,
  hotelId: string,
  actor: Actor | null,
) {
  return prisma.$transaction(async (tx) => {
    const checkIn = new Date(input.check_in);
    const checkOut = new Date(input.check_out);
    if (
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime()) ||
      checkOut <= checkIn
    ) {
      throw new ApiError(422, 'Check-out date must be after check-in date');
    }
    const nights = nightsBetween(checkIn, checkOut);

    const guest = await tx.guest.findUnique({ where: { id: input.guest_id } });
    if (!guest || guest.hotel_id !== hotelId) {
      throw new ApiError(404, 'Guest not found');
    }
    // Guest.tags is GuestTag[] on PostgreSQL; on the dev-only SQLite
    // schema it is Json, so narrow defensively (works for both clients).
    const guestTags: unknown = guest.tags;
    const blocked =
      Array.isArray(guestTags) && guestTags.includes('blocked');
    if (blocked) {
      throw new ApiError(400, 'Guest is blocked and cannot be booked');
    }

    let totalAmount = 0;
    let room = null;
    if (input.room_id) {
      room = await tx.room.findUnique({ where: { id: input.room_id } });
      if (!room || room.hotel_id !== hotelId) {
        throw new ApiError(404, 'Room not found');
      }
      await assertNoOverlap(tx, hotelId, input.room_id, checkIn, checkOut);
      totalAmount = room.price_per_night * nights;
    } else if (
      input.total_amount !== undefined &&
      Number.isFinite(input.total_amount)
    ) {
      totalAmount = input.total_amount;
    }

    const booking = await tx.booking.create({
      data: {
        hotel_id: hotelId,
        booking_number: await nextNumber(tx, hotelId, 'booking'),
        guest_id: input.guest_id,
        room_id: input.room_id ?? null,
        guest_type: input.guest_type ?? 'international',
        check_in: checkIn,
        check_out: checkOut,
        status: input.status ?? 'confirmed',
        nights,
        total_amount: totalAmount,
        notes: input.notes ?? null,
        payment_status: input.payment_status ?? 'pending',
        deposit_amount: input.deposit_amount ?? 0,
        created_by: actor?.id ?? null,
      },
    });

    await logActivity(tx, {
      hotel_id: hotelId,
      user_id: actor?.id ?? null,
      user_name: actor?.full_name ?? null,
      action: 'booking_created',
      details: `Created booking ${booking.booking_number} for ${guest.name}`,
      entity_type: 'booking',
      entity_id: booking.id,
    });

    await evaluateAutomations(tx, {
      type: 'booking.created',
      hotelId,
      booking,
      room,
      actorId: actor?.id ?? null,
      actorName: actor?.full_name ?? null,
    });

    if (booking.status === 'checked_in' && room) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'occupied' },
      });
      await evaluateAutomations(tx, {
        type: 'booking.checked_in',
        hotelId,
        booking,
        room,
        actorId: actor?.id ?? null,
        actorName: actor?.full_name ?? null,
      });
    }
    return booking;
  });
}

export interface BookingUpdateInput {
  guest_id?: string;
  room_id?: string | null;
  guest_type?: 'national' | 'international';
  check_in?: string;
  check_out?: string;
  notes?: string | null;
  status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  payment_status?: 'pending' | 'partially_paid' | 'paid' | 'refunded';
  deposit_amount?: number;
  total_amount?: number;
}

/** Load a booking or 404 (scoped to the hotel). */
async function loadBooking(tx: DbClient, id: string, hotelId: string) {
  const booking = await tx.booking.findUnique({ where: { id } });
  if (!booking || booking.hotel_id !== hotelId) {
    throw new ApiError(404, 'Booking not found');
  }
  return booking;
}

export async function updateBooking(
  id: string,
  updates: BookingUpdateInput,
  hotelId: string,
  actor: Actor | null,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await loadBooking(tx, id, hotelId);
    const oldStatus = booking.status;

    // Edits pass the same validation as creates: dates must be valid and
    // the room must not already be booked for the new range (excluding
    // this booking itself).
    if (
      updates.check_in !== undefined ||
      updates.check_out !== undefined ||
      updates.room_id !== undefined
    ) {
      const effectiveCheckIn = new Date(updates.check_in ?? booking.check_in);
      const effectiveCheckOut = new Date(updates.check_out ?? booking.check_out);
      const effectiveRoomId = updates.room_id ?? booking.room_id;
      if (
        Number.isNaN(effectiveCheckIn.getTime()) ||
        Number.isNaN(effectiveCheckOut.getTime()) ||
        effectiveCheckOut <= effectiveCheckIn
      ) {
        throw new ApiError(422, 'Check-out date must be after check-in date');
      }
      if (effectiveRoomId) {
        await assertNoOverlap(
          tx,
          hotelId,
          effectiveRoomId,
          effectiveCheckIn,
          effectiveCheckOut,
          id,
        );
      }
    }

    // Recompute nights / total when the dates or room change and the room
    // is known (same rule as create: price_per_night * nights).
    const data: Record<string, unknown> = { ...updates };
    if (
      updates.check_in !== undefined ||
      updates.check_out !== undefined ||
      updates.room_id !== undefined
    ) {
      const effectiveCheckIn = new Date(updates.check_in ?? booking.check_in);
      const effectiveCheckOut = new Date(updates.check_out ?? booking.check_out);
      const effectiveRoomId = updates.room_id ?? booking.room_id;
      const nights = nightsBetween(effectiveCheckIn, effectiveCheckOut);
      data.nights = nights;
      if (effectiveRoomId) {
        const room = await tx.room.findUnique({
          where: { id: effectiveRoomId },
        });
        if (!room || room.hotel_id !== hotelId) {
          throw new ApiError(404, 'Room not found');
        }
        data.total_amount = room.price_per_night * nights;
      }
      data.check_in = effectiveCheckIn;
      data.check_out = effectiveCheckOut;
    }
    delete data.status;

    const updated = await tx.booking.update({
      where: { id },
      data: {
        ...data,
        ...(updates.status ? { status: updates.status } : {}),
        updated_at: new Date(),
      },
    });

    if (updates.status && updates.status !== oldStatus) {
      await applyStatusTransition(tx, updated, oldStatus, updates.status, hotelId, actor);
    } else {
      await logActivity(tx, {
        hotel_id: hotelId,
        user_id: actor?.id ?? null,
        user_name: actor?.full_name ?? null,
        action: 'booking_updated',
        details: `Updated booking ${updated.booking_number}`,
        entity_type: 'booking',
        entity_id: updated.id,
      });
    }
    return tx.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });
  });
}

/** Shared side effects for a status change (used by PATCH and by the
 * dedicated check-in / check-out / cancel endpoints). */
async function applyStatusTransition(
  tx: DbClient,
  booking: Booking,
  oldStatus: string,
  newStatus: string,
  hotelId: string,
  actor: Actor | null,
): Promise<void> {
  const room = booking.room_id
    ? await tx.room.findUnique({ where: { id: booking.room_id } })
    : null;

  if (newStatus === 'checked_in') {
    if (room) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'occupied' },
      });
    }
    await evaluateAutomations(tx, {
      type: 'booking.checked_in',
      hotelId,
      booking,
      room,
      actorId: actor?.id ?? null,
      actorName: actor?.full_name ?? null,
    });
  } else if (newStatus === 'checked_out') {
    if (room) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'dirty' },
      });
    }
    await applyCheckoutSideEffects(tx, booking, room, hotelId, actor);
  } else if (newStatus === 'cancelled') {
    await applyCancelSideEffects(tx, booking, room, hotelId, actor);
  }

  await logActivity(tx, {
    hotel_id: hotelId,
    user_id: actor?.id ?? null,
    user_name: actor?.full_name ?? null,
    action: 'booking_status_changed',
    details: `Changed booking ${booking.booking_number} status from ${oldStatus} to ${newStatus}`,
    entity_type: 'booking',
    entity_id: booking.id,
  });
}

/**
 * Check-out side effects: engine first (a create_housekeeping_task /
 * create_invoice rule may cover it), direct fallback second — exactly the
 * frontend's rule. Then guest lifetime stats.
 */
async function applyCheckoutSideEffects(
  tx: DbClient,
  booking: Booking,
  room: Room | null,
  hotelId: string,
  actor: Actor | null,
): Promise<EngineResult> {
  const engine = await evaluateAutomations(tx, {
    type: 'booking.checked_out',
    hotelId,
    booking,
    room,
    actorId: actor?.id ?? null,
    actorName: actor?.full_name ?? null,
  });

  if (!engine.createdTask && room) {
    const taskNumber = await nextNumber(tx, hotelId, 'task');
    await tx.housekeepingTask.create({
      data: {
        hotel_id: hotelId,
        task_number: taskNumber,
        room_id: room.id,
        booking_id: booking.id,
        type: 'checkout_clean',
        status: 'pending',
        priority: 'high',
        description: `Checkout cleaning for room ${room.number}`,
        automation_triggered: false,
      },
    });
  }

  if (!engine.createdInvoice) {
    await createInvoiceRecord(tx, hotelId, {
      guest_id: booking.guest_id,
      booking_id: booking.id,
      amount: booking.total_amount,
      nights: booking.nights,
      due_date: booking.check_out.toISOString().slice(0, 10),
    });
  }

  if (booking.guest_id) {
    const guest = await tx.guest.findUnique({
      where: { id: booking.guest_id },
    });
    if (guest) {
      await tx.guest.update({
        where: { id: guest.id },
        data: {
          total_stays: { increment: 1 },
          total_spent: { increment: booking.total_amount },
          last_stay_at: booking.check_out,
        },
      });
    }
  }
  return engine;
}

/** Cancel side effects: free the room, cancel unpaid invoices, drop
 * pending housekeeping tasks for the booking, emit the event. */
async function applyCancelSideEffects(
  tx: DbClient,
  booking: Booking,
  room: Room | null,
  hotelId: string,
  actor: Actor | null,
): Promise<void> {
  if (room && room.status === 'occupied') {
    // Free the room only if no other active booking still holds it.
    const otherActive = await tx.booking.findFirst({
      where: {
        id: { not: booking.id },
        room_id: room.id,
        status: { in: ['confirmed', 'checked_in'] },
      },
    });
    if (!otherActive) {
      await tx.room.update({
        where: { id: room.id },
        data: { status: 'available' },
      });
    }
  }
  await tx.invoice.updateMany({
    where: {
      booking_id: booking.id,
      status: { in: ['pending', 'partially_paid'] },
    },
    data: { status: 'cancelled' },
  });
  await tx.housekeepingTask.deleteMany({
    where: { booking_id: booking.id, status: 'pending' },
  });
  await evaluateAutomations(tx, {
    type: 'booking.cancelled',
    hotelId,
    booking,
    room,
    actorId: actor?.id ?? null,
    actorName: actor?.full_name ?? null,
  });
}

export async function checkInBooking(
  id: string,
  hotelId: string,
  actor: Actor | null,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await loadBooking(tx, id, hotelId);
    if (booking.status !== 'confirmed') {
      throw new ApiError(
        409,
        `Cannot check in a booking with status '${booking.status}'`,
      );
    }
    await tx.booking.update({
      where: { id },
      data: { status: 'checked_in' },
    });
    await applyStatusTransition(
      tx,
      { ...booking, status: 'checked_in' },
      'confirmed',
      'checked_in',
      hotelId,
      actor,
    );
    return tx.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });
  });
}

export async function checkOutBooking(
  id: string,
  hotelId: string,
  actor: Actor | null,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await loadBooking(tx, id, hotelId);
    if (booking.status !== 'checked_in') {
      throw new ApiError(
        409,
        `Cannot check out a booking with status '${booking.status}'`,
      );
    }
    await tx.booking.update({
      where: { id },
      data: { status: 'checked_out' },
    });
    await applyStatusTransition(
      tx,
      { ...booking, status: 'checked_out' },
      'checked_in',
      'checked_out',
      hotelId,
      actor,
    );
    return tx.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });
  });
}

export async function cancelBooking(
  id: string,
  hotelId: string,
  actor: Actor | null,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await loadBooking(tx, id, hotelId);
    if (booking.status === 'cancelled') {
      throw new ApiError(409, 'Booking is already cancelled');
    }
    if (booking.status === 'checked_out') {
      throw new ApiError(409, 'Cannot cancel a booking that is checked out');
    }
    await tx.booking.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    await applyStatusTransition(
      tx,
      { ...booking, status: 'cancelled' },
      booking.status,
      'cancelled',
      hotelId,
      actor,
    );
    return tx.booking.findUnique({
      where: { id },
      include: { guest: true, room: true },
    });
  });
}
