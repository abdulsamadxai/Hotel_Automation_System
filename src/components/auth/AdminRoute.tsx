import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Guard for the separate admin dashboard (/admin). Only super_admin may
 * enter; everyone else — including a signed-in hotel user — is sent to the
 * admin login page. Mirrors ProtectedRoute, but with the admin login as
 * its destination instead of the hotel login.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || role !== 'super_admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
