import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = "text-primary",
}: KPICardProps) {
  return (
    <div className="glass-card p-5 group hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend.isPositive ? "text-status-success" : "text-status-error"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
