// F:\StudyBuddy\src\store\studyStore.ts
// ============================================
// ZUSTAND STUDY STORE
// Global state for study-related features
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  StudyPlan, 
  Flashcard, 
  StudySession, 
  CalendarEvent, 
  SubjectProgress,
  StudyPlanForm,
  AIGeneratedSchedule,
  AIConvertedSchedule,
  AIWeeklySummary
} from '../types';
import { 
  getStudyPlans, 
  getFlashcards, 
  getStudySessions, 
  getCalendarEvents,
  getSubjectProgress,
  getFlashcardsForReview,
  getFlashcardStats,
  createCalendarEvent
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
  
  // AI Calendar Features
  aiGeneratedSchedule: AIGeneratedSchedule | null;
  aiConvertedSchedule: AIConvertedSchedule | null;
  aiWeeklySummary: AIWeeklySummary | null;
  aiFeaturesLoading: boolean;
  aiReminders: { [key: string]: string }; // Store generated reminders by event ID
  
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
  
  // AI Calendar Actions
  setAIGeneratedSchedule: (schedule: AIGeneratedSchedule | null) => void;
  setAIConvertedSchedule: (schedule: AIConvertedSchedule | null) => void;
  setAIWeeklySummary: (summary: AIWeeklySummary | null) => void;
  setAIReminder: (eventId: string, reminder: string) => void;
  addAIGeneratedEvents: (events: CalendarEvent[]) => Promise<void>;
  refreshCalendarEvents: (userId: string) => Promise<void>;
}

type StudyStorePersist = Omit<StudyState, 'fetchStudyPlans' | 'setCurrentStudyPlan' | 'fetchFlashcards' | 'fetchDueFlashcards' | 'fetchFlashcardStats' | 'fetchStudySessions' | 'fetchCalendarEvents' | 'fetchSubjectProgress' | 'addStudySession' | 'updateFlashcard' | 'clearStudyData' | 'setAIGeneratedSchedule' | 'setAIConvertedSchedule' | 'setAIWeeklySummary' | 'setAIReminder' | 'addAIGeneratedEvents' | 'refreshCalendarEvents'>;

const persistOptions: PersistOptions<StudyState, StudyStorePersist> = {
  name: 'study-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state: StudyState): StudyStorePersist => ({
    studyPlans: state.studyPlans,
    currentStudyPlan: state.currentStudyPlan,
    studyPlansLoading: state.studyPlansLoading,
    flashcards: state.flashcards,
    dueFlashcards: state.dueFlashcards,
    flashcardsLoading: state.flashcardsLoading,
    flashcardStats: state.flashcardStats,
    studySessions: state.studySessions,
    studySessionsLoading: state.studySessionsLoading,
    calendarEvents: state.calendarEvents,
    calendarEventsLoading: state.calendarEventsLoading,
    subjectProgress: state.subjectProgress,
    progressLoading: state.progressLoading,
    aiGeneratedSchedule: state.aiGeneratedSchedule,
    aiConvertedSchedule: state.aiConvertedSchedule,
    aiWeeklySummary: state.aiWeeklySummary,
    aiFeaturesLoading: state.aiFeaturesLoading,
    aiReminders: state.aiReminders,
  }),
};

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
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
      
      // AI Calendar Features
      aiGeneratedSchedule: null,
      aiConvertedSchedule: null,
      aiWeeklySummary: null,
      aiFeaturesLoading: false,
      aiReminders: {},
      
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
          console.log('Fetched calendar events:', events);
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
        const updatedCards = flashcards.map((card: Flashcard) => 
          card.id === cardId ? { ...card, ...updates } : card
        );
        const updatedDueCards = dueFlashcards.map((card: Flashcard) => 
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
          aiGeneratedSchedule: null,
          aiConvertedSchedule: null,
          aiWeeklySummary: null,
          aiReminders: {},
        });
      },
      
      // AI Calendar Actions
      setAIGeneratedSchedule: (schedule: AIGeneratedSchedule | null) => {
        set({ aiGeneratedSchedule: schedule });
      },
      
      setAIConvertedSchedule: (schedule: AIConvertedSchedule | null) => {
        set({ aiConvertedSchedule: schedule });
      },
      
      setAIWeeklySummary: (summary: AIWeeklySummary | null) => {
        set({ aiWeeklySummary: summary });
      },
      
      setAIReminder: (eventId: string, reminder: string) => {
        const { aiReminders } = get();
        set({ aiReminders: { ...aiReminders, [eventId]: reminder } });
      },
      
      addAIGeneratedEvents: async (events: CalendarEvent[]) => {
        try {
          // Add each event to the database
          for (const event of events) {
            await createCalendarEvent(event);
          }
          
          // Refresh the calendar events
          const { calendarEvents } = get();
          set({ calendarEvents: [...events, ...calendarEvents] });
        } catch (error) {
          console.error('Error adding AI generated events:', error);
          throw error;
        }
      },
      
      refreshCalendarEvents: async (userId: string) => {
        try {
          // Get current date range
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          // Fetch events for current month
          await get().fetchCalendarEvents(
            userId,
            startOfMonth.toISOString(),
            endOfMonth.toISOString()
          );
        } catch (error) {
          console.error('Error refreshing calendar events:', error);
          throw error;
        }
      },
    }),
    persistOptions
  )
);