// Date helpers shared by the dashboard.
//
// Every comparison in the dashboard is done on calendar-day keys
// ("yyyy-MM-dd"), never on raw datetimes: seed rows carry ISO datetimes
// such as "2024-02-01T14:00:00Z", which are never equal to a plain date
// string. Comparing day keys is what makes "today's check-ins" work.

import { addDays, format, isValid, parseISO } from "date-fns";

/** Calendar-day key ("yyyy-MM-dd") for a date or ISO string. "" when invalid. */
export function dayKey(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

/** Today as a day key, in local time. */
export function todayKey(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/**
 * The latest date present in the records (bookings, invoices, ...).
 * Used to anchor the trend charts: the seed data is from Feb 2024, so a
 * chart ending "today" would be an empty desert. The anchor is capped at
 * today so future bookings never pull the range forward.
 */
export function latestDataDate(
  values: Array<string | null | undefined>,
  now: Date = new Date(),
): Date {
  let latest: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    const date = parseISO(value);
    if (!isValid(date)) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  if (!latest) return now;
  return latest.getTime() > now.getTime() ? now : latest;
}

/** `count` consecutive days ending on `end` (inclusive), oldest first. */
export function daysEndingOn(end: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    days.push(addDays(end, -i));
  }
  return days;
}

/** Short label for a chart axis, e.g. "Feb 2". */
export function shortDayLabel(date: Date): string {
  return format(date, "MMM d");
}
