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
  user_metadata?: {
    full_name?: string;
    learning_style?: string;
    subjects?: string[];
  };
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

// Enhanced Study Plan Data
export interface StudyPlanData {
  weeks: StudyWeek[];
  resources: StudyResource[];
  milestones: string[];
  overview: string;
  prerequisites?: string[];
  learning_outcomes: string[];
  assessment_methods: string[];
  tips: string[];
  custom_sections?: StudyPlanCustomSection[];
}

// Custom sections for study plans
export interface StudyPlanCustomSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'list' | 'resources' | 'tasks';
}

// Enhanced Study Week with more details
export interface StudyWeek {
  week: number;
  title: string;
  topics: string[];
  tasks: StudyTask[];
  objectives: string[];
  summary?: string;
  estimated_total_hours: number;
}

// Enhanced Study Task with more details
export interface StudyTask {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  completed: boolean;
  type: 'reading' | 'practice' | 'review' | 'assessment' | 'video' | 'project' | 'discussion';
  resources: string[]; // IDs of related resources
  notes?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  subtasks?: StudySubtask[];
}

// Subtasks for complex tasks
export interface StudySubtask {
  id: string;
  title: string;
  completed: boolean;
}

// Enhanced Study Resource with verification
export interface StudyResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'website' | 'tool' | 'course' | 'podcast' | 'interactive';
  url: string | null;
  description: string;
  verified: boolean;
  rating: number; // 1-5 stars
  user_rating?: number; // Individual user rating
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: number; // in minutes
  preview_image?: string;
  author?: string;
  date_published?: string;
}

// Flashcard types
export interface Flashcard {
  id: string;
  user_id: string;
  subject: string;
  question: string;
  answer: string;
  difficulty: number;
  hint: string | null;
  explanation: string | null;
  image_url: string | null;
  last_reviewed: string | null;
  next_review: string | null;
  review_count: number;
  correct_count: number;
  created_at: string;
}

// Study Session with more details
export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  duration_minutes: number;
  session_type: 'study_plan' | 'flashcards' | 'review' | 'custom';
  completed_at: string;
  notes: string | null;
  tasks_completed: string[]; // IDs of tasks completed
  resources_used: string[]; // IDs of resources used
  rating?: number; // User's rating of the session
  productivity_score?: number; // AI-calculated productivity score
  study_plan_id?: string;
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
  ai_reminder?: string; // AI-generated reminder text
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

// Study Plan Categories
export interface StudyPlanCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// User Study Plan Preferences
export interface StudyPlanPreferences {
  preferred_difficulty: 'beginner' | 'intermediate' | 'advanced';
  preferred_session_length: number; // in minutes
  preferred_time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  notification_preferences: {
    reminders: boolean;
    daily_summary: boolean;
    weekly_progress: boolean;
  };
  focus_areas: string[];
}

// AI Calendar types
export interface AIScheduleRequest {
  subjects: string[];
  preferredStudyTimes: string[];
  durationDays: number;
  dailyHours: number;
  upcomingDeadlines?: { subject: string; date: string; description: string }[];
  difficultyLevels?: { subject: string; level: string }[];
  avoidTimes?: string[];
}
export interface AIGeneratedSchedule {
  title: string;
  description: string;
  events: {
    title: string;
    subject: string;
    start_time: string;
    end_time: string;
    description: string;
    event_type: 'study_session' | 'review' | 'exam';
  }[];
}
export interface AIReminderRequest {
  userName: string;
  subject: string;
  topic: string;
  progress: number; // 0-100
  streak: number;
  studyTime: number; // minutes
  reminderType: 'motivational' | 'contextual' | 'break' | 'deadline';
}
export interface AIGoalRequest {
  goal: string;
  subject: string;
  deadline: string;
  availableDays: string[]; // Days of the week available
  availableTimes: string[]; // Time slots available
  sessionDuration: number; // Minutes per session
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
export interface AIConvertedSchedule {
  title: string;
  description: string;
  events: {
    title: string;
    subject: string;
    start_time: string;
    end_time: string;
    description: string;
    event_type: 'study_session' | 'review' | 'exam';
  }[];
}
export interface AIWeeklySummaryRequest {
  userName: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  studySessions: {
    subject: string;
    duration: number; // minutes
    date: string; // YYYY-MM-DD
    completed: boolean;
  }[];
  flashcardReviews: {
    subject: string;
    correct: number;
    incorrect: number;
    date: string; // YYYY-MM-DD
  }[];
  goals: {
    goal: string;
    completed: boolean;
    subject: string;
  }[];
}
export interface AIWeeklySummary {
  title: string;
  overview: string;
  stats: {
    totalStudyTime: number; // minutes
    totalSessions: number;
    successRate: number; // percentage
    mostStudiedSubject: string;
    leastStudiedSubject: string;
    streak: number;
  };
  achievements: string[];
  recommendations: string[];
  nextWeekFocus: string[];
}

// Community Feed types
export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  image_order: number;
  created_at: string;
}

export interface CommunityGuideline {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment' | 'reply';
  content_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  ai_analysis: {
    isViolation: boolean;
    confidence: number;
    explanation: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  title: string;
  content: string;
  image_url: string | null; // Keep for backward compatibility
  images: PostImage[]; // New multi-image support
  tags: string[];
  likes: number;
  comments: number;
  liked_by_user: boolean;
  bookmarked_by_user: boolean; // New bookmark status
  created_at: string;
  updated_at: string;
}

export interface CommentReply {
  id: string;
  comment_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  likes: number;
  liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  likes: number;
  liked_by_user: boolean;
  replies: CommentReply[]; // New replies support
  created_at: string;
  updated_at: string;
}

// Q&A System Types
export interface CommunityQuestion {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  title: string;
  content: string;
  tags: string[];
  difficulty_level: 'easy' | 'medium' | 'hard';
  views: number;
  downvotes: number;
  upvotes: number;
  has_accepted_answer: boolean;
  voted_by_user: 'up' | 'down' | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswer {
  id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  downvotes: number;
  upvotes: number;
  is_accepted: boolean;
  voted_by_user: 'up' | 'down' | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionComment {
  id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AnswerComment {
  id: string;
  answer_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

// Achievement System Types
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  unlocked_at: string;
}

export interface UserXP {
  id: string;
  user_id: string;
  xp_points: number;
  level: number;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  xp_amount: number;
  source: string;
  source_id: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  xp_points: number;
  level: number;
  answers_given: number;
  questions_asked: number;
  accepted_answers: number;
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
  StudyPlanDetail: { planId: string; startSession?: boolean };
  FlashcardReview: { 
    subject: string;
    flashcards?: Flashcard[]; // Optional array of flashcards to review
  };
  AddFlashcard: { subject: string };
  AddEvent: undefined;
  EditEvent: { eventId: string };
  AISchedule: undefined;
  AIGoal: undefined;
  AIWeeklySummary: undefined;
  // Community screens
  Community: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  EditPost: { postId: string };
  Profile: { userId: string };
  CommunityGuidelines: undefined;
  ImageViewer: { images: string[]; initialIndex: number };
  Bookmarks: undefined;
  ReportContent: {
    contentType: 'post' | 'comment' | 'reply';
    contentId: string;
    contentAuthorId: string;
  };
  // Q&A screens
  QAScreen: undefined;
  AskQuestionScreen: undefined;
  QuestionDetailScreen: { questionId: string };
  // Achievement screens
  LeaderboardScreen: undefined;
  AchievementsScreen: undefined;
};