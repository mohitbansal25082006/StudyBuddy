import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { StudyResource } from '../types';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// AUTH HELPER FUNCTIONS
// ============================================

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'studybuddy://reset-password',
  });

  if (error) throw error;
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// ============================================
// PROFILE HELPER FUNCTIONS
// ============================================

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

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

export const uploadAvatar = async (userId: string, uri: string) => {
  try {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const response = await fetch(uri);
    const blob = await response.blob();
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

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

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

export const getStudyPlans = async (userId: string) => {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getStudyPlan = async (planId: string) => {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) throw error;
  return data;
};

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

export const deleteFlashcard = async (cardId: string) => {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', cardId);

  if (error) throw error;
  return true;
};

export const getFlashcardStats = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString();

  try {
    const { data: totalCards, error: totalError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId);

    if (totalError) throw totalError;

    const { data: dueCards, error: dueError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .lte('next_review', new Date().toISOString());

    if (dueError) throw dueError;

    const { data: masteredCards, error: masteredError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .gte('correct_count', 5)
      .gte('review_count', 5);

    if (masteredError) throw masteredError;

    const { data: todaySessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', todayString)
      .eq('session_type', 'flashcards');

    if (sessionsError) throw sessionsError;

    const { data: yesterdaySessions, error: yesterdaySessionsError } = await supabase
      .from('study_sessions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', yesterdayString)
      .lt('completed_at', todayString)
      .eq('session_type', 'flashcards');

    if (yesterdaySessionsError) throw yesterdaySessionsError;

    let currentStreak = 0;
    if (todaySessions.length > 0) {
      currentStreak = 1;
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

export const createStudySession = async (session: any) => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: session.user_id,
        subject: session.subject,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type || 'study_plan',
        notes: session.notes || null,
        completed_at: new Date().toISOString(),
        ...(session.tasks_completed && { tasks_completed: session.tasks_completed }),
        ...(session.resources_used && { resources_used: session.resources_used }),
        ...(session.study_plan_id && { study_plan_id: session.study_plan_id }),
      })
      .select()
      .single();

    if (error) {
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

export const getCalendarEvent = async (eventId: string) => {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return data;
};

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

export const getSubjectProgress = async (userId: string) => {
  const { data: sessions, error: sessionsError } = await supabase
    .from('study_sessions')
    .select('subject, duration_minutes, completed_at')
    .eq('user_id', userId);

  if (sessionsError) throw sessionsError;

  const { data: flashcards, error: flashcardsError } = await supabase
    .from('flashcards')
    .select('subject, review_count, correct_count, created_at')
    .eq('user_id', userId);

  if (flashcardsError) throw flashcardsError;

  const subjectMap = new Map();

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

    if (new Date(session.completed_at) > new Date(subjectData.last_studied)) {
      subjectData.last_studied = session.completed_at;
    }
  });

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

export const getStudyPlanCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('study_plan_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
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

export const getStudyPlanPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('study_plan_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
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

export const addCustomResources = async (planId: string, resources: any[]) => {
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const updatedPlanData = {
    ...plan.plan_data,
    resources: [...plan.plan_data.resources, ...resources],
  };

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

export const addCustomTasks = async (planId: string, weekIndex: number, tasks: any[]) => {
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const updatedPlanData = { ...plan.plan_data };
  updatedPlanData.weeks[weekIndex].tasks = [
    ...updatedPlanData.weeks[weekIndex].tasks,
    ...tasks,
  ];

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

export const rateResource = async (planId: string, resourceId: string, rating: number) => {
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const updatedPlanData = { ...plan.plan_data };
  const resourceIndex = updatedPlanData.resources.findIndex((r: StudyResource) => r.id === resourceId);

  if (resourceIndex !== -1) {
    updatedPlanData.resources[resourceIndex].user_rating = rating;
  }

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

export const addTaskNotes = async (planId: string, weekIndex: number, taskIndex: number, notes: string) => {
  const { data: plan, error: planError } = await supabase
    .from('study_plans')
    .select('plan_data')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const updatedPlanData = { ...plan.plan_data };
  updatedPlanData.weeks[weekIndex].tasks[taskIndex].notes = notes;

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

export const createDetailedStudySession = async (session: any) => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: session.user_id,
        subject: session.subject,
        duration_minutes: session.duration_minutes,
        session_type: session.session_type || 'study_plan',
        notes: session.notes || null,
        completed_at: new Date().toISOString(),
        ...(session.tasks_completed && { tasks_completed: session.tasks_completed }),
        ...(session.resources_used && { resources_used: session.resources_used }),
        ...(session.study_plan_id && { study_plan_id: session.study_plan_id }),
      })
      .select()
      .single();

    if (error) {
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

export const getStudyPlanSessions = async (planId: string) => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('study_plan_id', planId)
      .order('completed_at', { ascending: false });

    if (error) {
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

export const verifyResourceUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error verifying URL:', error);
    return false;
  }
};

// ============================================
// STUDY PLAN RECOMMENDATIONS
// ============================================

export const getRecommendedStudyPlans = async (userId: string, limit: number = 5) => {
  try {
    const preferences = await getStudyPlanPreferences(userId);
    const { data: completedPlans, error: plansError } = await supabase
      .from('study_plans')
      .select('subject, difficulty_level')
      .eq('user_id', userId)
      .eq('completed', true);

    if (plansError) throw plansError;

    let query = supabase
      .from('study_plans')
      .select('*')
      .neq('user_id', userId)
      .eq('public', true)
      .order('rating', { ascending: false })
      .limit(limit * 2);

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
      if (error.code === 'PGRST204') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('study_plans')
          .select('*')
          .neq('user_id', userId)
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
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const getCommunityPostWithComments = async (postId: string, userId: string) => {
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

  const { data: comments, error: commentsError } = await supabase
    .from('post_comments')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      comment_likes:user_id!comment_likes(user_id)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  const processedComments = await Promise.all((comments || []).map(async (comment) => {
    const { data: replies } = await supabase
      .from('comment_replies')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('comment_id', comment.id)
      .order('created_at', { ascending: true });

    const repliesWithLikes = await Promise.all((replies || []).map(async (reply) => {
      const { data: replyLikes } = await supabase
        .from('reply_likes')
        .select('*')
        .eq('reply_id', reply.id)
        .eq('user_id', userId);

      return {
        ...reply,
        liked_by_user: (replyLikes && replyLikes.length > 0) || false,
      };
    }));

    return {
      ...comment,
      liked_by_user: (comment.comment_likes && comment.comment_likes.length > 0) || false,
      replies: repliesWithLikes || [],
    };
  }));

  return { post, comments: processedComments };
};

export const createCommunityPost = async (post: any, imageUris?: string[]) => {
  const { data: newPost, error: postError } = await supabase
    .from('community_posts')
    .insert({
      ...post,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (postError) throw postError;

  if (imageUris && imageUris.length > 0) {
    await uploadPostImages(post.user_id, newPost.id, imageUris);
  }

  return newPost;
};

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

export const deleteCommunityPost = async (postId: string) => {
  await deletePostImages(postId);
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  return true;
};

export const toggleCommunityPostLike = async (postId: string, userId: string) => {
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
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

export const toggleCommentLike = async (commentId: string, userId: string) => {
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('*')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
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

export const deleteComment = async (commentId: string) => {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
  return true;
};

export const uploadPostImage = async (uri: string, userId: string) => {
  try {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/post-${Date.now()}.${fileExt}`;
    const response = await fetch(uri);
    const blob = await response.blob();
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

    const { data, error } = await supabase.storage
      .from('community-images')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

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

export const getUserBookmarks = async (userId: string, limit = 20, offset = 0) => {
  const { data, error } = await supabase
    .from('post_bookmarks')
    .select(`
      id,
      post_id,
      user_id,
      created_at,
      community_posts!post_bookmarks_post_id_fkey (
        id,
        user_id,
        title,
        content,
        image_url,
        tags,
        likes_count,
        comments_count,
        created_at,
        updated_at,
        profiles!community_posts_user_id_fkey (
          full_name,
          avatar_url
        ),
        post_images (
          id,
          image_url,
          image_order,
          created_at
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const togglePostBookmark = async (postId: string, userId: string) => {
  try {
    const { data: existingBookmark, error: checkError } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingBookmark) {
      const { error: deleteError } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      return false;
    } else {
      const { error: insertError } = await supabase
        .from('post_bookmarks')
        .insert({
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        if (insertError.code === '23505') {
          console.warn('Bookmark already exists, treating as success');
          return true;
        }
        throw insertError;
      }
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
};

// ============================================
// REPLY HELPER FUNCTIONS
// ============================================

export const getCommentReplies = async (commentId: string) => {
  const { data, error } = await supabase
    .from('comment_replies')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

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

export const deleteReply = async (replyId: string) => {
  const { error } = await supabase
    .from('comment_replies')
    .delete()
    .eq('id', replyId);

  if (error) throw error;
  return true;
};

export const toggleReplyLike = async (replyId: string, userId: string) => {
  const { data: existingLike } = await supabase
    .from('reply_likes')
    .select('*')
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('reply_likes')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
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

export const getUserReports = async (userId: string) => {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

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

export const getPostImages = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_images')
    .select('*')
    .eq('post_id', postId)
    .order('image_order', { ascending: true });

  if (error) throw error;
  return data;
};

export const uploadPostImages = async (userId: string, postId: string, uris: string[]) => {
  const uploadedImages = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];

    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/post-${postId}-${i}.${fileExt}`;
      const response = await fetch(uri);
      const blob = await response.blob();
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

      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(fileName);

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
    }
  }

  return uploadedImages;
};

export const deletePostImages = async (postId: string) => {
  const { data: images, error: fetchError } = await supabase
    .from('post_images')
    .select('*')
    .eq('post_id', postId);

  if (fetchError) throw fetchError;

  if (images) {
    for (const image of images) {
      try {
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
  }

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
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const getPostWithComments = async (postId: string, userId: string) => {
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

  const { data: comments, error: commentsError } = await supabase
    .from('post_comments')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      comment_likes:user_id!comment_likes(user_id)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  const processedComments = await Promise.all((comments || []).map(async (comment) => {
    const { data: replies } = await supabase
      .from('comment_replies')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('comment_id', comment.id)
      .order('created_at', { ascending: true });

    const repliesWithLikes = await Promise.all((replies || []).map(async (reply) => {
      const { data: replyLikes } = await supabase
        .from('reply_likes')
        .select('*')
        .eq('reply_id', reply.id)
        .eq('user_id', userId);

      return {
        ...reply,
        liked_by_user: (replyLikes && replyLikes.length > 0) || false,
      };
    }));

    return {
      ...comment,
      liked_by_user: (comment.comment_likes && comment.comment_likes.length > 0) || false,
      replies: repliesWithLikes || [],
    };
  }));

  return { post, comments: processedComments };
};

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

export const deletePost = async (postId: string) => {
  await deletePostImages(postId);
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  return true;
};

export const togglePostLike = async (postId: string, userId: string) => {
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return false;
  } else {
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

export const unsubscribeFromChannel = (subscription: any) => {
  supabase.removeChannel(subscription);
};

export const unsubscribeFromAll = () => {
  supabase.removeAllChannels();
};

// ============================================
// Q&A SYSTEM HELPER FUNCTIONS
// ============================================

// Get community questions
export const getCommunityQuestions = async (userId: string, limit = 20, offset = 0, sortBy = 'latest') => {
  try {
    // First, get the questions without the votes
    let query = supabase
      .from('community_questions')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .neq('user_id', userId) // Exclude user's own questions
      .range(offset, offset + limit - 1);

    // Apply sorting
    if (sortBy === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('upvotes', { ascending: false });
    } else if (sortBy === 'unanswered') {
      query = query.eq('has_accepted_answer', false).order('created_at', { ascending: false });
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) throw questionsError;

    // If no questions, return empty array
    if (!questions || questions.length === 0) return [];

    // Get the votes for all these questions in a separate query
    const questionIds = questions.map(q => q.id);
    const { data: votes, error: votesError } = await supabase
      .from('question_votes')
      .select('*')
      .in('question_id', questionIds)
      .eq('user_id', userId);

    if (votesError) throw votesError;

    // Process the votes and add them to the questions
    const questionsWithVotes = questions.map(question => {
      const userVote = votes?.find(vote => vote.question_id === question.id);
      return {
        ...question,
        voted_by_user: userVote?.vote_type || null
      };
    });

    return questionsWithVotes;
  } catch (error) {
    console.error('Error in getCommunityQuestions:', error);
    throw error;
  }
};

// Get a single question with answers
export const getQuestionWithAnswers = async (questionId: string, userId: string) => {
  try {
    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('community_questions')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // Increment view count
    await supabase.rpc('increment_question_views', { question_id: questionId });

    // Get answers for the question
    const { data: answers, error: answersError } = await supabase
      .from('question_answers')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('question_id', questionId)
      .order('is_accepted', { ascending: false })
      .order('upvotes', { ascending: false });

    if (answersError) throw answersError;

    // Get votes for the question
    const { data: questionVotes } = await supabase
      .from('question_votes')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId);

    // Get votes for all answers
    const answerIds = answers?.map(a => a.id) || [];
    const { data: answerVotes } = await supabase
      .from('answer_votes')
      .select('*')
      .in('answer_id', answerIds)
      .eq('user_id', userId);

    // Process answer votes
    const processedAnswers = answers?.map(answer => {
      const userVote = answerVotes?.find(vote => vote.answer_id === answer.id);
      return {
        ...answer,
        voted_by_user: userVote?.vote_type || null
      };
    }) || [];

    return {
      question: {
        ...question,
        voted_by_user: questionVotes?.[0]?.vote_type || null
      },
      answers: processedAnswers
    };
  } catch (error) {
    console.error('Error in getQuestionWithAnswers:', error);
    throw error;
  }
};

export const createQuestion = async (question: any) => {
  const { data, error } = await supabase
    .from('community_questions')
    .insert({
      ...question,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.rpc('award_xp', {
    user_uuid: question.user_id,
    xp_amount: 10,
    source: 'question_asked',
    source_id: data.id
  });

  return data;
};

export const updateQuestion = async (questionId: string, updates: any) => {
  const { data, error } = await supabase
    .from('community_questions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteQuestion = async (questionId: string) => {
  const { error } = await supabase
    .from('community_questions')
    .delete()
    .eq('id', questionId);

  if (error) throw error;
  return true;
};

// Create a comment on a question
export const createQuestionComment = async (comment: any) => {
  try {
    const { data, error } = await supabase
      .from('question_comments')
      .insert({
        ...comment,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in createQuestionComment:', error);
    throw error;
  }
};

// Vote on a question
export const voteOnQuestion = async (questionId: string, userId: string, voteType: 'up' | 'down') => {
  try {
    // Check if user already voted
    const { data: existingVote, error: fetchError } = await supabase
      .from('question_votes')
      .select('*')
      .eq('question_id', questionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // User is removing their vote
        const { error } = await supabase
          .from('question_votes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', userId);

        if (error) throw error;
        return null;
      } else {
        // User is changing their vote
        const { error } = await supabase
          .from('question_votes')
          .update({ voteType })
          .eq('question_id', questionId)
          .eq('user_id', userId);

        if (error) throw error;
        return voteType;
      }
    } else {
      // User is voting for the first time
      const { error } = await supabase
        .from('question_votes')
        .insert({
          question_id: questionId,
          user_id: userId,
          vote_type: voteType
        });

      if (error) throw error;
      return voteType;
    }
  } catch (error) {
    console.error('Error in voteOnQuestion:', error);
    throw error;
  }
};

export const createAnswer = async (answer: any) => {
  const { data, error } = await supabase
    .from('question_answers')
    .insert({
      ...answer,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.rpc('award_xp', {
    user_uuid: answer.user_id,
    xp_amount: 15,
    source: 'answer_given',
    source_id: data.id
  });

  return data;
};

export const updateAnswer = async (answerId: string, updates: any) => {
  const { data, error } = await supabase
    .from('question_answers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', answerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAnswer = async (answerId: string) => {
  const { error } = await supabase
    .from('question_answers')
    .delete()
    .eq('id', answerId);

  if (error) throw error;
  return true;
};

// Vote on an answer
export const voteOnAnswer = async (answerId: string, userId: string, voteType: 'up' | 'down') => {
  try {
    // Check if user already voted
    const { data: existingVote, error: fetchError } = await supabase
      .from('answer_votes')
      .select('*')
      .eq('answer_id', answerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // User is removing their vote
        const { error } = await supabase
          .from('answer_votes')
          .delete()
          .eq('answer_id', answerId)
          .eq('user_id', userId);

        if (error) throw error;
        return null;
      } else {
        // User is changing their vote
        const { error } = await supabase
          .from('answer_votes')
          .update({ voteType })
          .eq('answer_id', answerId)
          .eq('user_id', userId);

        if (error) throw error;
        return voteType;
      }
    } else {
      // User is voting for the first time
      const { error } = await supabase
        .from('answer_votes')
        .insert({
          answer_id: answerId,
          user_id: userId,
          vote_type: voteType
        });

      if (error) throw error;
      return voteType;
    }
  } catch (error) {
    console.error('Error in voteOnAnswer:', error);
    throw error;
  }
};

export const acceptAnswer = async (answerId: string, questionId: string, userId: string) => {
  const { data: question } = await supabase
    .from('community_questions')
    .select('user_id')
    .eq('id', questionId)
    .single();

  if (!question || question.user_id !== userId) {
    throw new Error('You can only accept answers for your own questions');
  }

  await supabase
    .from('question_answers')
    .update({ is_accepted: false })
    .eq('question_id', questionId)
    .neq('id', answerId);

  const { data, error } = await supabase
    .from('question_answers')
    .update({ is_accepted: true })
    .eq('id', answerId)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('community_questions')
    .update({ has_accepted_answer: true })
    .eq('id', questionId);

  return data;
};

// ============================================
// ACHIEVEMENTS & LEADERBOARD HELPER FUNCTIONS
// ============================================

// Get user XP
export const getUserXP = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // If no record exists, create one
    if (!data) {
      const { data: newXp, error: insertError } = await supabase.rpc('award_xp', { 
        user_uuid: userId, 
        xp_amount: 0, 
        source: 'initial_setup', 
        source_id: null 
      });
      
      if (insertError) {
        // If the function doesn't work, try a direct insert
        const { data: directXp, error: directError } = await supabase
          .from('user_xp')
          .insert({
            user_id: userId,
            xp_points: 0,
            level: 1
          })
          .select()
          .single();
        
        if (directError) throw directError;
        return directXp;
      }
      
      // Get the newly created record
      const { data: createdXp, error: fetchError } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (fetchError) throw fetchError;
      return createdXp;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserXP:', error);
    // Return a default XP object if everything fails
    return {
      id: '',
      user_id: userId,
      xp_points: 0,
      level: 1,
      updated_at: new Date().toISOString()
    };
  }
};

export const getUserAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const unlockAchievement = async (userId: string, achievementId: string, achievementName: string, achievementDescription: string, achievementIcon: string) => {
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      achievement_name: achievementName,
      achievement_description: achievementDescription,
      achievement_icon: achievementIcon
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.rpc('award_xp', {
    user_uuid: userId,
    xp_amount: 25,
    source: 'achievement_unlocked',
    source_id: data.id
  });

  return data;
};

// Get leaderboard
export const getLeaderboard = async (limit = 50) => {
  try {
    // First, update the leaderboard
    await supabase.rpc('update_weekly_leaderboard');
    
    // Then get the data
    const { data, error } = await supabase
      .from('weekly_leaderboard')
      .select('*')
      .eq('week_start', new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().split('T')[0]) // Get current week's start date
      .order('xp_points', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    // Fallback to a simple query if the function doesn't work
    try {
      const { data, error: fallbackError } = await supabase
        .from('profiles')
        .select(`
          id as user_id,
          full_name,
          avatar_url,
          user_xp!inner (
            xp_points,
            level
          )
        `)
        .order('user_xp(xp_points)', { ascending: false })
        .limit(limit);

      if (fallbackError) throw fallbackError;
      
      // Transform the data to match the expected format
      return data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.full_name,
        avatar_url: item.avatar_url,
        xp_points: item.user_xp.xp_points,
        level: item.user_xp.level,
        answers_given: 0,
        questions_asked: 0,
        accepted_answers: 0
      }));
    } catch (fallbackError) {
      console.error('Error in fallback leaderboard query:', fallbackError);
      return [];
    }
  }
};

// Get user's rank on leaderboard
export const getUserLeaderboardRank = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_leaderboard_rank', { user_uuid: userId });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getUserLeaderboardRank:', error);
    // Fallback to a simple calculation
    try {
      const { data: allUsers } = await supabase
        .from('user_xp')
        .select('user_id, xp_points')
        .order('xp_points', { ascending: false });

      if (!allUsers) return null;
      
      const userIndex = allUsers.findIndex(user => user.user_id === userId);
      return userIndex >= 0 ? userIndex + 1 : null;
    } catch (fallbackError) {
      console.error('Error in fallback rank calculation:', fallbackError);
      return null;
    }
  }
};

export const getXPTransactions = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};