// F:\StudyBuddy\src\store\sessionStore.ts
// ============================================
// ZUSTAND SESSION STORE
// Global state for active study sessions
// ============================================

import { create } from 'zustand';
import { StudySession } from '../types';

interface ActiveSession {
  id: string;
  subject: string;
  startTime: Date;
  duration: number; // in seconds
  isRunning: boolean;
  type: 'study_plan' | 'flashcards' | 'review';
}

interface SessionState {
  activeSession: ActiveSession | null;
  todaySessions: StudySession[];
  todayFlashcardReviews: number;
  todayCorrectAnswers: number;
  todayIncorrectAnswers: number;
  
  // Actions
  startSession: (subject: string, type: 'study_plan' | 'flashcards' | 'review') => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void; // Changed from endSession to stopSession
  updateDuration: () => void;
  updateTodaySessions: (sessions: StudySession[]) => void;
  incrementFlashcardReviews: (correct: boolean) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  todaySessions: [],
  todayFlashcardReviews: 0,
  todayCorrectAnswers: 0,
  todayIncorrectAnswers: 0,
  
  startSession: (subject, type) => {
    const newSession: ActiveSession = {
      id: Date.now().toString(),
      subject,
      startTime: new Date(),
      duration: 0,
      isRunning: true,
      type,
    };
    
    set({ activeSession: newSession });
  },
  
  pauseSession: () => {
    const { activeSession } = get();
    if (activeSession && activeSession.isRunning) {
      set({
        activeSession: {
          ...activeSession,
          isRunning: false,
        }
      });
    }
  },
  
  resumeSession: () => {
    const { activeSession } = get();
    if (activeSession && !activeSession.isRunning) {
      set({
        activeSession: {
          ...activeSession,
          isRunning: true,
        }
      });
    }
  },
  
  stopSession: () => { // Changed from endSession to stopSession
    set({ activeSession: null });
  },
  
  updateDuration: () => {
    const { activeSession } = get();
    if (activeSession && activeSession.isRunning) {
      const now = new Date();
      const duration = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
      
      set({
        activeSession: {
          ...activeSession,
          duration,
        }
      });
    }
  },
  
  updateTodaySessions: (sessions) => {
    set({ todaySessions: sessions });
  },
  
  incrementFlashcardReviews: (correct) => {
    set(state => ({
      todayFlashcardReviews: state.todayFlashcardReviews + 1,
      todayCorrectAnswers: correct ? state.todayCorrectAnswers + 1 : state.todayCorrectAnswers,
      todayIncorrectAnswers: !correct ? state.todayIncorrectAnswers + 1 : state.todayIncorrectAnswers,
    }));
  },
}));