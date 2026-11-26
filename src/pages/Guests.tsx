import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Star, Ban, User, Users, Loader2, Save, Trash2 } from "lucide-react";
import { useGuests, useCreateGuest, useUpdateGuest, useDeleteGuest, type Guest, type GuestTag } from "@/hooks/useGuests";
import { format } from "date-fns";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";


const tagConfig: Record<GuestTag, { icon: React.ElementType; color: string }> = {
  vip: { icon: Star, color: "bg-status-warning/15 text-status-warning border-status-warning/30" },
  regular: { icon: User, color: "bg-status-info/15 text-status-info border-status-info/30" },
  blocked: { icon: Ban, color: "bg-status-error/15 text-status-error border-status-error/30" },
};

export default function Guests() {
  const { data: guests = [], isLoading } = useGuests();
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();
  const { currency } = useCurrency();


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    id_number: "",
    notes: "",
    // New guests start untagged; the store defaults tags to [].
    tags: [] as GuestTag[]
  });

  const handleOpenDialog = (guest?: Guest) => {
    if (guest) {
      setEditingGuest(guest);
      setFormData({
        name: guest.name,
        email: guest.email || "",
        phone: guest.phone || "",
        nationality: guest.nationality || "",
        id_number: guest.id_number || "",
        notes: guest.notes || "",
        tags: guest.tags
      });
    } else {
      setEditingGuest(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        nationality: "",
        id_number: "",
        notes: "",
        tags: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveGuest = async () => {
    const payload = {
      ...formData,
      email: formData.email || null,
      phone: formData.phone || null,
      nationality: formData.nationality || null,
      id_number: formData.id_number || null,
      notes: formData.notes || null,
    };

    if (editingGuest) {
      await updateGuest.mutateAsync({
        id: editingGuest.id,
        ...payload
      });
    } else {
      await createGuest.mutateAsync({
        ...payload,
        tags: formData.tags
      });
    }
    setIsDialogOpen(false);
    setEditingGuest(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      nationality: "",
      id_number: "",
      notes: "",
      tags: []
    });
  };


  const filteredGuests = guests.filter(g =>
    (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.phone && g.phone.includes(searchTerm))
  );

  const vipCount = guests.filter((g) => g.tags.includes("vip")).length;
  const totalGuests = guests.length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Guest CRM</h1>
            <p className="text-muted-foreground">
              Manage guest profiles and stay history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Guest
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGuest ? "Edit Guest Profile" : "Add New Guest"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      placeholder="john@example.com"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+1 234 567 890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input
                      placeholder="e.g. American"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ID / Passport Number</Label>
                    <Input
                      placeholder="e.g. AB123456"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Preferences, allergies, etc."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={handleSaveGuest}
                  disabled={!formData.name || createGuest.isPending || updateGuest.isPending}
                >
                  {createGuest.isPending || updateGuest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingGuest ? "Update Profile" : "Save Guest Profile")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <p className="text-3xl font-bold">{totalGuests}</p>
            <p className="text-sm text-muted-foreground">Total Guests</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-bold text-status-warning">{vipCount}</p>
            <p className="text-sm text-muted-foreground">VIP Guests</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-bold">{guests.filter(g => new Date(g.created_at).getMonth() === new Date().getMonth()).length}</p>
            <p className="text-sm text-muted-foreground">New This Month</p>
          </div>
        </div>

        {/* Search */}
        <div className="glass-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-10 bg-muted/50 border-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Guests Table */}
        <div className="glass-card overflow-hidden">
          {filteredGuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No guests found</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Try adjusting your search or add a new guest.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Guest</TableHead>
                  <TableHead className="text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-muted-foreground">Stays</TableHead>
                  <TableHead className="text-muted-foreground">Total Spent</TableHead>
                  <TableHead className="text-muted-foreground">Last Stay</TableHead>
                  <TableHead className="text-muted-foreground">Tags</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest) => (
                  <TableRow
                    key={guest.id}
                    className="border-border hover:bg-muted/30 group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {guest.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium">{guest.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {guest.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{guest.email || "-"}</p>
                      <p className="text-xs text-muted-foreground">{guest.phone || "-"}</p>
                      {(guest.nationality || guest.id_number) && (
                        <p className="text-[10px] text-primary/70 mt-1">
                          {guest.nationality} {guest.id_number ? `(${guest.id_number})` : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{guest.total_stays}</TableCell>
                    <TableCell className="font-medium">
                      {formatAndConvert(guest.total_spent, currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {guest.last_stay_at ? format(new Date(guest.last_stay_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {guest.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          guest.tags.map((tag) => {
                            const config = tagConfig[tag] || tagConfig.regular;
                            const Icon = config.icon;
                            return (
                              <Badge
                                key={tag}
                                variant="outline"
                                className={`gap-1 ${config.color}`}
                              >
                                <Icon className="h-3 w-3" />
                                {tag.toUpperCase()}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleOpenDialog(guest)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${guest.name}? This action cannot be undone.`)) {
                              deleteGuest.mutate(guest.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout >
  );
}
