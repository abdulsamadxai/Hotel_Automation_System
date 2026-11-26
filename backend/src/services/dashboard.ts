// Dashboard summary, mirroring the frontend's Index.tsx + DashboardCharts:
// revenue = invoice `total` by `paid_date` day-key; occupancy trend =
// rooms with a guest staying that night (check_in day <= day < check_out
// day) over 14 days; revenue trend = 30 days by paid_date. All day-key
// comparisons, never raw datetimes. The "today" used for arrivals /
// departures / revenue-today is the anchor date (latest data date, capped
// at now) so the Feb 2024 seed data still produces real numbers; with
// live data the anchor is today.
import { prisma } from '../lib/prisma.js';
import {
  dayKey,
  daysEndingOn,
  latestDataDate,
  monthPrefix,
  yearPrefix,
} from '../lib/dates.js';
import { serializeBooking, serializeTask } from '../lib/serialize.js';

export async function getDashboardSummary(hotelId: string | null) {
  const where = hotelId ? { hotel_id: hotelId } : {};

  const [rooms, bookings, invoices, tasks, messages, notifications, activities] =
    await Promise.all([
      prisma.room.findMany({ where }),
      prisma.booking.findMany({
        where,
        include: { guest: true, room: true },
        orderBy: { check_in: 'asc' },
      }),
      prisma.invoice.findMany({ where }),
      prisma.housekeepingTask.findMany({
        where,
        include: { room: true, assignee: true },
        orderBy: { created_at: 'asc' },
      }),
      prisma.message.findMany({ where }),
      prisma.notification.findMany({ where }),
      prisma.activityLog.findMany({ where, select: { created_at: true } }),
    ]);

  const anchor = latestDataDate([
    ...bookings.flatMap((b) => [b.check_in, b.check_out, b.created_at]),
    ...invoices.flatMap((inv) => [inv.paid_date, inv.created_at]),
    ...activities.map((a) => a.created_at),
  ]);
  const anchorKey = dayKey(anchor);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const arrivals = bookings.filter(
    (b) => b.status !== 'cancelled' && dayKey(b.check_in) === anchorKey,
  );
  const departures = bookings.filter(
    (b) => b.status !== 'cancelled' && dayKey(b.check_out) === anchorKey,
  );

  const revenueInPeriod = (predicate: (paidDay: string) => boolean): number =>
    invoices
      .filter((inv) => inv.paid_date && predicate(dayKey(inv.paid_date)))
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const weekStart = dayKey(
    new Date(anchor.getTime() - 6 * 24 * 60 * 60 * 1000),
  );
  const revenueToday = revenueInPeriod((d) => d === anchorKey);
  const revenue7d = revenueInPeriod((d) => d >= weekStart && d <= anchorKey);
  const revenueMonth = revenueInPeriod((d) =>
    d.startsWith(monthPrefix(anchorKey)),
  );
  const revenueYear = revenueInPeriod((d) =>
    d.startsWith(yearPrefix(anchorKey)),
  );

  const outstanding = invoices
    .filter(
      (inv) =>
        inv.status !== 'paid' &&
        inv.status !== 'cancelled' &&
        inv.status !== 'refunded' &&
        (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0) > 0,
    )
    .reduce(
      (sum, inv) => sum + (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0),
      0,
    );

  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const unreadMessages = messages.filter(
    (m) => m.direction === 'inbound' && m.status !== 'read',
  ).length;
  const unreadAlerts = notifications.filter((n) => !n.is_read).length;

  const housekeepingQueue = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .map((t) => serializeTask(t as unknown as Record<string, unknown> & { room?: { id: string; number: string; type: string } | null; assignee?: { id: string; full_name: string } | null }));

  const occupancyTrend = daysEndingOn(anchor, 14).map((day) => {
    const key = dayKey(day);
    const staying = bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      const inKey = dayKey(b.check_in);
      const outKey = dayKey(b.check_out);
      if (!inKey || !outKey) return false;
      return inKey <= key && key < outKey;
    }).length;
    return {
      date: key,
      rate: totalRooms > 0 ? Math.round((staying / totalRooms) * 100) : 0,
    };
  });

  const revenueTrend = daysEndingOn(anchor, 30).map((day) => {
    const key = dayKey(day);
    const amount = invoices
      .filter((inv) => inv.paid_date && dayKey(inv.paid_date) === key)
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    return { date: key, amount: Math.round(amount * 100) / 100 };
  });

  return {
    anchor_date: anchorKey,
    today_check_ins: arrivals.length,
    today_check_outs: departures.length,
    occupancy_rate: occupancyRate,
    revenue_today: revenueToday,
    revenue_7d: revenue7d,
    revenue_month: revenueMonth,
    revenue_year: revenueYear,
    outstanding: Math.round(outstanding * 100) / 100,
    pending_tasks: pendingTasks,
    unread_messages: unreadMessages,
    unread_alerts: unreadAlerts,
    arrivals: arrivals.map((b) => serializeBooking(b)),
    departures: departures.map((b) => serializeBooking(b)),
    housekeeping_queue: housekeepingQueue,
    occupancy_trend: occupancyTrend,
    revenue_trend: revenueTrend,
  };
}
