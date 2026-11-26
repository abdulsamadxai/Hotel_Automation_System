import { Link } from "react-router-dom";
import {
  Zap,
  CalendarCheck,
  Bed,
  ClipboardList,
  AlertCircle,
  Receipt,
  User,
  Building2,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import type { ActivityLog } from "@/lib/types";

const iconMap: Record<string, typeof Zap> = {
  booking: CalendarCheck,
  room: Bed,
  housekeeping_task: ClipboardList,
  task: ClipboardList,
  automation: Zap,
  invoice: Receipt,
  guest: User,
  hotel: Building2,
};

const colorMap: Record<string, string> = {
  booking: "text-status-info bg-status-info/10",
  room: "text-status-warning bg-status-warning/10",
  housekeeping_task: "text-status-pending bg-status-pending/10",
  task: "text-status-pending bg-status-pending/10",
  automation: "text-primary bg-primary/10",
  invoice: "text-status-success bg-status-success/10",
  guest: "text-primary bg-primary/10",
  hotel: "text-primary bg-primary/10",
};

function formatTimestamp(createdAt: string): string {
  const date = parseISO(createdAt);
  if (!isValid(date)) return "";
  return format(date, "MMM d, h:mm a");
}

interface ActivityFeedProps {
  /** Newest first — useActivity already returns logs in that order. */
  activities: ActivityLog[];
}

/**
 * Recent activity, rendered from the real log fields (`action` /
 * `details` / `entity_type`). There is no live feed in this frontend-only
 * app, so the header says "Recent activity" — never "Live".
 */
export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent activity</h3>
          <Link
            to="/logs"
            className="text-xs text-primary hover:underline"
          >
            View all logs
          </Link>
        </div>
      </div>
      {activities.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No activity recorded yet. Actions such as bookings, check-ins and
          payments are logged here as they happen.
        </p>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {activities.map((activity) => {
            const Icon = iconMap[activity.entity_type] ?? AlertCircle;
            const color =
              colorMap[activity.entity_type] ??
              "text-muted-foreground bg-muted/10";
            return (
              <div
                key={activity.id}
                className="p-4 hover:bg-muted/30 transition-colors animate-fade-in"
              >
                <div className="flex gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {activity.action.replace(/_/g, " ")}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.details}
                    </p>
                    {activity.user_name && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        by {activity.user_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
