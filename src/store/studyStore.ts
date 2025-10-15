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
  getSubjectProgress 
} from '../services/supabase';

interface StudyState {
  // Study Plans
  studyPlans: StudyPlan[];
  currentStudyPlan: StudyPlan | null;
  studyPlansLoading: boolean;
  
  // Flashcards
  flashcards: Flashcard[];
  flashcardsLoading: boolean;
  
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
  fetchStudySessions: (userId: string, limit?: number) => Promise<void>;
  fetchCalendarEvents: (userId: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchSubjectProgress: (userId: string) => Promise<void>;
  addStudySession: (session: StudySession) => void;
  updateFlashcard: (cardId: string, updates: Partial<Flashcard>) => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  // Initial state
  studyPlans: [],
  currentStudyPlan: null,
  studyPlansLoading: false,
  
  flashcards: [],
  flashcardsLoading: false,
  
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
    const { flashcards } = get();
    const updatedCards = flashcards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    set({ flashcards: updatedCards });
  },
}));