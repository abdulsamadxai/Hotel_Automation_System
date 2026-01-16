import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { AutomationIndicator } from "@/components/dashboard/AutomationIndicator";
import { TodayOverview } from "@/components/dashboard/TodayOverview";
import {
  Bed,
  Users,
  DollarSign,
  CalendarCheck,
} from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { useBookings } from "@/hooks/useBookings";
import { useHousekeepingTasks } from "@/hooks/useHousekeeping";
import { useGuests } from "@/hooks/useGuests";
import { useRealtimeRooms, useRealtimeBookings, useRealtimeHousekeeping, useRealtimeActivity } from "@/hooks/useActivity";
import { useAutomations } from "@/hooks/useAutomations";
import { useActivity } from "@/hooks/useActivity";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Helper hook for revenue
function useRevenue() {
  return useQuery({
    queryKey: ['revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid');

      if (error) return 0;
      // Filter for today's revenue (paid_at)
      const today = format(new Date(), 'yyyy-MM-dd');
      return data
        .filter(inv => inv.paid_at && format(new Date(inv.paid_at), 'yyyy-MM-dd') === today)
        .reduce((sum, inv) => sum + inv.amount, 0);
    }
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function useHousekeeping() {
  return useHousekeepingTasks();
}

export default function Dashboard() {
  // Enable realtime subscriptions
  useRealtimeRooms();
  useRealtimeBookings();
  useRealtimeHousekeeping();
  useRealtimeActivity();

  // Fetch data
  const { data: rooms = [] } = useRooms();
  const { data: bookings = [] } = useBookings();
  const { data: guests = [] } = useGuests();
  const { data: tasks = [] } = useHousekeeping();
  const { data: automations = [] } = useAutomations();
  const { data: activities = [] } = useActivity(10);
  const { data: todaysRevenue = 0 } = useRevenue();

  // Calculate KPIs
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const today = format(new Date(), "yyyy-MM-dd");
  const todayCheckIns = bookings.filter(
    (b) => b.check_in === today && (b.status === "confirmed" || b.status === "checked_in")
  ).length;
  const todayCheckOuts = bookings.filter(
    (b) => b.check_out === today && (b.status === "checked_in" || b.status === "checked_out")
  ).length;
  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked_in"
  ).length;

  // Map rooms for the grid component
  const roomsForGrid = rooms.map((room) => ({
    id: room.id,
    number: room.number,
    type: room.type,
    status: room.status,
    floor: room.floor,
  }));

  // Map activities for feed
  const activitiesForFeed = activities.map((a) => ({
    id: a.id,
    type: a.event_type,
    title: a.title,
    description: a.description || "",
    timestamp: formatTimeAgo(a.created_at),
  }));

  // Map automations for indicator
  const automationsForIndicator = automations.map((a) => ({
    id: a.id,
    name: a.name,
    trigger: a.trigger_event,
    action: a.action_type.replace("_", " "),
    isActive: a.is_active,
    lastTriggered: a.last_triggered_at ? formatTimeAgo(a.last_triggered_at) : undefined,
  }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back. Here's your hotel at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Live updates enabled
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Occupancy Rate"
            value={`${occupancyRate}%`}
            subtitle={`${occupiedRooms} of ${totalRooms} rooms occupied`}
            icon={Bed}
          />
          <KPICard
            title="Today's Revenue"
            value={`$${todaysRevenue.toLocaleString()}`}
            subtitle="Collected today"
            icon={DollarSign}
          />
          <KPICard
            title="Active Bookings"
            value={activeBookings}
            subtitle={`${todayCheckIns} check-ins today`}
            icon={CalendarCheck}
          />
          <KPICard
            title="Total Guests"
            value={guests.length}
            subtitle="In your database"
            icon={Users}
          />
        </div>

        {/* Today's Overview */}
        <TodayOverview
          checkIns={todayCheckIns}
          checkOuts={todayCheckOuts}
          newBookings={bookings.filter(b =>
            format(new Date(b.created_at), "yyyy-MM-dd") === today
          ).length}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed activities={activitiesForFeed} />
          </div>

          {/* Center Column - Room Status */}
          <div className="lg:col-span-1">
            <RoomStatusGrid rooms={roomsForGrid} />
          </div>

          {/* Right Column - Automation */}
          <div className="lg:col-span-1">
            <AutomationIndicator rules={automationsForIndicator} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
