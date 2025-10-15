// F:\StudyBuddy\src\screens\subjects\SubjectsScreen.tsx
// ============================================
// SUBJECTS SCREEN - ADVANCED VERSION WITH REAL-TIME TRACKING
// Enhanced subject management with real-time study tracking
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Animated, 
  Dimensions,
  FlatList,
  TextInput,
  Modal,
  StatusBar,
  RefreshControl,
  Share
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getSubjectProgress, createStudySession, getStudySessions } from '../../services/supabase';
import { SubjectProgress, StudySession } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 180;

// Subject colors for visual distinction
const SUBJECT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
  '#10B981', '#14B8A6', '#F97316', '#EF4444'
];

// Achievement badges
const ACHIEVEMENTS = {
  FIRST_SESSION: { icon: '🌟', title: 'First Session', description: 'Complete your first study session' },
  WEEK_STREAK: { icon: '🔥', title: 'Week Streak', description: 'Study for 7 days in a row' },
  MASTER: { icon: '👑', title: 'Subject Master', description: 'Achieve 90% accuracy in a subject' },
  MARATHON: { icon: '⏰', title: 'Study Marathon', description: 'Study for 3 hours straight' },
};

// Extended subject data interface
interface ExtendedSubjectData {
  subject: string;
  total_minutes: number;
  session_count: number;
  flashcard_count: number;
  accuracy_rate: number;
  last_studied: string;
  color: string;
  recent_sessions: StudySession[];
  average_session_length: number;
  improvement_rate: number;
  study_goal: string;
  isCurrentlyStudying?: boolean;
  currentSessionTime?: number;
}

