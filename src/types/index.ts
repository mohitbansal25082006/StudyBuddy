// F:\StudyBuddy\src\types\index.ts
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

// Study Plan types
export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  daily_hours: number;
  plan_data: StudyPlanData;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanData {
  weeks: StudyWeek[];
  resources: StudyResource[];
  milestones: string[];
}

export interface StudyWeek {
  week: number;
  title: string;
  topics: string[];
  tasks: StudyTask[];
}

export interface StudyTask {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  completed: boolean;
  type: 'reading' | 'practice' | 'review' | 'assessment';
}

export interface StudyResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'website' | 'tool';
  url: string | null;
  description: string;
}

// Flashcard types
export interface Flashcard {
  id: string;
  user_id: string;
  subject: string;
  question: string;
  answer: string;
  difficulty: number;
  last_reviewed: string | null;
  next_review: string | null;
  review_count: number;
  correct_count: number;
  created_at: string;
}

// Study Session types
export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  duration_minutes: number;
  session_type: 'study_plan' | 'flashcards' | 'review';
  completed_at: string;
  notes: string | null;
}

// Calendar Event types
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  subject: string;
  event_type: 'study_session' | 'review' | 'exam';
  google_calendar_id: string | null;
  created_at: string;
}

// Progress tracking types
export interface SubjectProgress {
  subject: string;
  total_minutes: number;
  session_count: number;
  flashcard_count: number;
  accuracy_rate: number;
  last_studied: string;
}

// Form data for study plan generation
export interface StudyPlanForm {
  subject: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  daily_hours: number;
  goals: string;
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
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
  Home: undefined;
  StudyPlan: undefined;
  Flashcards: undefined;
  Calendar: undefined;
  Progress: undefined;
  Subjects: undefined;
  StudyPlanDetail: { planId: string };
  FlashcardReview: { subject: string };
  AddFlashcard: { subject: string };
  AddEvent: undefined;
  EditEvent: { eventId: string };
};