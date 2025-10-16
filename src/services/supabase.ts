// F:\StudyBuddy\src\services\supabase.ts
// ============================================
// SUPABASE CLIENT CONFIGURATION
// This connects our app to Supabase
// ============================================

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

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

// Get flashcard hint
export const getFlashcardHint = async (cardId: string) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('hint')
    .eq('id', cardId)
    .single();

  if (error) throw error;
  return data.hint || '';
};

// Get flashcard explanation
export const getFlashcardExplanation = async (cardId: string) => {
  const { data, error } = await supabase
    .from('flashcards')
    .select('explanation')
    .eq('id', cardId)
    .single();

  if (error) throw error;
  return data.explanation || '';
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

// Create a new study session
export const createStudySession = async (session: any) => {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      ...session,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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