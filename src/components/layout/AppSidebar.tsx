import { useState, type ReactNode } from "react";
import { useLocation, useNavigate, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  Bed,
  Users,
  ClipboardList,
  DollarSign,
  Zap,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useHotel } from "@/hooks/useHotels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarProvider
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const roleColors: Record<string, string> = {
  super_admin: "bg-primary/20 text-primary font-bold border-primary/50",
  owner: "bg-primary/15 text-primary",
  manager: "bg-status-info/15 text-status-info",
  housekeeping: "bg-status-warning/15 text-status-warning",
};

interface SidebarMenuItemData {
  title: string;
  url: string;
  iconComp: ReactNode;
}

interface MenuGroupProps {
  label: string;
  items: SidebarMenuItemData[];
  defaultOpen?: boolean;
}

function MenuGroup({ label, items, defaultOpen = true }: MenuGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;
  const hasActiveItem = items.some((item) => isActive(item.url));

  return (
    <Collapsible open={isOpen || hasActiveItem} onOpenChange={setIsOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 transition-colors">
            <span className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
              {label}
            </span>
            {!isCollapsed && (
              <ChevronDown
                className={`h-3 w-3 text-sidebar-foreground/40 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"
                  }`}
              />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                    >
                      {item.iconComp}
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// Export the sidebar component so AppLayout can use it
export function AppSidebar() {
  const { state } = useSidebar();
  const { user, role, signOut, hotelId } = useAuth();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  // 'global' (super-admin, no hotel picked) falls back to the first hotel.
  const { data: hotel } = useHotel(hotelId || null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  const mainMenuItems = [
    ...(role !== 'housekeeping' ? [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Bookings", url: "/bookings", icon: CalendarCheck },
      { title: "Rooms", url: "/rooms", icon: Bed },
      { title: "Guests", url: "/guests", icon: Users },
    ] : []),
  ].filter(Boolean);

  const operationsItems = [
    { title: "Housekeeping", url: "/housekeeping", icon: ClipboardList },
    ...(role !== 'housekeeping' ? [{ title: "Staff & Tasks", url: "/staff", icon: Users }] : []),
  ];

  const financeItems = [
    ...(role !== 'housekeeping' ? [{ title: "Billing", url: "/billing", icon: DollarSign }] : []),
    ...(role === 'owner' || role === 'super_admin' ? [{ title: "Expenses", url: "/expenses", icon: FileText }] : []),
  ].filter(Boolean);

  const systemItems = [
    ...(role === 'super_admin' ? [{ title: "Automations", url: "/automations", icon: Zap }] : []),
    ...(role !== 'housekeeping' ? [{ title: "Messages", url: "/messages", icon: MessageSquare }] : []),
    ...(role !== 'housekeeping' ? [{ title: "Alerts", url: "/alerts", icon: Bell }] : []),
    ...((role === 'owner' || role === 'manager' || role === 'super_admin') ? [{ title: "Event Logs", url: "/logs", icon: FileText }] : []),
    ...((role === 'owner' || role === 'manager' || role === 'super_admin') ? [{ title: "Settings", url: "/settings", icon: Settings }] : []),

  ].filter(Boolean);

  // STRICT FILTER: If housekeeping, force only operations items
  if (role === 'housekeeping') {
    return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          {/* Same header as below but simplified or identical */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-warning/20 text-status-warning font-bold text-lg shadow-glow overflow-hidden shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Housekeeping</span>
                <span className="text-[10px] text-muted-foreground uppercase">Task View</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <MenuGroup
            label="Tasks"
            items={[{ title: "My Tasks", url: "/housekeeping", iconComp: <ClipboardList className="h-4 w-4" /> }]}
          />
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Sign Out"}
          </Button>
        </SidebarFooter>
      </Sidebar>
    );
  }

  const renderIcon = (Icon: LucideIcon | undefined) => {
    if (!Icon) return <LayoutDashboard className="h-4 w-4 shrink-0" />;
    return <Icon className="h-4 w-4 shrink-0" />;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-glow overflow-hidden shrink-0">
            {hotel?.logo_url ? (
              <img src={hotel.logo_url} alt={hotel.name} className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-foreground truncate">
                {hotel?.name || "Autopilot ONE"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                Hotel Operating System
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <MenuGroup
          label="Main"
          items={mainMenuItems.map(i => ({ ...i, iconComp: renderIcon(i.icon) }))}
          defaultOpen
        />

        <MenuGroup
          label="Operations"
          items={operationsItems.map(i => ({ ...i, iconComp: renderIcon(i.icon) }))}
        />

        <MenuGroup
          label="Finance"
          items={financeItems.map(i => ({ ...i, iconComp: renderIcon(i.icon) }))}
        />
        <MenuGroup
          label="System"
          items={systemItems.map(i => ({ ...i, iconComp: renderIcon(i.icon) }))}
        />
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!isCollapsed && (
          <>
            <div className="glass-card p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Automation Active
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                12 rules running • 48 events today
              </p>
            </div>

            {user && (
              <div className="glass-card p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                    {getUserInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    {role && (
                      <Badge variant="outline" className={`text-[10px] mt-1 ${roleColors[role] || ''}`}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            )}
          </>
        )}

        {isCollapsed && user && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

