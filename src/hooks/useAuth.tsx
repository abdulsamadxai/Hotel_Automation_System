import {
  createContext,
  useContext,
  type ReactNode,
  useState,
  useEffect,
} from 'react';
import { api, clearToken, getToken, setToken } from '@/lib/api';
import type { ApiUser, SessionUser, UserRole } from '@/lib/types';
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

/** The API user shape mapped onto the session user the pages expect. */
function toSessionUser(apiUser: ApiUser): SessionUser {
  return {
    id: apiUser.id,
    email: apiUser.email,
    user_metadata: {
      full_name: apiUser.full_name,
      role: apiUser.role,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: SessionUser } | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  // The JWT, held in memory as well as in localStorage (`has:token`).
  const [token, setTokenState] = useState<string | null>(() => getToken());
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
      // No token, no session — skip the API call entirely.
      if (!token) {
        setIsLoading(false);
        return;
      }
      const apiUser = await api.get<ApiUser>('/api/auth/me');
      const sessionUser = toSessionUser(apiUser);
      setSession({ user: sessionUser });
      setUser(sessionUser);
      applyProfile(apiUser);
    } catch (error) {
      // A 401 already cleared the token (api client) — just end up logged out.
      console.error('Error initializing session:', error);
      setSession(null);
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
    }
  };

  /** Role + hotel come straight from the user record — no staff lookup. */
  const applyProfile = (apiUser: ApiUser) => {
    if (apiUser.role === 'super_admin') {
      setRole('super_admin');
      setHotelId('global');
    } else {
      setRole(apiUser.role);
      setHotelId(apiUser.hotel_id ?? '');
    }
    setIsLoading(false);
  };

  const signIn = async (
    email: string,
    password: string,
    hotelCode?: string | null,
  ) => {
    try {
      const { token: jwt, user: apiUser } = await api.post<{
        token: string;
        user: ApiUser;
      }>('/api/auth/login', {
        email,
        password,
        hotel_code: hotelCode ?? undefined,
      });

      setToken(jwt);
      setTokenState(jwt);
      const sessionUser = toSessionUser(apiUser);
      setSession({ user: sessionUser });
      setUser(sessionUser);
      applyProfile(apiUser);

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
      // Only manager / housekeeping / staff may self-register, and only
      // with a valid hotel code (enforced server-side). Signup does not
      // sign the user in — they log in afterwards.
      await api.post('/api/auth/signup', {
        full_name: fullName ?? email.split('@')[0],
        email,
        password,
        role: role ?? 'staff',
        hotel_code: hotelCode ?? '',
      });
      return { error: null };
    } catch (error: unknown) {
      return { error: toAuthError(error, 'Signup failed') };
    }
  };

  const signOut = async () => {
    clearToken();
    setTokenState(null);
    setSession(null);
    setUser(null);
    setRole('staff');
    setHotelId('');
    setSelectedHotelId(null);
    try {
      localStorage.removeItem('super-admin-selected-hotel');
    } catch {
      // Ignore storage errors.
    }
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
 * Change a login user's password. Used by the Staff page when an admin
 * edits a member who has a linked login user. An admin resetting someone
 * else's password sends only the new password; self-service requires the
 * current password server-side.
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async ({
      userId,
      newPassword,
      currentPassword,
    }: {
      userId: string;
      newPassword: string;
      /** Required by the server when changing your own password; omit when an admin resets someone else's. */
      currentPassword?: string;
    }) => {
      await api.post(`/api/users/${userId}/change-password`, {
        new_password: newPassword,
        ...(currentPassword ? { current_password: currentPassword } : {}),
      });
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
