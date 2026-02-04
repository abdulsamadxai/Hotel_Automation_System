import { useState } from "react";
import { Link } from "react-router-dom";
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
  TrendingUp,
  Building2,
  ListChecks,
  UserCircle,
  ShieldCheck,
  Briefcase,
  ClipboardList,
  Loader2,
  LogIn,
  LogOut,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { useBookings } from "@/hooks/useBookings";
import { useGuests } from "@/hooks/useGuests";
import {
  useRealtimeRooms,
  useRealtimeBookings,
  useRealtimeHousekeeping,
  useRealtimeActivity
} from "@/hooks/useActivity";
import { useAutomations } from "@/hooks/useAutomations";
import { useActivity } from "@/hooks/useActivity";
import { format, isAfter, startOfMonth, startOfYear, subDays } from "date-fns";
import { useAuth, SUPER_ADMIN_EMAIL } from "@/hooks/useAuth";
import { formatAndConvert } from "@/utils/currency";
import HousekeepingPage from "./Housekeeping";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGlobalStaff } from "@/hooks/useStaff";
import { useInvoices } from "@/hooks/useInvoices";
import { useCurrency } from "@/contexts/AppSettingsContext";

import { SaaSRevenueCard } from "@/components/dashboard/SaaSRevenueCard";
import { SuperAdminHotelTable } from "@/components/dashboard/SuperAdminHotelTable";
import { GlobalUsersTable } from "@/components/dashboard/GlobalUsersTable";
import { HotelCodeDisplay } from "@/components/dashboard/HotelCodeDisplay";


