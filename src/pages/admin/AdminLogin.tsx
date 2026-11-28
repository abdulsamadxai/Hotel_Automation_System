import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, Mail, Lock } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

/**
 * Separate admin login, like /admin/login on the Cyber Nexa site. Only the
 * super_admin account may use the admin dashboard — a hotel user who signs
 * in here is signed straight back out with an error.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { signIn, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // After sign-in the auth provider loads the user record; only a
  // super_admin may enter /admin. Anyone else is signed straight out.
  useEffect(() => {
    if (!signedIn || !user) return;
    if (user.user_metadata.role === 'super_admin') {
      toast({ title: 'Welcome back, admin!' });
      navigate('/admin');
      return;
    }
    void signOut();
    toast({
      variant: 'destructive',
      title: 'Not an administrator',
      description: 'Only the super-admin account can use the admin dashboard. Use the hotel sign-in instead.',
    });
    setSignedIn(false);
  }, [signedIn, user, navigate, signOut, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password, null);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    setSignedIn(true);
    setIsLoading(false);
  };

  return (
    <AuthLayout
      title="Admin Dashboard"
      subtitle="Hotel Autopilot ONE — system administration"
      footer="Protected by enterprise-grade security"
      icon={<ShieldCheck className="h-8 w-8" />}
    >
        {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
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
              <p className="text-xs text-muted-foreground">
                Only the super-admin account can sign in here. Hotel owners,
                managers and staff use the hotel sign-in.
              </p>
            </div>

            <Button type="submit" className="w-full shadow-lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign in to admin'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline font-medium">
              ← Back to hotel sign in
            </Link>
          </div>
    </AuthLayout>
  );
}
