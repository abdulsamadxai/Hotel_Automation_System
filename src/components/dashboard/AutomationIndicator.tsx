import { Link } from "react-router-dom";
import { Zap, Play, Pause } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Automation, AutomationAction, StoreEventType } from "@/lib/types";
import { useToggleAutomation } from "@/hooks/useAutomations";

const triggerLabels: Record<StoreEventType, string> = {
  "booking.created": "Booking created",
  "booking.checked_in": "Guest checks in",
  "booking.checked_out": "Guest checks out",
  "booking.cancelled": "Booking cancelled",
  "room.updated": "Room updated",
  "invoice.created": "Invoice created",
  "invoice.paid": "Invoice paid",
};

const actionLabels: Record<AutomationAction, string> = {
  create_housekeeping_task: "Create housekeeping task",
  create_notification: "Create notification",
  log_activity: "Log activity",
  create_invoice: "Create invoice",
  send_email: "Send email",
};

function formatLastTriggered(value: string | null): string {
  if (!value) return "Never run";
  const date = parseISO(value);
  if (!isValid(date)) return "Never run";
  return `Last run ${format(date, "MMM d, h:mm a")}`;
}

interface AutomationIndicatorProps {
  rules: Automation[];
  /** Only super_admin can open /automations (route guard). */
  canManage: boolean;
}

export function AutomationIndicator({ rules, canManage }: AutomationIndicatorProps) {
  const toggleAutomation = useToggleAutomation();
  const activeRules = rules.filter((r) => r.enabled).length;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Automation Engine</h3>
              <p className="text-xs text-muted-foreground">
                {activeRules} of {rules.length} rules active
              </p>
            </div>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/automations">Manage</Link>
            </Button>
          )}
        </div>
      </div>
      {rules.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No automation rules yet. Rules run when a booking, room or invoice
          event happens.
        </p>
      ) : (
        <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${
                !rule.enabled ? "opacity-50" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      rule.enabled ? "bg-status-success" : "bg-muted-foreground"
                    }`}
                  />
                  <p className="text-sm font-medium truncate">{rule.name}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {triggerLabels[rule.trigger] ?? rule.trigger} →{" "}
                  {actionLabels[rule.action] ?? rule.action}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rule.execution_count} run
                  {rule.execution_count === 1 ? "" : "s"} ·{" "}
                  {formatLastTriggered(rule.last_triggered_at)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={rule.enabled ? `Pause ${rule.name}` : `Resume ${rule.name}`}
                disabled={toggleAutomation.isPending}
                onClick={() =>
                  toggleAutomation.mutate({ id: rule.id, enabled: !rule.enabled })
                }
              >
                {rule.enabled ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
