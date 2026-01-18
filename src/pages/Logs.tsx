import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useActivity, useDeleteActivity } from "@/hooks/useActivity";
import { Search, RefreshCw, Zap, CalendarCheck, Bed, ClipboardList, AlertCircle, DollarSign, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

const iconMap: any = {
  booking: CalendarCheck,
  room: Bed,
  task: ClipboardList,
  automation: Zap,
  alert: AlertCircle,
  payment: DollarSign,
};

const colorMap: any = {
  booking: "bg-status-info/10 text-status-info",
  room: "bg-status-warning/10 text-status-warning",
  task: "bg-status-pending/10 text-status-pending",
  automation: "bg-primary/10 text-primary",
  alert: "bg-status-error/10 text-status-error",
  payment: "bg-status-success/10 text-status-success",
};

export default function Logs() {
  const { data: logs = [], isLoading, refetch } = useActivity(50);
  const deleteActivity = useDeleteActivity();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = logs.filter(log =>
    log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.event_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      await deleteActivity.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

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
          <Button variant="outline" className="gap-2" onClick={() => refetch()}>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-border">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No analytics logs found.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const Icon = iconMap[log.event_type] || Zap;
                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[log.event_type] || "bg-muted"}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-sm font-medium">
                              {log.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="bg-muted text-muted-foreground"
                              >
                                {log.source}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {log.event_name}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
