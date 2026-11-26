import { useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut, Bell, CheckCheck } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BookingWithJoins } from "@/lib/types";
import type { HousekeepingTask } from "@/hooks/useHousekeeping";
import type { Notification } from "@/lib/types";
import { useUpdateBookingStatus } from "@/hooks/useBookings";
import { useUpdateTaskStatus } from "@/hooks/useHousekeeping";
import { useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string | null | undefined, pattern: string): string {
  if (!value) return "—";
  const date = parseISO(value);
  if (!isValid(date)) return "—";
  return format(date, pattern);
}

function guestName(booking: BookingWithJoins): string {
  return booking.guest?.name ?? "Guest";
}

function roomNumber(booking: BookingWithJoins): string {
  return booking.room?.number ?? "—";
}

// ---------------------------------------------------------------------------
// Arrivals & departures
// ---------------------------------------------------------------------------

interface ArrivalsDeparturesPanelProps {
  arrivals: BookingWithJoins[];
  departures: BookingWithJoins[];
  /** Staff see arrivals but cannot check guests in/out from the dashboard. */
  canCheckInOut: boolean;
  showViewAll: boolean;
}

export function ArrivalsDeparturesPanel({
  arrivals,
  departures,
  canCheckInOut,
  showViewAll,
}: ArrivalsDeparturesPanelProps) {
  const updateStatus = useUpdateBookingStatus();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const runStatus = (id: string, status: "checked_in" | "checked_out") => {
    setPendingId(id);
    updateStatus.mutate(
      { id, status },
      { onSettled: () => setPendingId(null) },
    );
  };

  const renderBooking = (
    booking: BookingWithJoins,
    kind: "arrival" | "departure",
  ) => {
    const isArrival = kind === "arrival";
    const canAct = isArrival
      ? booking.status === "confirmed" || booking.status === "pending"
      : booking.status === "checked_in";
    return (
      <li
        key={booking.id}
        className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{guestName(booking)}</p>
          <p className="text-xs text-muted-foreground">
            Room {roomNumber(booking)} · {booking.booking_number} ·{" "}
            {isArrival
              ? `${formatDate(booking.check_in, "MMM d")} → ${formatDate(booking.check_out, "MMM d")}`
              : `${formatDate(booking.check_in, "MMM d")} → ${formatDate(booking.check_out, "MMM d")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="capitalize">
            {booking.status.replace("_", " ")}
          </Badge>
          {canCheckInOut && canAct && (
            <Button
              size="sm"
              disabled={pendingId === booking.id}
              onClick={() =>
                runStatus(booking.id, isArrival ? "checked_in" : "checked_out")
              }
            >
              {isArrival ? (
                <LogIn className="h-3 w-3 mr-1" />
              ) : (
                <LogOut className="h-3 w-3 mr-1" />
              )}
              {isArrival ? "Check in" : "Check out"}
            </Button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Today&apos;s arrivals &amp; departures</h3>
        {showViewAll && (
          <Link to="/bookings" className="text-xs text-primary hover:underline">
            View all bookings
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Arrivals ({arrivals.length})
          </p>
          {arrivals.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No arrivals today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {arrivals.map((b) => renderBooking(b, "arrival"))}
            </ul>
          )}
        </div>
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Departures ({departures.length})
          </p>
          {departures.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No departures today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {departures.map((b) => renderBooking(b, "departure"))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Housekeeping queue
// ---------------------------------------------------------------------------

interface HousekeepingQueuePanelProps {
  /** Pending / in-progress tasks (with the hook's derived `is_overdue`). */
  tasks: HousekeepingTask[];
  /** Title shown above the list (e.g. "Housekeeping queue" or "My tasks"). */
  title: string;
  showViewAll: boolean;
}

export function HousekeepingQueuePanel({ tasks, title, showViewAll }: HousekeepingQueuePanelProps) {
  const updateTask = useUpdateTaskStatus();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => {
      const aOverdue = a.is_overdue ? 0 : 1;
      const bOverdue = b.is_overdue ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return (a.due_at ?? "").localeCompare(b.due_at ?? "");
    });

  const runStatus = (id: string, status: "in_progress" | "completed") => {
    setPendingId(id);
    updateTask.mutate({ id, status }, { onSettled: () => setPendingId(null) });
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">
          {title} ({openTasks.length} open)
        </h3>
        {showViewAll && (
          <Link to="/housekeeping" className="text-xs text-primary hover:underline">
            View all tasks
          </Link>
        )}
      </div>
      {openTasks.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No open housekeeping tasks. Rooms needing attention will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border max-h-[320px] overflow-y-auto">
          {openTasks.map((task) => (
            <li
              key={task.id}
              className={`p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                task.is_overdue ? "border-l-4 border-l-status-error bg-status-error/5" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">
                    Room {task.room?.number ?? "—"} ·{" "}
                    {task.type.replace(/_/g, " ")}
                  </p>
                  {task.is_overdue && (
                    <Badge variant="destructive" className="text-[10px]">
                      Overdue
                    </Badge>
                  )}
                  <StatusBadge
                    status={task.status === "in_progress" ? "in_progress" : "pending"}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {task.description}
                  {task.assignee ? ` · ${task.assignee.full_name}` : " · Unassigned"}
                  {task.due_at ? ` · due ${formatDate(task.due_at, "MMM d, h:mm a")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {task.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingId === task.id}
                    onClick={() => runStatus(task.id, "in_progress")}
                  >
                    Start
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={pendingId === task.id}
                  onClick={() => runStatus(task.id, "completed")}
                >
                  Complete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

interface AlertsPanelProps {
  /** Unread notifications, newest first. */
  notifications: Notification[];
}

export function AlertsPanel({ notifications }: AlertsPanelProps) {
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Alerts ({unread.length} unread)</h3>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              disabled={markAllAsRead.isPending}
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
          <Link to="/alerts" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
      </div>
      {unread.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No unread alerts. New booking, task and system alerts appear here.
        </p>
      ) : (
        <ul className="divide-y divide-border max-h-[300px] overflow-y-auto">
          {unread.slice(0, 5).map((notification) => (
            <li key={notification.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatDate(notification.created_at, "MMM d, h:mm a")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs shrink-0"
                disabled={pendingId === notification.id}
                onClick={() => {
                  setPendingId(notification.id);
                  markAsRead.mutate(notification.id, {
                    onSettled: () => setPendingId(null),
                  });
                }}
              >
                Dismiss
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
