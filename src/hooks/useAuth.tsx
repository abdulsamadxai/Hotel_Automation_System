// MOCK AUTH - Frontend Only
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'housekeeping' | 'staff';

interface AuthContextType {
  user: any;
  session: any;
  role: UserRole;
  hotelId: string;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use localStorage to persist role across reloads
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem('mock-role') as UserRole) || 'owner');
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('mock-user');
    return saved ? JSON.parse(saved) : { id: '123', email: 'owner@example.com', user_metadata: { full_name: 'Hotel Owner' } };
  });

  const signIn = async (email: string, password: string) => {
    // Determine role from email (or just allow any email for mock)
    let newRole: UserRole = 'owner';
    let name = 'Hotel Owner';

    if (email.includes('admin')) newRole = 'super_admin';
    else if (email.includes('manager')) newRole = 'manager';
    else if (email.includes('housekeeping')) newRole = 'housekeeping';
    else if (email.includes('staff')) newRole = 'staff';

    const newUser = { id: Math.random().toString(), email, user_metadata: { full_name: name } };

    setRole(newRole);
    setUser(newUser);
    localStorage.setItem('mock-role', newRole);
    localStorage.setItem('mock-user', JSON.stringify(newUser));

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const newUser = { id: Math.random().toString(), email, user_metadata: { full_name: fullName || 'New User' } };
    setUser(newUser);
    setRole('owner');
    localStorage.setItem('mock-role', 'owner');
    localStorage.setItem('mock-user', JSON.stringify(newUser));
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('mock-role');
    localStorage.removeItem('mock-user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { access_token: 'mock-token', user } : null,
        role,
        hotelId: 'mock-hotel-1',
        isLoading: false,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const SUPER_ADMIN_EMAIL = 'admin@autopilot.com';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

