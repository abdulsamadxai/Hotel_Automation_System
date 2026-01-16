import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

type StatusType =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "checked-in"
  | "checked-out"
  | "available"
  | "occupied"
  | "dirty"
  | "cleaning"
  | "maintenance"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "in_progress"
  | "completed"
  | "overdue";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; dot: string; label: string }
> = {
  confirmed: {
    bg: "bg-booking-confirmed/15",
    text: "text-booking-confirmed",
    dot: "bg-booking-confirmed",
    label: "Confirmed",
  },
  pending: {
    bg: "bg-booking-pending/15",
    text: "text-booking-pending",
    dot: "bg-booking-pending",
    label: "Pending",
  },
  cancelled: {
    bg: "bg-booking-cancelled/15",
    text: "text-booking-cancelled",
    dot: "bg-booking-cancelled",
    label: "Cancelled",
  },
  "checked-in": {
    bg: "bg-booking-checked-in/15",
    text: "text-booking-checked-in",
    dot: "bg-booking-checked-in",
    label: "Checked In",
  },
  "checked-out": {
    bg: "bg-booking-checked-out/15",
    text: "text-booking-checked-out",
    dot: "bg-booking-checked-out",
    label: "Checked Out",
  },
  available: {
    bg: "bg-room-available/15",
    text: "text-room-available",
    dot: "bg-room-available",
    label: "Available",
  },
  occupied: {
    bg: "bg-room-occupied/15",
    text: "text-room-occupied",
    dot: "bg-room-occupied",
    label: "Occupied",
  },
  dirty: {
    bg: "bg-room-dirty/15",
    text: "text-room-dirty",
    dot: "bg-room-dirty",
    label: "Dirty",
  },
  cleaning: {
    bg: "bg-room-cleaning/15",
    text: "text-room-cleaning",
    dot: "bg-room-cleaning",
    label: "Cleaning",
  },
  maintenance: {
    bg: "bg-room-maintenance/15",
    text: "text-room-maintenance",
    dot: "bg-room-maintenance",
    label: "Maintenance",
  },
  success: {
    bg: "bg-status-success/15",
    text: "text-status-success",
    dot: "bg-status-success",
    label: "Success",
  },
  warning: {
    bg: "bg-status-warning/15",
    text: "text-status-warning",
    dot: "bg-status-warning",
    label: "Warning",
  },
  error: {
    bg: "bg-status-error/15",
    text: "text-status-error",
    dot: "bg-status-error",
    label: "Error",
  },
  info: {
    bg: "bg-status-info/15",
    text: "text-status-info",
    dot: "bg-status-info",
    label: "Info",
  },
  in_progress: {
    bg: "bg-status-info/15",
    text: "text-status-info",
    dot: "bg-status-info",
    label: "In Progress",
  },
  completed: {
    bg: "bg-status-success/15",
    text: "text-status-success",
    dot: "bg-status-success",
    label: "Completed",
  },
  overdue: {
    bg: "bg-status-error/15",
    text: "text-status-error",
    dot: "bg-status-error",
    label: "Overdue",
  },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, showDot = true, size = "md", className, ...props }, ref) => {
    const config = statusConfig[status] || statusConfig.info;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium",
          config.bg,
          config.text,
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn(
              "rounded-full",
              config.dot,
              size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
            )}
          />
        )}
        {label || config.label}
      </span>
    );
  }
);

StatusBadge.displayName = "StatusBadge";
