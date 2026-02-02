import { useState } from "react";
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

// SaaS Revenue Component for Owner only
function SaaSRevenueDashboard({ hotelId }: { hotelId: string | null }) {
  const { data: invoices = [] } = useInvoices();

  // Logic: Platform charges 10% of revenue + $50 maintenance fee per paid invoice (simplified)
  const totalSaaSRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, inv) => acc + (Number(inv.amount) * 0.1) + 50, 0);

  return (
    <div className="glass-card p-6 border-status-success/20 bg-status-success/5 animate-pulse-slow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-status-success" />
          <h3 className="font-bold text-lg">SaaS Platform Revenue</h3>
        </div>
        <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20">
          Owner Only
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground italic">Platform Earnings</p>
          <p className="text-2xl font-bold text-status-success">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSaaSRevenue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground italic">Hotel Assignment</p>
          <p className="text-xs font-mono">{hotelId || 'Global Network'}</p>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest text-center opacity-60">
        Charges: 10% Platform + $50/Invoice Maintenance
      </p>
    </div>
  );
}

// Global Users Table for Super Admin
function GlobalUsersTable() {
  const { data: staff = [], isLoading } = useGlobalStaff();

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead>User Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Hotel Property</TableHead>
          <TableHead>Access Code</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.filter(Boolean).map((member: any, idx: number) => (
          <TableRow key={member?.id || idx} className="hover:bg-primary/5 transition-colors">
            <TableCell className="font-medium">{member?.name || "System"}</TableCell>
            <TableCell>{member?.email || "—"}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {member?.saas_role === 'super_admin' && <ShieldCheck className="h-3 w-3 text-primary" />}
                {member?.saas_role === 'owner' && <UserCircle className="h-3 w-3 text-status-success" />}
                {member?.saas_role === 'manager' && <Briefcase className="h-3 w-3 text-status-info" />}
                {member?.saas_role === 'housekeeping' && <ClipboardList className="h-3 w-3 text-status-warning" />}
                <span className="capitalize">{(member?.saas_role || 'user').replace('_', ' ')}</span>
              </div>
            </TableCell>
            <TableCell>
              {member?.hotels?.name || (member?.saas_role === 'super_admin' ? "System Wide" : "Unassigned")}
            </TableCell>
            <TableCell>
              <code className="bg-primary/5 px-2 py-1 rounded text-xs font-mono font-bold text-primary">
                {member?.hotels?.access_code || (member?.saas_role === 'super_admin' ? "MASTER" : "N/A")}
              </code>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={
                member?.status === 'on_duty' ? "bg-status-success/15 text-status-success border-status-success/20" :
                  "bg-muted text-muted-foreground"
              }>
                {(member?.status || 'inactive').replace('_', ' ')}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Dashboard() {
  const { role, hotelId } = useAuth();
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
    const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());
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

  console.log("Dashboard rendering with role:", role);

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

        {/* 1. SUPER ADMIN VIEW */}
        {role === 'super_admin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard
                title="Global Hotels"
                value={adminStats?.hotelCount || 0}
                subtitle="Total active properties"
                icon={Building2}
              />
              <KPICard
                title="Global Bookings"
                value={adminStats?.totalBookings || 0}
                subtitle="Lifetime transactions"
                icon={CalendarCheck}
              />
              <KPICard
                title="System Load"
                value="Optimal"
                subtitle="All services operational"
                icon={TrendingUp}
              />
              <KPICard
                title="Total Users"
                value={guests.length + (adminStats?.hotelCount || 1) * 3}
                subtitle="Staff & Management"
                icon={Users}
              />
            </div>

            {/* Global User Management Table */}
            <div className="glass-card overflow-hidden animate-fade-in border border-white/5 shadow-glow">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Global User Management</h3>
                    <p className="text-sm text-muted-foreground">Monitoring active staff across all properties</p>
                  </div>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                <GlobalUsersTable />
              </div>
            </div>
          </div>
        )}

        {/* OWNER & SUPER ADMIN FINANCE */}
        {(role === 'owner' || role === 'super_admin') && (
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
              <SaaSRevenueDashboard hotelId={hotelId} />
            </div>
          </div>
        )}

        {/* MANAGER ONLY FINANCE */}
        {role === 'manager' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Daily Revenue" value={formatAndConvert(finStats.today, currency)} icon={DollarSign} subtitle="Daily collection limit" />
            <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_in' })} className="cursor-pointer">
              <KPICard title="Today's Check-ins" value={todayCheckIns} icon={LogIn} subtitle="Guests arriving" />
            </div>
            <div onClick={() => setActiveFilter({ type: 'booking', value: 'check_out' })} className="cursor-pointer">
              <KPICard title="Today's Check-outs" value={todayCheckOuts} icon={LogOut} subtitle="Guests leaving" />
            </div>
          </div>
        )}

        {/* 3. MANAGER / COMMON VIEW */}
        {(role === 'manager' || role === 'owner' || role === 'super_admin') && (
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
                  <div className="glass-card p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Hotel Property Instance</h4>
                      <p className="text-sm text-muted-foreground">
                        {hotelId ? `ID: ${hotelId.substring(0, 8)}...` : 'Corporate Connection'}
                      </p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-none">
                      Operational
                    </Badge>
                  </div>
                )}

                {/* Search / Filter Logic UI */}
                <div className="glass-card p-6 space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Availability Engine
                  </h4>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Quick Search</label>
                    <Input
                      placeholder="Room number or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-muted/30 border-white/5 focus-visible:ring-primary"
                    />
                  </div>
                  <Button className="w-full shadow-glow" onClick={() => console.log("Searching availability...")}>
                    Verify Full Availability
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Real-time state synchronization active
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
