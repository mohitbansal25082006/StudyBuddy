// F:\StudyBuddy\src\screens\progress\ProgressScreen.tsx
// ============================================
// PROGRESS SCREEN WITH REAL-TIME TRACKING
// Progress tracking with charts and real-time session updates
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  Modal,
  FlatList
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getSubjectProgress, getStudySessions, getFlashcards } from '../../services/supabase';
import { SubjectProgress, StudySession, Flashcard } from '../../types';
import { ProgressChart } from '../../components/ProgressChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

export const ProgressScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { subjectProgress, studySessions, fetchSubjectProgress, fetchStudySessions } = useStudyStore();
  const { activeSession, updateDuration, todayFlashcardReviews, todayCorrectAnswers, todayIncorrectAnswers } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notReviewedToday, setNotReviewedToday] = useState<Flashcard[]>([]);
  const [reviewedToday, setReviewedToday] = useState<Flashcard[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  
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
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchSubjectProgress(user.id);
        
        // Get recent study sessions
        const sessions = await getStudySessions(user.id, 10);
        setRecentSessions(sessions);
        
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

    loadData();
  }, [user, fetchSubjectProgress]);

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
    return `${hours}h ${mins}m`;
  };

  // Handle subject press
  const handleSubjectPress = (subject: string) => {
    setSelectedSubject(subject);
    setShowSubjectModal(true);
  };

  // Handle viewing flashcards
  const handleViewFlashcards = () => {
    // Close the modal first
    setShowSubjectModal(false);
    
    // Then navigate to flashcards
    if (selectedSubject) {
      navigation.navigate('Flashcards', { subject: selectedSubject });
    } else {
      navigation.navigate('Flashcards');
    }
  };

  // Render subject progress item with real-time updates
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
    return <LoadingSpinner message="Loading progress data..." />;
  }

  return (
    <View style={styles.container}>
      {/* Active Session Banner */}
      {activeSession && activeSession.isRunning && (
        <View style={styles.activeSessionBanner}>
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
        </View>
      )}
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
        </View>

        {/* Overall Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
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
            <Text style={styles.statValue}>{getTotalSessions()}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getAverageAccuracy()}%</Text>
            <Text style={styles.statLabel}>Avg. Accuracy</Text>
          </View>
        </View>

        {/* Flashcard Stats */}
        <View style={styles.flashcardStatsContainer}>
          <Text style={styles.flashcardStatsTitle}>Today's Flashcard Progress</Text>
          
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
              <Text style={styles.flashcardStatLabel}>Not Reviewed Today</Text>
            </View>
            
            <View style={styles.flashcardStatItem}>
              <Text style={styles.flashcardStatValue}>{reviewedToday.length}</Text>
              <Text style={styles.flashcardStatLabel}>Reviewed Today</Text>
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
                chartType === 'bar' && styles.selectedChartTypeButton,
              ]}
              onPress={() => setChartType('bar')}
            >
              <Text
                style={[
                  styles.chartTypeButtonText,
                  chartType === 'bar' && styles.selectedChartTypeButtonText,
                ]}
              >
                Bar
              </Text>
            </TouchableOpacity>
            
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

        {/* Progress Chart */}
        <ProgressChart data={subjectProgress} type={chartType} />

        {/* Subject Progress */}
        <View style={styles.subjectsContainer}>
          <Text style={styles.sectionTitle}>Subject Progress</Text>
          {subjectProgress.length > 0 ? (
            subjectProgress.map(subject => (
              <View key={subject.subject} style={styles.subjectItem}>
                <View style={styles.subjectItemHeader}>
                  <Text style={styles.subjectItemName}>{subject.subject}</Text>
                  <Text style={styles.subjectItemTime}>
                    {activeSession?.subject === subject.subject && activeSession.isRunning
                      ? formatTime(activeSession.duration)
                      : formatStudyTime(subject.total_minutes)
                    }
                  </Text>
                </View>
                <View style={styles.subjectItemStats}>
                  <Text style={styles.subjectItemStat}>
                    {subject.session_count} sessions
                  </Text>
                  <Text style={styles.subjectItemStat}>
                    {subject.flashcard_count} cards
                  </Text>
                  <Text style={styles.subjectItemStat}>
                    {subject.accuracy_rate}% accuracy
                  </Text>
                  {activeSession?.subject === subject.subject && activeSession.isRunning && (
                    <Text style={styles.currentlyStudyingStat}>
                      Currently studying
                    </Text>
                  )}
                </View>
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
              <Text style={styles.emptyText}>No progress data available</Text>
              <Text style={styles.emptySubtext}>Start studying to see your progress here</Text>
            </View>
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.sessionsContainer}>
          <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
          {recentSessions.length > 0 ? (
            recentSessions.map(session => (
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
              <>
                <View style={styles.subjectDetailHeader}>
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
              </>
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
    backgroundColor: '#F9FAFB',
  },
  activeSessionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
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
  chartTypeContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  chartTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedChartTypeButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chartTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedChartTypeButtonText: {
    color: '#FFFFFF',
  },
  subjectsContainer: {
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
  subjectItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subjectItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subjectItemTime: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  subjectItemStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  subjectItemStat: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 12,
    marginBottom: 4,
  },
  currentlyStudyingStat: {
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  subjectItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
  },
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
  subjectDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  subjectDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subjectDetailStats: {
    marginBottom: 20,
  },
  subjectDetailStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectDetailStatLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  subjectDetailStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subjectDetailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectDetailButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subjectDetailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});