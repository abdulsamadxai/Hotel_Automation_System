import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, Zap, X, Loader2, Bell, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, type NotificationType } from "@/hooks/useNotifications";

/** One icon per known notification type — no generic fallback for known types. */
const typeConfig: Record<NotificationType, { color: string; bg: string; icon: typeof AlertCircle }> = {
  alert: { color: "text-status-error", bg: "bg-status-error/10", icon: AlertCircle },
  task: { color: "text-status-warning", bg: "bg-status-warning/10", icon: Clock },
  booking: { color: "text-status-info", bg: "bg-status-info/10", icon: Bell },
  automation: { color: "text-primary", bg: "bg-primary/10", icon: Zap },
  room: { color: "text-muted-foreground", bg: "bg-muted", icon: Bell },
  info: { color: "text-status-info", bg: "bg-status-info/10", icon: Info },
  warning: { color: "text-status-warning", bg: "bg-status-warning/10", icon: AlertTriangle },
  success: { color: "text-status-success", bg: "bg-status-success/10", icon: CheckCircle2 },
};


export default function Alerts() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const unread = notifications.filter((n) => !n.is_read).length;
  const alertCount = notifications.filter((n) => n.type === "alert").length;
  const automationCount = notifications.filter((n) => n.type === "automation").length;
  const readCount = notifications.filter((n) => n.is_read).length;

  const handleAcknowledge = async (id: string) => {
    await markRead.mutateAsync(id);
  };

  const handleDismiss = async (id: string) => {
    // For mock implementation, we'll just mark as read
    await markRead.mutateAsync(id);
    toast({ title: "Notification dismissed" });
  };

  const handleDelete = async (id: string) => {
    await deleteNotification.mutateAsync(id);
    toast({ title: "Notification deleted" });
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
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
            <h1 className="text-2xl font-bold tracking-tight">Alerts & Notifications</h1>
            <p className="text-muted-foreground">
              Monitor issues requiring attention
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending || unread === 0}
          >
            {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Mark All Read
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-status-error/10 flex items-center justify-center text-status-error">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unread}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-status-warning/10 flex items-center justify-center text-status-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{alertCount}</p>
                <p className="text-xs text-muted-foreground">Alerts</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automationCount}</p>
                <p className="text-xs text-muted-foreground">Auto-generated</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-status-success/10 flex items-center justify-center text-status-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readCount}</p>
                <p className="text-xs text-muted-foreground">Read</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground text-sm">
                You're all caught up! Notifications will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = typeConfig[notification.type];
              const IconComponent = config.icon;

              return (
                <div
                  key={notification.id}
                  className={`glass-card p-5 transition-all ${notification.is_read ? "opacity-60" : ""
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge
                              variant="outline"
                              className={config.color}
                            >
                              {notification.type}
                            </Badge>
                            {notification.type === "automation" && (
                              <Badge
                                variant="outline"
                                className="gap-1 bg-primary/10 text-primary border-primary/20"
                              >
                                <Zap className="h-3 w-3" />
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(notification.id)}
                              disabled={markRead.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Dismiss notification"
                            onClick={() => handleDismiss(notification.id)}
                            disabled={markRead.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            aria-label="Delete notification"
                            onClick={() => handleDelete(notification.id)}
                            disabled={deleteNotification.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
