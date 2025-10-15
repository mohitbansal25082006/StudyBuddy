// F:\StudyBuddy\src\store\sessionStore.ts
// ============================================
// ZUSTAND SESSION STORE
// Real-time study session tracking
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  // Current active session
  activeSession: {
    subject: string;
    startTime: Date | null;
    isRunning: boolean;
    duration: number; // in seconds
  } | null;
  
  // Today's sessions
  todaySessions: Array<{
    subject: string;
    duration: number; // in minutes
    timestamp: Date;
  }>;
  
  // Actions
  startSession: (subject: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  updateDuration: () => void;
  addCompletedSession: (subject: string, duration: number) => void;
  clearTodaySessions: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeSession: null,
      todaySessions: [],
      
      // Start a new session
      startSession: (subject: string) => {
        set({
          activeSession: {
            subject,
            startTime: new Date(),
            isRunning: true,
            duration: 0,
          }
        });
      },
      
      // Pause the current session
      pauseSession: () => {
        set(state => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              isRunning: false,
            }
          };
        });
      },
      
      // Resume the current session
      resumeSession: () => {
        set(state => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              isRunning: true,
            }
          };
        });
      },
      
      // Stop the current session and add to today's sessions
      stopSession: () => {
        const state = get();
        if (!state.activeSession) return;
        
        const { subject, duration } = state.activeSession;
        const durationMinutes = Math.floor(duration / 60);
        
        // Add to today's sessions
        set(state => ({
          activeSession: null,
          todaySessions: [
            ...state.todaySessions,
            {
              subject,
              duration: durationMinutes,
              timestamp: new Date(),
            }
          ]
        }));
      },
      
      // Update the duration of the current session
      updateDuration: () => {
        const state = get();
        if (!state.activeSession || !state.activeSession.startTime || !state.activeSession.isRunning) return;
        
        const now = new Date();
        const duration = Math.floor((now.getTime() - state.activeSession.startTime.getTime()) / 1000);
        
        set({
          activeSession: {
            ...state.activeSession,
            duration,
          }
        });
      },
      
      // Add a completed session (from backend sync)
      addCompletedSession: (subject: string, duration: number) => {
        set(state => ({
          todaySessions: [
            ...state.todaySessions,
            {
              subject,
              duration,
              timestamp: new Date(),
            }
          ]
        }));
      },
      
      // Clear today's sessions (called at midnight)
      clearTodaySessions: () => {
        set({ todaySessions: [] });
      },
    }),
    {
      name: 'session-storage',
      // Only persist the active session state, not the timer
      partialize: (state) => ({
        activeSession: state.activeSession ? {
          ...state.activeSession,
          startTime: state.activeSession.startTime?.toISOString() || null,
        } : null,
      }),
    }
  )
);