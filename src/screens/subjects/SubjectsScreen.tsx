// F:\StudyBuddy\src\screens\subjects\SubjectsScreen.tsx
// ============================================
// SUBJECTS SCREEN
// Subject management and quick study actions
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { getSubjectProgress, createStudySession } from '../../services/supabase';
import { SubjectProgress } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const SubjectsScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { subjectProgress, fetchSubjectProgress } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Load subject progress
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchSubjectProgress(user.id);
      } catch (error) {
        console.error('Error loading subject progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, fetchSubjectProgress]);

  // Get all subjects from profile and progress
  const getAllSubjects = () => {
    const profileSubjects = profile?.subjects || [];
    const progressSubjects = subjectProgress.map(p => p.subject);
    
    // Combine and deduplicate
    const allSubjects = [...new Set([...profileSubjects, ...progressSubjects])];
    
    // Add progress data for each subject
    return allSubjects.map(subject => {
      const progress = subjectProgress.find(p => p.subject === subject);
      return {
        subject,
        total_minutes: progress?.total_minutes || 0,
        session_count: progress?.session_count || 0,
        flashcard_count: progress?.flashcard_count || 0,
        accuracy_rate: progress?.accuracy_rate || 0,
        last_studied: progress?.last_studied || new Date().toISOString(),
      };
    });
  };

  // Handle starting a study session
  const handleStartSession = (subject: string) => {
    setSelectedSubject(subject);
    setSessionStartTime(new Date());
    setSessionModalVisible(true);
  };

  // Handle completing a study session
  const handleCompleteSession = async () => {
    if (!selectedSubject || !sessionStartTime || !user) return;

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 60000);

    try {
      // Create study session
      await createStudySession({
        user_id: user.id,
        subject: selectedSubject,
        duration_minutes: durationMinutes,
        session_type: 'study_plan',
        notes: `Study session for ${selectedSubject}`,
      });

      // Refresh subject progress
      await fetchSubjectProgress(user.id);

      // Close modal
      setSessionModalVisible(false);
      setSelectedSubject(null);
      setSessionStartTime(null);

      Alert.alert('Success', 'Study session completed!');
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to complete study session');
    }
  };

  // Handle canceling a study session
  const handleCancelSession = () => {
    setSessionModalVisible(false);
    setSelectedSubject(null);
    setSessionStartTime(null);
  };

  // Handle navigating to flashcards
  const handleGoToFlashcards = (subject: string) => {
    navigation.navigate('Flashcards', { subject });
  };

  // Handle navigating to study plans
  const handleGoToStudyPlans = (subject: string) => {
    navigation.navigate('StudyPlan');
  };

  // Format study time
  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get progress color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  if (loading) {
    return <LoadingSpinner message="Loading subjects..." />;
  }

  const allSubjects = getAllSubjects();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Subjects</Text>
          <Text style={styles.subtitle}>Choose a subject to start studying</Text>
        </View>

        {/* Subject List */}
        {allSubjects.length > 0 ? (
          allSubjects.map((subjectData) => (
            <View key={subjectData.subject} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subjectData.subject}</Text>
                <View style={[styles.accuracyBadge, { backgroundColor: getProgressColor(subjectData.accuracy_rate) }]}>
                  <Text style={styles.accuracyText}>{subjectData.accuracy_rate}%</Text>
                </View>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatStudyTime(subjectData.total_minutes)}</Text>
                  <Text style={styles.statLabel}>Study Time</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{subjectData.session_count}</Text>
                  <Text style={styles.statLabel}>Sessions</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{subjectData.flashcard_count}</Text>
                  <Text style={styles.statLabel}>Flashcards</Text>
                </View>
              </View>
              
              <View style={styles.footer}>
                <Text style={styles.lastStudied}>Last studied: {formatDate(subjectData.last_studied)}</Text>
              </View>
              
              <View style={styles.actionsContainer}>
                <Button
                  title="Study"
                  onPress={() => handleStartSession(subjectData.subject)}
                  style={styles.actionButton}
                />
                <Button
                  title="Flashcards"
                  onPress={() => handleGoToFlashcards(subjectData.subject)}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button
                  title="Study Plan"
                  onPress={() => handleGoToStudyPlans(subjectData.subject)}
                  variant="outline"
                  style={styles.actionButton}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No subjects yet</Text>
            <Text style={styles.emptySubtext}>Add subjects in your profile to get started</Text>
            <Button
              title="Edit Profile"
              onPress={() => navigation.navigate('ProfileEdit')}
              style={styles.emptyButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Session Modal */}
      <View style={[styles.modalOverlay, sessionModalVisible && styles.modalOverlayVisible]}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Study Session in Progress</Text>
          
          {selectedSubject && (
            <View style={styles.modalSubject}>
              <Text style={styles.modalSubjectName}>{selectedSubject}</Text>
              <Text style={styles.modalTimer}>
                Started at: {sessionStartTime?.toLocaleTimeString()}
              </Text>
            </View>
          )}
          
          <Button
            title="Complete Session"
            onPress={handleCompleteSession}
            style={styles.completeButton}
          />
          
          <Button
            title="Cancel"
            onPress={handleCancelSession}
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 16,
  },
  lastStudied: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
    pointerEvents: 'none',
  },
  modalOverlayVisible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubject: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  modalSubjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalTimer: {
    fontSize: 14,
    color: '#6B7280',
  },
  completeButton: {
    width: '100%',
    marginBottom: 12,
  },
  cancelButton: {
    width: '100%',
  },
});