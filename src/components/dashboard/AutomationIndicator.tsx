import { Zap, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  lastTriggered?: string;
}

interface AutomationIndicatorProps {
  rules: AutomationRule[];
}

export function AutomationIndicator({ rules = [] }: AutomationIndicatorProps) {
  const safeRules = Array.isArray(rules) ? rules : [];
  const activeRules = safeRules.filter((r) => r?.isActive).length;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold">Automation Engine</h3>
              <p className="text-xs text-muted-foreground">
                {activeRules} of {safeRules.length} rules active
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
        {safeRules.map((rule) => (
          <div
            key={rule?.id || Math.random()}
            className={`p-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${!rule?.isActive ? "opacity-50" : ""
              }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${rule.isActive ? "bg-status-success" : "bg-muted-foreground"
                    }`}
                />
                <p className="text-sm font-medium truncate">{rule.name}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {rule.trigger} → {rule.action}
              </p>
              {rule.lastTriggered && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Last: {rule.lastTriggered}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              {rule.isActive ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
