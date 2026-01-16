import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, Zap, CalendarCheck, Bed, ClipboardList, AlertCircle, DollarSign } from "lucide-react";

interface EventLog {
  id: string;
  event: string;
  type: "booking" | "room" | "task" | "automation" | "alert" | "payment";
  data: Record<string, string | number>;
  timestamp: string;
  source: "user" | "system" | "automation";
  userId?: string;
}

const mockLogs: EventLog[] = [
  {
    id: "EVT-001",
    event: "booking.checked_out",
    type: "booking",
    data: { booking_id: "BK-002", room: "305", guest: "Sarah Johnson" },
    timestamp: "2024-01-15 10:32:15",
    source: "user",
    userId: "reception@hotel.com",
  },
  {
    id: "EVT-002",
    event: "automation.triggered",
    type: "automation",
    data: { rule: "Auto Housekeeping", trigger: "booking.checked_out", action: "task.created" },
    timestamp: "2024-01-15 10:32:16",
    source: "automation",
  },
  {
    id: "EVT-003",
    event: "task.created",
    type: "task",
    data: { task_id: "HK-001", room: "305", type: "checkout_clean", assignee: "Maria Garcia" },
    timestamp: "2024-01-15 10:32:16",
    source: "automation",
  },
  {
    id: "EVT-004",
    event: "room.status_changed",
    type: "room",
    data: { room: "305", from: "occupied", to: "dirty" },
    timestamp: "2024-01-15 10:32:17",
    source: "system",
  },
  {
    id: "EVT-005",
    event: "invoice.generated",
    type: "payment",
    data: { invoice_id: "INV-002", amount: 380, guest: "Sarah Johnson" },
    timestamp: "2024-01-15 10:32:18",
    source: "automation",
  },
  {
    id: "EVT-006",
    event: "alert.created",
    type: "alert",
    data: { type: "task_overdue", task_id: "HK-003", delay: "30min" },
    timestamp: "2024-01-15 10:15:00",
    source: "system",
  },
  {
    id: "EVT-007",
    event: "booking.created",
    type: "booking",
    data: { booking_id: "BK-005", room: "412", guest: "John Smith", nights: 3 },
    timestamp: "2024-01-15 09:45:22",
    source: "user",
    userId: "reception@hotel.com",
  },
  {
    id: "EVT-008",
    event: "task.completed",
    type: "task",
    data: { task_id: "HK-005", room: "103", duration: "45min" },
    timestamp: "2024-01-15 09:30:00",
    source: "user",
    userId: "housekeeping@hotel.com",
  },
];

const iconMap = {
  booking: CalendarCheck,
  room: Bed,
  task: ClipboardList,
  automation: Zap,
  alert: AlertCircle,
  payment: DollarSign,
};

const colorMap = {
  booking: "bg-status-info/10 text-status-info",
  room: "bg-status-warning/10 text-status-warning",
  task: "bg-status-pending/10 text-status-pending",
  automation: "bg-primary/10 text-primary",
  alert: "bg-status-error/10 text-status-error",
  payment: "bg-status-success/10 text-status-success",
};

const sourceColors = {
  user: "bg-status-info/15 text-status-info",
  system: "bg-muted text-muted-foreground",
  automation: "bg-primary/15 text-primary",
};

export default function Logs() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Logs</h1>
            <p className="text-muted-foreground">
              Track all system events and automation triggers
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["booking", "room", "task", "automation", "alert", "payment"] as const).map(
                (type) => {
                  const Icon = iconMap[type];
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {type}
                    </Button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-border">
            {mockLogs.map((log) => {
              const Icon = iconMap[log.type];
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[log.type]}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-medium">
                            {log.event}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={sourceColors[log.source]}
                            >
                              {log.source}
                            </Badge>
                            {log.userId && (
                              <span className="text-xs text-muted-foreground">
                                by {log.userId}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
