import { Zap, CalendarCheck, Bed, ClipboardList, AlertCircle } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "automation" | "booking" | "room" | "task" | "alert";
  title: string;
  description: string;
  timestamp: string;
}

const iconMap = {
  automation: Zap,
  booking: CalendarCheck,
  room: Bed,
  task: ClipboardList,
  alert: AlertCircle,
};

const colorMap = {
  automation: "text-primary bg-primary/10",
  booking: "text-status-info bg-status-info/10",
  room: "text-status-warning bg-status-warning/10",
  task: "text-status-pending bg-status-pending/10",
  alert: "text-status-error bg-status-error/10",
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Activity Feed</h3>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          const color = colorMap[activity.type];
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
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {activity.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {activity.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
