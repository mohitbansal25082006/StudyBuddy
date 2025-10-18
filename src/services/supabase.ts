// F:\StudyBuddy\src\services\supabase.ts
// ============================================
// SUPABASE CLIENT CONFIGURATION
// This connects our app to Supabase
// ============================================

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { StudyResource } from '../types';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with AsyncStorage for session persistence
// This means users stay logged in even after closing the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Save auth tokens here
    autoRefreshToken: true, // Auto-refresh when token expires
    persistSession: true,   // Keep session after app restart
    detectSessionInUrl: false, // We don't use URL-based auth
  },
});

// ============================================
// AUTH HELPER FUNCTIONS
// ============================================

// Sign up with email and password
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // This gets passed to our trigger
      },
    },
  });

  if (error) throw error;
  return data;
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Send password reset email
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'studybuddy://reset-password', // Deep link for app
  });

  if (error) throw error;
};

// Get current session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// ============================================
// PROFILE HELPER FUNCTIONS
// ============================================

// Get user profile
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Update user profile
export const updateProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Upload avatar image - FIXED VERSION
export const uploadAvatar = async (userId: string, uri: string) => {
  try {
    // Get file extension from URI
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    // Fetch the image as a blob using XMLHttpRequest (works in React Native)
    const response = await fetch(uri);
    const blob = await response.blob();

    // Convert blob to ArrayBuffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to ArrayBuffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

// ============================================
// STUDY PLAN HELPER FUNCTIONS
// ============================================

// Get all study plans for a user
export const getStudyPlans = async (userId: string) => {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Get a specific study plan
export const getStudyPlan = async (planId: string) => {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
};

// Create a new study plan
export const createStudyPlan = async (plan: any) => {
  const { data, error } = await supabase
    .from('study_plans')
    .insert({
      ...plan,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a study plan
export const updateStudyPlan = async (planId: string, updates: any) => {
  const { data, error } = await supabase
    .from('study_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a study plan
export const deleteStudyPlan = async (planId: string) => {
  const { error } = await supabase
    .from('study_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
  return true;
};

// ============================================
// FLASHCARD HELPER FUNCTIONS
// ============================================

// Get all flashcards for a user
export const getFlashcards = async (userId: string, subject?: string) => {
  let query = supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('next_review', { ascending: true });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Get flashcards due for review
export const getFlashcardsForReview = async (userId: string, subject?: string) => {
  const now = new Date().toISOString();
  let query = supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review', now)
    .order('next_review', { ascending: true });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Get all flashcards for a user (not just due ones)
export const getAllFlashcards = async (userId: string, subject?: string) => {
  let query = supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (subject) {
    query = query.eq('subject', subject);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Create a new flashcard
export const createFlashcard = async (flashcard: any) => {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      ...flashcard,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a flashcard
export const updateFlashcard = async (cardId: string, updates: any) => {
  const { data, error } = await supabase
    .from('flashcards')
    .update(updates)
    .eq('id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a flashcard
export const deleteFlashcard = async (cardId: string) => {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', cardId);

  if (error) throw error;
  return true;
};

// Get flashcard statistics
export const getFlashcardStats = async (userId: string) => {
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString();
  
  // Get yesterday's date at midnight
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString();
  
  try {
    // Get total flashcards
    const { data: totalCards, error: totalError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId);
    
    if (totalError) throw totalError;
    
    // Get flashcards due today
    const { data: dueCards, error: dueError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .lte('next_review', new Date().toISOString());
    
    if (dueError) throw dueError;
    
    // Get mastered flashcards
    const { data: masteredCards, error: masteredError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .gte('correct_count', 5)
      .gte('review_count', 5);
    
    if (masteredError) throw masteredError;
    
    // Get today's study sessions
    const { data: todaySessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', todayString)
      .eq('session_type', 'flashcards');
    
    if (sessionsError) throw sessionsError;
    
    // Get yesterday's study sessions
    const { data: yesterdaySessions, error: yesterdaySessionsError } = await supabase
      .from('study_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', yesterdayString)
      .lt('completed_at', todayString)
      .eq('session_type', 'flashcards');
    
    if (yesterdaySessionsError) throw yesterdaySessionsError;
    
    // Calculate current streak
    let currentStreak = 0;
    if (todaySessions.length > 0) {
      currentStreak = 1;
      
      // Check previous days to extend streak
      let checkDate = new Date(yesterday);
      let streakContinues = true;
      
      while (streakContinues) {
        const startDate = new Date(checkDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(checkDate);
        endDate.setHours(23, 59, 59, 999);
        
        const { data: daySessions, error: dayError } = await supabase
          .from('study_sessions')
          .select('completed_at')
          .eq('user_id', userId)
          .gte('completed_at', startDate.toISOString())
          .lte('completed_at', endDate.toISOString())
          .eq('session_type', 'flashcards');
        
        if (dayError) throw dayError;
        
        if (daySessions.length > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          streakContinues = false;
        }
      }
    }
    
    return {
      totalCards: totalCards.length,
      dueCards: dueCards.length,
      masteredCards: masteredCards.length,
      todaySessions: todaySessions.length,
      lastStudyDate: todaySessions.length > 0 ? todayString : 
                   yesterdaySessions.length > 0 ? yesterdayString : null,
      currentStreak,
    };
  } catch (error) {
    console.error('Error getting flashcard stats:', error);
    throw error;
  }
};

// ============================================
// STUDY SESSION HELPER FUNCTIONS
// ============================================

// Get all study sessions for a user
export const getStudySessions = async (userId: string, limit?: number) => {
  let query = supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Create a new study session - FIXED VERSION
export const createStudySession = async (session: any) => {
  try {
    // First, try to create the session with all fields
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: session.user_id,
        subject: session.subject,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type || 'study_plan',
        notes: session.notes || null,
        completed_at: new Date().toISOString(),
        // Try to include these fields if they exist in the schema
        ...(session.tasks_completed && { tasks_completed: session.tasks_completed }),
        ...(session.resources_used && { resources_used: session.resources_used }),
        ...(session.study_plan_id && { study_plan_id: session.study_plan_id }),
      })
      .select()
      .single();

    if (error) {
      // If the error is about a missing column, try without those fields
      if (error.code === 'PGRST204') {
        console.warn('Some columns not found in study_sessions table, using fallback');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: session.user_id,
            subject: session.subject,
            duration_minutes: session.duration_minutes,
            session_type: session.session_type || 'study_plan',
            notes: session.notes || null,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating study session:', error);
    throw error;
  }
};

// ============================================
// CALENDAR EVENT HELPER FUNCTIONS
// ============================================

// Get all calendar events for a user
export const getCalendarEvents = async (userId: string, startDate?: string, endDate?: string) => {
  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (startDate) {
    query = query.gte('start_time', startDate);
  }

  if (endDate) {
    query = query.lte('start_time', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// Get a specific calendar event
export const getCalendarEvent = async (eventId: string) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return data;
};

// Create a new calendar event
export const createCalendarEvent = async (event: any) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      ...event,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a calendar event
export const updateCalendarEvent = async (eventId: string, updates: any) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a calendar event
export const deleteCalendarEvent = async (eventId: string) => {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
  return true;
};

// ============================================
// PROGRESS TRACKING HELPER FUNCTIONS
// ============================================

// Get progress data for all subjects
export const getSubjectProgress = async (userId: string) => {
  // Get study sessions data
  const { data: sessions, error: sessionsError } = await supabase
    .from('study_sessions')
    .select('subject, duration_minutes, completed_at')
    .eq('user_id', userId);

  if (sessionsError) throw sessionsError;

  // Get flashcard data
  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('subject, review_count, correct_count, created_at')
    .eq('user_id', userId);

  if (flashcardsError) throw flashcardsError;

  // Process the data to calculate progress for each subject
  const subjectMap = new Map();

  // Process study sessions
  sessions.forEach(session => {
    const subject = session.subject;
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        subject,
        total_minutes: 0,
        session_count: 0,
        flashcard_count: 0,
        correct_reviews: 0,
        total_reviews: 0,
        last_studied: session.completed_at,
      });
    }

    const subjectData = subjectMap.get(subject);
    subjectData.total_minutes += session.duration_minutes;
    subjectData.session_count += 1;

    // Update last studied date if this session is more recent
    if (new Date(session.completed_at) > new Date(subjectData.last_studied)) {
      subjectData.last_studied = session.completed_at;
    }
  });

  // Process flashcards
  flashcards.forEach(card => {
    const subject = card.subject;
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        subject,
        total_minutes: 0,
        session_count: 0,
        flashcard_count: 0,
        correct_reviews: 0,
        total_reviews: 0,
        last_studied: card.created_at,
      });
    }

    const subjectData = subjectMap.get(subject);
    subjectData.flashcard_count += 1;
    subjectData.correct_reviews += card.correct_count;
    subjectData.total_reviews += card.review_count;
  });

  // Convert to array and calculate accuracy rate
  const progressData = Array.from(subjectMap.values()).map(data => ({
    subject: data.subject,
    total_minutes: data.total_minutes,
    session_count: data.session_count,
    flashcard_count: data.flashcard_count,
    accuracy_rate: data.total_reviews > 0 
      ? Math.round((data.correct_reviews / data.total_reviews) * 100) 
      : 0,
    last_studied: data.last_studied,
  }));

  return progressData;
};

// ============================================
// ENHANCED STUDY PLAN HELPER FUNCTIONS
// ============================================

// Get study plan categories - HANDLES MISSING TABLE
export const getStudyPlanCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('study_plan_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST205') {
        console.warn('Study plan categories table does not exist, using empty array');
        return [];
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting study plan categories:', error);
    return [];
  }
};

// Get user study plan preferences - HANDLES MISSING TABLE
export const getStudyPlanPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('study_plan_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If table doesn't exist or no preferences found, return null
      if (error.code === 'PGRST116' || error.code === 'PGRST205') {
        console.warn('Study plan preferences table does not exist or no preferences found');
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting study plan preferences:', error);
    return null;
  }
};

// Update user study plan preferences - HANDLES MISSING TABLE
export const updateStudyPlanPreferences = async (userId: string, preferences: any) => {
  try {
    const { data, error } = await supabase
      .from('study_plan_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, just return the preferences without saving
      if (error.code === 'PGRST205') {
        console.warn('Study plan preferences table does not exist, preferences not saved');
        return preferences;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating study plan preferences:', error);
    return preferences;
  }
};

// Add custom resources to a study plan
export const addCustomResources = async (planId: string, resources: any[]) => {
  // First, get the current plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  // Update the plan_data with new resources
  const updatedPlanData = {
    ...plan.plan_data,
    resources: [...plan.plan_data.resources, ...resources],
  };

  // Update the study plan
  const { data, error } = await supabase
    .from('study_plans')
    .update({
      plan_data: updatedPlanData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Add custom tasks to a specific week in a study plan
export const addCustomTasks = async (planId: string, weekIndex: number, tasks: any[]) => {
  // First, get the current plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  // Update the plan_data with new tasks
  const updatedPlanData = { ...plan.plan_data };
  updatedPlanData.weeks[weekIndex].tasks = [
    ...updatedPlanData.weeks[weekIndex].tasks,
    ...tasks,
  ];

  // Update the study plan
  const { data, error } = await supabase
    .from('study_plans')
    .update({
      plan_data: updatedPlanData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Rate a resource
export const rateResource = async (planId: string, resourceId: string, rating: number) => {
  // First, get the current plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  // Update the resource rating
  const updatedPlanData = { ...plan.plan_data };
  const resourceIndex = updatedPlanData.resources.findIndex((r: StudyResource) => r.id === resourceId);
  
  if (resourceIndex !== -1) {
    updatedPlanData.resources[resourceIndex].user_rating = rating;
  }

  // Update the study plan
  const { data, error } = await supabase
    .from('study_plans')
    .update({
      plan_data: updatedPlanData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Add notes to a task
export const addTaskNotes = async (planId: string, weekIndex: number, taskIndex: number, notes: string) => {
  // First, get the current plan
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  // Update the task notes
  const updatedPlanData = { ...plan.plan_data };
  updatedPlanData.weeks[weekIndex].tasks[taskIndex].notes = notes;

  // Update the study plan
  const { data, error } = await supabase
    .from('study_plans')
    .update({
      plan_data: updatedPlanData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Create a detailed study session
export const createDetailedStudySession = async (session: any) => {
  try {
    // First, try to create the session with all fields
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: session.user_id,
        subject: session.subject,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type || 'study_plan',
        notes: session.notes || null,
        completed_at: new Date().toISOString(),
        // Try to include these fields if they exist in the schema
        ...(session.tasks_completed && { tasks_completed: session.tasks_completed }),
        ...(session.resources_used && { resources_used: session.resources_used }),
        ...(session.study_plan_id && { study_plan_id: session.study_plan_id }),
      })
      .select()
      .single();

    if (error) {
      // If the error is about a missing column, try without those fields
      if (error.code === 'PGRST204') {
        console.warn('Some columns not found in study_sessions table, using fallback');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: session.user_id,
            subject: session.subject,
            duration_minutes: session.duration_minutes,
            session_type: session.session_type || 'study_plan',
            notes: session.notes || null,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating detailed study session:', error);
    throw error;
  }
};

// Get study sessions for a specific study plan
export const getStudyPlanSessions = async (planId: string) => {
  try {
    // First try with the study_plan_id column
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('study_plan_id', planId)
      .order('completed_at', { ascending: false });

    if (error) {
      // If the column doesn't exist, return empty array
      if (error.code === 'PGRST204') {
        console.warn('study_plan_id column not found in study_sessions table');
        return [];
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting study plan sessions:', error);
    return [];
  }
};

// ============================================
// RESOURCE VERIFICATION HELPER FUNCTIONS
// ============================================

// Verify a resource URL
export const verifyResourceUrl = async (url: string): Promise<boolean> => {
  try {
    // This is a simplified check - in a real app, you might want to use a more sophisticated method
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error verifying URL:', error);
    return false;
  }
};

// ============================================
// STUDY PLAN RECOMMENDATIONS - HANDLES MISSING TABLE
// ============================================

// Get recommended study plans based on user preferences
export const getRecommendedStudyPlans = async (userId: string, limit: number = 5) => {
  try {
    // Get user preferences
    const preferences = await getStudyPlanPreferences(userId);

    // Get user's completed study plans to understand preferences
    const { data: completedPlans, error: plansError } = await supabase
      .from('study_plans')
      .select('subject, difficulty_level')
      .eq('user_id', userId)
      .eq('completed', true);

    if (plansError) throw plansError;

    // Get all study plans
    let query = supabase
      .from('study_plans')
      .select('*')
      .neq('user_id', userId) // Exclude user's own plans
      .eq('public', true) // Only public plans
      .order('rating', { ascending: false })
      .limit(limit * 2); // Get more than needed to filter

    // Filter by user preferences if available
    if (preferences) {
      if (preferences.preferred_difficulty) {
        query = query.eq('difficulty_level', preferences.preferred_difficulty);
      }
      if (preferences.focus_areas && preferences.focus_areas.length > 0) {
        query = query.in('subject', preferences.focus_areas);
      }
    }

    const { data, error } = await query;

    if (error) {
      // If public column doesn't exist, try without it
      if (error.code === 'PGRST204') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('study_plans')
          .select('*')
          .neq('user_id', userId) // Exclude user's own plans
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting recommended study plans:', error);
    return [];
  }
};

// ============================================
// COMMUNITY FEED HELPER FUNCTIONS
// ============================================

// Get community posts
export const getCommunityPosts = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      post_images (
        id,
        image_url,
        image_order
      ),
      post_likes:user_id!post_likes(user_id),
      post_bookmarks:user_id!post_bookmarks(user_id)
    `)
    .neq('user_id', userId) // Exclude user's own posts
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

// Get a single community post with comments
export const getCommunityPostWithComments = async (postId: string, userId: string) => {
  // Get the post
  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      post_images (
        id,
        image_url,
        image_order
      ),
      post_likes:user_id!post_likes(user_id),
      post_bookmarks:user_id!post_bookmarks(user_id)
    `)
    .eq('id', postId)
    .single();

  if (postError) throw postError;

  // Get comments for the post
  const { data: comments, error: commentsError } = await supabase
    .from('post_comments')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      comment_likes:user_id!comment_likes(user_id),
      comment_replies (
        id,
        content,
        user_id,
        created_at,
        updated_at,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        reply_likes:user_id!reply_likes(user_id)
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  return { post, comments };
};

// Create a new community post
export const createCommunityPost = async (post: any, imageUris?: string[]) => {
  // Create the post first
  const { data: newPost, error: postError } = await supabase
    .from('community_posts')
    .insert({
      ...post,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (postError) throw postError;

  // If there are images, upload them
  if (imageUris && imageUris.length > 0) {
    await uploadPostImages(post.user_id, newPost.id, imageUris);
  }

  return newPost;
};

// Update a community post
export const updateCommunityPost = async (postId: string, updates: any) => {
  const { data, error } = await supabase
    .from('community_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a community post
export const deleteCommunityPost = async (postId: string) => {
  // Delete images first
  await deletePostImages(postId);
  
  // Then delete the post
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  return true;
};

// Like or unlike a community post
export const toggleCommunityPostLike = async (postId: string, userId: string) => {
  // Check if user already liked the post
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // User already liked, so unlike
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // User hasn't liked, so like
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
};

// Create a comment on a community post
export const createPostComment = async (comment: any) => {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      ...comment,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Like or unlike a comment
export const toggleCommentLike = async (commentId: string, userId: string) => {
  // Check if user already liked the comment
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('*')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // User already liked, so unlike
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // User hasn't liked, so like
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
};

// Delete a comment
export const deleteComment = async (commentId: string) => {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
  return true;
};

// Upload post image
export const uploadPostImage = async (userId: string, uri: string) => {
  try {
    // Get file extension from URI
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/post-${Date.now()}.${fileExt}`;

    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Convert blob to ArrayBuffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to ArrayBuffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('community-images')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('community-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading post image:', error);
    throw error;
  }
};

// ============================================
// BOOKMARK HELPER FUNCTIONS
// ============================================

// Get user's bookmarked posts
export const getUserBookmarks = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('post_bookmarks')
    .select(`
      *,
      community_posts:post_id (
        *,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        post_images (
          id,
          image_url,
          image_order
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

// Toggle bookmark on a post
export const togglePostBookmark = async (postId: string, userId: string) => {
  // Check if user already bookmarked the post
  const { data: existingBookmark } = await supabase
    .from('post_bookmarks')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingBookmark) {
    // User already bookmarked, so remove bookmark
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // User hasn't bookmarked, so add bookmark
    const { error } = await supabase
      .from('post_bookmarks')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
};

// ============================================
// REPLY HELPER FUNCTIONS
// ============================================

// Get replies for a comment
export const getCommentReplies = async (commentId: string) => {
  const { data, error } = await supabase
    .from('comment_replies')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      reply_likes:user_id!reply_likes(user_id)
    `)
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

// Create a new reply
export const createReply = async (reply: any) => {
  const { data, error } = await supabase
    .from('comment_replies')
    .insert({
      ...reply,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update a reply
export const updateReply = async (replyId: string, updates: any) => {
  const { data, error } = await supabase
    .from('comment_replies')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a reply
export const deleteReply = async (replyId: string) => {
  const { error } = await supabase
    .from('comment_replies')
    .delete()
    .eq('id', replyId);

  if (error) throw error;
  return true;
};

// Like or unlike a reply
export const toggleReplyLike = async (replyId: string, userId: string) => {
  // Check if user already liked the reply
  const { data: existingLike } = await supabase
    .from('reply_likes')
    .select('*')
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // User already liked, so unlike
    const { error } = await supabase
      .from('reply_likes')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // User hasn't liked, so like
    const { error } = await supabase
      .from('reply_likes')
      .insert({
        reply_id: replyId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
};

// ============================================
// REPORT HELPER FUNCTIONS
// ============================================

// Create a new report
export const createReport = async (report: any) => {
  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      ...report,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get reports for a user
export const getUserReports = async (userId: string) => {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Update a report
export const updateReport = async (reportId: string, updates: any) => {
  const { data, error } = await supabase
    .from('content_reports')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// POST IMAGES HELPER FUNCTIONS
// ============================================

// Get images for a post
export const getPostImages = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_images')
    .select('*')
    .eq('post_id', postId)
    .order('image_order', { ascending: true });

  if (error) throw error;
  return data;
};

// Upload multiple images for a post
export const uploadPostImages = async (userId: string, postId: string, uris: string[]) => {
  const uploadedImages = [];
  
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    
    try {
      // Get file extension from URI
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/post-${postId}-${i}.${fileExt}`;

      // Fetch the image as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to ArrayBuffer'));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(fileName);

      // Save to database
      const { data: imageData, error: imageError } = await supabase
        .from('post_images')
        .insert({
          post_id: postId,
          image_url: publicUrlData.publicUrl,
          image_order: i,
        })
        .select()
        .single();

      if (imageError) throw imageError;
      
      uploadedImages.push(imageData);
    } catch (error) {
      console.error(`Error uploading image ${i}:`, error);
      // Continue with other images even if one fails
    }
  }
  
  return uploadedImages;
};

// Delete images for a post
export const deletePostImages = async (postId: string) => {
  // First get all images for the post
  const { data: images, error: fetchError } = await supabase
    .from('post_images')
    .select('*')
    .eq('post_id', postId);

  if (fetchError) throw fetchError;
  
  // Delete each image from storage
  for (const image of images) {
    try {
      // Extract file path from URL
      const urlParts = image.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${urlParts[urlParts.length - 2]}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('community-images')
        .remove([filePath]);
        
      if (error) console.error('Error deleting image from storage:', error);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }
  }
  
  // Delete image records from database
  const { error } = await supabase
    .from('post_images')
    .delete()
    .eq('post_id', postId);

  if (error) throw error;
  return true;
};

// ============================================
// COMMUNITY GUIDELINES HELPER FUNCTIONS
// ============================================

// Get community guidelines
export const getCommunityGuidelines = async () => {
  const { data, error } = await supabase
    .from('community_guidelines')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Update community guidelines
export const updateCommunityGuidelines = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('community_guidelines')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// COMMUNITY SERVICE FUNCTIONS
// ============================================

// Get posts for community service
export const getPosts = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      post_images (
        id,
        image_url,
        image_order
      ),
      post_likes:user_id!post_likes(user_id),
      post_bookmarks:user_id!post_bookmarks(user_id)
    `)
    .neq('user_id', userId) // Exclude user's own posts
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

// Get post with comments for community service
export const getPostWithComments = async (postId: string, userId: string) => {
  // Get the post
  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      post_images (
        id,
        image_url,
        image_order
      ),
      post_likes:user_id!post_likes(user_id),
      post_bookmarks:user_id!post_bookmarks(user_id)
    `)
    .eq('id', postId)
    .single();

  if (postError) throw postError;

  // Get comments for the post
  const { data: comments, error: commentsError } = await supabase
    .from('post_comments')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      comment_likes:user_id!comment_likes(user_id),
      comment_replies (
        id,
        content,
        user_id,
        created_at,
        updated_at,
        profiles:user_id (
          full_name,
          avatar_url
        ),
        reply_likes:user_id!reply_likes(user_id)
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  return { post, comments };
};

// Create post for community service
export const createPost = async (post: any) => {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      ...post,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update post for community service
export const updatePost = async (postId: string, updates: any) => {
  const { data, error } = await supabase
    .from('community_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete post for community service
export const deletePost = async (postId: string) => {
  // Delete images first
  await deletePostImages(postId);
  
  // Then delete the post
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  return true;
};

// Toggle post like for community service
export const togglePostLike = async (postId: string, userId: string) => {
  // Check if user already liked the post
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    // User already liked, so unlike
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
    // User hasn't liked, so like
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) throw error;
    return true;
  }
};

// Create comment for community service
export const createComment = async (comment: any) => {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      ...comment,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get user posts for community service
export const getUserPosts = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      post_images (
        id,
        image_url,
        image_order
      ),
      post_likes:user_id!post_likes(user_id),
      post_bookmarks:user_id!post_bookmarks(user_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

// ============================================
// REALTIME SUBSCRIPTION FUNCTIONS
// ============================================

// Subscribe to posts changes
export const subscribeToPosts = (userId: string, callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('posts_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'community_posts',
        filter: `user_id=neq.${userId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
};

// Subscribe to comments changes
export const subscribeToComments = (postId: string, callback: (payload: any) => void) => {
  const subscription = supabase
    .channel(`comments_${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
};

// Unsubscribe from channel
export const unsubscribeFromChannel = (subscription: any) => {
  supabase.removeChannel(subscription);
};

// Unsubscribe from all channels
export const unsubscribeFromAll = () => {
  supabase.removeAllChannels();
};