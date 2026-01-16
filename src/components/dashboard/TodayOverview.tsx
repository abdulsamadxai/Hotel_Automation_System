import { ArrowRight, LogIn, LogOut, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodayOverviewProps {
  checkIns: number;
  checkOuts: number;
  newBookings: number;
}

export function TodayOverview({ checkIns, checkOuts, newBookings }: TodayOverviewProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Today's Overview</h3>
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          View All <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-xl bg-status-info/10 border border-status-info/20">
          <div className="h-10 w-10 mx-auto rounded-lg bg-status-info/20 flex items-center justify-center text-status-info mb-2">
            <LogIn className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-status-info">{checkIns}</p>
          <p className="text-xs text-muted-foreground">Check-ins</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-status-pending/10 border border-status-pending/20">
          <div className="h-10 w-10 mx-auto rounded-lg bg-status-pending/20 flex items-center justify-center text-status-pending mb-2">
            <LogOut className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-status-pending">{checkOuts}</p>
          <p className="text-xs text-muted-foreground">Check-outs</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="h-10 w-10 mx-auto rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-2">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-primary">{newBookings}</p>
          <p className="text-xs text-muted-foreground">New Bookings</p>
        </div>
      </div>
    </div>
  );
}
