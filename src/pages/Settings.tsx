import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Bell, Shield, Database, Zap, Sun, Moon, DollarSign, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { useTheme, useCurrency } from "@/contexts/AppSettingsContext";
import { CURRENCIES, type Currency } from "@/utils/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-3">
      <button
        onClick={() => setTheme('dark')}
        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${theme === 'dark'
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
          }`}
      >
        <Moon className="h-5 w-5" />
        <span className="font-medium">Dark</span>
      </button>
      <button
        onClick={() => setTheme('light')}
        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${theme === 'light'
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
          }`}
      >
        <Sun className="h-5 w-5" />
        <span className="font-medium">Light</span>
      </button>
    </div>
  );
}

function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="space-y-3">
      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(CURRENCIES).map((curr) => (
            <SelectItem key={curr.code} value={curr.code}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">{curr.symbol}</span>
                <span>{curr.name}</span>
                <span className="text-muted-foreground">({curr.code})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <DollarSign className="h-4 w-4 inline mr-1" />
        Conversion rate: 1 USD = {CURRENCIES[currency].rate} {currency}
      </div>
    </div>
  );
}

function HotelCodeDisplay() {
  const { hotelId } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['hotel-details', hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', hotelId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!hotelId,
  });

  const copyToClipboard = () => {
    if (hotel?.access_code) {
      navigator.clipboard.writeText(hotel.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading access code...</div>;
  if (!hotel) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Hotel Access Code
          </h4>
          <p className="text-sm text-muted-foreground">Unique identifier for staff login and secure tenant isolation</p>
        </div>
        <div className="bg-background/50 border border-primary/10 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm">
          <span className="font-mono text-2xl font-bold tracking-[0.2em] text-primary">
            {hotel.access_code}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
            onClick={copyToClipboard}
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-status-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/5">
        <Zap className="h-3 w-3 mt-0.5 text-primary" />
        <p>Give this code to your Managers and Housekeeping staff. They will need it along with their email and password to access your hotel property specifically.</p>
      </div>
    </div>
  );
}

export default function Settings() {
  const { hotelId, role } = useAuth();
  const { data: hotel } = useQuery({
    queryKey: ['hotel-info', hotelId],
    queryFn: async () => {
      if (!hotelId) return null;
      const { data, error } = await supabase.from('hotels').select('*').eq('id', hotelId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!hotelId
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Configure your hotel operating system
            </p>
          </div>
          {hotelId && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 px-3 py-1">
              Hotel ID: {hotelId.substring(0, 8)}...
            </Badge>
          )}
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="hotel" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 overflow-x-auto h-auto">
            <TabsTrigger value="hotel" className="gap-2">
              <Building2 className="h-4 w-4" />
              Hotel
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2">
              <Zap className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Hotel Settings */}
          <TabsContent value="hotel" className="space-y-6">
            {(role === 'owner' || role === 'super_admin') && <HotelCodeDisplay />}

            <div className="glass-card p-6 space-y-6 border border-white/5">
              {/* Theme Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Choose your preferred color scheme
                    </p>
                    <ThemeSelector />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h3 className="text-lg font-semibold mb-4">Currency</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Display Currency</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      All prices will be displayed in this currency
                    </p>
                    <CurrencySelector />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6">
                <h3 className="text-lg font-semibold mb-4">Hotel Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input defaultValue={hotel?.name || "Grand Hotel"} className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input defaultValue={hotel?.location || "Update Location"} className="bg-muted/50" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="shadow-lg hover:shadow-primary/20 transition-all">Save Changes</Button>
              </div>
            </div>
          </TabsContent>

          {/* Users Settings */}
          <TabsContent value="users">
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Management</h3>
                <Button>Add User</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage staff accounts and role-based permissions. Users can have roles: Owner, Manager, Housekeeping.
              </p>
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                User management is currently handled in the Staff section.
              </div>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { label: "New booking alerts", description: "Get notified when new bookings are created", enabled: true },
                  { label: "Check-in reminders", description: "Alerts for upcoming guest check-ins", enabled: true },
                  { label: "Housekeeping updates", description: "Task completion notifications", enabled: false },
                  { label: "Overdue task alerts", description: "Escalation when tasks are overdue", enabled: true },
                  { label: "Financial alerts", description: "Payment and invoice notifications", enabled: true },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Automation Settings */}
          <TabsContent value="automation">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold">Automation Engine</h3>
              <div className="space-y-4">
                {[
                  { label: "Enable automation engine", description: "Run all active automation rules", enabled: true },
                  { label: "Auto housekeeping tasks", description: "Create cleaning tasks on checkout", enabled: true },
                  { label: "Auto invoice generation", description: "Generate invoices on checkout", enabled: true },
                  { label: "Task escalation", description: "Escalate overdue tasks to managers", enabled: true },
                  { label: "VIP notifications", description: "Alert staff for VIP guest activities", enabled: true },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              <div className="space-y-4">
                {[
                  { label: "Two-factor authentication", description: "Require 2FA for all admin accounts", enabled: false },
                  { label: "Session timeout", description: "Auto logout after 30 minutes of inactivity", enabled: true },
                  { label: "Audit logging", description: "Log all user actions for review", enabled: true },
                  { label: "IP restriction", description: "Limit access to specific IP addresses", enabled: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={item.enabled} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
