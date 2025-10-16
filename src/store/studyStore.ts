// F:\StudyBuddy\src\store\studyStore.ts
// ============================================
// ZUSTAND STUDY STORE
// Global state for study-related features
// ============================================

import { create } from 'zustand';
import { 
  StudyPlan, 
  Flashcard, 
  StudySession, 
  CalendarEvent, 
  SubjectProgress,
  StudyPlanForm 
} from '../types';
import { 
  getStudyPlans, 
  getFlashcards, 
  getStudySessions, 
  getCalendarEvents,
  getSubjectProgress,
  getFlashcardsForReview,
  getFlashcardStats
} from '../services/supabase';

interface StudyState {
  // Study Plans
  studyPlans: StudyPlan[];
  currentStudyPlan: StudyPlan | null;
  studyPlansLoading: boolean;
  
  // Flashcards
  flashcards: Flashcard[];
  dueFlashcards: Flashcard[];
  flashcardsLoading: boolean;
  flashcardStats: any;
  
  // Study Sessions
  studySessions: StudySession[];
  studySessionsLoading: boolean;
  
  // Calendar Events
  calendarEvents: CalendarEvent[];
  calendarEventsLoading: boolean;
  
  // Progress
  subjectProgress: SubjectProgress[];
  progressLoading: boolean;
  
  // Actions
  fetchStudyPlans: (userId: string) => Promise<void>;
  setCurrentStudyPlan: (plan: StudyPlan | null) => void;
  fetchFlashcards: (userId: string, subject?: string) => Promise<void>;
  fetchDueFlashcards: (userId: string, subject?: string) => Promise<void>;
  fetchFlashcardStats: (userId: string) => Promise<void>;
  fetchStudySessions: (userId: string, limit?: number) => Promise<void>;
  fetchCalendarEvents: (userId: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchSubjectProgress: (userId: string) => Promise<void>;
  addStudySession: (session: StudySession) => void;
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => void;
  clearStudyData: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  // Initial state
  studyPlans: [],
  currentStudyPlan: null,
  studyPlansLoading: false,
  
  flashcards: [],
  dueFlashcards: [],
  flashcardsLoading: false,
  flashcardStats: null,
  
  studySessions: [],
  studySessionsLoading: false,
  
  calendarEvents: [],
  calendarEventsLoading: false,
  
  subjectProgress: [],
  progressLoading: false,
  
  // Actions
  fetchStudyPlans: async (userId: string) => {
    set({ studyPlansLoading: true });
    try {
      const plans = await getStudyPlans(userId);
      set({ studyPlans: plans, studyPlansLoading: false });
    } catch (error) {
      console.error('Error fetching study plans:', error);
      set({ studyPlansLoading: false });
    }
  },
  
  setCurrentStudyPlan: (plan: StudyPlan | null) => {
    set({ currentStudyPlan: plan });
  },
  
  fetchFlashcards: async (userId: string, subject?: string) => {
    set({ flashcardsLoading: true });
    try {
      const cards = await getFlashcards(userId, subject);
      set({ flashcards: cards, flashcardsLoading: false });
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      set({ flashcardsLoading: false });
    }
  },
  
  fetchDueFlashcards: async (userId: string, subject?: string) => {
    try {
      const cards = await getFlashcardsForReview(userId, subject);
      set({ dueFlashcards: cards });
    } catch (error) {
      console.error('Error fetching due flashcards:', error);
    }
  },
  
  fetchFlashcardStats: async (userId: string) => {
    try {
      const stats = await getFlashcardStats(userId);
      set({ flashcardStats: stats });
    } catch (error) {
      console.error('Error fetching flashcard stats:', error);
    }
  },
  
  fetchStudySessions: async (userId: string, limit?: number) => {
    set({ studySessionsLoading: true });
    try {
      const sessions = await getStudySessions(userId, limit);
      set({ studySessions: sessions, studySessionsLoading: false });
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      set({ studySessionsLoading: false });
    }
  },
  
  fetchCalendarEvents: async (userId: string, startDate?: string, endDate?: string) => {
    set({ calendarEventsLoading: true });
    try {
      const events = await getCalendarEvents(userId, startDate, endDate);
      set({ calendarEvents: events, calendarEventsLoading: false });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      set({ calendarEventsLoading: false });
    }
  },
  
  fetchSubjectProgress: async (userId: string) => {
    set({ progressLoading: true });
    try {
      const progress = await getSubjectProgress(userId);
      set({ subjectProgress: progress, progressLoading: false });
    } catch (error) {
      console.error('Error fetching subject progress:', error);
      set({ progressLoading: false });
    }
  },
  
  addStudySession: (session: StudySession) => {
    const { studySessions } = get();
    set({ studySessions: [session, ...studySessions] });
  },
  
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => {
    const { flashcards, dueFlashcards } = get();
    const updatedCards = flashcards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    const updatedDueCards = dueFlashcards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    set({ flashcards: updatedCards, dueFlashcards: updatedDueCards });
  },
  
  clearStudyData: () => {
    set({
      studyPlans: [],
      currentStudyPlan: null,
      flashcards: [],
      dueFlashcards: [],
      flashcardStats: null,
      studySessions: [],
      calendarEvents: [],
      subjectProgress: [],
    });
  },
}));