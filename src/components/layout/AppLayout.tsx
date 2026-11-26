import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Bell, Search, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useAuth, UserRole } from "@/hooks/useAuth";
import { GlobalLoader } from "./GlobalLoader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: ReactNode;
}

/** Roles allowed on /settings by the route guard in App.tsx. */
const SETTINGS_ROLES: UserRole[] = ['owner', 'manager', 'super_admin'];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const { user, role, signOut, isLoading } = useAuth();

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      try {
        return user.user_metadata.full_name
          .split(" ")
          .filter(Boolean)
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "U";
      } catch (e) {
        return "U";
      }
    }
    if (user?.user_metadata?.role) {
      return user.user_metadata.role.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      {isLoading && <GlobalLoader />}
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8" />
              {role !== 'housekeeping' && (
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bookings, guests, rooms..."
                    className="w-80 pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/alerts")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-status-error" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0 bg-primary/20 hover:bg-primary/30">
                    <span className="text-primary text-sm font-medium">{getInitials()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.user_metadata?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {role && (
                        <p className="text-xs text-muted-foreground capitalize">Role: {role}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {SETTINGS_ROLES.includes(role) && (
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