export default function Dashboard() {
  const { role, hotelId, selectedHotelId, setSelectedHotelId } = useAuth();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<{ type: 'status' | 'booking', value: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Realtime subscriptions
  useRealtimeRooms();
  useRealtimeBookings();
  useRealtimeHousekeeping();
  useRealtimeActivity();

  // Data fetching
  const { data: rooms = [] } = useRooms();
  const { data: bookings = [] } = useBookings();
  const { data: guests = [] } = useGuests();
  const { data: activities = [] } = useActivity(10);
  const { data: automations = [] } = useAutomations();
  const { data: invoices = [] } = useInvoices();
  const { data: staff = [] } = useGlobalStaff();

  // If Housekeeping, show the specialized task view
  if (role === 'housekeeping') {
    return <HousekeepingPage />;
  }

  // Filtered Logic
  const filteredRooms = rooms.filter(room => {
    const matchesStatus = activeFilter?.type === 'status' ? room.status === activeFilter.value : true;
    const matchesSearch = (room.number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.type || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter?.type !== 'booking') return false;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (activeFilter.value === 'check_in') return booking.check_in === todayStr;
    if (activeFilter.value === 'check_out') return booking.check_out === todayStr;
    return true;
  });

  // Calculate KPIs
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const availableRooms = rooms.filter((r) => r.status === "available").length;
  const dirtyRooms = rooms.filter((r) => r.status === "dirty").length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const today = format(new Date(), "yyyy-MM-dd");
  const todayCheckIns = bookings.filter(b => b.check_in === today).length;
  const todayCheckOuts = bookings.filter(b => b.check_out === today).length;

  // Financial Stats calculation
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const last7Days = subDays(now, 7);
  const startOfMo = startOfMonth(now);
  const startOfYr = startOfYear(now);

  const finStats = paidInvoices.reduce((acc, inv) => {
    if (!inv || !inv.paid_at) return acc;
    try {
      const paidDate = new Date(inv.paid_at);
      if (isNaN(paidDate.getTime())) return acc;

      const amount = Number(inv.amount) || 0;
      const dateStr = format(paidDate, 'yyyy-MM-dd');

      if (dateStr === todayStr) acc.today += amount;
      if (isAfter(paidDate, last7Days)) acc.weekly += amount;
      if (isAfter(paidDate, startOfMo)) acc.monthly += amount;
      if (isAfter(paidDate, startOfYr)) acc.yearly += amount;
    } catch (e) {
      console.error("Finance detail calculation error:", e);
    }
    return acc;
  }, { today: 0, weekly: 0, monthly: 0, yearly: 0 });

  // Safe Activity Mapping
  const safeActivities = activities.map(a => {
    if (!a) return null;
    let timestamp = "Just now";
    try {
      if (a.created_at) {
        timestamp = format(new Date(a.created_at), "h:mm a");
      }
    } catch (e) {
      console.warn("Invalid activity date:", a.created_at);
    }

    return {
      id: a.id || Math.random().toString(),
      type: (a.event_type || 'alert') as any,
      title: a.title || "Untitled Activity",
      description: a.description || "",
      timestamp: timestamp
    };
  }).filter(Boolean) as any[];

  // Admin Stats
  const uniqueHotels = new Set(staff.map((s: any) => s?.hotel_id).filter(Boolean));
  const adminStats = {
    hotelCount: uniqueHotels.size,
    totalBookings: bookings.length
  };

  const clearFilters = () => {
    setActiveFilter(null);
    setSearchQuery("");
  };



  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in" key={role}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {role === 'super_admin' ? 'Super Admin Control Center' : 'Hotel Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {role === 'super_admin'
                ? 'Global perspective of all connected properties'
                : "Welcome back. Here's your hotel at a glance."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {role?.replace('_', ' ')} Access Level
            </span>
          </div>
        </div>

        {/* 1. SUPER ADMIN GLOBAL VIEW (Hotel Selection) */}
        {role === 'super_admin' && !selectedHotelId && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard title="Global Hotels" value={adminStats?.hotelCount || 0} icon={Building2} subtitle="Properties" />
              <KPICard title="Global Bookings" value={adminStats?.totalBookings || 0} icon={CalendarCheck} subtitle="Transactions" />
              <KPICard title="Platform Health" value="100%" icon={ShieldCheck} subtitle="Status: Good" />
              <KPICard title="Total Revenue" value={formatAndConvert(finStats.yearly, currency)} icon={DollarSign} subtitle="Platform Wide" />
            </div>
            <SuperAdminHotelTable onSelectHotel={setSelectedHotelId} />
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">Global Network Users</h3>
              <GlobalUsersTable />
            </div>
          </div>
        )}

        {/* 1b. SUPER ADMIN PROPERTY DASHBOARD (Header toggle) */}
        {role === 'super_admin' && selectedHotelId && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="text-primary h-6 w-6" />
              <span className="font-bold">Viewing Hotel Context: {selectedHotelId}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedHotelId(null)} className="gap-2">
              <LogOut className="h-4 w-4" /> Back to Hotel List
            </Button>
          </div>
        )}

        {/* PROPERTY-SPECIFIC VIEW (SA selected or Owner/Manager) */}
        {(role === 'owner' || (role === 'super_admin' && selectedHotelId)) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KPICard title="Daily Revenue" value={formatAndConvert(finStats.today, currency)} icon={DollarSign} subtitle="Collected today" />
                <KPICard title="Weekly Revenue" value={formatAndConvert(finStats.weekly, currency)} icon={TrendingUp} subtitle="Last 7 days" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KPICard title="Monthly Total" value={formatAndConvert(finStats.monthly, currency)} icon={DollarSign} subtitle="This calendar month" />
                <KPICard title="Yearly Total" value={formatAndConvert(finStats.yearly, currency)} icon={TrendingUp} subtitle="Current fiscal year" />
              </div>
            </div>
            <div className="lg:col-span-1">
              <SaaSRevenueCard hotelId={selectedHotelId || hotelId} />
              <div className="mt-4">
                <HotelCodeDisplay showManageButton={true} />
              </div>
            </div>
          </div>
        )}

        {/* MANAGER ONLY FINANCE (Limit to Daily) */}
        {role === 'manager' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Daily Revenue" value={formatAndConvert(finStats.today, currency)} icon={DollarSign} subtitle="Today's Performance" />
            <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_in' })} className="cursor-pointer">
              <KPICard title="Today's Check-ins" value={todayCheckIns} icon={LogIn} subtitle="Guests arriving" />
            </div>
            <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_out' })} className="cursor-pointer">
              <KPICard title="Today's Check-outs" value={todayCheckOuts} icon={LogOut} subtitle="Guests leaving" />
            </div>
          </div>
        )}

        {/* 3. MANAGER / COMMON VIEW (Only if hotel selected or role is not SA) */}
        {((role === 'manager' || role === 'owner') || (role === 'super_admin' && selectedHotelId)) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className={`cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${activeFilter?.value === 'occupied' ? 'ring-2 ring-primary rounded-xl' : ''}`}
                onClick={() => setActiveFilter({ type: 'status', value: 'occupied' })}
              >
                <KPICard
                  title="Occupancy"
                  value={`${occupancyRate}%`}
                  subtitle={`${occupiedRooms} of ${totalRooms} rooms`}
                  icon={Bed}
                />
              </div>

              <div
                className={`cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${activeFilter?.value === 'available' ? 'ring-2 ring-primary rounded-xl' : ''}`}
                onClick={() => setActiveFilter({ type: 'status', value: 'available' })}
              >
                <KPICard
                  title="Available Rooms"
                  value={availableRooms}
                  subtitle="Ready for check-in"
                  icon={Building2}
                />
              </div>

              <div
                className={`cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${activeFilter?.value === 'dirty' ? 'ring-2 ring-primary rounded-xl' : ''}`}
                onClick={() => setActiveFilter({ type: 'status', value: 'dirty' })}
              >
                <KPICard
                  title="Dirty Rooms"
                  value={dirtyRooms}
                  subtitle="Awaiting housekeeping"
                  icon={ClipboardList}
                />
              </div>

              <KPICard
                title="Pending Tasks"
                value={bookings.filter(b => b.status === 'confirmed').length}
                subtitle="Arrivals pending"
                icon={ListChecks}
              />
            </div>

            {/* Automation Logic Filter Clear */}
            {(activeFilter || searchQuery) && (
              <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Filtered
                  </ Badge>
                  <p className="text-xs text-primary font-medium">
                    {activeFilter ? `Showing ${activeFilter.value.replace('_', ' ').toUpperCase()}` : ''}
                    {searchQuery ? ` | Search: "${searchQuery}"` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs hover:bg-primary/10 text-primary">
                  Clear All Filters
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_in' })} className="cursor-pointer">
                <KPICard title="Today's Check-ins" value={todayCheckIns} icon={LogIn} subtitle="Guests arriving today" />
              </div>
              <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_out' })} className="cursor-pointer">
                <KPICard title="Today's Check-outs" value={todayCheckOuts} icon={LogOut} subtitle="Guests leaving today" />
              </div>
            </div>

            <TodayOverview
              checkIns={todayCheckIns}
              checkOuts={todayCheckOuts}
              newBookings={bookings.filter(b => {
                try {
                  return b.created_at && format(new Date(b.created_at), "yyyy-MM-dd") === today;
                } catch (e) {
                  return false;
                }
              }).length}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ActivityFeed activities={safeActivities} />
              </div>
              <div className="lg:col-span-2">
                {activeFilter?.type === 'booking' ? (
                  <div className="glass-card p-6">
                    <h3 className="font-bold mb-4 capitalize">{activeFilter.value.replace('_', ' ')} list</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guest</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map(b => (
                          <TableRow key={b.id}>
                            <TableCell>{b.guest?.name || 'Guest'}</TableCell>
                            <TableCell>Room {b.room?.number || '?'}</TableCell>
                            <TableCell><Badge>{b.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                        {filteredBookings.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No bookings found for today.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <RoomStatusGrid rooms={filteredRooms as any} />
                )}
              </div>
              <div className="lg:col-span-1 space-y-6">
                {role === 'super_admin' ? (
                  <AutomationIndicator rules={automations.filter(Boolean).map(a => ({
                    id: a?.id || Math.random().toString(),
                    name: a?.name || "Unnamed Rule",
                    trigger: a?.trigger_event || "Unknown Trigger",
                    action: a?.action_type || "Unknown Action",
                    isActive: a?.is_active ?? false
                  }))} />
                ) : (
                  <HotelCodeDisplay showManageButton={true} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
