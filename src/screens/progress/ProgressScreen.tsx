// F:\StudyBuddy\src\screens\progress\ProgressScreen.tsx
// ============================================
// PROGRESS SCREEN WITH REAL-TIME TRACKING
// Progress tracking with charts and real-time session updates
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getSubjectProgress, getStudySessions } from '../../services/supabase';
import { SubjectProgress, StudySession } from '../../types';
import { ProgressChart } from '../../components/ProgressChart';
import { SubjectItem } from '../../components/SubjectItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const ProgressScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { subjectProgress, studySessions, fetchSubjectProgress, fetchStudySessions } = useStudyStore();
  const { activeSession, updateDuration } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchSubjectProgress(user.id);
        
        // Get recent study sessions
        const sessions = await getStudySessions(user.id, 10);
        setRecentSessions(sessions);
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
    navigation.navigate('Flashcards', { subject });
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
              {activeSession && activeSession.isRunning ? 'Current Session' : 'Total Study Time'}
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
                    <Text style={styles.subjectItemButtonText}>View Flashcards</Text>
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
});