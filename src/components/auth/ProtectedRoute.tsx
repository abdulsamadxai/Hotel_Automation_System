import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return null; // Optimized for speed: show nothing during initial auth check
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const fallback = role === 'housekeeping' ? '/housekeeping' : '/';
    return <Navigate to={fallback} replace />;
  }

  // Strict: Housekeeping should not land on / (Dashboard)
  if (role === 'housekeeping' && window.location.pathname === '/') {
    return <Navigate to="/housekeeping" replace />;
  }

  return <>{children}</>;
}
