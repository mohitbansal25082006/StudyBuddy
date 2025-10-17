// F:\StudyBuddy\src\screens\home\HomeScreen.tsx
// ============================================
// HOME SCREEN - ADVANCED VERSION WITH REAL-TIME TRACKING
// Enhanced dashboard with rich features and real-time session tracking
// ============================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl, 
  Animated, 
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  Share,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getCalendarEvents, getStudySessions, getFlashcards, getSubjectProgress, getStudyPlans } from '../../services/supabase';
import { CalendarEvent, StudySession, Flashcard, SubjectProgress, StudyPlan } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Button } from '../../components/Button';
import { CalendarEventComponent } from '../../components/CalendarEvent';
import { StudyPlanCard } from '../../components/StudyPlanCard';
import { AIReminderGenerator } from '../../components/calendar/AIReminderGenerator';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Motivational quotes
const MOTIVATIONAL_QUOTES = [
  "The expert in anything was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The beautiful thing about learning is that nobody can take it away from you.",
  "Education is the passport to the future.",
  "Learning never exhausts the mind.",
];

// Study tips
const STUDY_TIPS = [
  "Take breaks every 25-30 minutes to maintain focus",
  "Stay hydrated and have healthy snacks nearby",
  "Create a dedicated study space free from distractions",
  "Use active recall techniques for better retention",
  "Teach what you've learned to someone else",
];

// Subject colors for visual distinction
const SUBJECT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
  '#10B981', '#14B8A6', '#F97316', '#EF4444'
];

// AsyncStorage keys
const WEEKLY_GOAL_KEY = 'studyBuddy_weeklyGoal';
const TODAY_REMINDER_KEY = 'studyBuddy_todayReminder';
const REMINDER_DATE_KEY = 'studyBuddy_reminderDate';
const DISMISSED_REMINDER_KEY = 'studyBuddy_dismissedReminder';

