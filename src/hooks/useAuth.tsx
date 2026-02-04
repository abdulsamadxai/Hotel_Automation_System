import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { mockStore } from '@/lib/mockStore';

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'housekeeping' | 'staff';

interface AuthContextType {
  user: any;
  session: any;
  role: UserRole;
  hotelId: string;
  selectedHotelId: string | null;
  setSelectedHotelId: (id: string | null) => void;
  isLoading: boolean;
  signIn: (email: string, password: string, hotelCode?: string | null) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>('staff');
  const [hotelId, setHotelId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(() => localStorage.getItem('super-admin-selected-hotel'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize from localStorage
    initializeSession();
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

  const fetchUserProfile = async (authUser: any) => {
    try {
      // Determine if Super Admin via email
      if (authUser.email === SUPER_ADMIN_EMAIL) {
        setRole('super_admin');
        setHotelId('global');
        setIsLoading(false);
        return;
      }

      // Find staff profile
      const staff = await mockStore.staff.getByUserId(authUser.id);

      if (staff) {
        setRole(staff.role as UserRole);
        setHotelId(staff.hotel_id);
      } else {
        // Fallback to metadata role
        const metaRole = authUser.user_metadata?.role;
        if (metaRole === 'owner') {
          console.warn("Profile missing, falling back to metadata role 'owner'");
          setRole('owner');
          setHotelId('hotel-001'); // Default hotel for new owners
        } else {
          setRole('staff');
          setHotelId('hotel-001');
        }
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, hotelCode?: string | null) => {
    try {
      const result = await mockStore.auth.signIn(email, password);

      if (result.error) {
        return { error: result.error };
      }

      setSession(result.data);
      setUser(result.data.user);
      await fetchUserProfile(result.data.user);

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Login failed' } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const result = await mockStore.auth.signUp(email, password, fullName);

      if (result.error) {
        return { error: result.error };
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Signup failed' } };
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
        hotelId: (role === 'super_admin' && selectedHotelId) ? selectedHotelId : hotelId,
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

export const SUPER_ADMIN_EMAIL = 'mrabdulsamad323@gmail.com';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
