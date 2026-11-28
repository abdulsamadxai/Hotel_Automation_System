import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Info } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Public self-registration is for hotel staff only. 'owner' and
// 'super_admin' are deliberately absent: the store rejects them with
// "Owner accounts are created by an administrator".
type SignupRole = 'manager' | 'housekeeping' | 'staff';

const ROLE_OPTIONS: { value: SignupRole; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'staff', label: 'Staff' },
];

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SignupRole>('staff');
  const [hotelCode, setHotelCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Password validation with stronger requirements
    if (password.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
      });
      setIsLoading(false);
      return;
    }

    // Check for complexity requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasNumber) {
      toast({
        variant: 'destructive',
        title: 'Password too weak',
        description: 'Password must contain at least one uppercase letter and one number.',
      });
      setIsLoading(false);
      return;
    }

    // A valid hotel access code is required for staff / manager /
    // housekeeping sign-up — it is what links the new account to a hotel.
    if (!hotelCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Hotel Access Code Required',
        description: 'Please enter the hotel access code provided by your hotel owner.',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(
      email,
      password,
      fullName,
      role as UserRole,
      hotelCode.trim(),
    );

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'You can now sign in to your account.',
      });
      navigate('/login');
    }

    setIsLoading(false);
  };

  return (
    <AuthLayout
      title="Sign Up"
      subtitle="Create a staff account for your hotel. Owner accounts are created by an administrator — they cannot be self-registered here."
      footer="Join the network of enterprise hotels powered by Autopilot ONE"
    >
        {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg bg-muted/40 border border-border p-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Owner accounts are created by an administrator. If you own a
                hotel, ask an administrator to create your account.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
                  className="pl-10"
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
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters with uppercase and number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as SignupRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotelCode">Hotel Access Code *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  id="hotelCode"
                  type="text"
                  placeholder="Enter your hotel code"
                  value={hotelCode}
                  onChange={(e) => setHotelCode(e.target.value.toUpperCase())}
                  className="pl-10 bg-primary/5 border-primary/20 focus:border-primary font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The code for the hotel you work at, provided by its owner.
                Demo codes: <span className="font-mono">DEMO-1001</span> (Grand
                Plaza Hotel) and <span className="font-mono">DEMO-1002</span>{" "}
                (Sunset Resort). A wrong code is rejected.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
    </AuthLayout>
  );
}