export const HomeScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { 
    studySessions, 
    calendarEvents, 
    addStudySession, 
    getAIReminder, 
    generateAIReminderForEvent,
    setAIReminder,
    aiReminders
  } = useStudyStore();
  const { 
    activeSession, 
    todaySessions, 
    todayFlashcardReviews, 
    todayCorrectAnswers, 
    todayIncorrectAnswers,
    updateDuration 
  } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notReviewedToday, setNotReviewedToday] = useState<Flashcard[]>([]);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(300); // 5 hours default
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [studyStreak, setStudyStreak] = useState(0);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [recentStudyPlans, setRecentStudyPlans] = useState<StudyPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // AI Reminder state
  const [todayReminder, setTodayReminder] = useState<string | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderEvent, setReminderEvent] = useState<CalendarEvent | null>(null);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [showReminderGenerator, setShowReminderGenerator] = useState(false);
  const [selectedEventForReminder, setSelectedEventForReminder] = useState<CalendarEvent | null>(null);
  const [dismissedForToday, setDismissedForToday] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Set up timer for real-time updates
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Listen for changes in AI reminders from the store
  useEffect(() => {
    // Check if any of today's events have reminders
    if (todayEvents.length > 0) {
      const today = new Date().toDateString();
      
      // Check if we have a reminder for today in AsyncStorage
      AsyncStorage.getItem(REMINDER_DATE_KEY).then(savedReminderDate => {
        if (savedReminderDate === today) {
          AsyncStorage.getItem(TODAY_REMINDER_KEY).then(savedReminder => {
            if (savedReminder) {
              setTodayReminder(savedReminder);
            }
          });
        }
      });
      
      // Check if we have dismissed the reminder for today
      AsyncStorage.getItem(DISMISSED_REMINDER_KEY).then(dismissedDate => {
        if (dismissedDate === today) {
          setDismissedForToday(true);
        } else {
          setDismissedForToday(false);
        }
      });
      
      // Check if any of today's events have reminders in the store
      const eventWithReminder = todayEvents.find(event => aiReminders[event.id]);
      if (eventWithReminder && aiReminders[eventWithReminder.id]) {
        setTodayReminder(aiReminders[eventWithReminder.id]);
        setReminderEvent(eventWithReminder);
        
        // Save to AsyncStorage for persistence
        AsyncStorage.setItem(TODAY_REMINDER_KEY, aiReminders[eventWithReminder.id]);
        AsyncStorage.setItem(REMINDER_DATE_KEY, today);
      }
    }
  }, [aiReminders, todayEvents]);
  
  // Load weekly goal from AsyncStorage
  const loadWeeklyGoal = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);
      if (savedGoal) {
        setWeeklyGoal(parseInt(savedGoal));
      }
    } catch (error) {
      console.error('Error loading weekly goal:', error);
    }
  };
  
  // Save weekly goal to AsyncStorage
  const saveWeeklyGoal = async (goal: number) => {
    try {
      await AsyncStorage.setItem(WEEKLY_GOAL_KEY, goal.toString());
    } catch (error) {
      console.error('Error saving weekly goal:', error);
    }
  };
  
  // Load today's reminder from AsyncStorage
  const loadTodayReminder = async () => {
    try {
      const savedReminderDate = await AsyncStorage.getItem(REMINDER_DATE_KEY);
      const today = new Date().toDateString();
      
      // Check if we have a reminder for today
      if (savedReminderDate === today) {
        const savedReminder = await AsyncStorage.getItem(TODAY_REMINDER_KEY);
        if (savedReminder) {
          setTodayReminder(savedReminder);
          return;
        }
      }
      
      // Check if we have dismissed the reminder for today
      const dismissedDate = await AsyncStorage.getItem(DISMISSED_REMINDER_KEY);
      if (dismissedDate === today) {
        setDismissedForToday(true);
        return;
      } else {
        setDismissedForToday(false);
      }
      
      // If no reminder for today, try to get one from today's events
      await generateTodayReminder();
    } catch (error) {
      console.error('Error loading today reminder:', error);
    }
  };
  
  // Generate a reminder for today
  const generateTodayReminder = async () => {
    if (!user || todayEvents.length === 0) return;
    
    setReminderLoading(true);
    try {
      // Get the first event for today that doesn't have a reminder yet
      const eventWithoutReminder = todayEvents.find(event => !getAIReminder(event.id));
      
      if (eventWithoutReminder) {
        // Generate a new reminder for this event
        const reminder = await generateAIReminderForEvent(
          eventWithoutReminder.id,
          eventWithoutReminder.title,
          eventWithoutReminder.subject
        );
        
        // Save the reminder for today
        const today = new Date().toDateString();
        await AsyncStorage.setItem(TODAY_REMINDER_KEY, reminder);
        await AsyncStorage.setItem(REMINDER_DATE_KEY, today);
        
        setTodayReminder(reminder);
        setReminderEvent(eventWithoutReminder);
      } else if (todayEvents.length > 0) {
        // Use an existing reminder from today's events
        const eventWithReminder = todayEvents.find(event => getAIReminder(event.id));
        if (eventWithReminder) {
          const reminder = getAIReminder(eventWithReminder.id);
          if (reminder) {
            // Save the reminder for today
            const today = new Date().toDateString();
            await AsyncStorage.setItem(TODAY_REMINDER_KEY, reminder);
            await AsyncStorage.setItem(REMINDER_DATE_KEY, today);
            
            setTodayReminder(reminder);
            setReminderEvent(eventWithReminder);
          }
        }
      }
    } catch (error) {
      console.error('Error generating today reminder:', error);
    } finally {
      setReminderLoading(false);
    }
  };
  
  // Update today's reminder
  const updateTodayReminder = async (newReminder: string) => {
    try {
      // Update the reminder in the store
      if (reminderEvent) {
        setAIReminder(reminderEvent.id, newReminder);
      }
      
      // Update the reminder in AsyncStorage
      const today = new Date().toDateString();
      await AsyncStorage.setItem(TODAY_REMINDER_KEY, newReminder);
      await AsyncStorage.setItem(REMINDER_DATE_KEY, today);
      
      // Update the local state
      setTodayReminder(newReminder);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating today reminder:', error);
    }
  };
  
  // Regenerate today's reminder
  const regenerateTodayReminder = async () => {
    if (!user || todayEvents.length === 0) return;
    
    // Select a random event from today's events
    const randomEvent = todayEvents[Math.floor(Math.random() * todayEvents.length)];
    setSelectedEventForReminder(randomEvent);
    setShowReminderGenerator(true);
    setShowReminderOptions(false);
  };
  
  // Handle reminder generated from the AI Reminder Generator
  const handleReminderGenerated = (eventId: string, reminder: string) => {
    // Update the reminder in the store
    setAIReminder(eventId, reminder);
    
    // Update the reminder in AsyncStorage
    const today = new Date().toDateString();
    AsyncStorage.setItem(TODAY_REMINDER_KEY, reminder);
    AsyncStorage.setItem(REMINDER_DATE_KEY, today);
    
    // Update the local state
    setTodayReminder(reminder);
    
    // Find the event with the given ID
    const event = todayEvents.find(e => e.id === eventId);
    if (event) {
      setReminderEvent(event);
    }
    
    // Reset dismissed state
    setDismissedForToday(false);
    AsyncStorage.removeItem(DISMISSED_REMINDER_KEY);
    
    // Close the reminder generator
    setShowReminderGenerator(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  // Handle dismissing the reminder for today
  const handleDismissForToday = () => {
    const today = new Date().toDateString();
    AsyncStorage.setItem(DISMISSED_REMINDER_KEY, today);
    setDismissedForToday(true);
    setShowReminderOptions(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  // Handle temporarily dismissing the reminder (will reappear on refresh)
  const handleTemporarilyDismiss = () => {
    setTodayReminder(null);
    setReminderEvent(null);
    setShowReminderOptions(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  useEffect(() => {
    timerRef.current = setInterval(() => {
      updateDuration();
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [updateDuration]);

  // Helper function to check if a card was reviewed today
  const wasReviewedToday = (card: Flashcard): boolean => {
    if (!card.last_reviewed) return false;
    
    const lastReviewed = new Date(card.last_reviewed);
    const today = new Date();
    
    // Check if the card was reviewed today (same day)
    return (
      lastReviewed.getFullYear() === today.getFullYear() &&
      lastReviewed.getMonth() === today.getMonth() &&
      lastReviewed.getDate() === today.getDate()
    );
  };

  // Load study plans
  const loadStudyPlans = async () => {
    if (!user) return;
    
    setLoadingPlans(true);
    try {
      const plans = await getStudyPlans(user.id);
      // Sort by creation date and take the most recent 3
      const sortedPlans = plans.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 3);
      setRecentStudyPlans(sortedPlans);
    } catch (error) {
      console.error('Error loading study plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load data
  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load weekly goal from storage
      await loadWeeklyGoal();
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      // Get week start and end
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      // Get today's calendar events
      const events = await getCalendarEvents(user.id, startOfDay, endOfDay);
      setTodayEvents(events);
      
      // Get recent study sessions (last 5)
      const sessions = await getStudySessions(user.id, 10);
      setRecentSessions(sessions);
      
      // Get all flashcards
      const allFlashcards = await getFlashcards(user.id);
      setFlashcards(allFlashcards);
      
      // Filter flashcards that haven't been reviewed today
      const userFlashcards = allFlashcards.filter(card => card.user_id === user.id);
      const notReviewed = userFlashcards.filter(card => !wasReviewedToday(card));
      setNotReviewedToday(notReviewed);
      
      // Get subject progress
      const progress = await getSubjectProgress(user.id);
      setSubjectProgress(progress);
      
      // Calculate today's study time
      const todaySessions = sessions.filter(session => {
        const sessionDate = new Date(session.completed_at);
        return sessionDate.toDateString() === today.toDateString();
      });
      
      const totalMinutes = todaySessions.reduce((total, session) => total + session.duration_minutes, 0);
      setTodayStudyTime(totalMinutes);
      
      // Calculate weekly progress
      const weekSessions = sessions.filter(session => {
        const sessionDate = new Date(session.completed_at);
        return sessionDate >= weekStart && sessionDate < weekEnd;
      });
      
      const weeklyMinutes = weekSessions.reduce((total, session) => total + session.duration_minutes, 0);
      setWeeklyProgress(weeklyMinutes);
      
      // Calculate study streak
      const streak = calculateStudyStreak(sessions);
      setStudyStreak(streak);
      
      // Load study plans
      await loadStudyPlans();
      
      // Load today's reminder
      await loadTodayReminder();
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Set random quote
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setCurrentQuote(randomQuote);
    
    // Set random tip
    const randomTip = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)];
    setCurrentTip(randomTip);
  }, [user]);

  // Calculate study streak
  const calculateStudyStreak = (sessions: StudySession[]) => {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < 30; i++) {
      const hasSessionOnDay = sessions.some(session => {
        const sessionDate = new Date(session.completed_at);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });
      
      if (hasSessionOnDay) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // No session today, check yesterday
        currentDate.setDate(currentDate.getDate() - 1);
        const hasSessionYesterday = sessions.some(session => {
          const sessionDate = new Date(session.completed_at);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === currentDate.getTime();
        });
        
        if (!hasSessionYesterday) break;
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Reset dismissed state on refresh
    setDismissedForToday(false);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Handle sharing progress
  const handleShareProgress = async () => {
    const totalHours = Math.floor(weeklyProgress / 60);
    const totalMins = weeklyProgress % 60;
    
    const message = `📚 StudyBuddy Progress\n\n🔥 Study Streak: ${studyStreak} days\n⏰ Today's Study: ${activeSession && activeSession.isRunning ? formatTime(activeSession.duration) : formatStudyTime(todayStudyTime)}\n📊 Weekly Progress: ${totalHours}h ${totalMins}m\n📖 Subjects: ${subjectProgress.length}\n🗂️ Cards Not Reviewed Today: ${notReviewedToday.length}\n📝 Flashcards Reviewed: ${todayFlashcardReviews}\n✅ Correct Answers: ${todayCorrectAnswers}\n❌ Incorrect Answers: ${todayIncorrectAnswers}\n\n#StudyBuddy #LearningProgress`;
    
    try {
      await Share.share({
        message,
        title: 'My StudyBuddy Progress',
      });
    } catch (error) {
      console.error('Error sharing progress:', error);
    }
  };

  // Handle updating weekly goal
  const handleUpdateGoal = () => {
    if (!newGoal.trim()) {
      Alert.alert('Error', 'Please enter a valid goal');
      return;
    }
    
    const goalMinutes = parseInt(newGoal);
    if (isNaN(goalMinutes) || goalMinutes <= 0) {
      Alert.alert('Error', 'Please enter a valid number of minutes');
      return;
    }
    
    setWeeklyGoal(goalMinutes);
    saveWeeklyGoal(goalMinutes); // Save to AsyncStorage
    setShowGoalModal(false);
    setNewGoal('');
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Weekly goal updated successfully');
  };

  // Handle creating a new study plan
  const handleCreateStudyPlan = () => {
    navigation.navigate('StudyPlan');
  };

  // Handle viewing a study plan
  const handleViewStudyPlan = (planId: string) => {
    navigation.navigate('StudyPlanDetail', { planId });
  };

  // Handle starting a study plan
  const handleStartStudyPlan = (planId: string) => {
    navigation.navigate('StudyPlanDetail', { planId, startSession: true });
  };

  // Handle viewing the event associated with the reminder
  const handleViewReminderEvent = () => {
    if (reminderEvent) {
      navigation.navigate('EditEvent', { eventId: reminderEvent.id });
    }
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    // Include active session time if running
    const currentProgress = weeklyProgress + (activeSession && activeSession.isRunning ? Math.floor(activeSession.duration / 60) : 0);
    return Math.min(Math.round((currentProgress / weeklyGoal) * 100), 100);
  };

  // Get progress color
  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 80) return '#10B981';
    if (percentage >= 50) return '#F59E0B';
    return '#EF4444';
  };

  // Get flashcard accuracy
  const getFlashcardAccuracy = () => {
    if (todayFlashcardReviews === 0) return 0;
    return Math.round((todayCorrectAnswers / todayFlashcardReviews) * 100);
  };

  // Get session type icon and color
  const getSessionTypeInfo = (sessionType: string) => {
    switch (sessionType) {
      case 'study_plan':
        return { icon: '📚', color: '#6366F1', label: 'Study Plan' };
      case 'flashcards':
        return { icon: '🗂️', color: '#10B981', label: 'Flashcards' };
      case 'review':
        return { icon: '📝', color: '#F59E0B', label: 'Review' };
      default:
        return { icon: '📖', color: '#8B5CF6', label: 'Study' };
    }
  };

  // Get subject color
  const getSubjectColor = (subject: string) => {
    const index = subjectProgress.findIndex(p => p.subject === subject);
    return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  };

  // Render AI Reminder Component
  const renderAIReminder = () => {
    if (!todayReminder || dismissedForToday) return null;
    
    return (
      <Animated.View 
        style={[
          styles.aiReminderWrapper,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiReminderGradient}
        >
          <View style={styles.reminderHeader}>
            <View style={styles.reminderTitleContainer}>
              <Text style={styles.reminderIcon}>✨</Text>
              <Text style={styles.reminderTitle}>Today's AI Reminder</Text>
            </View>
            <View style={styles.reminderActions}>
              <TouchableOpacity 
                onPress={() => setShowReminderOptions(true)} 
                style={styles.reminderOptionButton}
              >
                <Text style={styles.reminderOptionButtonText}>⋯</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTemporarilyDismiss} style={styles.dismissButton}>
                <Text style={styles.dismissButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.reminderContent}>
            <Text style={styles.reminderText}>{todayReminder}</Text>
            
            {reminderEvent && (
              <TouchableOpacity 
                style={styles.reminderEventButton}
                onPress={handleViewReminderEvent}
              >
                <Text style={styles.reminderEventButtonText}>View Related Event</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.reminderFooter}>
            <View style={styles.reminderDot} />
            <Text style={styles.reminderFooterText}>Generated by AI for you today</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render Study Plans section
  const renderStudyPlansSection = () => (
    <Animated.View style={[styles.studyPlansContainer, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🤖 AI Study Plans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StudyPlan')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      
      {loadingPlans ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading study plans..." />
        </View>
      ) : recentStudyPlans.length > 0 ? (
        <View>
          {recentStudyPlans.map((plan) => (
            <StudyPlanCard
              key={plan.id}
              studyPlan={plan}
              onPress={() => handleViewStudyPlan(plan.id)}
              onStartPlan={() => handleStartStudyPlan(plan.id)}
              showStartButton={true}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyText}>No AI study plans yet</Text>
          <Text style={styles.emptySubtext}>Create your first personalized study plan</Text>
          <Button
            title="✨ Create AI Study Plan"
            onPress={handleCreateStudyPlan}
            style={styles.emptyButton}
          />
        </View>
      )}
    </Animated.View>
  );

  // Render subject progress item
  const renderSubjectProgress = ({ item, index }: { item: SubjectProgress; index: number }) => {
    // Check if this subject is currently being studied
    const isCurrentlyStudying = activeSession?.subject === item.subject && activeSession.isRunning;
    const currentSessionTime = isCurrentlyStudying ? activeSession.duration : 0;
    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    
    // Calculate progress percentage based on weekly goal
    const subjectWeeklyMinutes = item.total_minutes; // This would ideally be filtered by week
    const progressPercentage = Math.min((subjectWeeklyMinutes / 120) * 100, 100); // Assuming 2h per subject weekly
    
    return (
      <TouchableOpacity 
        style={[
          styles.subjectProgressItem,
          isCurrentlyStudying && { 
            borderColor: color, 
            borderWidth: 2,
            shadowColor: color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}
        onPress={() => {
          setSelectedSubject(item.subject);
          if (isCurrentlyStudying) {
            navigation.navigate('Subjects');
          } else {
            navigation.navigate('Subjects', { subject: item.subject });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.subjectProgressHeader}>
          <View style={styles.subjectProgressTitleContainer}>
            <Text style={[styles.subjectProgressName, { color }]}>{item.subject}</Text>
            {isCurrentlyStudying && (
              <View style={[styles.activeIndicator, { backgroundColor: color }]}>
                <Text style={styles.activeIndicatorText}>LIVE</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subjectProgressTime, { color }]}>
            {isCurrentlyStudying && currentSessionTime
              ? formatTime(currentSessionTime)
              : formatStudyTime(item.total_minutes)
            }
          </Text>
        </View>
        
        <View style={styles.subjectProgressBar}>
          <View 
            style={[
              styles.subjectProgressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: color
              }
            ]} 
          />
        </View>
        
        <View style={styles.subjectProgressStats}>
          <View style={styles.subjectProgressStat}>
            <Text style={styles.subjectProgressStatValue}>{item.session_count}</Text>
            <Text style={styles.subjectProgressStatLabel}>Sessions</Text>
          </View>
          
          <View style={styles.subjectProgressStat}>
            <Text style={styles.subjectProgressStatValue}>{item.flashcard_count}</Text>
            <Text style={styles.subjectProgressStatLabel}>Cards</Text>
          </View>
          
          <View style={styles.subjectProgressStat}>
            <Text style={styles.subjectProgressStatValue}>{item.accuracy_rate}%</Text>
            <Text style={styles.subjectProgressStatLabel}>Accuracy</Text>
          </View>
          
          {isCurrentlyStudying && (
            <View style={styles.subjectProgressStat}>
              <Text style={styles.subjectProgressStatValue}>{formatTime(currentSessionTime)}</Text>
              <Text style={styles.subjectProgressStatLabel}>Current</Text>
            </View>
          )}
        </View>
        
        {isCurrentlyStudying && (
          <View style={styles.liveSessionContainer}>
            <Text style={styles.liveSessionText}>Session in progress</Text>
            <TouchableOpacity 
              style={[styles.viewSessionButton, { backgroundColor: color }]}
              onPress={() => navigation.navigate('Subjects')}
            >
              <Text style={styles.viewSessionButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render recent study session
  const renderRecentSession = ({ item, index }: { item: StudySession; index: number }) => {
    const sessionTypeInfo = getSessionTypeInfo(item.session_type);
    const subjectColor = getSubjectColor(item.subject);
    
    // Calculate when the session was completed
    const sessionDate = new Date(item.completed_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateText = '';
    if (sessionDate.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (sessionDate.toDateString() === yesterday.toDateString()) {
      dateText = 'Yesterday';
    } else {
      dateText = sessionDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    
    return (
      <Animated.View
        style={[
          styles.sessionCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionSubjectContainer}>
            <View style={[styles.sessionSubjectIndicator, { backgroundColor: subjectColor }]} />
            <Text style={styles.sessionSubject}>{item.subject}</Text>
          </View>
          <View style={styles.sessionTypeContainer}>
            <Text style={styles.sessionTypeIcon}>{sessionTypeInfo.icon}</Text>
            <Text style={[styles.sessionTypeLabel, { color: sessionTypeInfo.color }]}>
              {sessionTypeInfo.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.sessionDetails}>
          <View style={styles.sessionDurationContainer}>
            <Text style={styles.sessionDurationValue}>{formatStudyTime(item.duration_minutes)}</Text>
            <Text style={styles.sessionDurationLabel}>Duration</Text>
          </View>
          
          <View style={styles.sessionDateContainer}>
            <Text style={styles.sessionDateValue}>{dateText}</Text>
            <Text style={styles.sessionDateLabel}>
              {sessionDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
          </View>
        </View>
        
        <View style={styles.sessionCardFooter}>
          <View style={styles.sessionProgressBar}>
            <View 
              style={[
                styles.sessionProgressFill, 
                { 
                  width: `${Math.min((item.duration_minutes / 60) * 100, 100)}%`,
                  backgroundColor: sessionTypeInfo.color
                }
              ]} 
            />
          </View>
          <Text style={styles.sessionProgressText}>
            {item.duration_minutes < 60 
              ? `${item.duration_minutes} min` 
              : `${Math.floor(item.duration_minutes / 60)}h ${item.duration_minutes % 60}m`
            }
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header with Profile Button */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Student'}!</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setShowQuoteModal(true)} 
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>💡</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleShareProgress} 
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>📤</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowProfileModal(true)} 
              style={styles.profileButton}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profilePlaceholderText}>
                    {profile?.full_name?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* AI Reminder */}
        {reminderLoading ? (
          <View style={[styles.aiReminderWrapper, styles.reminderLoading]}>
            <LoadingSpinner message="Generating your AI reminder..." />
          </View>
        ) : (
          renderAIReminder()
        )}

        {/* Active Session Banner */}
        {activeSession && activeSession.isRunning && (
          <Animated.View 
            style={[
              styles.activeSessionBanner, 
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.activeSessionContent}>
              <Text style={styles.activeSessionTitle}>Currently Studying</Text>
              <Text style={styles.activeSessionSubject}>{activeSession.subject}</Text>
              <Text style={styles.activeSessionTimer}>{formatTime(activeSession.duration)}</Text>
              
              {activeSession.type === 'flashcards' && (
                <View style={styles.flashcardStats}>
                  <Text style={styles.flashcardStatsText}>
                    Reviewed: {todayFlashcardReviews} | Correct: {todayCorrectAnswers} | Accuracy: {getFlashcardAccuracy()}%
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.activeSessionButton}
              onPress={() => navigation.navigate('Subjects')}
            >
              <Text style={styles.activeSessionButtonText}>View</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Today's Stats */}
        <Animated.View 
          style={[
            styles.statsContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {activeSession && activeSession.isRunning
                ? formatTime(activeSession.duration)
                : formatStudyTime(todayStudyTime)
              }
            </Text>
            <Text style={styles.statLabel}>
              {activeSession && activeSession.isRunning ? "Current Session" : "Today's Study"}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{notReviewedToday.length}</Text>
            <Text style={styles.statLabel}>Cards Not Reviewed Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{studyStreak}</Text>
            <Text style={styles.statLabel}>Day Streak 🔥</Text>
          </View>
        </Animated.View>

        {/* Flashcard Review Stats */}
        {(todayFlashcardReviews > 0 || activeSession?.type === 'flashcards') && (
          <Animated.View style={[styles.flashcardStatsContainer, { opacity: fadeAnim }]}>
            <Text style={styles.flashcardStatsTitle}>Today's Flashcard Review</Text>
            
            <View style={styles.flashcardStatsGrid}>
              <View style={styles.flashcardStatItem}>
                <Text style={styles.flashcardStatValue}>{todayFlashcardReviews}</Text>
                <Text style={styles.flashcardStatLabel}>Cards Reviewed</Text>
              </View>
              
              <View style={styles.flashcardStatItem}>
                <Text style={styles.flashcardStatValue}>{getFlashcardAccuracy()}%</Text>
                <Text style={styles.flashcardStatLabel}>Accuracy</Text>
              </View>
              
              <View style={styles.flashcardStatItem}>
                <Text style={styles.flashcardStatValue}>{todayCorrectAnswers}</Text>
                <Text style={styles.flashcardStatLabel}>Correct</Text>
              </View>
              
              <View style={styles.flashcardStatItem}>
                <Text style={styles.flashcardStatValue}>{todayIncorrectAnswers}</Text>
                <Text style={styles.flashcardStatLabel}>Incorrect</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Weekly Goal Progress */}
        <Animated.View style={[styles.weeklyGoalContainer, { opacity: fadeAnim }]}>
          <View style={styles.weeklyGoalHeader}>
            <Text style={styles.weeklyGoalTitle}>Weekly Goal</Text>
            <TouchableOpacity onPress={() => setShowGoalModal(true)}>
              <Text style={styles.editGoalText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.weeklyGoalProgress}>
            <Text style={styles.weeklyGoalText}>
              {formatStudyTime(weeklyProgress + (activeSession && activeSession.isRunning ? Math.floor(activeSession.duration / 60) : 0))} / {formatStudyTime(weeklyGoal)}
            </Text>
            <Text style={[styles.weeklyGoalPercentage, { color: getProgressColor() }]}>
              {getProgressPercentage()}%
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${getProgressPercentage()}%`,
                  backgroundColor: getProgressColor()
                }
              ]} 
            />
          </View>
          
          {/* Live session indicator in weekly goal */}
          {activeSession && activeSession.isRunning && (
            <View style={styles.liveSessionIndicator}>
              <View style={styles.liveSessionDot} />
              <Text style={styles.liveSessionText}>
                Currently studying: {activeSession.subject} - {formatTime(activeSession.duration)}
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            onPress={() => setShowTipModal(true)}
            style={styles.tipButton}
          >
            <Text style={styles.tipButtonText}>💡 Study Tip</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {/* First Row - Primary Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('Subjects')}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.primaryActionButtonGradient}
              >
                <Text style={styles.primaryActionButtonIcon}>📖</Text>
                <Text style={styles.primaryActionButtonText}>
                  {activeSession && activeSession.isRunning ? "View Session" : "Start Study Session"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={() => navigation.navigate('Flashcards')}
            >
              <LinearGradient
                colors={['#10B981', '#14B8A6']}
                style={styles.primaryActionButtonGradient}
              >
                <Text style={styles.primaryActionButtonIcon}>🗂️</Text>
                <Text style={styles.primaryActionButtonText}>Review Flashcards</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Second Row - Navigation Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate('StudyPlan')}
            >
              <LinearGradient
                colors={['#F59E0B', '#F97316']}
                style={styles.secondaryActionButtonGradient}
              >
                <Text style={styles.secondaryActionButtonIcon}>📚</Text>
                <Text style={styles.secondaryActionButtonText}>Study Plans</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <LinearGradient
                colors={['#EC4899', '#F472B6']}
                style={styles.secondaryActionButtonGradient}
              >
                <Text style={styles.secondaryActionButtonIcon}>📅</Text>
                <Text style={styles.secondaryActionButtonText}>Calendar</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate('Progress')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                style={styles.secondaryActionButtonGradient}
              >
                <Text style={styles.secondaryActionButtonIcon}>📊</Text>
                <Text style={styles.secondaryActionButtonText}>Progress</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Study Plans Section */}
        {renderStudyPlansSection()}

        {/* Subject Progress */}
        {subjectProgress.length > 0 && (
          <Animated.View style={[styles.subjectProgressContainer, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subject Progress</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Subjects')}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={subjectProgress.slice(0, 3)}
              renderItem={renderSubjectProgress}
              keyExtractor={item => item.subject}
              scrollEnabled={false}
              ListHeaderComponent={
                <View style={{ height: 10 }} />
              }
            />
          </Animated.View>
        )}

        {/* Today's Schedule */}
        <Animated.View style={[styles.scheduleContainer, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todayEvents.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {todayEvents.length > 0 ? (
            todayEvents.map(event => (
              <CalendarEventComponent
                key={event.id}
                event={event}
                onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events scheduled for today</Text>
              <Button
                title="Add Event"
                onPress={() => navigation.navigate('AddEvent')}
                variant="outline"
                style={styles.emptyButton}
              />
            </View>
          )}
        </Animated.View>

        {/* Recent Study Sessions */}
        <Animated.View style={[styles.sessionsContainer, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
            {recentSessions.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {recentSessions.length > 0 ? (
            <FlatList
              data={recentSessions.slice(0, 3)}
              renderItem={renderRecentSession}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              ListHeaderComponent={
                <View style={{ height: 10 }} />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No study sessions yet</Text>
              <Button
                title="Start Studying"
                onPress={() => navigation.navigate('Subjects')}
                variant="outline"
                style={styles.emptyButton}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileContent}>
              <View style={styles.profileAvatarContainer}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarPlaceholder}>
                    <Text style={styles.profileAvatarPlaceholderText}>
                      {profile?.full_name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.profileName}>{profile?.full_name || 'Student'}</Text>
              <Text style={styles.profileEmail}>{profile?.email || 'No email'}</Text>
              
              <View style={styles.profileStats}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatValue}>{studyStreak}</Text>
                  <Text style={styles.profileStatLabel}>Day Streak</Text>
                </View>
                
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatValue}>
                    {activeSession && activeSession.isRunning
                      ? formatTime(activeSession.duration)
                      : formatStudyTime(todayStudyTime)
                    }
                  </Text>
                  <Text style={styles.profileStatLabel}>
                    {activeSession && activeSession.isRunning ? 'Current' : 'Today'}
                  </Text>
                </View>
                
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatValue}>{subjectProgress.length}</Text>
                  <Text style={styles.profileStatLabel}>Subjects</Text>
                </View>
              </View>
              
              <View style={styles.profileActions}>
                <Button
                  title="Edit Profile"
                  onPress={() => {
                    setShowProfileModal(false);
                    navigation.navigate('ProfileEdit');
                  }}
                  style={styles.profileActionButton}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quote Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQuoteModal}
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <TouchableOpacity
          style={styles.quoteModalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuoteModal(false)}
        >
          <View style={styles.quoteModal}>
            <Text style={styles.quoteText}>"{currentQuote}"</Text>
            <TouchableOpacity 
              onPress={() => setShowQuoteModal(false)}
              style={styles.quoteCloseButton}
            >
              <Text style={styles.quoteCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tip Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTipModal}
        onRequestClose={() => setShowTipModal(false)}
      >
        <TouchableOpacity
          style={styles.tipModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTipModal(false)}
        >
          <View style={styles.tipModal}>
            <Text style={styles.tipTitle}>💡 Study Tip</Text>
            <Text style={styles.tipText}>{currentTip}</Text>
            <TouchableOpacity 
              onPress={() => setShowTipModal(false)}
              style={styles.tipCloseButton}
            >
              <Text style={styles.tipCloseButtonText}>Thanks!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGoalModal}
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.goalModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Weekly Goal</Text>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.goalLabel}>Weekly study goal (in minutes)</Text>
            <TextInput
              style={styles.goalInput}
              value={newGoal}
              onChangeText={setNewGoal}
              placeholder={weeklyGoal.toString()}
              keyboardType="numeric"
              autoFocus
            />
            
            <View style={styles.goalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowGoalModal(false)}
                variant="outline"
                style={styles.goalButton}
              />
              <Button
                title="Save"
                onPress={handleUpdateGoal}
                style={styles.goalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStatsModal}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Study Statistics</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.statsContent}>
              {subjectProgress.map((subject, index) => {
                // Check if this subject is currently being studied
                const isCurrentlyStudying = activeSession?.subject === subject.subject && activeSession.isRunning;
                const currentSessionTime = isCurrentlyStudying ? activeSession.duration : 0;
                const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                
                return (
                  <View key={subject.subject} style={styles.statsSubjectItem}>
                    <View style={styles.statsSubjectHeader}>
                      <Text style={[styles.statsSubjectName, { color }]}>{subject.subject}</Text>
                      {isCurrentlyStudying && (
                        <View style={[styles.statsActiveIndicator, { backgroundColor: color }]}>
                          <Text style={styles.statsActiveIndicatorText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.statsSubjectDetails}>
                      <View style={styles.statsSubjectDetailRow}>
                        <Text style={styles.statsSubjectDetailLabel}>Total Time:</Text>
                        <Text style={styles.statsSubjectDetailValue}>
                          {isCurrentlyStudying && currentSessionTime
                            ? formatTime(currentSessionTime)
                            : formatStudyTime(subject.total_minutes)
                          }
                        </Text>
                      </View>
                      
                      <View style={styles.statsSubjectDetailRow}>
                        <Text style={styles.statsSubjectDetailLabel}>Sessions:</Text>
                        <Text style={styles.statsSubjectDetailValue}>{subject.session_count}</Text>
                      </View>
                      
                      <View style={styles.statsSubjectDetailRow}>
                        <Text style={styles.statsSubjectDetailLabel}>Flashcards:</Text>
                        <Text style={styles.statsSubjectDetailValue}>{subject.flashcard_count}</Text>
                      </View>
                      
                      <View style={styles.statsSubjectDetailRow}>
                        <Text style={styles.statsSubjectDetailLabel}>Accuracy:</Text>
                        <Text style={styles.statsSubjectDetailValue}>{subject.accuracy_rate}%</Text>
                      </View>
                      
                      {isCurrentlyStudying && (
                        <View style={styles.statsCurrentSession}>
                          <Text style={styles.statsCurrentSessionText}>
                            Currently studying for {formatTime(currentSessionTime)}
                          </Text>
                          <TouchableOpacity 
                            style={[styles.statsViewSessionButton, { backgroundColor: color }]}
                            onPress={() => {
                              setShowStatsModal(false);
                              navigation.navigate('Subjects');
                            }}
                          >
                            <Text style={styles.statsViewSessionButtonText}>View Session</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reminder Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReminderOptions}
        onRequestClose={() => setShowReminderOptions(false)}
      >
        <TouchableOpacity
          style={styles.reminderOptionsOverlay}
          activeOpacity={1}
          onPress={() => setShowReminderOptions(false)}
        >
          <View style={styles.reminderOptionsModal}>
            <View style={styles.reminderOptionsHeader}>
              <Text style={styles.reminderOptionsTitle}>Reminder Options</Text>
              <TouchableOpacity onPress={() => setShowReminderOptions(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.reminderOptionsContent}>
              <TouchableOpacity
                style={styles.reminderOptionItem}
                onPress={() => {
                  setShowReminderOptions(false);
                  regenerateTodayReminder();
                }}
              >
                <Text style={styles.reminderOptionIcon}>🔄</Text>
                <Text style={styles.reminderOptionText}>Regenerate Reminder</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reminderOptionItem}
                onPress={() => {
                  setShowReminderOptions(false);
                  navigation.navigate('Calendar');
                }}
              >
                <Text style={styles.reminderOptionIcon}>📅</Text>
                <Text style={styles.reminderOptionText}>Go to Calendar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reminderOptionItem}
                onPress={() => {
                  setShowReminderOptions(false);
                  handleDismissForToday();
                }}
              >
                <Text style={styles.reminderOptionIcon}>🚫</Text>
                <Text style={styles.reminderOptionText}>Dismiss for Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI Reminder Generator Modal */}
      {selectedEventForReminder && (
        <AIReminderGenerator
          visible={showReminderGenerator}
          onClose={() => setShowReminderGenerator(false)}
          eventId={selectedEventForReminder.id}
          eventTitle={selectedEventForReminder.title}
          eventSubject={selectedEventForReminder.subject}
          onReminderGenerated={handleReminderGenerated}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButtonText: {
    fontSize: 20,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  
  // AI Reminder Styles
  aiReminderWrapper: {
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  aiReminderGradient: {
    padding: 20,
    borderRadius: 20,
  },
  reminderLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderOptionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  reminderOptionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reminderContent: {
    marginBottom: 12,
  },
  reminderText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
    fontWeight: '500',
  },
  reminderEventButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  reminderEventButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    opacity: 0.9,
  },
  reminderFooterText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  
  // Reminder Options Modal
  reminderOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderOptionsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  reminderOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderOptionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  reminderOptionsContent: {
    flexDirection: 'column',
  },
  reminderOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reminderOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  reminderOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  
  activeSessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  activeSessionContent: {
    flex: 1,
  },
  activeSessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  activeSessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  activeSessionTimer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  flashcardStats: {
    marginTop: 8,
  },
  flashcardStatsText: {
    fontSize: 12,
    color: '#6366F1',
  },
  activeSessionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeSessionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  flashcardStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  flashcardStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  flashcardStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flashcardStatItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  flashcardStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  flashcardStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  weeklyGoalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  weeklyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyGoalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  editGoalText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  weeklyGoalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyGoalText: {
    fontSize: 16,
    color: '#374151',
  },
  weeklyGoalPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  liveSessionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  liveSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveSessionText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  tipButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tipButtonText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  primaryActionButton: {
    flex: 1,
    height: 70,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  primaryActionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryActionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  primaryActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondaryActionButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  secondaryActionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  secondaryActionButtonIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  secondaryActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  studyPlansContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  subjectProgressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  subjectProgressItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  subjectProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectProgressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectProgressName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  activeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subjectProgressTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  subjectProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectProgressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectProgressStat: {
    alignItems: 'center',
    flex: 1,
  },
  subjectProgressStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  subjectProgressStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  liveSessionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
  },
  viewSessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewSessionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scheduleContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sessionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionSubjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionSubjectIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  sessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTypeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  sessionTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sessionDurationContainer: {
    alignItems: 'center',
  },
  sessionDurationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 2,
  },
  sessionDurationLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionDateContainer: {
    alignItems: 'center',
  },
  sessionDateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  sessionDateLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 12,
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sessionProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  profileContent: {
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarPlaceholderText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  profileActions: {
    width: '100%',
  },
  profileActionButton: {
    marginBottom: 12,
  },
  quoteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  quoteModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 26,
  },
  quoteCloseButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quoteCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  tipModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  tipCloseButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tipCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  goalLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
  },
  goalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  statsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  statsContent: {
    flex: 1,
  },
  statsSubjectItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsSubjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsSubjectName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsActiveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statsActiveIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsSubjectDetails: {
    paddingLeft: 8,
  },
  statsSubjectDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statsSubjectDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsSubjectDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsCurrentSession: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCurrentSessionText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  statsViewSessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statsViewSessionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});