import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsers, useCreateUser, type CreateUserInput } from '@/hooks/useUsers';
import { useHotels } from '@/hooks/useHotels';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, Plus, Loader2, Users, Hotel, LogOut } from 'lucide-react';

const roleColors: Record<UserRole, string> = {
  housekeeping: 'bg-status-pending/15 text-status-pending',
  manager: 'bg-primary/15 text-primary',
  owner: 'bg-status-warning/15 text-status-warning',
  staff: 'bg-status-info/15 text-status-info',
  super_admin: 'bg-status-error/15 text-status-error',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'staff', label: 'Staff' },
  { value: 'super_admin', label: 'Super Admin' },
];

/**
 * Separate admin dashboard (super_admin only), like /admin on the Cyber
 * Nexa site. This is where login users are created — including owners,
 * which self-registration deliberately forbids.
 */
export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: hotels = [], isLoading: hotelsLoading } = useHotels();
  const createUser = useCreateUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    full_name: '',
    email: '',
    password: '',
    role: 'owner',
    hotel_id: null,
  });

  const hotelById = new Map(hotels.map((h) => [h.id, h]));
  const needsHotel = formData.role !== 'super_admin';
  const canSubmit =
    formData.full_name.trim().length > 0 &&
    formData.email.includes('@') &&
    formData.password.length >= 8 &&
    (!needsHotel || !!formData.hotel_id) &&
    !createUser.isPending;

  const handleOpenDialog = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'owner',
      hotel_id: hotels[0]?.id ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleCreateUser = () => {
    createUser.mutate(
      {
        ...formData,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        hotel_id: needsHotel ? formData.hotel_id : null,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({
            full_name: '',
            email: '',
            password: '',
            role: 'owner',
            hotel_id: null,
          });
        },
      },
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Hotel Autopilot ONE — system administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Back to app</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <p className="text-2xl font-bold">{hotelsLoading ? '…' : hotels.length}</p>
            <p className="text-sm text-muted-foreground">Hotels</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-2xl font-bold">{usersLoading ? '…' : users.length}</p>
            <p className="text-sm text-muted-foreground">Login users</p>
          </div>
        </div>

        {/* Login users */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Login Users</h2>
            </div>
            <Button className="gap-2" size="sm" onClick={handleOpenDialog}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
          {usersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <h3 className="font-semibold mb-1">No login users yet</h3>
              <p className="text-muted-foreground text-sm">Add a user to create their login.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                        {u.full_name
                          ? u.full_name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                          : 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={roleColors[u.role]}>
                        {u.role.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        {u.hotel_id ? hotelById.get(u.hotel_id)?.name ?? '—' : 'All hotels'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hotels */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Hotels</h2>
          </div>
          {hotelsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {hotels.map((h) => (
                <div key={h.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-sm text-muted-foreground">{h.location || 'No location set'}</p>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">{h.access_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add User dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Login User</DialogTitle>
            <DialogDescription>
              Create a login account. Owners log in without a hotel code;
              managers, housekeeping and staff sign in with their hotel&apos;s
              access code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password * (at least 8 characters)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                minLength={8}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData({ ...formData, role: v as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hotel {needsHotel ? '*' : ''}</Label>
                <Select
                  value={formData.hotel_id ?? ''}
                  onValueChange={(v) =>
                    setFormData({ ...formData, hotel_id: v || null })
                  }
                  disabled={!needsHotel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={needsHotel ? 'Pick a hotel' : 'Not needed'} />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} ({h.access_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleCreateUser}
              disabled={!canSubmit}
              className="w-full"
            >
              {createUser.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create User'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
