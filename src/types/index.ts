// ============================================
// TYPESCRIPT TYPES & INTERFACES
// Defines the shape of our data
// ============================================

// User profile from database
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | null;
  grade_level: string | null;
  subjects: string[] | null;
  study_goals: string | null;
  created_at: string;
  updated_at: string;
}

// User object from Supabase Auth
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Auth state in our store
export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
}

// Form data for profile setup
export interface ProfileSetupData {
  full_name: string;
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
  grade_level: string;
  subjects: string[];
  study_goals: string;
}

// Props for navigation screens
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  ProfileSetup: undefined;
  ProfileEdit: undefined;
  Main: undefined;
};