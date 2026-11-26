import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BookingWithJoins, InvoiceWithJoins } from "@/lib/mockStore";
import type { Currency } from "@/utils/currency";
import { formatAndConvert } from "@/utils/currency";
import { dayKey, daysEndingOn, shortDayLabel } from "./dashboardDates";

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string; name?: string }>;
  label?: string;
}

function OccupancyTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        Occupancy: {typeof value === "number" ? `${value}%` : "—"}
      </p>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        Revenue: {typeof value === "number" ? `$${value.toFixed(2)}` : "—"}
      </p>
    </div>
  );
}

interface DashboardChartsProps {
  bookings: BookingWithJoins[];
  invoices: InvoiceWithJoins[];
  totalRooms: number;
  /** Last day of both ranges — the latest date present in the records. */
  anchorDate: Date;
  currency: Currency;
}

/**
 * Occupancy (last 14 days, from bookings) and revenue (last 30 days, from
 * invoice `total` by `paid_date`). No data is invented: a day with no
 * bookings / no payments plots as zero, and the range is labelled with its
 * real end date.
 */
export function DashboardCharts({
  bookings,
  invoices,
  totalRooms,
  anchorDate,
  currency,
}: DashboardChartsProps) {
  const occupancyData = useMemo(() => {
    return daysEndingOn(anchorDate, 14).map((day) => {
      const key = dayKey(day);
      const staying = bookings.filter((b) => {
        if (b.status === "cancelled") return false;
        const inKey = dayKey(b.check_in);
        const outKey = dayKey(b.check_out);
        if (!inKey || !outKey) return false;
        // Guest occupies the night of `key` when check-in <= key < check-out.
        return inKey <= key && key < outKey;
      }).length;
      return {
        day: shortDayLabel(day),
        fullDay: format(day, "MMM d, yyyy"),
        occupancy: totalRooms > 0 ? Math.round((staying / totalRooms) * 100) : 0,
      };
    });
  }, [bookings, totalRooms, anchorDate]);

  const revenueData = useMemo(() => {
    return daysEndingOn(anchorDate, 30).map((day) => {
      const key = dayKey(day);
      const revenue = invoices
        .filter((inv) => inv.paid_date && dayKey(inv.paid_date) === key)
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      return {
        day: shortDayLabel(day),
        fullDay: format(day, "MMM d, yyyy"),
        revenue: Math.round(revenue * 100) / 100,
      };
    });
  }, [invoices, anchorDate]);

  const rangeLabel = `ending ${format(anchorDate, "MMM d, yyyy")}`;
  const totalRevenue30d = revenueData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold">Occupancy trend</h3>
            <p className="text-xs text-muted-foreground">
              Last 14 days, {rangeLabel} — rooms with a guest staying that
              night, from bookings
            </p>
          </div>
        </div>
        {totalRooms === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            No rooms yet, so occupancy cannot be computed.
          </p>
        ) : (
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={1} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip content={<OccupancyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="occupancy"
                  name="Occupancy"
                  stroke="#0ea371"
                  fill="#0ea371"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold">Revenue trend</h3>
            <p className="text-xs text-muted-foreground">
              Last 30 days, {rangeLabel} — invoice totals by paid date
            </p>
          </div>
          <p className="text-sm font-bold whitespace-nowrap">
            {formatAndConvert(totalRevenue30d, currency)}
          </p>
        </div>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<RevenueTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
