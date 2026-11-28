import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { RoomDetailDialog } from "@/components/dashboard/RoomDetailDialog";
import { AutomationIndicator } from "@/components/dashboard/AutomationIndicator";
import { TodayOverview } from "@/components/dashboard/TodayOverview";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import {
  AlertsPanel,
  ArrivalsDeparturesPanel,
  HousekeepingQueuePanel,
} from "@/components/dashboard/OperationalPanels";
import { SuperAdminHotelTable, type HotelTableStats } from "@/components/dashboard/SuperAdminHotelTable";
import { GlobalUsersTable } from "@/components/dashboard/GlobalUsersTable";
import { HotelCodeDisplay } from "@/components/dashboard/HotelCodeDisplay";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { ActivityLog, Automation, BookingWithJoins, DashboardSummary, Hotel, InvoiceWithJoins, Notification, Room, StaffWithJoins } from "@/lib/types";
import type { Conversation } from "@/hooks/useMessages";
import type { HousekeepingTask } from "@/hooks/useHousekeeping";
import {
  Bed,
  Users,
  DollarSign,
  CalendarCheck,
  CalendarDays,
  Building2,
  ListChecks,
  ClipboardList,
  LogIn,
  Search,
  Plus,
  UserPlus,
  Receipt,
  Bell,
  MessageSquare,
  ArrowLeft,
  Wallet,
  AlertTriangle,
  Banknote,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { useBookings } from "@/hooks/useBookings";
import { useConversations } from "@/hooks/useMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAutomations } from "@/hooks/useAutomations";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { formatAndConvert } from "@/utils/currency";
import { useHousekeepingTasks } from "@/hooks/useHousekeeping";
import { useInvoices } from "@/hooks/useInvoices";
import { useGlobalStaff, useStaff } from "@/hooks/useStaff";
import { useHotels, useHotel } from "@/hooks/useHotels";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { dayKey, latestDataDate, todayKey } from "@/components/dashboard/dashboardDates";
import HousekeepingPage from "./Housekeeping";

export default function Dashboard() {
  const { role, hotelId, selectedHotelId, setSelectedHotelId, user } = useAuth();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<Room["status"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Data fetching — every hook is scoped to the effective hotel. For a
  // super-admin with no hotel selected, hotelId is 'global' and these return
  // [] (the store filters by hotel_id); the global view below aggregates
  // per-hotel data itself instead of passing 'global' to these hooks.
  const { data: rooms = [] } = useRooms();
  const { data: bookings = [] } = useBookings();
  const { data: activities = [] } = useActivity(10);
  const { data: automations = [] } = useAutomations();
  const { data: invoices = [] } = useInvoices();
  const { data: tasks = [] } = useHousekeepingTasks();
  const { data: conversations = [] } = useConversations();
  const { data: notifications = [] } = useNotifications();
  const { data: globalStaff = [] } = useGlobalStaff();
  const { data: staffList = [] } = useStaff();
  // Date-aware KPIs, arrivals / departures, housekeeping queue and trend
  // arrays from GET /api/dashboard/summary (the single dashboard source).
  const { data: summary } = useDashboardSummary();

  const isSuperAdminGlobal = role === "super_admin" && !selectedHotelId;
  const isPropertyView =
    role === "owner" || role === "manager" || (role === "super_admin" && !!selectedHotelId);
  const canSeeRevenue = isPropertyView;
  // Manager sees only today's revenue. The full revenue picture (last
  // 7 days, this month, this year — and the 30-day revenue trend chart)
  // is for the owner and super-admin only.
  const canSeeFullRevenue = role === 'owner' || role === 'super_admin';
  const canCheckInOut = role === "owner" || role === "manager" || role === "super_admin";
  const canManageRoom = canCheckInOut;
  const canBook = canCheckInOut;

  // Super-admin global aggregation: sum real per-hotel data. The hotels
  // table (not staff distinct hotel_ids) is the source of the hotel count.
  const { data: hotelsList = [] } = useHotels();
  const { data: globalData } = useQuery({
    queryKey: ["global-dashboard"],
    queryFn: async () => {
      const hotels = hotelsList;
      const perHotel = await Promise.all(
        hotels.map(async (hotel) => {
          const [hotelRooms, hotelBookings, hotelInvoices] = await Promise.all([
            api.get<Array<{ id: string }>>("/api/rooms", { hotel_id: hotel.id }),
            api.get<Array<{ id: string }>>("/api/bookings", { hotel_id: hotel.id }),
            api.get<Array<{ paid_date: string | null; total: number }>>("/api/invoices", { hotel_id: hotel.id }),
          ]);
          const stats: HotelTableStats = {
            rooms: hotelRooms.length,
            bookings: hotelBookings.length,
            revenue: hotelInvoices
              .filter((inv) => inv.paid_date)
              .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0),
          };
          return { hotel, stats };
        }),
      );
      const stats: Record<string, HotelTableStats> = {};
      for (const entry of perHotel) stats[entry.hotel.id] = entry.stats;
      return {
        hotels: perHotel.map((entry) => entry.hotel),
        stats,
        totalRooms: perHotel.reduce((sum, entry) => sum + entry.stats.rooms, 0),
        totalBookings: perHotel.reduce((sum, entry) => sum + entry.stats.bookings, 0),
        totalRevenue: perHotel.reduce((sum, entry) => sum + entry.stats.revenue, 0),
      };
    },
    enabled: isSuperAdminGlobal && hotelsList.length > 0,
  });

  // Staff: their own staff record, so "My tasks" shows only tasks assigned
  // to them. (useHousekeepingTasks only isolates the housekeeping role.)
  const myStaffRecord = role === "staff" && user?.id
    ? staffList.find((s) => s.user_id === user.id) ?? null
    : null;

  // Name for the "viewing hotel" banner (the global query is disabled once
  // a hotel is selected, so it cannot supply this).
  const { data: selectedHotel } = useHotel(selectedHotelId);

  // Housekeeping role keeps its specialised task view.
  if (role === "housekeeping") {
    return <HousekeepingPage />;
  }

  return (
    <DashboardContent
      role={role}
      hotelId={hotelId}
      selectedHotelId={selectedHotelId}
      setSelectedHotelId={setSelectedHotelId}
      currency={currency}
      rooms={rooms}
      bookings={bookings}
      activities={activities}
      automations={automations}
      invoices={invoices}
      tasks={tasks}
      conversations={conversations}
      notifications={notifications}
      globalStaff={globalStaff}
      globalData={globalData}
      summary={summary}
      selectedHotelName={selectedHotel?.name ?? null}
      myStaffRecordId={myStaffRecord?.id ?? null}
      activeFilter={activeFilter}
      setActiveFilter={setActiveFilter}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectedRoom={selectedRoom}
      setSelectedRoom={setSelectedRoom}
      isSuperAdminGlobal={isSuperAdminGlobal}
      isPropertyView={isPropertyView}
      canSeeRevenue={canSeeRevenue}
      canSeeFullRevenue={canSeeFullRevenue}
      canCheckInOut={canCheckInOut}
      canManageRoom={canManageRoom}
      canBook={canBook}
    />
  );
}

interface GlobalDashboardData {
  hotels: Hotel[];
  stats: Record<string, HotelTableStats>;
  totalRooms: number;
  totalBookings: number;
  totalRevenue: number;
}

interface DashboardContentProps {
  role: string;
  hotelId: string;
  selectedHotelId: string | null;
  selectedHotelName: string | null;
  setSelectedHotelId: (id: string | null) => void;
  currency: "USD" | "PKR" | "EUR" | "GBP" | "SAR" | "AED" | "OMR";
  rooms: Room[];
  bookings: BookingWithJoins[];
  activities: ActivityLog[];
  automations: Automation[];
  invoices: InvoiceWithJoins[];
  tasks: HousekeepingTask[];
  conversations: Conversation[];
  notifications: Notification[];
  globalStaff: StaffWithJoins[];
  globalData: GlobalDashboardData | undefined;
  summary: DashboardSummary | null | undefined;
  myStaffRecordId: string | null;
  activeFilter: Room["status"] | null;
  setActiveFilter: (status: Room["status"] | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  isSuperAdminGlobal: boolean;
  isPropertyView: boolean;
  canSeeRevenue: boolean;
  canSeeFullRevenue: boolean;
  canCheckInOut: boolean;
  canManageRoom: boolean;
  canBook: boolean;
}

function DashboardContent(props: DashboardContentProps) {
  const {
    role,
    selectedHotelId,
    selectedHotelName,
    setSelectedHotelId,
    currency,
    rooms,
    bookings,
    activities,
    automations,
    invoices,
    tasks,
    conversations,
    notifications,
    globalStaff,
    globalData,
    summary,
    myStaffRecordId,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedRoom,
    setSelectedRoom,
    isSuperAdminGlobal,
    isPropertyView,
    canSeeRevenue,
    canSeeFullRevenue,
    canCheckInOut,
    canManageRoom,
    canBook,
  } = props;

  const now = new Date();
  const today = todayKey(now);

  // The seed data is from Feb 2024, so "today" (real calendar) has no
  // bookings or payments. The summary anchors the range to the latest date
  // present in the records and says so, instead of plotting an empty range.
  // Until the summary loads, anchor to the lists the same way as before.
  const anchorDate = useMemo(
    () =>
      summary
        ? parseISO(summary.anchor_date)
        : latestDataDate([
            ...bookings.flatMap((b) => [b.check_in, b.check_out, b.created_at]),
            ...invoices.flatMap((inv) => [inv.paid_date, inv.created_at]),
            ...activities.map((a) => a.created_at),
          ]),
    [summary, bookings, invoices, activities],
  );
  const dataIsStale = dayKey(anchorDate) < today;

  // --- Room KPIs -----------------------------------------------------------
  const totalRooms = rooms.length;
  const countByStatus = (status: Room["status"]) =>
    rooms.filter((r) => r.status === status).length;
  const occupiedRooms = countByStatus("occupied");
  const availableRooms = countByStatus("available");
  const dirtyRooms = countByStatus("dirty");
  const cleaningRooms = countByStatus("cleaning");
  const maintenanceRooms = countByStatus("maintenance");
  const occupancyRate =
    summary?.occupancy_rate ??
    (totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0);

  // --- Today's arrivals / departures (from the summary's anchor day) -------
  const arrivals =
    summary?.arrivals ??
    bookings.filter(
      (b) => b.status !== "cancelled" && dayKey(b.check_in) === today,
    );
  const departures =
    summary?.departures ??
    bookings.filter(
      (b) => b.status !== "cancelled" && dayKey(b.check_out) === today,
    );
  const newBookingsToday = bookings.filter(
    (b) => dayKey(b.created_at) === today,
  ).length;

  // --- Revenue from the summary (invoice `total` by `paid_date`) -----------
  const revenueToday = summary?.revenue_today ?? 0;
  const revenue7d = summary?.revenue_7d ?? 0;
  const revenueMonth = summary?.revenue_month ?? 0;
  const revenueYear = summary?.revenue_year ?? 0;

  // --- Outstanding balances: summary amount; the count comes from the
  // invoice list (the summary only carries the amount) ----------------------
  const outstanding = {
    count: invoices.filter(
      (inv) =>
        inv.status !== "paid" &&
        inv.status !== "cancelled" &&
        inv.status !== "refunded" &&
        (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0) > 0,
    ).length,
    amount: summary?.outstanding ?? invoices
      .filter(
        (inv) =>
          inv.status !== "paid" &&
          inv.status !== "cancelled" &&
          inv.status !== "refunded" &&
          (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0) > 0,
      )
      .reduce(
        (sum, inv) => sum + (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0),
        0,
      ),
  };

  // --- Housekeeping / messages / alerts (real counts) -----------------------
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const overdueTasks = tasks.filter((t) => t.is_overdue);
  const unreadMessages =
    summary?.unread_messages ??
    conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadNotifications =
    summary?.unread_alerts ?? notifications.filter((n) => !n.is_read).length;

  // --- Staff: only their own tasks ------------------------------------------
  const myTasks = myStaffRecordId
    ? tasks.filter((t) => t.assigned_to === myStaffRecordId)
    : [];
  const myPendingTasks = myTasks.filter((t) => t.status === "pending").length;
  const myOverdueTasks = myTasks.filter((t) => t.is_overdue).length;

  // --- Room grid filter + search --------------------------------------------
  const filteredRooms = rooms.filter((room) => {
    const matchesStatus = activeFilter ? room.status === activeFilter : true;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      room.number.toLowerCase().includes(query) ||
      room.type.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const currentBooking =
    selectedRoom
      ? (bookings.find(
          (b) => b.room_id === selectedRoom.id && b.status === "checked_in",
        ) ?? null)
      : null;
  const nextBooking = selectedRoom
    ? (bookings
        .filter(
          (b) =>
            b.room_id === selectedRoom.id &&
            (b.status === "confirmed" || b.status === "pending") &&
            dayKey(b.check_in) >= today,
        )
        .sort((a, b) => dayKey(a.check_in).localeCompare(dayKey(b.check_in)))[0] ?? null)
    : null;

  const clearFilters = () => {
    setActiveFilter(null);
    setSearchQuery("");
  };

  const staleBanner = dataIsStale ? (
    <div className="rounded-xl border border-status-warning/30 bg-status-warning/10 p-4 text-sm">
      <p className="font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Latest records are from {format(anchorDate, "MMM d, yyyy")}
      </p>
      <p className="text-muted-foreground mt-1">
        No bookings or payments fall on today ({format(now, "MMM d, yyyy")}),
        so today&apos;s lists are empty for that reason — not because the
        dashboard is broken. The trends below are anchored to the latest date
        in the records.
      </p>
    </div>
  ) : null;

  const statusFilterCard = (
    title: string,
    value: string | number,
    subtitle: string,
    icon: typeof Bed,
    status: Room["status"],
    iconColor?: string,
  ) => (
    <div
      className={`cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
        activeFilter === status ? "ring-2 ring-primary rounded-xl" : ""
      }`}
      onClick={() =>
        setActiveFilter(activeFilter === status ? null : status)
      }
    >
      <KPICard title={title} value={value} subtitle={subtitle} icon={icon} iconColor={iconColor} />
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in" key={role}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {role === "super_admin"
                ? "Super Admin Control Center"
                : role === "staff"
                  ? "My Dashboard"
                  : "Hotel Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {role === "super_admin" && !selectedHotelId
                ? "Global perspective of all connected properties"
                : role === "staff"
                  ? "Your tasks and today's arrivals at a glance."
                  : "Welcome back. Here's your hotel at a glance."}
            </p>
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap capitalize">
            {role.replace("_", " ")} access
          </span>
        </div>

        {/* Quick actions (roles that may open those pages) */}
        {isPropertyView && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link to="/bookings" className="gap-2">
                <Plus className="h-4 w-4" /> New Booking
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/guests" className="gap-2">
                <UserPlus className="h-4 w-4" /> New Guest
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/billing" className="gap-2">
                <Receipt className="h-4 w-4" /> New Invoice
              </Link>
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms by number or type…"
                aria-label="Search rooms"
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* ============ SUPER ADMIN: GLOBAL VIEW ============ */}
        {isSuperAdminGlobal && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Global Hotels"
                value={globalData?.hotels.length ?? 0}
                icon={Building2}
                subtitle="From the hotels table"
              />
              <KPICard
                title="Global Bookings"
                value={globalData?.totalBookings ?? 0}
                icon={CalendarCheck}
                subtitle="Across all hotels"
              />
              <KPICard
                title="Staff Accounts"
                value={globalStaff.length}
                icon={Users}
                subtitle="Across all hotels"
              />
              <KPICard
                title="Revenue Collected"
                value={formatAndConvert(globalData?.totalRevenue ?? 0, currency)}
                icon={DollarSign}
                subtitle="Paid invoices, all hotels, all time"
              />
            </div>
            <SuperAdminHotelTable
              hotels={globalData?.hotels ?? []}
              stats={globalData?.stats ?? {}}
              currency={currency}
              onSelectHotel={setSelectedHotelId}
            />
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">Global Network Users</h3>
              <GlobalUsersTable />
            </div>
          </div>
        )}

        {/* Super-admin viewing one property */}
        {role === "super_admin" && selectedHotelId && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <Building2 className="text-primary h-6 w-6" />
              <span className="font-bold">
                Viewing hotel: {selectedHotelName ?? selectedHotelId}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedHotelId(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Hotel List
            </Button>
          </div>
        )}

        {/* ============ STAFF VIEW: tasks + arrivals, no blank page ============ */}
        {role === "staff" && (
          <div className="space-y-6">
            {staleBanner}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="My Pending Tasks" value={myPendingTasks} icon={ListChecks} subtitle="Assigned to me" />
              <KPICard title="My Overdue Tasks" value={myOverdueTasks} icon={AlertTriangle} subtitle="Past their due time" />
              <KPICard title="Today's Arrivals" value={arrivals.length} icon={LogIn} subtitle="Guests arriving today" />
              <KPICard title="Available Rooms" value={availableRooms} icon={Bed} subtitle={`of ${totalRooms} rooms`} />
            </div>
            <ArrivalsDeparturesPanel
              arrivals={arrivals}
              departures={departures}
              canCheckInOut={false}
              showViewAll={false}
            />
            <HousekeepingQueuePanel
              tasks={myStaffRecordId ? myTasks : tasks}
              title={myStaffRecordId ? "My tasks" : "Housekeeping queue"}
              showViewAll
            />
            <RoomStatusGrid
              rooms={filteredRooms}
              onSelectRoom={setSelectedRoom}
              selectedRoomId={selectedRoom?.id}
            />
          </div>
        )}

        {/* ============ PROPERTY VIEW: owner / manager / super-admin-on-hotel ============ */}
        {isPropertyView && (
          <div className="space-y-6">
            {staleBanner}

            {/* Room KPIs — clicking a card filters the room grid below */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statusFilterCard(
                "Occupancy",
                `${occupancyRate}%`,
                `${occupiedRooms} of ${totalRooms} rooms occupied`,
                Bed,
                "occupied",
                "text-status-info",
              )}
              {statusFilterCard(
                "Available Rooms",
                availableRooms,
                "Ready for check-in",
                Building2,
                "available",
                "text-status-success",
              )}
              {statusFilterCard(
                "Dirty Rooms",
                dirtyRooms,
                "Awaiting housekeeping",
                ClipboardList,
                "dirty",
                "text-status-warning",
              )}
              <KPICard
                title="Rooms Needing Attention"
                value={dirtyRooms + cleaningRooms + maintenanceRooms}
                subtitle={`${dirtyRooms} dirty · ${cleaningRooms} cleaning · ${maintenanceRooms} maintenance`}
                icon={AlertTriangle}
                iconColor="text-status-error"
              />
            </div>

            {/* Revenue — owner, manager and super-admin on a hotel.
                Managers see only today's revenue; owners and super-admins
                see the full picture. */}
            {canSeeRevenue && (
              <section aria-label="Revenue">
                <h2 className="text-base font-semibold mb-3">Revenue</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard title="Revenue Today" value={formatAndConvert(revenueToday, currency)} icon={Banknote} iconColor="text-status-success" subtitle="Collected today" />
                  {canSeeFullRevenue && (
                    <>
                      <KPICard title="Revenue · Last 7 Days" value={formatAndConvert(revenue7d, currency)} icon={TrendingUp} iconColor="text-status-success" subtitle="Collected in the last 7 days" />
                      <KPICard title="Revenue · This Month" value={formatAndConvert(revenueMonth, currency)} icon={CalendarDays} iconColor="text-status-success" subtitle="Collected this calendar month" />
                      <KPICard title="Revenue · This Year" value={formatAndConvert(revenueYear, currency)} icon={PiggyBank} iconColor="text-status-success" subtitle="Collected this calendar year" />
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Operational counts — real task / message / alert numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard title="Pending Tasks" value={pendingTasks.length} subtitle="Housekeeping tasks awaiting start" icon={ListChecks} />
              <KPICard title="Overdue Tasks" value={overdueTasks.length} subtitle="Past their due time" icon={AlertTriangle} iconColor="text-status-error" />
              <KPICard title="Unread Messages" value={unreadMessages} subtitle="Inbound messages not yet read" icon={MessageSquare} iconColor="text-status-info" />
              <KPICard title="Unread Alerts" value={unreadNotifications} subtitle="Notifications awaiting review" icon={Bell} iconColor="text-status-warning" />
              <div className="col-span-2 lg:col-span-1 [&>div]:h-full">
                <KPICard title="Outstanding Balances" value={formatAndConvert(outstanding.amount, currency)} subtitle={`${outstanding.count} unpaid invoice${outstanding.count === 1 ? "" : "s"}`} icon={Wallet} iconColor="text-status-warning" />
              </div>
            </div>

            <TodayOverview
              checkIns={arrivals.length}
              checkOuts={departures.length}
              newBookings={newBookingsToday}
            />

            <DashboardCharts
              bookings={bookings}
              invoices={invoices}
              totalRooms={totalRooms}
              anchorDate={anchorDate}
              currency={currency}
              occupancyTrend={summary?.occupancy_trend}
              revenueTrend={summary?.revenue_trend}
              showRevenue={canSeeFullRevenue}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ArrivalsDeparturesPanel
                arrivals={arrivals}
                departures={departures}
                canCheckInOut={canCheckInOut}
                showViewAll
              />
              <HousekeepingQueuePanel tasks={tasks} title="Housekeeping queue" showViewAll />
            </div>

            {(activeFilter || searchQuery) && (
              <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                <p className="text-xs text-primary font-medium">
                  {activeFilter ? `Showing ${activeFilter} rooms` : ""}
                  {searchQuery ? ` | Search: "${searchQuery}"` : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs hover:bg-primary/10 text-primary">
                  Clear All Filters
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RoomStatusGrid
                  rooms={filteredRooms}
                  onSelectRoom={setSelectedRoom}
                  selectedRoomId={selectedRoom?.id}
                />
              </div>
              <div className="lg:col-span-1">
                <ActivityFeed activities={activities} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AutomationIndicator rules={automations} canManage={role === "super_admin"} />
              <AlertsPanel notifications={notifications} />
            </div>

            {(role === "owner" || role === "super_admin") && (
              <HotelCodeDisplay showManageButton />
            )}
          </div>
        )}
      </div>

      <RoomDetailDialog
        room={selectedRoom}
        currentBooking={currentBooking}
        nextBooking={nextBooking}
        canManageRoom={canManageRoom}
        canBook={canBook}
        onClose={() => setSelectedRoom(null)}
      />
    </AppLayout>
  );
}
