// Date helpers mirroring the frontend's src/components/dashboard/
// dashboardDates.ts: every comparison is done on calendar-day keys
// ("yyyy-MM-dd"), never on raw datetimes. Server-side the keys are UTC
// (all stored datetimes are UTC ISO strings).

/** Calendar-day key ("yyyy-MM-dd") for a Date or ISO string. "" when invalid. */
export function dayKey(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** "yyyy-MM" prefix of a day key. */
export function monthPrefix(day: string): string {
  return day.slice(0, 7);
}

/** "yyyy" prefix of a day key. */
export function yearPrefix(day: string): string {
  return day.slice(0, 4);
}

/**
 * The latest date present in the records, capped at now — the same anchor
 * the frontend dashboard uses (dashboardDates.latestDataDate). The seed
 * data is Feb 2024, so an anchor of "today" would make every dashboard
 * number zero; with live data the anchor is today.
 */
export function latestDataDate(
  values: Array<string | Date | null | undefined>,
  now: Date = new Date(),
): Date {
  let latest: Date | null = null;
  for (const value of values) {
    if (!value) continue;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  if (!latest) return now;
  return latest.getTime() > now.getTime() ? now : latest;
}

/** `count` consecutive days ending on `end` (inclusive), oldest first. */
export function daysEndingOn(end: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d);
  }
  return days;
}

/** Round money to 2 decimals (avoids 0.1 float dust in tax totals). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
