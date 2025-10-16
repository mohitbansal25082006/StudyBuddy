// F:\StudyBuddy\src\screens\progress\ProgressScreen.tsx
// ============================================
// PROGRESS SCREEN WITH REAL-TIME TRACKING
// Beautiful progress tracking with charts and real-time session updates
// ============================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Modal,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getFlashcards } from '../../services/supabase';
import { SubjectProgress, StudySession, Flashcard } from '../../types';
import { ProgressChart } from '../../components/ProgressChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

export const ProgressScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { 
    subjectProgress, 
    studySessions, 
    fetchSubjectProgress, 
    fetchStudySessions,
    progressLoading 
  } = useStudyStore();
  const { 
    activeSession, 
    updateDuration, 
    todayFlashcardReviews, 
    todayCorrectAnswers, 
    todayIncorrectAnswers 
  } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'pie'>('line');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notReviewedToday, setNotReviewedToday] = useState<Flashcard[]>([]);
  const [reviewedToday, setReviewedToday] = useState<Flashcard[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
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

  // Animate components on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      // Fetch data from study store
      await fetchSubjectProgress(user.id);
      await fetchStudySessions(user.id, 10);
      
      // Get all flashcards
      const allFlashcards = await getFlashcards(user.id);
      setFlashcards(allFlashcards);
      
      // Filter flashcards based on review status
      const userFlashcards = allFlashcards.filter(card => card.user_id === user.id);
      const notReviewed = userFlashcards.filter(card => !wasReviewedToday(card));
      const reviewed = userFlashcards.filter(card => wasReviewedToday(card));
      
      setNotReviewedToday(notReviewed);
      setReviewedToday(reviewed);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [user, fetchSubjectProgress, fetchStudySessions]);

  // Calculate total study time
  const getTotalStudyTime = () => {
    let totalMinutes = subjectProgress.reduce((total, subject) => total + subject.total_minutes, 0);
    
    // Add current session time if active
    if (activeSession && activeSession.isRunning) {
      totalMinutes += Math.floor(activeSession.duration / 60);
    }
    
    return totalMinutes;
  };

  // Calculate total sessions
  const getTotalSessions = () => {
    return subjectProgress.reduce((total, subject) => total + subject.session_count, 0);
  };

  // Calculate average accuracy
  const getAverageAccuracy = () => {
    if (subjectProgress.length === 0) return 0;
    
    const totalAccuracy = subjectProgress.reduce((total, subject) => total + subject.accuracy_rate, 0);
    return Math.round(totalAccuracy / subjectProgress.length);
  };

  // Calculate flashcard accuracy
  const getFlashcardAccuracy = () => {
    if (todayFlashcardReviews === 0) return 0;
    return Math.round((todayCorrectAnswers / todayFlashcardReviews) * 100);
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
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Handle subject press
  const handleSubjectPress = (subject: string) => {
    setSelectedSubject(subject);
    setShowSubjectModal(true);
  };

  // Handle viewing flashcards
  const handleViewFlashcards = () => {
    setShowSubjectModal(false);
    
    if (selectedSubject) {
      navigation.navigate('Flashcards', { subject: selectedSubject });
    } else {
      navigation.navigate('Flashcards');
    }
  };

  // Get displayed subjects based on show all state
  const getDisplayedSubjects = () => {
    if (showAllSubjects) {
      return subjectProgress;
    }
    return subjectProgress.slice(0, 3);
  };

  // Get displayed sessions based on show all state
  const getDisplayedSessions = () => {
    if (showAllSessions) {
      return studySessions;
    }
    return studySessions.slice(0, 3);
  };

  // Prepare enhanced chart data with study hours for Y-axis
  const getChartData = (): SubjectProgress[] => {
    return subjectProgress.map((subject, index) => {
      const isCurrentlyStudying = activeSession?.subject === subject.subject && activeSession.isRunning;
      const currentSessionMinutes = isCurrentlyStudying ? Math.floor(activeSession.duration / 60) : 0;
      const totalMinutes = subject.total_minutes + currentSessionMinutes;
      
      // Convert minutes to hours for the chart Y-axis
      const studyHours = parseFloat((totalMinutes / 60).toFixed(2));
      
      return {
        ...subject,
        total_minutes: totalMinutes,
        study_hours: studyHours, // Additional field for charts
      } as SubjectProgress & { study_hours: number };
    });
  };

  // Subject colors for progress bars
  const SUBJECT_COLORS = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
    '#10B981', '#14B8A6', '#F97316', '#EF4444'
  ];

  if (loading || progressLoading) {
    return <LoadingSpinner message="Loading progress data..." />;
  }

  return (
    <View style={styles.container}>
      {/* Beautiful Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your learning journey</Text>
        </View>
      </View>

      {/* Active Session Banner */}
      {activeSession && activeSession.isRunning && (
        <Animated.View 
          style={[
            styles.activeSessionBanner,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.activeSessionContent}>
            <View style={styles.activeSessionIndicator} />
            <View style={styles.activeSessionInfo}>
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
          </View>
          <TouchableOpacity
            style={styles.activeSessionButton}
            onPress={() => navigation.navigate('Subjects')}
          >
            <Text style={styles.activeSessionButtonText}>View</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']} // Android color for the refresh indicator
            tintColor="#6366F1" // iOS color for the refresh indicator
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Text style={styles.statIconText}>⏱️</Text>
            </View>
            <Text style={styles.statValue}>
              {activeSession && activeSession.isRunning
                ? formatTime(activeSession.duration)
                : formatStudyTime(getTotalStudyTime())
              }
            </Text>
            <Text style={styles.statLabel}>
              {activeSession && activeSession.isRunning ? "Current Session" : "Total Study Time"}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Text style={styles.statIconText}>📚</Text>
            </View>
            <Text style={styles.statValue}>{getTotalSessions()}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Text style={styles.statIconText}>🎯</Text>
            </View>
            <Text style={styles.statValue}>{getAverageAccuracy()}%</Text>
            <Text style={styles.statLabel}>Avg. Accuracy</Text>
          </View>
        </View>

        {/* Flashcard Stats */}
        <View style={styles.flashcardStatsContainer}>
          <View style={styles.flashcardStatsHeader}>
            <Text style={styles.flashcardStatsTitle}>Today's Flashcard Progress</Text>
            <View style={styles.flashcardStatsIcon}>
              <Text style={styles.flashcardStatsIconText}>🃏</Text>
            </View>
          </View>
          
          <View style={styles.flashcardStatsGrid}>
            <View style={styles.flashcardStatItem}>
              <Text style={styles.flashcardStatValue}>{todayFlashcardReviews}</Text>
              <Text style={styles.flashcardStatLabel}>Reviewed</Text>
            </View>
            
            <View style={styles.flashcardStatItem}>
              <Text style={styles.flashcardStatValue}>{getFlashcardAccuracy()}%</Text>
              <Text style={styles.flashcardStatLabel}>Accuracy</Text>
            </View>
            
            <View style={styles.flashcardStatItem}>
              <Text style={styles.flashcardStatValue}>{notReviewedToday.length}</Text>
              <Text style={styles.flashcardStatLabel}>Not Reviewed</Text>
            </View>
            
            <View style={styles.flashcardStatItem}>
              <Text style={styles.flashcardStatValue}>{reviewedToday.length}</Text>
              <Text style={styles.flashcardStatLabel}>Reviewed</Text>
            </View>
          </View>
        </View>

        {/* Chart Type Selector */}
        <View style={styles.chartTypeContainer}>
          <Text style={styles.sectionTitle}>Progress Visualization</Text>
          <View style={styles.chartTypeButtons}>
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                chartType === 'line' && styles.selectedChartTypeButton,
              ]}
              onPress={() => setChartType('line')}
            >
              <Text
                style={[
                  styles.chartTypeButtonText,
                  chartType === 'line' && styles.selectedChartTypeButtonText,
                ]}
              >
                Line
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                chartType === 'pie' && styles.selectedChartTypeButton,
              ]}
              onPress={() => setChartType('pie')}
            >
              <Text
                style={[
                  styles.chartTypeButtonText,
                  chartType === 'pie' && styles.selectedChartTypeButtonText,
                ]}
              >
                Pie
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Chart with Study Hours Data */}
        {subjectProgress.length > 0 ? (
          <View style={styles.chartContainer}>
            <ProgressChart data={getChartData()} type={chartType} />
          </View>
        ) : (
          <View style={styles.emptyChartContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>📊</Text>
            </View>
            <Text style={styles.emptyText}>No data to display</Text>
            <Text style={styles.emptySubtext}>Start studying to see your progress chart</Text>
          </View>
        )}

        {/* Subject Progress */}
        <View style={styles.subjectsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subject Progress</Text>
            {subjectProgress.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllSubjects(!showAllSubjects)}>
                <Text style={styles.viewAllButton}>
                  {showAllSubjects ? 'View Less' : 'View All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {subjectProgress.length > 0 ? (
            getDisplayedSubjects().map((subject, index) => (
              <View key={subject.subject} style={styles.subjectItem}>
                <View style={styles.subjectItemHeader}>
                  <View style={styles.subjectItemInfo}>
                    <Text style={styles.subjectItemName}>{subject.subject}</Text>
                    <Text style={styles.subjectItemTime}>
                      {activeSession?.subject === subject.subject && activeSession.isRunning
                        ? formatTime(activeSession.duration)
                        : formatStudyTime(subject.total_minutes)
                      }
                    </Text>
                  </View>
                  <View style={styles.subjectItemIcon}>
                    <Text style={styles.subjectItemIconText}>📖</Text>
                  </View>
                </View>
                <View style={styles.subjectProgressBar}>
                  <View 
                    style={[
                      styles.subjectProgressFill, 
                      { 
                        width: `${Math.min((subject.total_minutes / 180) * 100, 100)}%`,
                        backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
                      }
                    ]} 
                  />
                </View>
                <View style={styles.subjectItemStats}>
                  <View style={styles.subjectItemStat}>
                    <Text style={styles.subjectItemStatValue}>{subject.session_count}</Text>
                    <Text style={styles.subjectItemStatLabel}>sessions</Text>
                  </View>
                  <View style={styles.subjectItemStat}>
                    <Text style={styles.subjectItemStatValue}>{subject.flashcard_count}</Text>
                    <Text style={styles.subjectItemStatLabel}>cards</Text>
                  </View>
                  <View style={styles.subjectItemStat}>
                    <Text style={styles.subjectItemStatValue}>{subject.accuracy_rate}%</Text>
                    <Text style={styles.subjectItemStatLabel}>accuracy</Text>
                  </View>
                </View>
                {activeSession?.subject === subject.subject && activeSession.isRunning && (
                  <View style={styles.currentlyStudyingBadge}>
                    <Text style={styles.currentlyStudyingText}>• Currently studying</Text>
                  </View>
                )}
                <View style={styles.subjectItemActions}>
                  <TouchableOpacity
                    style={styles.subjectItemButton}
                    onPress={() => handleSubjectPress(subject.subject)}
                  >
                    <Text style={styles.subjectItemButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📚</Text>
              </View>
              <Text style={styles.emptyText}>No progress data available</Text>
              <Text style={styles.emptySubtext}>Start studying to see your progress here</Text>
            </View>
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.sessionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
            {studySessions.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllSessions(!showAllSessions)}>
                <Text style={styles.viewAllButton}>
                  {showAllSessions ? 'View Less' : 'View All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {studySessions.length > 0 ? (
            getDisplayedSessions().map((session, index) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionSubjectContainer}>
                    <Text style={styles.sessionSubject}>{session.subject}</Text>
                    <View style={[styles.sessionTypeBadge, { backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length] + '20' }]}>
                      <Text style={[styles.sessionTypeText, { color: SUBJECT_COLORS[index % SUBJECT_COLORS.length] }]}>
                        {session.session_type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sessionDuration}>{formatStudyTime(session.duration_minutes)}</Text>
                </View>
                <View style={styles.sessionFooter}>
                  <Text style={styles.sessionDate}>
                    {new Date(session.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                  <View style={styles.sessionProgress}>
                    <View style={styles.sessionProgressBar}>
                      <View 
                        style={[
                          styles.sessionProgressFill, 
                          { 
                            width: `${Math.min((session.duration_minutes / 60) * 100, 100)}%`,
                            backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>📝</Text>
              </View>
              <Text style={styles.emptyText}>No study sessions yet</Text>
              <Text style={styles.emptySubtext}>Start studying to see your sessions here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Subject Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSubjectModal}
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSubject || 'Subject Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedSubject && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.subjectDetailHeader}>
                  <View style={styles.subjectDetailIcon}>
                    <Text style={styles.subjectDetailIconText}>📚</Text>
                  </View>
                  <Text style={styles.subjectDetailName}>{selectedSubject}</Text>
                </View>
                
                <View style={styles.subjectDetailStats}>
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Total Study Time</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {formatStudyTime(
                        subjectProgress.find(s => s.subject === selectedSubject)?.total_minutes || 0
                      )}
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Study Hours</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {((subjectProgress.find(s => s.subject === selectedSubject)?.total_minutes || 0) / 60).toFixed(1)}h
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Total Sessions</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {subjectProgress.find(s => s.subject === selectedSubject)?.session_count || 0}
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Flashcards</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {subjectProgress.find(s => s.subject === selectedSubject)?.flashcard_count || 0}
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Accuracy Rate</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {subjectProgress.find(s => s.subject === selectedSubject)?.accuracy_rate || 0}%
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Not Reviewed Today</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {notReviewedToday.filter(card => card.subject === selectedSubject).length}
                    </Text>
                  </View>
                  
                  <View style={styles.subjectDetailStat}>
                    <Text style={styles.subjectDetailStatLabel}>Reviewed Today</Text>
                    <Text style={styles.subjectDetailStatValue}>
                      {reviewedToday.filter(card => card.subject === selectedSubject).length}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.subjectDetailActions}>
                  <TouchableOpacity
                    style={styles.subjectDetailButton}
                    onPress={handleViewFlashcards}
                  >
                    <Text style={styles.subjectDetailButtonText}>View Flashcards</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Beautiful Header
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  // Active Session Banner
  activeSessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  activeSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activeSessionIndicator: {
    width: 4,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginRight: 12,
  },
  activeSessionInfo: {
    flex: 1,
  },
  activeSessionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  activeSessionSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
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
    color: '#64748B',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Flashcard Stats
  flashcardStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  flashcardStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flashcardStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  flashcardStatsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashcardStatsIconText: {
    fontSize: 20,
  },
  flashcardStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  flashcardStatItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  flashcardStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  flashcardStatLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Chart Type
  chartTypeContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  chartTypeButton: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    marginHorizontal: 10,
  },
  selectedChartTypeButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chartTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedChartTypeButtonText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  emptyChartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  // Subject Progress
  subjectsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  subjectItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  subjectItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectItemInfo: {
    flex: 1,
  },
  subjectItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subjectItemTime: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  subjectItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectItemIconText: {
    fontSize: 20,
  },
  subjectProgressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectItemStat: {
    alignItems: 'center',
  },
  subjectItemStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subjectItemStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  currentlyStudyingBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  currentlyStudyingText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  subjectItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  subjectItemButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  subjectItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Sessions
  sessionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  sessionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionSubjectContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginRight: 8,
  },
  sessionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  sessionProgress: {
    flex: 1,
    marginLeft: 12,
  },
  sessionProgressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Empty States
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    fontSize: 28,
    color: '#64748B',
    fontWeight: '300',
  },
  subjectDetailHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  subjectDetailIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectDetailIconText: {
    fontSize: 32,
  },
  subjectDetailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  subjectDetailStats: {
    marginBottom: 24,
  },
  subjectDetailStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
  },
  subjectDetailStatLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  subjectDetailStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subjectDetailActions: {
    marginTop: 8,
  },
  subjectDetailButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subjectDetailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});