import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useEffect,
} from 'react';
import { mockStore } from '@/lib/mockStore';
import type { SessionUser, UserRole } from '@/lib/types';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export type { UserRole } from '@/lib/types';

export interface AuthError {
  message: string;
}

interface AuthContextType {
  user: SessionUser | null;
  session: { user: SessionUser } | null;
  role: UserRole;
  hotelId: string;
  selectedHotelId: string | null;
  setSelectedHotelId: (id: string | null) => void;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    hotelCode?: string | null,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    role?: UserRole,
    hotelCode?: string | null,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthError(error: unknown, fallback: string): AuthError {
  if (error instanceof Error) return { message: error.message };
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return { message: (error as { message: string }).message };
  }
  return { message: fallback };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: SessionUser } | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole>('staff');
  const [hotelId, setHotelId] = useState<string>('');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(() =>
    localStorage.getItem('super-admin-selected-hotel'),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeSession = async () => {
    setIsLoading(true);
    try {
      const currentUser = await mockStore.auth.getCurrentUser();

      if (currentUser) {
        setSession({ user: currentUser });
        setUser(currentUser);
        await fetchUserProfile(currentUser);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (authUser: SessionUser) => {
    try {
      // Super-admin is derived from the role field — never an email match.
      if (authUser.user_metadata.role === 'super_admin') {
        setRole('super_admin');
        setHotelId('global');
        setIsLoading(false);
        return;
      }

      // Find staff profile
      const staff = await mockStore.staff.getByUserId(authUser.id);

      if (staff) {
        setRole(staff.role);
        setHotelId(staff.hotel_id);
      } else {
        // Fallback to metadata role
        const metaRole = authUser.user_metadata?.role;
        if (metaRole === 'owner') {
          console.warn(
            "Profile missing, falling back to metadata role 'owner'",
          );
          setRole('owner');
          setHotelId('hotel-001'); // Default hotel for new owners
        } else {
          setRole(metaRole ?? 'staff');
          setHotelId('hotel-001');
        }
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (
    email: string,
    password: string,
    hotelCode?: string | null,
  ) => {
    try {
      const result = await mockStore.auth.signIn(email, password, hotelCode);

      if (result.error) {
        return { error: result.error };
      }

      setSession(result.data);
      setUser(result.data.user);
      await fetchUserProfile(result.data.user);

      return { error: null };
    } catch (error: unknown) {
      return { error: toAuthError(error, 'Login failed') };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    role?: UserRole,
    hotelCode?: string | null,
  ) => {
    try {
      const result = await mockStore.auth.signUp(
        email,
        password,
        fullName,
        role,
        hotelCode,
      );

      if (result.error) {
        return { error: result.error };
      }

      return { error: null };
    } catch (error: unknown) {
      return { error: toAuthError(error, 'Signup failed') };
    }
  };

  const signOut = async () => {
    await mockStore.auth.signOut();
    setSession(null);
    setUser(null);
    setRole('staff');
    setHotelId('');
    setSelectedHotelId(null);
  };

  const setAdminHotel = (id: string | null) => {
    setSelectedHotelId(id);
    if (id) localStorage.setItem('super-admin-selected-hotel', id);
    else localStorage.removeItem('super-admin-selected-hotel');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        hotelId:
          role === 'super_admin' && selectedHotelId
            ? selectedHotelId
            : hotelId,
        selectedHotelId,
        setSelectedHotelId: setAdminHotel,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/**
 * Change a login user's password (updates the stored hash). Used by the
 * Staff page when an admin edits a member who has a linked login user.
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await mockStore.auth.updatePassword(userId, newPassword);
    },
    onSuccess: () => {
      toast({ title: 'Login password updated' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Password change failed',
        description: error instanceof Error ? error.message : 'Could not update the login password.',
        variant: 'destructive',
      });
    },
  });
}
