/**
 * Store-level checks for the booking-edit validation and notification
 * delete added in the senior-engineer rebuild.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore, resetStore } from '@/lib/mockStore';

describe('bookings.update validation (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('rejects an edit that moves a booking onto another booking dates', async () => {
    const guests = await mockStore.guests.getAll('hotel-001');
    const guestId = guests[0].id;
    const b1 = await mockStore.bookings.create(
      {
        guest_id: guestId,
        room_id: 'room-102',
        check_in: '2024-02-20T14:00:00Z',
        check_out: '2024-02-25T11:00:00Z',
        guest_type: 'national',
        status: 'confirmed',
      },
      'hotel-001',
    );
    const b2 = await mockStore.bookings.create(
      {
        guest_id: guestId,
        room_id: 'room-102',
        check_in: '2024-03-01T14:00:00Z',
        check_out: '2024-03-05T11:00:00Z',
        guest_type: 'national',
        status: 'confirmed',
      },
      'hotel-001',
    );
    await expect(
      mockStore.bookings.update(b1.id, {
        check_in: b2.check_in,
        check_out: b2.check_out,
      }),
    ).rejects.toThrow('already booked');
  });

  it('rejects an edit with check-out before check-in', async () => {
    const bookings = await mockStore.bookings.getAll('hotel-001');
    const b1 = bookings[0];
    await expect(
      mockStore.bookings.update(b1.id, {
        check_in: '2024-02-10',
        check_out: '2024-02-09',
      }),
    ).rejects.toThrow('after check-in');
  });

  it('allows a non-overlapping edit', async () => {
    const bookings = await mockStore.bookings.getAll('hotel-001');
    const b1 = bookings.find((b) => b.room_id === 'room-102' && b.status !== 'cancelled');
    const updated = await mockStore.bookings.update(b1!.id, {
      check_out: '2024-03-15',
    });
    expect(updated.check_out).toBe('2024-03-15');
  });

  it('deletes a notification and it stays deleted', async () => {
    const before = await mockStore.notifications.getAll('hotel-001');
    expect(before.length).toBeGreaterThan(0);
    await mockStore.notifications.delete(before[0].id);
    const after = await mockStore.notifications.getAll('hotel-001');
    expect(after.length).toBe(before.length - 1);
    expect(after.find((n) => n.id === before[0].id)).toBeUndefined();
  });
});
