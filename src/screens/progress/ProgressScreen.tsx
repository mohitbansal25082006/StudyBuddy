// F:\StudyBuddy\src\screens\progress\ProgressScreen.tsx
// ============================================
// PROGRESS SCREEN
// Progress tracking with charts
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { getSubjectProgress, getStudySessions } from '../../services/supabase';
import { SubjectProgress, StudySession } from '../../types';
import { ProgressChart } from '../../components/ProgressChart';
import { SubjectItem } from '../../components/SubjectItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const ProgressScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { subjectProgress, studySessions, fetchSubjectProgress, fetchStudySessions } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);

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
    return subjectProgress.reduce((total, subject) => total + subject.total_minutes, 0);
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

  if (loading) {
    return <LoadingSpinner message="Loading progress data..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      {/* Overall Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatStudyTime(getTotalStudyTime())}</Text>
          <Text style={styles.statLabel}>Total Study Time</Text>
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
            <SubjectItem
              key={subject.subject}
              subject={subject}
              onPress={() => handleSubjectPress(subject.subject)}
            />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    marginBottom: 24,
  },
  sessionsContainer: {
    marginBottom: 24,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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