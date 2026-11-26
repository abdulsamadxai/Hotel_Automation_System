import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Shield, Database, Zap, Loader2, Camera, Copy, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHotel, useUpdateHotel } from "@/hooks/useHotels";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

import { ThemeSelector } from "@/components/dashboard/ThemeSelector";
import { CurrencySelector } from "@/components/dashboard/CurrencySelector";
import { HotelCodeDisplay } from "@/components/dashboard/HotelCodeDisplay";

export default function Settings() {
  const { hotelId, role } = useAuth();
  const { data: hotel } = useHotel(hotelId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for form
  const [hotelName, setHotelName] = useState("");
  const [hotelLocation, setHotelLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Sync state when data loads
  useEffect(() => {
    if (hotel) {
      setHotelName(hotel.name || "");
      setHotelLocation(hotel.location || "");
      setLogoUrl(hotel.logo_url || "");
    }
  }, [hotel]);

  // Persists through the store (mockStore.hotels.update writes to the
  // persisted store state), so a reload keeps the change.
  const updateHotel = useUpdateHotel(hotelId);

  const handleSave = () => {
    if (!hotel) return;
    updateHotel.mutate({
      id: hotel.id,
      updates: {
        name: hotelName || hotel.name || "",
        location: hotelLocation || hotel.location || "",
        logo_url: logoUrl || hotel.logo_url || "",
      },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
                <h3 className="text-lg font-semibold mb-6">Hotel Branding</h3>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/60">
                      {logoUrl || hotel?.logo_url ? (
                        <img src={logoUrl || hotel?.logo_url} alt="Hotel Logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px] font-medium">No Logo</span>
                        </div>
                      )}
                    </div>
                    {(role === 'owner' || role === 'super_admin') && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Hotel Name</Label>
                        <Input
                          value={hotelName}
                          onChange={(e) => setHotelName(e.target.value)}
                          readOnly={role !== 'owner' && role !== 'super_admin'}
                          className="bg-muted/50 focus:bg-background transition-colors"
                          placeholder="e.g. Grand Sky Resort"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={hotelLocation}
                          onChange={(e) => setHotelLocation(e.target.value)}
                          readOnly={role !== 'owner' && role !== 'super_admin'}
                          className="bg-muted/50 focus:bg-background transition-colors"
                          placeholder="e.g. Maldives"
                        />
                      </div>
                    </div>

                    {(role === 'owner' || role === 'super_admin') && (
                      <div className="pt-2 space-y-2">
                        <Label className="text-primary font-bold text-xs uppercase">Hotel Unique Access Code (Staff Binding)</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={hotel?.access_code || "Generating..."}
                            className="bg-primary/5 border-primary/20 font-mono text-lg tracking-widest font-bold pr-24"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Read Only</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                if (hotel?.access_code) {
                                  navigator.clipboard.writeText(hotel.access_code);
                                  toast({ title: "Copied to clipboard" });
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">Required for your Managers and Housekeeping staff to log in.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(role === 'owner' || role === 'super_admin') && (
                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button
                    className="shadow-lg hover:shadow-primary/20 transition-all gap-2"
                    onClick={handleSave}
                    disabled={updateHotel.isPending}
                  >
                    {updateHotel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    {updateHotel.isPending ? "Saving..." : "Save Branding Changes"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>



          {/* Users Settings */}
          <TabsContent value="users">
            <div className="space-y-6">
              {(role === 'owner' || role === 'super_admin') && <HotelCodeDisplay />}

              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <Link to="/staff" className="text-primary text-sm hover:underline flex items-center gap-1 font-medium">
                    Go to Staff Management
                    <Users className="h-3 w-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage staff accounts and role-based permissions. Only Hotel Owners can add or remove users.
                </p>
                <div className="border border-dashed border-border rounded-lg p-10 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Account administration is centralized</p>
                    <p className="text-sm text-muted-foreground">Manage all Managers and Housekeeping identities in the Staff section.</p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/staff">Manage All Users</Link>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notification preferences were removed: the toggles were
              hardcoded and wired to nothing, and there is no persisted
              notification-preference store to wire them to. Re-add this tab
              only with a real preference store behind it. */}

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
