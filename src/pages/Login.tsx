import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ');
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // After a successful sign-in the auth provider loads the user record; the
  // welcome toast uses the REAL role from that record — never a role the
  // user picked on this page (there is no role selector here).
  useEffect(() => {
    if (!signedIn) return;
    if (user) {
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${formatRole(user.user_metadata.role)}`,
      });
      navigate('/');
      return;
    }
    // Fallback: the session is valid even if the profile record is slow to
    // load — do not strand the user on the login page.
    const timer = window.setTimeout(() => {
      toast({ title: 'Welcome back!' });
      navigate('/');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [signedIn, user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // The hotel access code is validated by the store for manager /
    // housekeeping / staff accounts. Owner and super-admin accounts do not
    // need one. An empty code is passed as null so the store can reject
    // staff sign-ins that omit it.
    const { error } = await signIn(
      email,
      password,
      hotelCode.trim() ? hotelCode.trim() : null,
    );

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        toast({
          variant: 'default',
          title: 'Verification Required',
          description: 'Please check your email to verify your account before logging in.',
          className: 'bg-status-warning text-status-warning-foreground border-status-warning'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error.message === "Invalid login credentials"
            ? "Invalid email or password. If you just signed up, please check your email for verification."
            : error.message,
        });
      }
      setIsLoading(false);
      return;
    }

    // Success: wait for the user record to load so the toast prints the
    // real role (see the effect above). If the record is already present
    // the effect fires immediately.
    setSignedIn(true);
    setIsLoading(false);
  };

  return (
    <AuthLayout
      title="Hotel Autopilot ONE"
      subtitle="Enterprise SaaS Platform"
      footer="Protected by enterprise-grade security"
    >
        {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="pl-10 bg-muted/30 border-border"
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
                  className="pl-10 bg-muted/30 border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotelCode">Hotel Access Code</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  id="hotelCode"
                  type="text"
                  placeholder="DEMO-1001"
                  value={hotelCode}
                  onChange={(e) => setHotelCode(e.target.value.toUpperCase())}
                  className="pl-10 bg-primary/5 border-primary/20 focus:border-primary font-mono tracking-widest"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Required for manager, housekeeping and staff accounts. Owner
                and super-admin accounts do not need one. Demo codes:{" "}
                <span className="font-mono">DEMO-1001</span> (Grand Plaza Hotel)
                and <span className="font-mono">DEMO-1002</span> (Sunset Resort).
              </p>
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

          <div className="mt-6 text-center text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
            <div>
              <Link to="/admin/login" className="text-muted-foreground hover:underline">
                Administrator? Sign in to the admin dashboard
              </Link>
            </div>
          </div>
    </AuthLayout>
  );
}
