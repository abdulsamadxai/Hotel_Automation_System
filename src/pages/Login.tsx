import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, SUPER_ADMIN_EMAIL } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Hotel,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
  UserCircle,
  Briefcase,
  ClipboardList
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LoginRole = 'super_admin' | 'owner' | 'manager' | 'housekeeping';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [role, setRole] = useState<LoginRole>('owner');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Hardcoded check for Super Admin intent
    if (role === 'super_admin' && email !== SUPER_ADMIN_EMAIL) {
      toast({
        variant: 'destructive',
        title: 'Access denied',
        description: 'You do not have Super Admin privileges.',
      });
      setIsLoading(false);
      return;
    }

    // Role-specific hotel code check (Only for staff)
    const isStaff = role === 'manager' || role === 'housekeeping';
    if (isStaff && !hotelCode) {
      toast({
        variant: 'destructive',
        title: 'Hotel Code Required',
        description: 'Please enter your unique hotel access code.',
      });
      setIsLoading(false);
      return;
    }

    // @ts-ignore - updating signIn to accept hotelCode
    const { error } = await signIn(email, password, isStaff ? hotelCode : null);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${role.replace('_', ' ')}`,
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Hotel className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hotel Autopilot ONE</h1>
          <p className="text-muted-foreground mt-2">Enterprise SaaS Platform</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8 border border-white/10 shadow-glow mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role">Login As</Label>
              <Select value={role} onValueChange={(v) => setRole(v as LoginRole)}>
                <SelectTrigger id="role" className="bg-muted/30 border-white/5">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Super Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-status-success" />
                      <span>Hotel Owner</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-status-info" />
                      <span>Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="housekeeping">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-status-warning" />
                      <span>Housekeeping</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hotel Code - Hidden for Super Admin and Owner */}
            {(role === 'manager' || role === 'housekeeping') && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="hotelCode">Hotel Access Code</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                  <Input
                    id="hotelCode"
                    type="text"
                    placeholder="H-XXXXXX"
                    value={hotelCode}
                    onChange={(e) => setHotelCode(e.target.value.toUpperCase())}
                    className="pl-10 bg-primary/5 border-primary/20 focus:border-primary font-mono tracking-widest"
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Unique code provided by your hotel owner</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted/30 border-white/5"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-muted/30 border-white/5"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full shadow-lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
}