export const SubjectsScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { subjectProgress, fetchSubjectProgress } = useStudyStore();
  const { 
    activeSession, 
    todaySessions, 
    startSession, 
    pauseSession, 
    resumeSession, 
    stopSession, 
    updateDuration 
  } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'recent'>('recent');
  const [showSortModal, setShowSortModal] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [studyStreak, setStudyStreak] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsSubject, setselectedStatsSubject] = useState<ExtendedSubjectData | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Set up timer for real-time updates
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchSubjectProgress(user.id);
        
        // Get recent sessions
        const sessions = await getStudySessions(user.id, 20);
        setRecentSessions(sessions);
        
        // Calculate stats
        calculateStats(sessions);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading subject data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, fetchSubjectProgress]);

  // Calculate statistics
  const calculateStats = (sessions: StudySession[]) => {
    // Calculate total study time
    const totalMinutes = sessions.reduce((total, session) => total + session.duration_minutes, 0);
    setTotalStudyTime(totalMinutes);
    
    // Calculate study streak
    const streak = calculateStudyStreak(sessions);
    setStudyStreak(streak);
    
    // Check achievements
    checkAchievements(sessions, totalMinutes);
  };

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

  // Check achievements
  const checkAchievements = (sessions: StudySession[], totalMinutes: number) => {
    const newAchievements = [];
    
    if (sessions.length > 0) {
      newAchievements.push('FIRST_SESSION');
    }
    
    if (studyStreak >= 7) {
      newAchievements.push('WEEK_STREAK');
    }
    
    if (totalMinutes >= 180) {
      newAchievements.push('MARATHON');
    }
    
    // Check for subject mastery
    subjectProgress.forEach(subject => {
      if (subject.accuracy_rate >= 90) {
        newAchievements.push('MASTER');
      }
    });
    
    setAchievements([...new Set(newAchievements)]);
  };

  // Get all subjects with enhanced data
  const getAllSubjects = useCallback(() => {
    const profileSubjects = profile?.subjects || [];
    const progressSubjects = subjectProgress.map(p => p.subject);
    
    // Combine and deduplicate
    const allSubjects = [...new Set([...profileSubjects, ...progressSubjects])];
    
    // Add progress data and additional stats
    return allSubjects.map((subject, index) => {
      const progress = subjectProgress.find(p => p.subject === subject);
      const subjectSessions = recentSessions.filter(s => s.subject === subject);
      const lastSession = subjectSessions[0];
      
      // Check if this subject is currently being studied
      const isCurrentlyStudying = activeSession?.subject === subject && activeSession.isRunning;
      const currentSessionTime = isCurrentlyStudying ? activeSession.duration : 0;
      
      return {
        subject,
        total_minutes: progress?.total_minutes || 0,
        session_count: progress?.session_count || 0,
        flashcard_count: progress?.flashcard_count || 0,
        accuracy_rate: progress?.accuracy_rate || 0,
        last_studied: progress?.last_studied || new Date().toISOString(),
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
        recent_sessions: subjectSessions.slice(0, 3),
        average_session_length: subjectSessions.length > 0 
          ? Math.round(subjectSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / subjectSessions.length)
          : 0,
        improvement_rate: calculateImprovementRate(subjectSessions),
        study_goal: getStudyGoal(subject),
        isCurrentlyStudying,
        currentSessionTime,
      };
    });
  }, [profile?.subjects, subjectProgress, recentSessions, activeSession]);

  // Calculate improvement rate
  const calculateImprovementRate = (sessions: StudySession[]) => {
    if (sessions.length < 2) return 0;
    
    const recent = sessions.slice(0, 5);
    const older = sessions.slice(5, 10);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, s) => sum + s.duration_minutes, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.duration_minutes, 0) / older.length;
    
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  };

  // Get study goal for subject
  const getStudyGoal = (subject: string) => {
    // This could be personalized based on user preferences
    const goals: { [key: string]: string } = {
      'Mathematics': 'Complete 5 practice problems daily',
      'Physics': 'Review 2 concepts per session',
      'Chemistry': 'Memorize 10 formulas weekly',
      'Biology': 'Study 1 chapter per week',
      'default': 'Study for 30 minutes daily'
    };
    
    return goals[subject] || goals.default;
  };

  // Filter and sort subjects
  const getFilteredAndSortedSubjects = useCallback(() => {
    let subjects = getAllSubjects();
    
    // Filter by search
    if (searchQuery) {
      subjects = subjects.filter(s => 
        s.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'name':
        subjects.sort((a, b) => a.subject.localeCompare(b.subject));
        break;
      case 'progress':
        subjects.sort((a, b) => b.accuracy_rate - a.accuracy_rate);
        break;
      case 'recent':
        subjects.sort((a, b) => 
          new Date(b.last_studied).getTime() - new Date(a.last_studied).getTime()
        );
        break;
    }
    
    return subjects;
  }, [getAllSubjects, searchQuery, sortBy]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchSubjectProgress(user.id);
      const sessions = await getStudySessions(user.id, 20);
      setRecentSessions(sessions);
      calculateStats(sessions);
    }
    setRefreshing(false);
  };

  // Handle starting a study session
  const handleStartSession = (subject: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSubject(subject);
    startSession(subject);
    setSessionModalVisible(true);
  };

  // Handle completing a study session
  const handleCompleteSession = async () => {
    if (!activeSession || !user) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const durationMinutes = Math.floor(activeSession.duration / 60);

    try {
      // Create study session in database
      await createStudySession({
        user_id: user.id,
        subject: activeSession.subject,
        duration_minutes: durationMinutes,
        session_type: 'study_plan',
        notes: `Study session for ${activeSession.subject}`,
      });

      // Stop the session in the store
      stopSession();

      // Refresh data
      await fetchSubjectProgress(user.id);
      const sessions = await getStudySessions(user.id, 20);
      setRecentSessions(sessions);
      calculateStats(sessions);

      // Close modal
      setSessionModalVisible(false);
      setSelectedSubject(null);

      // Show success message with stats
      Alert.alert(
        'Session Complete! 🎉',
        `Great job! You studied ${activeSession.subject} for ${formatTime(activeSession.duration)}.\n\nKeep up the good work!`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to complete study session');
    }
  };

  // Handle pause/resume timer
  const handleToggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeSession?.isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  // Handle canceling a study session
  const handleCancelSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopSession();
    setSessionModalVisible(false);
    setSelectedSubject(null);
  };

  // Handle sharing progress
  const handleShareProgress = async () => {
    const totalHours = Math.floor(totalStudyTime / 60);
    const totalMins = totalStudyTime % 60;
    
    const message = `📚 StudyBuddy Progress\n\n🔥 Study Streak: ${studyStreak} days\n⏰ Total Study Time: ${totalHours}h ${totalMins}m\n📖 Subjects: ${getAllSubjects().length}\n📊 Avg Accuracy: ${Math.round(subjectProgress.reduce((sum, s) => sum + s.accuracy_rate, 0) / Math.max(subjectProgress.length, 1))}%\n\n#StudyBuddy #LearningProgress`;
    
    try {
      await Share.share({
        message,
        title: 'My StudyBuddy Progress',
      });
    } catch (error) {
      console.error('Error sharing progress:', error);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format study time
  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get progress color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#F59E0B';
    return '#EF4444';
  };

  // Render subject card
  const renderSubjectCard = ({ item, index }: { item: ExtendedSubjectData; index: number }) => {
    const inputRange = [-1, 0, 1];
    const outputRange = [20, 0, -20];
    const translateY = scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.subjectCard,
          {
            transform: [{ translateY }],
            backgroundColor: item.color + '10',
            borderColor: item.color,
            ...(item.isCurrentlyStudying && {
              borderWidth: 3,
              shadowColor: item.color,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            })
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedSubject(expandedSubject === item.subject ? null : item.subject)}
          activeOpacity={0.7}
        >
          <View style={styles.subjectHeader}>
            <View style={styles.subjectTitleContainer}>
              <Text style={[styles.subjectName, { color: item.color }]}>
                {item.subject}
              </Text>
              <View style={[styles.accuracyBadge, { backgroundColor: getProgressColor(item.accuracy_rate) }]}>
                <Text style={styles.accuracyText}>{item.accuracy_rate}%</Text>
              </View>
            </View>
            
            {item.isCurrentlyStudying && (
              <View style={styles.activeSessionIndicator}>
                <Text style={styles.activeSessionText}>STUDYING</Text>
              </View>
            )}
            
            {!item.isCurrentlyStudying && (
              <View style={styles.streakContainer}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>{studyStreak}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {item.isCurrentlyStudying && item.currentSessionTime
                  ? formatTime(item.currentSessionTime)
                  : formatStudyTime(item.total_minutes)
                }
              </Text>
              <Text style={styles.statLabel}>
                {item.isCurrentlyStudying ? 'Current' : 'Total Time'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.session_count}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.flashcard_count}</Text>
              <Text style={styles.statLabel}>Cards</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.average_session_length}m</Text>
              <Text style={styles.statLabel}>Avg Session</Text>
            </View>
          </View>
          
          {item.improvement_rate !== 0 && (
            <View style={styles.improvementContainer}>
              <Text style={styles.improvementLabel}>Improvement</Text>
              <Text style={[
                styles.improvementValue,
                { color: item.improvement_rate > 0 ? '#10B981' : '#EF4444' }
              ]}>
                {item.improvement_rate > 0 ? '+' : ''}{item.improvement_rate}%
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {expandedSubject === item.subject && (
          <Animated.View style={styles.expandedContent}>
            <View style={styles.goalContainer}>
              <Text style={styles.goalLabel}>📌 Study Goal</Text>
              <Text style={styles.goalText}>{item.study_goal}</Text>
            </View>
            
            {item.recent_sessions.length > 0 && (
              <View style={styles.recentSessionsContainer}>
                <Text style={styles.recentSessionsLabel}>Recent Sessions</Text>
                {item.recent_sessions.map((session: StudySession, idx: number) => (
                  <View key={session.id} style={styles.recentSessionItem}>
                    <Text style={styles.recentSessionTime}>
                      {formatStudyTime(session.duration_minutes)}
                    </Text>
                    <Text style={styles.recentSessionDate}>
                      {new Date(session.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.expandedActions}>
              <Button
                title="View Stats"
                onPress={() => {
                  setselectedStatsSubject(item);
                  setShowStatsModal(true);
                }}
                variant="outline"
                style={styles.expandedActionButton}
              />
            </View>
          </Animated.View>
        )}
        
        <View style={styles.actionsContainer}>
          {item.isCurrentlyStudying ? (
            <Button
              title="View Session"
              onPress={() => setSessionModalVisible(true)}
              style={[styles.actionButton, { backgroundColor: item.color }]}
            />
          ) : (
            <Button
              title="Study"
              onPress={() => handleStartSession(item.subject)}
              style={[styles.actionButton, { backgroundColor: item.color }]}
            />
          )}
          
          <Button
            title="Flashcards"
            onPress={() => navigation.navigate('Flashcards', { subject: item.subject })}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Plan"
            onPress={() => navigation.navigate('StudyPlan')}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading subjects..." />;
  }

  const allSubjects = getFilteredAndSortedSubjects();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header with stats */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Subjects</Text>
          <TouchableOpacity onPress={handleShareProgress} style={styles.shareButton}>
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>Track your learning journey</Text>
        
        <View style={styles.overallStats}>
          <View style={styles.overallStatItem}>
            <Text style={styles.overallStatValue}>{studyStreak}</Text>
            <Text style={styles.overallStatLabel}>Day Streak 🔥</Text>
          </View>
          
          <View style={styles.overallStatItem}>
            <Text style={styles.overallStatValue}>
              {activeSession && activeSession.isRunning
                ? formatTime(activeSession.duration)
                : formatStudyTime(totalStudyTime)
              }
            </Text>
            <Text style={styles.overallStatLabel}>
              {activeSession && activeSession.isRunning ? 'Current Session' : 'Total Time'}
            </Text>
          </View>
          
          <View style={styles.overallStatItem}>
            <Text style={styles.overallStatValue}>{allSubjects.length}</Text>
            <Text style={styles.overallStatLabel}>Subjects</Text>
          </View>
        </View>
        
        {/* Active Session Banner */}
        {activeSession && activeSession.isRunning && (
          <View style={styles.activeSessionBanner}>
            <Text style={styles.activeSessionBannerText}>
              Currently studying: {activeSession.subject} - {formatTime(activeSession.duration)}
            </Text>
            <TouchableOpacity
              style={styles.activeSessionBannerButton}
              onPress={() => setSessionModalVisible(true)}
            >
              <Text style={styles.activeSessionBannerButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Achievements */}
        {achievements.length > 0 && (
          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>Recent Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achievements.map(achievement => (
                <View key={achievement} style={styles.achievementBadge}>
                  <Text style={styles.achievementIcon}>
                    {ACHIEVEMENTS[achievement as keyof typeof ACHIEVEMENTS]?.icon}
                  </Text>
                  <Text style={styles.achievementTitle}>
                    {ACHIEVEMENTS[achievement as keyof typeof ACHIEVEMENTS]?.title}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Search and filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Text style={styles.sortIcon}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* Subject list */}
      {allSubjects.length > 0 ? (
        <Animated.FlatList
          data={allSubjects}
          renderItem={renderSubjectCard}
          keyExtractor={item => item.subject}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No subjects found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'Add subjects in your profile to get started'}
          </Text>
          {!searchQuery && (
            <Button
              title="Edit Profile"
              onPress={() => navigation.navigate('ProfileEdit')}
              style={styles.emptyButton}
            />
          )}
        </View>
      )}

      {/* Study Session Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sessionModalVisible}
        onRequestClose={handleCancelSession}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sessionModal, { borderColor: activeSession ? allSubjects.find(s => s.subject === activeSession.subject)?.color : '#6366F1' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Study Session</Text>
              <TouchableOpacity onPress={handleCancelSession} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {activeSession && (
              <View style={styles.modalSubject}>
                <Text style={[styles.modalSubjectName, { color: allSubjects.find(s => s.subject === activeSession.subject)?.color }]}>
                  {activeSession.subject}
                </Text>
                <Text style={styles.modalTimer}>{formatTime(activeSession.duration)}</Text>
              </View>
            )}
            
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>{activeSession ? formatTime(activeSession.duration) : '00:00'}</Text>
              <Text style={styles.timerLabel}>Studying</Text>
            </View>
            
            <View style={styles.sessionActions}>
              <TouchableOpacity
                style={[styles.timerControlButton, { backgroundColor: activeSession?.isRunning ? '#F59E0B' : '#10B981' }]}
                onPress={handleToggleTimer}
              >
                <Text style={styles.timerControlText}>
                  {activeSession?.isRunning ? '⏸️ Pause' : '▶️ Resume'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.timerControlButton, { backgroundColor: '#EF4444' }]}
                onPress={handleCompleteSession}
              >
                <Text style={styles.timerControlText}>🏁 Complete</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.sessionTips}>
              <Text style={styles.tipsTitle}>💡 Study Tips</Text>
              <Text style={styles.tipText}>• Take breaks every 25 minutes</Text>
              <Text style={styles.tipText}>• Stay hydrated</Text>
              <Text style={styles.tipText}>• Keep your phone away</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort Subjects</Text>
            
            {[
              { key: 'name', label: '🔤 Name' },
              { key: 'progress', label: '📊 Progress' },
              { key: 'recent', label: '🕐 Recently Studied' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.selectedSortOption
                ]}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.selectedSortOptionText
                ]}>
                  {option.label}
                </Text>
                {sortBy === option.key && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stats Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStatsModal}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedStatsSubject && (
            <View style={styles.statsModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Subject Statistics</Text>
                <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.statsSubjectName, { color: selectedStatsSubject.color }]}>
                {selectedStatsSubject.subject}
              </Text>
              
              <View style={styles.detailedStats}>
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Total Study Time</Text>
                  <Text style={styles.detailStatValue}>
                    {selectedStatsSubject.isCurrentlyStudying && selectedStatsSubject.currentSessionTime
                      ? formatTime(selectedStatsSubject.currentSessionTime)
                      : formatStudyTime(selectedStatsSubject.total_minutes)
                    }
                  </Text>
                </View>
                
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Total Sessions</Text>
                  <Text style={styles.detailStatValue}>{selectedStatsSubject.session_count}</Text>
                </View>
                
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Flashcards</Text>
                  <Text style={styles.detailStatValue}>{selectedStatsSubject.flashcard_count}</Text>
                </View>
                
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Accuracy Rate</Text>
                  <Text style={styles.detailStatValue}>{selectedStatsSubject.accuracy_rate}%</Text>
                </View>
                
                <View style={styles.detailStatItem}>
                  <Text style={styles.detailStatLabel}>Last Studied</Text>
                  <Text style={styles.detailStatValue}>
                    {new Date(selectedStatsSubject.last_studied).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
              
              <Button
                title="Close"
                onPress={() => setShowStatsModal(false)}
                style={styles.closeStatsButton}
              />
            </View>
          )}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareIcon: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overallStatItem: {
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
  },
  overallStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activeSessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  activeSessionBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    flex: 1,
  },
  activeSessionBannerButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeSessionBannerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  achievementsContainer: {
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sortIcon: {
    fontSize: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 12,
  },
  accuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeSessionIndicator: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeSessionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  improvementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  improvementLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  improvementValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  goalContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#374151',
  },
  recentSessionsContainer: {
    marginBottom: 16,
  },
  recentSessionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  recentSessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  recentSessionTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  recentSessionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandedActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  expandedActionButton: {
    paddingHorizontal: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 3,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalSubject: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalSubjectName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  timerDisplay: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timerControlButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  timerControlText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionTips: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#15803D',
    marginBottom: 4,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#EEF2FF',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedSortOptionText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 16,
    color: '#6366F1',
  },
  statsModal: {
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
  statsSubjectName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailedStats: {
    marginBottom: 24,
  },
  detailStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailStatLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  closeStatsButton: {
    marginTop: 8,
  },
});