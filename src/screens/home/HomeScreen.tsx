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
  TextInput
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getCalendarEvents, getStudySessions, getFlashcards, getSubjectProgress } from '../../services/supabase';
import { CalendarEvent, StudySession, Flashcard, SubjectProgress } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Button } from '../../components/Button';
import { CalendarEventComponent } from '../../components/CalendarEvent';
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

export const HomeScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { studySessions, calendarEvents, addStudySession } = useStudyStore();
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Set up timer for real-time updates
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Load data
  const loadData = async () => {
    if (!user) return;
    
    try {
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
    setShowGoalModal(false);
    setNewGoal('');
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Weekly goal updated successfully');
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

  // Render subject progress item
  const renderSubjectProgress = ({ item }: { item: SubjectProgress }) => {
    // Check if this subject is currently being studied
    const isCurrentlyStudying = activeSession?.subject === item.subject && activeSession.isRunning;
    const currentSessionTime = isCurrentlyStudying ? activeSession.duration : 0;
    
    return (
      <View style={styles.subjectProgressItem}>
        <View style={styles.subjectProgressHeader}>
          <Text style={styles.subjectProgressName}>{item.subject}</Text>
          <Text style={styles.subjectProgressTime}>
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
                width: `${Math.min((item.total_minutes / 60) + (isCurrentlyStudying ? currentSessionTime / 60 : 0), 100)}%`,
                backgroundColor: SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]
              }
            ]} 
          />
        </View>
        <Text style={styles.subjectProgressStats}>
          {item.session_count} sessions • {item.flashcard_count} cards • {item.accuracy_rate}% accuracy
          {isCurrentlyStudying && <Text style={styles.currentlyStudyingText}> • Currently studying</Text>}
        </Text>
      </View>
    );
  };

  // Subject colors for progress bars
  const SUBJECT_COLORS = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
    '#10B981', '#14B8A6', '#F97316', '#EF4444'
  ];

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
          <View style={styles.actionButtons}>
            <Button
              title={activeSession && activeSession.isRunning ? "View Session" : "Start Study Session"}
              onPress={() => navigation.navigate('Subjects')}
              style={styles.actionButton}
            />
            <Button
              title="Review Flashcards"
              onPress={() => navigation.navigate('Flashcards')}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>
        </Animated.View>

        {/* Subject Progress */}
        {subjectProgress.length > 0 && (
          <Animated.View style={[styles.subjectProgressContainer, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subject Progress</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(true)}>
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
            recentSessions.slice(0, 3).map(session => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionSubject}>{session.subject}</Text>
                  <Text style={styles.sessionDuration}>{formatStudyTime(session.duration_minutes)}</Text>
                </View>
                <Text style={styles.sessionType}>
                  {session.session_type.replace('_', ' ')}
                </Text>
                <Text style={styles.sessionDate}>
                  {new Date(session.completed_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))
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
              {subjectProgress.map(subject => {
                // Check if this subject is currently being studied
                const isCurrentlyStudying = activeSession?.subject === subject.subject && activeSession.isRunning;
                const currentSessionTime = isCurrentlyStudying ? activeSession.duration : 0;
                
                return (
                  <View key={subject.subject} style={styles.statsSubjectItem}>
                    <Text style={styles.statsSubjectName}>{subject.subject}</Text>
                    <View style={styles.statsSubjectDetails}>
                      <Text style={styles.statsSubjectDetail}>
                        Total Time: {isCurrentlyStudying && currentSessionTime
                          ? formatTime(currentSessionTime)
                          : formatStudyTime(subject.total_minutes)
                        }
                      </Text>
                      <Text style={styles.statsSubjectDetail}>
                        Sessions: {subject.session_count}
                      </Text>
                      <Text style={styles.statsSubjectDetail}>
                        Flashcards: {subject.flashcard_count}
                      </Text>
                      <Text style={styles.statsSubjectDetail}>
                        Accuracy: {subject.accuracy_rate}%
                      </Text>
                      {isCurrentlyStudying && (
                        <Text style={styles.currentlyStudyingDetail}>
                          Currently studying for {formatTime(currentSessionTime)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
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
    marginBottom: 16,
  },
  subjectProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectProgressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subjectProgressTime: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  subjectProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 6,
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectProgressStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  currentlyStudyingText: {
    color: '#10B981',
    fontWeight: '600',
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
  emptyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  sessionType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
  statsSubjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statsSubjectDetails: {
    paddingLeft: 8,
  },
  statsSubjectDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentlyStudyingDetail: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 4,
  },
});