// ============================================
// ZUSTAND AUTH STORE
// Global state for user authentication
// ============================================

import { create } from 'zustand';
import { supabase, getProfile } from '../services/supabase';
import { AuthState, User, Profile } from '../types';

// Create store
export const useAuthStore = create<AuthState & {
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}>((set) => ({
  // Initial state
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  // Set user
  setUser: (user) => set({ user }),

  // Set profile
  setProfile: (profile) => set({ profile }),

  // Set session
  setSession: (session) => set({ session }),

  // Set loading
  setLoading: (loading) => set({ loading }),

  // Initialize auth state (called on app start)
  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is logged in
        set({
          user: session.user as User,
          session,
        });

        // Fetch profile
        try {
          const profile = await getProfile(session.user.id);
          set({ profile });
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }

      set({ initialized: true, loading: false });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ initialized: true, loading: false });
    }
  },

  // Logout
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        profile: null,
        session: null,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },
}));

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event);

  if (session?.user) {
    useAuthStore.setState({
      user: session.user as User,
      session,
    });

    // Fetch profile
    try {
      const profile = await getProfile(session.user.id);
      useAuthStore.setState({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  } else {
    useAuthStore.setState({
      user: null,
      profile: null,
      session: null,
    });
  }
});