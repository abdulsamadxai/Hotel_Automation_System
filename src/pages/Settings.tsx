import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Bell, Shield, Database, Zap } from "lucide-react";

export default function Settings() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your hotel operating system
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="hotel" className="space-y-6">
          <TabsList className="bg-muted/50">
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
          <TabsContent value="hotel">
            <div className="glass-card p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Hotel Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input defaultValue="Grand Hotel" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue="info@grandhotel.com" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input defaultValue="+1 555-0100" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input defaultValue="123 Main Street, City" className="bg-muted/50" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold mb-4">Room Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Rooms</Label>
                    <Input type="number" defaultValue="50" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Floors</Label>
                    <Input type="number" defaultValue="5" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-in Time</Label>
                    <Input type="time" defaultValue="14:00" className="bg-muted/50" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
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
                Manage staff accounts and role-based permissions. Users can have roles: Owner, Manager, Reception, Housekeeping, Accountant.
              </p>
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                User management will be available after authentication is configured
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
                  <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
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
                  <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
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
                  <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
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
