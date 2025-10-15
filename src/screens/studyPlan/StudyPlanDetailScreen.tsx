// F:\StudyBuddy\src\screens\studyPlan\StudyPlanDetailScreen.tsx
// ============================================
// STUDY PLAN DETAIL SCREEN
// Displays detailed view of a study plan
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal } from 'react-native';
import { useStudyStore } from '../../store/studyStore';
import { useAuthStore } from '../../store/authStore';
import { getStudyPlan, updateStudyPlan, deleteStudyPlan, createStudySession } from '../../services/supabase';
import { StudyPlan, StudyWeek, StudyTask } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const StudyPlanDetailScreen = ({ route, navigation }: any) => {
  const { planId } = route.params;
  const { user } = useAuthStore();
  const { currentStudyPlan, setCurrentStudyPlan } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Load study plan
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const plan = await getStudyPlan(planId);
        setCurrentStudyPlan(plan);
      } catch (error) {
        console.error('Error loading study plan:', error);
        Alert.alert('Error', 'Failed to load study plan');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [planId, setCurrentStudyPlan, navigation]);

  const handleToggleTask = async (weekIndex: number, taskIndex: number) => {
    if (!currentStudyPlan || !user) return;

    const updatedPlanData = { ...currentStudyPlan.plan_data };
    const task = updatedPlanData.weeks[weekIndex].tasks[taskIndex];
    task.completed = !task.completed;

    try {
      await updateStudyPlan(planId, {
        plan_data: updatedPlanData,
      });

      // Update local state
      setCurrentStudyPlan({
        ...currentStudyPlan,
        plan_data: updatedPlanData,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleStartSession = (task: StudyTask) => {
    setSelectedTask(task);
    setSessionStartTime(new Date());
    setSessionModalVisible(true);
  };

  const handleCompleteSession = async () => {
    if (!selectedTask || !sessionStartTime || !currentStudyPlan || !user) return;

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 60000);

    try {
      // Create study session
      await createStudySession({
        user_id: user.id,
        subject: currentStudyPlan.subject,
        duration_minutes: durationMinutes,
        session_type: 'study_plan',
        notes: `Completed task: ${selectedTask.title}`,
      });

      // Mark task as completed
      const updatedPlanData = { ...currentStudyPlan.plan_data };
      
      // Find and update the task
      for (let i = 0; i < updatedPlanData.weeks.length; i++) {
        const taskIndex = updatedPlanData.weeks[i].tasks.findIndex(
          t => t.id === selectedTask.id
        );
        if (taskIndex !== -1) {
          updatedPlanData.weeks[i].tasks[taskIndex].completed = true;
          break;
        }
      }

      await updateStudyPlan(planId, {
        plan_data: updatedPlanData,
      });

      // Update local state
      setCurrentStudyPlan({
        ...currentStudyPlan,
        plan_data: updatedPlanData,
      });

      // Close modal
      setSessionModalVisible(false);
      setSelectedTask(null);
      setSessionStartTime(null);

      Alert.alert('Success', 'Study session completed!');
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to complete study session');
    }
  };

  const handleDeletePlan = () => {
    Alert.alert(
      'Delete Study Plan',
      'Are you sure you want to delete this study plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudyPlan(planId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting study plan:', error);
              Alert.alert('Error', 'Failed to delete study plan');
            }
          },
        },
      ]
    );
  };

  const getProgressPercentage = () => {
    if (!currentStudyPlan) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    currentStudyPlan.plan_data.weeks.forEach(week => {
      week.tasks.forEach(task => {
        totalTasks++;
        if (task.completed) completedTasks++;
      });
    });

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return '📖';
      case 'practice':
        return '✏️';
      case 'review':
        return '🔄';
      case 'assessment':
        return '📝';
      default:
        return '📚';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading study plan..." />;
  }

  if (!currentStudyPlan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Study plan not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{currentStudyPlan.title}</Text>
          <Text style={styles.subject}>{currentStudyPlan.subject}</Text>
          
          {currentStudyPlan.description && (
            <Text style={styles.description}>{currentStudyPlan.description}</Text>
          )}
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progress: {getProgressPercentage()}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} 
              />
            </View>
          </View>
        </View>

        {/* Milestones */}
        {currentStudyPlan.plan_data.milestones && currentStudyPlan.plan_data.milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {currentStudyPlan.plan_data.milestones.map((milestone, index) => (
              <View key={index} style={styles.milestoneItem}>
                <Text style={styles.milestoneBullet}>•</Text>
                <Text style={styles.milestoneText}>{milestone}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Study Weeks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Plan</Text>
          {currentStudyPlan.plan_data.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekContainer}>
              <Text style={styles.weekTitle}>{week.title}</Text>
              
              {week.topics && week.topics.length > 0 && (
                <View style={styles.topicsContainer}>
                  <Text style={styles.topicsLabel}>Topics:</Text>
                  <Text style={styles.topicsText}>{week.topics.join(', ')}</Text>
                </View>
              )}
              
              <View style={styles.tasksContainer}>
                {week.tasks.map((task, taskIndex) => (
                  <View key={task.id} style={styles.taskItem}>
                    <TouchableOpacity
                      style={styles.taskCheckbox}
                      onPress={() => handleToggleTask(weekIndex, taskIndex)}
                    >
                      <View style={[
                        styles.checkbox,
                        task.completed && styles.checkboxChecked
                      ]}>
                        {task.completed && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <Text style={styles.taskTypeIcon}>
                          {getTaskTypeIcon(task.type)}
                        </Text>
                        <Text style={[
                          styles.taskTitle,
                          task.completed && styles.taskTitleCompleted
                        ]}>
                          {task.title}
                        </Text>
                      </View>
                      
                      <Text style={styles.taskDescription}>{task.description}</Text>
                      
                      <View style={styles.taskFooter}>
                        <Text style={styles.taskDuration}>
                          {task.duration_minutes} minutes
                        </Text>
                        
                        {!task.completed && (
                          <Button
                            title="Start"
                            onPress={() => handleStartSession(task)}
                            variant="outline"
                            style={styles.startButton}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Resources */}
        {currentStudyPlan.plan_data.resources && currentStudyPlan.plan_data.resources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources</Text>
            {currentStudyPlan.plan_data.resources.map((resource) => (
              <View key={resource.id} style={styles.resourceItem}>
                <Text style={styles.resourceTypeIcon}>
                  {resource.type === 'video' && '🎥'}
                  {resource.type === 'article' && '📄'}
                  {resource.type === 'book' && '📚'}
                  {resource.type === 'website' && '🌐'}
                  {resource.type === 'tool' && '🛠️'}
                </Text>
                <View style={styles.resourceContent}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceDescription}>{resource.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Delete Button */}
        <View style={styles.deleteContainer}>
          <Button
            title="Delete Study Plan"
            onPress={handleDeletePlan}
            variant="outline"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>

      {/* Session Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sessionModalVisible}
        onRequestClose={() => setSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Study Session in Progress</Text>
            
            {selectedTask && (
              <View style={styles.modalTask}>
                <Text style={styles.modalTaskTitle}>{selectedTask.title}</Text>
                <Text style={styles.modalTaskDescription}>{selectedTask.description}</Text>
              </View>
            )}
            
            <Text style={styles.modalTimer}>
              Started at: {sessionStartTime?.toLocaleTimeString()}
            </Text>
            
            <Button
              title="Complete Session"
              onPress={handleCompleteSession}
              style={styles.completeButton}
            />
            
            <Button
              title="Cancel"
              onPress={() => setSessionModalVisible(false)}
              variant="outline"
              style={styles.cancelButton}
            />
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
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subject: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  milestoneBullet: {
    fontSize: 18,
    color: '#6366F1',
    marginRight: 8,
  },
  milestoneText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  weekContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  topicsContainer: {
    marginBottom: 16,
  },
  topicsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  topicsText: {
    fontSize: 14,
    color: '#374151',
  },
  tasksContainer: {
    marginLeft: 8,
  },
  taskItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  taskCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  resourceItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  resourceTypeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  deleteContainer: {
    marginVertical: 20,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
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
  modalTask: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalTaskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  modalTimer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  completeButton: {
    width: '100%',
    marginBottom: 12,
  },
  cancelButton: {
    width: '100%',
  },
});