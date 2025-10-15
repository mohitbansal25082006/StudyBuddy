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
  refreshProfile: () => Promise<void>;
}>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  // Set user
  setUser: (user) => {
    console.log('Setting user:', user?.email);
    set({ user });
  },

  // Set profile
  setProfile: (profile) => {
    console.log('Setting profile:', profile?.full_name, profile?.learning_style);
    set({ profile });
  },

  // Set session
  setSession: (session) => set({ session }),

  // Set loading
  setLoading: (loading) => set({ loading }),

  // Refresh profile from database
  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      console.log('No user to refresh profile for');
      return;
    }

    try {
      console.log('Refreshing profile for user:', user.id);
      const profile = await getProfile(user.id);
      console.log('Profile refreshed:', profile);
      set({ profile });
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  },

  // Initialize auth state (called on app start)
  initialize: async () => {
    try {
      console.log('=== INITIALIZING AUTH ===');
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✓ Session found for user:', session.user.email);
        
        set({
          user: session.user as User,
          session,
        });

        // Fetch profile
        try {
          console.log('Fetching profile...');
          const profile = await getProfile(session.user.id);
          console.log('✓ Profile loaded:', {
            full_name: profile.full_name,
            learning_style: profile.learning_style,
            grade_level: profile.grade_level,
            subjects: profile.subjects
          });
          set({ profile });
        } catch (error) {
          console.error('✗ Error fetching profile:', error);
          set({ profile: null });
        }
      } else {
        console.log('✗ No active session');
      }

      set({ initialized: true, loading: false });
      console.log('=== AUTH INITIALIZED ===');
    } catch (error) {
      console.error('✗ Error initializing auth:', error);
      set({ initialized: true, loading: false });
    }
  },

  // Logout
  logout: async () => {
    try {
      console.log('Logging out...');
      await supabase.auth.signOut();
      set({
        user: null,
        profile: null,
        session: null,
      });
      console.log('✓ User logged out');
    } catch (error) {
      console.error('✗ Error logging out:', error);
    }
  },
}));

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('=== AUTH STATE CHANGE ===');
  console.log('Event:', event);

  if (event === 'SIGNED_IN' && session?.user) {
    console.log('✓ User signed in:', session.user.email);
    
    useAuthStore.setState({
      user: session.user as User,
      session,
    });

    // Fetch profile
    try {
      const profile = await getProfile(session.user.id);
      console.log('✓ Profile fetched after sign in:', profile);
      useAuthStore.setState({ profile });
    } catch (error) {
      console.error('✗ Error fetching profile after sign in:', error);
      useAuthStore.setState({ profile: null });
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('✓ User signed out');
    useAuthStore.setState({
      user: null,
      profile: null,
      session: null,
    });
  } else if (event === 'USER_UPDATED' && session?.user) {
    console.log('✓ User updated');
    
    // Refresh profile when user updates
    try {
      const profile = await getProfile(session.user.id);
      console.log('✓ Profile refreshed after update:', profile);
      useAuthStore.setState({ profile });
    } catch (error) {
      console.error('✗ Error refreshing profile:', error);
    }
  }
});