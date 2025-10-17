// F:\StudyBuddy\src\screens\studyPlan\StudyPlanDetailScreen.tsx
// ============================================
// STUDY PLAN DETAIL SCREEN - ENHANCED & RESPONSIVE
// Fully compatible with Android & iOS with polished UI
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
  Animated,
  Linking,
  Share,
  Platform,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Pressable
} from 'react-native';
import { useStudyStore } from '../../store/studyStore';
import { useAuthStore } from '../../store/authStore';
import {
  getStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  createStudySession,
  addCustomResources,
  addCustomTasks,
  addTaskNotes
} from '../../services/supabase';
import {
  generateAdditionalResources,
  generateAdditionalTasks,
  verifyAndRateResources
} from '../../services/openai';
import { StudyPlan, StudyWeek, StudyTask, StudyResource } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

// Responsive scaling
const scale = (size: number) => (width / 375) * size;
const verticalScale = (size: number) => (height / 812) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const StudyPlanDetailScreen = ({ route, navigation }: any) => {
  const { planId, startSession = false } = route.params;
  const { user } = useAuthStore();
  const { currentStudyPlan, setCurrentStudyPlan } = useStudyStore();
 
  const [loading, setLoading] = useState(true);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [sessionTimerInterval, setSessionTimerInterval] = useState<NodeJS.Timeout | null>(null);
 
  // Resource and task modals
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [customResourceUrl, setCustomResourceUrl] = useState('');
  const [customResourceTitle, setCustomResourceTitle] = useState('');
  const [customResourceDescription, setCustomResourceDescription] = useState('');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskDescription, setCustomTaskDescription] = useState('');
  const [customTaskDuration, setCustomTaskDuration] = useState(60);
 
  // Notes modal
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [taskNotes, setTaskNotes] = useState('');
  const [selectedWeekIndexForNotes, setSelectedWeekIndexForNotes] = useState(0);
  const [selectedTaskIndexForNotes, setSelectedTaskIndexForNotes] = useState(0);
 
  // AI features
  const [generatingResources, setGeneratingResources] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [verifyingResources, setVerifyingResources] = useState(false);
 
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Load study plan
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const plan = await getStudyPlan(planId);
        setCurrentStudyPlan(plan);
       
        // Animate in the screen
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start();
       
        // Auto-start session if requested
        if (startSession && plan.plan_data.weeks.length > 0 && plan.plan_data.weeks[0].tasks.length > 0) {
          const firstTask = plan.plan_data.weeks[0].tasks[0];
          handleStartSession(firstTask);
        }
      } catch (error) {
        console.error('Error loading study plan:', error);
        Alert.alert('Error', 'Failed to load study plan');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [planId]);

  // Session timer
  useEffect(() => {
    if (sessionModalVisible && sessionStartTime) {
      const interval = setInterval(() => {
        setSessionTimer(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
      }, 1000);
      setSessionTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (sessionTimerInterval) {
      clearInterval(sessionTimerInterval);
      setSessionTimerInterval(null);
    }
  }, [sessionModalVisible, sessionStartTime]);

  const handleToggleTask = useCallback(async (weekIndex: number, taskIndex: number) => {
    if (!currentStudyPlan || !user) return;
    const updatedPlanData = { ...currentStudyPlan.plan_data };
    const task = updatedPlanData.weeks[weekIndex].tasks[taskIndex];
    task.completed = !task.completed;
    try {
      await updateStudyPlan(planId, { plan_data: updatedPlanData });
      setCurrentStudyPlan({ ...currentStudyPlan, plan_data: updatedPlanData });
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  }, [currentStudyPlan, user, planId]);

  const handleStartSession = useCallback((task: StudyTask) => {
    setSelectedTask(task);
    setSessionStartTime(new Date());
    setSessionTimer(0);
    setSessionNotes('');
    setSessionModalVisible(true);
  }, []);

  const handleCompleteSession = useCallback(async () => {
    if (!selectedTask || !sessionStartTime || !currentStudyPlan || !user) return;
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 60000);
    try {
      // Create session data with proper typing - include all fields upfront
      const sessionData: {
        user_id: string;
        subject: string;
        duration_minutes: number;
        session_type: string;
        notes: string;
        completed_at: string;
        tasks_completed?: string[];
        study_plan_id?: string;
      } = {
        user_id: user.id,
        subject: currentStudyPlan.subject,
        duration_minutes: durationMinutes,
        session_type: 'study_plan',
        notes: sessionNotes,
        completed_at: new Date().toISOString(),
      };
     
      // Add optional fields if they exist
      if (selectedTask.id) {
        sessionData.tasks_completed = [selectedTask.id];
      }
     
      if (planId) {
        sessionData.study_plan_id = planId;
      }
      await createStudySession(sessionData);
      const updatedPlanData = { ...currentStudyPlan.plan_data };
     
      for (let i = 0; i < updatedPlanData.weeks.length; i++) {
        const taskIndex = updatedPlanData.weeks[i].tasks.findIndex(t => t.id === selectedTask.id);
        if (taskIndex !== -1) {
          updatedPlanData.weeks[i].tasks[taskIndex].completed = true;
          break;
        }
      }
      await updateStudyPlan(planId, { plan_data: updatedPlanData });
      setCurrentStudyPlan({ ...currentStudyPlan, plan_data: updatedPlanData });
      setSessionModalVisible(false);
      setSelectedTask(null);
      setSessionStartTime(null);
      setSessionNotes('');
      Alert.alert('Success', 'Study session completed!');
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to complete study session');
    }
  }, [selectedTask, sessionStartTime, currentStudyPlan, user, planId, sessionNotes]);

  const handleDeletePlan = useCallback(() => {
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
  }, [planId, navigation]);

  const handleSharePlan = useCallback(async () => {
    if (!currentStudyPlan) return;
   
    try {
      await Share.share({
        message: `Check out my study plan for ${currentStudyPlan.subject}: ${currentStudyPlan.title}`,
        title: currentStudyPlan.title,
      });
    } catch (error) {
      console.error('Error sharing plan:', error);
    }
  }, [currentStudyPlan]);

  const handleAddCustomResource = useCallback(async () => {
    if (!customResourceTitle.trim() || !customResourceUrl.trim()) {
      Alert.alert('Error', 'Please enter a title and URL for the resource');
      return;
    }
    if (!currentStudyPlan) return;
    try {
      const newResource: StudyResource = {
        id: `custom_${Date.now()}`,
        title: customResourceTitle,
        type: 'website',
        url: customResourceUrl,
        description: customResourceDescription,
        verified: false,
        rating: 0,
        tags: [],
        difficulty: currentStudyPlan.difficulty_level,
      };
      await addCustomResources(planId, [newResource]);
      const updatedPlan = await getStudyPlan(planId);
      setCurrentStudyPlan(updatedPlan);
     
      setCustomResourceTitle('');
      setCustomResourceUrl('');
      setCustomResourceDescription('');
      setResourceModalVisible(false);
     
      Alert.alert('Success', 'Resource added successfully!');
    } catch (error) {
      console.error('Error adding resource:', error);
      Alert.alert('Error', 'Failed to add resource');
    }
  }, [customResourceTitle, customResourceUrl, customResourceDescription, currentStudyPlan, planId]);

  const handleAddCustomTask = useCallback(async () => {
    if (!customTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the task');
      return;
    }
    if (!currentStudyPlan) return;
    try {
      const newTask: StudyTask = {
        id: `custom_${Date.now()}`,
        title: customTaskTitle,
        description: customTaskDescription,
        duration_minutes: customTaskDuration,
        completed: false,
        type: 'practice',
        resources: [],
        difficulty: currentStudyPlan.difficulty_level,
        priority: 'medium',
      };
      await addCustomTasks(planId, selectedWeekIndex, [newTask]);
      const updatedPlan = await getStudyPlan(planId);
      setCurrentStudyPlan(updatedPlan);
     
      setCustomTaskTitle('');
      setCustomTaskDescription('');
      setCustomTaskDuration(60);
      setTaskModalVisible(false);
     
      Alert.alert('Success', 'Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    }
  }, [customTaskTitle, customTaskDescription, customTaskDuration, currentStudyPlan, planId, selectedWeekIndex]);

  const handleGenerateAdditionalResources = useCallback(async () => {
    if (!currentStudyPlan) return;
   
    setGeneratingResources(true);
    try {
      const topics = currentStudyPlan.plan_data.weeks.flatMap(week => week.topics);
      const additionalResources = await generateAdditionalResources(
        currentStudyPlan.subject,
        topics,
        currentStudyPlan.difficulty_level,
        'visual',
        currentStudyPlan.plan_data.resources
      );
     
      await addCustomResources(planId, additionalResources);
      const updatedPlan = await getStudyPlan(planId);
      setCurrentStudyPlan(updatedPlan);
     
      Alert.alert('Success', `Generated ${additionalResources.length} additional resources!`);
    } catch (error) {
      console.error('Error generating resources:', error);
      Alert.alert('Error', 'Failed to generate additional resources');
    } finally {
      setGeneratingResources(false);
    }
  }, [currentStudyPlan, planId]);

  const handleGenerateAdditionalTasks = useCallback(async (weekIndex: number) => {
    if (!currentStudyPlan) return;
   
    setGeneratingTasks(true);
    try {
      const week = currentStudyPlan.plan_data.weeks[weekIndex];
      const additionalTasks = await generateAdditionalTasks(
        currentStudyPlan.subject,
        week.title,
        week.topics,
        currentStudyPlan.difficulty_level,
        'visual',
        week.tasks
      );
     
      await addCustomTasks(planId, weekIndex, additionalTasks);
      const updatedPlan = await getStudyPlan(planId);
      setCurrentStudyPlan(updatedPlan);
     
      Alert.alert('Success', `Generated ${additionalTasks.length} additional tasks!`);
    } catch (error) {
      console.error('Error generating tasks:', error);
      Alert.alert('Error', 'Failed to generate additional tasks');
    } finally {
      setGeneratingTasks(false);
    }
  }, [currentStudyPlan, planId]);

  const handleVerifyResources = useCallback(async () => {
    if (!currentStudyPlan) return;
   
    setVerifyingResources(true);
    try {
      const verifiedResources = await verifyAndRateResources(currentStudyPlan.plan_data.resources);
     
      const updatedPlanData = { ...currentStudyPlan.plan_data };
      updatedPlanData.resources = verifiedResources;
     
      await updateStudyPlan(planId, { plan_data: updatedPlanData });
      setCurrentStudyPlan({ ...currentStudyPlan, plan_data: updatedPlanData });
     
      Alert.alert('Success', 'Resources verified and rated!');
    } catch (error) {
      console.error('Error verifying resources:', error);
      Alert.alert('Error', 'Failed to verify resources');
    } finally {
      setVerifyingResources(false);
    }
  }, [currentStudyPlan, planId]);

  const handleOpenResource = useCallback((resource: StudyResource) => {
    if (resource.url) {
      Linking.openURL(resource.url).catch(error => {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'Failed to open resource');
      });
    }
  }, []);

  const handleAddTaskNotes = useCallback(async () => {
    if (!currentStudyPlan) return;
   
    try {
      await addTaskNotes(planId, selectedWeekIndexForNotes, selectedTaskIndexForNotes, taskNotes);
      const updatedPlan = await getStudyPlan(planId);
      setCurrentStudyPlan(updatedPlan);
     
      setTaskNotes('');
      setNotesModalVisible(false);
     
      Alert.alert('Success', 'Notes added successfully!');
    } catch (error) {
      console.error('Error adding notes:', error);
      Alert.alert('Error', 'Failed to add notes');
    }
  }, [currentStudyPlan, planId, selectedWeekIndexForNotes, selectedTaskIndexForNotes, taskNotes]);

  const getProgressPercentage = useCallback(() => {
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
  }, [currentStudyPlan]);

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'practice': return '✏️';
      case 'review': return '🔄';
      case 'assessment': return '📝';
      case 'video': return '🎥';
      case 'project': return '🚀';
      case 'discussion': return '💬';
      default: return '📚';
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'article': return '📄';
      case 'book': return '📚';
      case 'website': return '🌐';
      case 'tool': return '🛠️';
      case 'course': return '🎓';
      case 'podcast': return '🎧';
      case 'interactive': return '🎮';
      default: return '📎';
    }
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

  const renderResourceItem = useCallback(({ item, index }: { item: StudyResource, index: number }) => (
    <Pressable
      key={`resource-${item.id}-${index}`}
      style={({ pressed }) => [
        styles.resourceItem,
        pressed && styles.pressedItem
      ]}
      onPress={() => handleOpenResource(item)}
    >
      <View style={styles.resourceIconContainer}>
        <Text style={styles.resourceTypeIcon}>
          {getResourceTypeIcon(item.type)}
        </Text>
      </View>
     
      <View style={styles.resourceContent}>
        <View style={styles.resourceHeader}>
          <Text style={styles.resourceTitle}>
            {item.title}
          </Text>
          <View style={styles.resourceRating}>
            <Text style={styles.resourceRatingText}>
              {item.rating.toFixed(1)} ⭐
            </Text>
            {item.verified && (
              <Text style={styles.verifiedBadge}>✓</Text>
            )}
          </View>
        </View>
       
        <Text style={styles.resourceDescription}>
          {item.description}
        </Text>
       
        <View style={styles.resourceFooter}>
          <TouchableOpacity
            style={[styles.resourceActionButton, styles.openButton]}
            onPress={() => handleOpenResource(item)}
          >
            <Text style={[styles.resourceActionText, styles.openButtonText]}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  ), [handleOpenResource]);

  const renderTaskItem = useCallback(({ item, weekIndex, taskIndex }: {
    item: StudyTask,
    weekIndex: number,
    taskIndex: number
  }) => (
    <Pressable
      key={`task-week${weekIndex}-task${taskIndex}-${item.id}`}
      style={({ pressed }) => [
        styles.taskItem,
        pressed && styles.pressedItem
      ]}
    >
      <TouchableOpacity
        style={styles.taskCheckbox}
        onPress={() => handleToggleTask(weekIndex, taskIndex)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[
          styles.checkbox,
          item.completed && styles.checkboxChecked
        ]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
     
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTypeIcon}>
            {getTaskTypeIcon(item.type)}
          </Text>
          <Text style={[
            styles.taskTitle,
            item.completed && styles.taskTitleCompleted
          ]}>
            {item.title}
          </Text>
          <View style={[
            styles.priorityBadge,
            item.priority === 'high' && styles.priorityHigh,
            item.priority === 'medium' && styles.priorityMedium,
            item.priority === 'low' && styles.priorityLow,
          ]}>
            <Text style={styles.priorityText}>
              {item.priority.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
       
        <Text style={styles.taskDescription}>
          {item.description}
        </Text>
       
        {item.notes && (
          <View style={styles.taskNotesContainer}>
            <Text style={styles.taskNotesLabel}>Notes:</Text>
            <Text style={styles.taskNotesText}>
              {item.notes}
            </Text>
          </View>
        )}
       
        <View style={styles.taskFooter}>
          <Text style={styles.taskDuration}>
            ⏱️ {item.duration_minutes} min
          </Text>
         
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.taskActionButton}
              onPress={() => {
                setSelectedWeekIndexForNotes(weekIndex);
                setSelectedTaskIndexForNotes(taskIndex);
                setTaskNotes(item.notes || '');
                setNotesModalVisible(true);
              }}
            >
              <Text style={styles.taskActionText}>📝 Notes</Text>
            </TouchableOpacity>
           
            {!item.completed && (
              <TouchableOpacity
                style={[styles.taskActionButton, styles.startButton]}
                onPress={() => handleStartSession(item)}
              >
                <Text style={[styles.taskActionText, styles.startButtonText]}>▶️ Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  ), [handleToggleTask, handleStartSession]);

  if (loading) {
    return <LoadingSpinner message="Loading study plan..." />;
  }

  if (!currentStudyPlan) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Study plan not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isIOS ? "dark-content" : "light-content"} />
      <Animated.View style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={isIOS}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {currentStudyPlan.title}
            </Text>
            <View style={styles.subjectBadge}>
              <Text style={styles.subject}>{currentStudyPlan.subject}</Text>
            </View>
           
            {currentStudyPlan.description && (
              <Text style={styles.description}>
                {currentStudyPlan.description}
              </Text>
            )}
           
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{getProgressPercentage()}%</Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${getProgressPercentage()}%` }
                  ]}
                />
              </View>
            </View>
           
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleSharePlan}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>📤</Text>
                <Text style={styles.headerActionText}>Share</Text>
              </TouchableOpacity>
             
              <TouchableOpacity
                style={[styles.headerActionButton, styles.deleteButton]}
                onPress={handleDeletePlan}
                activeOpacity={0.7}
              >
                <Text style={styles.headerActionIcon}>🗑️</Text>
                <Text style={[styles.headerActionText, styles.deleteActionText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overview */}
          {currentStudyPlan.plan_data.overview && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Overview</Text>
              <Text style={styles.overviewText}>{currentStudyPlan.plan_data.overview}</Text>
            </View>
          )}

          {/* Learning Outcomes */}
          {currentStudyPlan.plan_data.learning_outcomes?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Learning Outcomes</Text>
              {currentStudyPlan.plan_data.learning_outcomes.map((outcome, index) => (
                <View key={`outcome-${index}`} style={styles.listItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.listItemText}>{outcome}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Milestones */}
          {currentStudyPlan.plan_data.milestones?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Milestones</Text>
              {currentStudyPlan.plan_data.milestones.map((milestone, index) => (
                <View key={`milestone-${index}`} style={styles.listItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.listItemText}>{milestone}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Study Tips */}
          {currentStudyPlan.plan_data.tips?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Study Tips</Text>
              {currentStudyPlan.plan_data.tips.map((tip, index) => (
                <View key={`tip-${index}`} style={styles.tipCard}>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Study Weeks */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📅 Study Plan</Text>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={() => handleGenerateAdditionalTasks(0)}
                disabled={generatingTasks}
                activeOpacity={0.7}
              >
                <Text style={styles.aiButtonText}>
                  {generatingTasks ? '⏳' : '🤖'} AI Tasks
                </Text>
              </TouchableOpacity>
            </View>
           
            {currentStudyPlan.plan_data.weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekContainer}>
                <View style={styles.weekHeader}>
                  <View style={styles.weekTitleContainer}>
                    <Text style={styles.weekNumber}>Week {weekIndex + 1}</Text>
                    <Text style={styles.weekTitle}>
                      {week.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addTaskButton}
                    onPress={() => {
                      setSelectedWeekIndex(weekIndex);
                      setTaskModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addTaskButtonText}>+ Task</Text>
                  </TouchableOpacity>
                </View>
               
                {week.objectives?.length > 0 && (
                  <View style={styles.objectivesContainer}>
                    <Text style={styles.objectivesLabel}>Objectives:</Text>
                    {week.objectives.map((objective, index) => (
                      <Text key={`objective-${weekIndex}-${index}`} style={styles.objectiveText}>
                        {index + 1}. {objective}
                      </Text>
                    ))}
                  </View>
                )}
               
                {week.topics?.length > 0 && (
                  <View style={styles.topicsContainer}>
                    <Text style={styles.topicsLabel}>Topics:</Text>
                    <Text style={styles.topicsText}>{week.topics.join(', ')}</Text>
                  </View>
                )}
               
                <View style={styles.tasksContainer}>
                  {week.tasks.map((task, taskIndex) =>
                    renderTaskItem({ item: task, weekIndex, taskIndex })
                  )}
                </View>
               
                {week.summary && (
                  <View style={styles.weekSummaryContainer}>
                    <Text style={styles.weekSummaryLabel}>Summary:</Text>
                    <Text style={styles.weekSummaryText}>{week.summary}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Resources */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📚 Resources</Text>
            </View>
           
            <View style={styles.resourceButtonsRow}>
              <TouchableOpacity
                style={styles.aiButton}
                onPress={handleGenerateAdditionalResources}
                disabled={generatingResources}
                activeOpacity={0.7}
              >
                <Text style={styles.aiButtonText}>
                  {generatingResources ? '⏳' : '🤖'} AI
                </Text>
              </TouchableOpacity>
             
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleVerifyResources}
                disabled={verifyingResources}
                activeOpacity={0.7}
              >
                <Text style={styles.verifyButtonText}>
                  {verifyingResources ? '⏳' : '✓'} Verify
                </Text>
              </TouchableOpacity>
             
              <TouchableOpacity
                style={styles.addResourceButton}
                onPress={() => setResourceModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.addResourceButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>
           
            <View style={styles.resourcesList}>
              {currentStudyPlan.plan_data.resources.map((item, index) =>
                renderResourceItem({ item, index })
              )}
            </View>
          </View>
        </ScrollView>

        {/* Session Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={sessionModalVisible}
          onRequestClose={() => setSessionModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={isIOS ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setSessionModalVisible(false)}
            />
            <View style={styles.sessionModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Study Session</Text>
                <TouchableOpacity
                  onPress={() => setSessionModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
             
              {selectedTask && (
                <View style={styles.modalTask}>
                  <Text style={styles.modalTaskTitle}>
                    {selectedTask.title}
                  </Text>
                  <Text style={styles.modalTaskDescription}>
                    {selectedTask.description}
                  </Text>
                </View>
              )}
             
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Time Elapsed</Text>
                <Text style={styles.timerText}>{formatTime(sessionTimer)}</Text>
              </View>
             
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Session Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  placeholder="Add notes about your study session..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
             
              <View style={styles.sessionActions}>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={handleCompleteSession}
                  activeOpacity={0.8}
                >
                  <Text style={styles.completeButtonText}>✓ Complete Session</Text>
                </TouchableOpacity>
               
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setSessionModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Resource Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={resourceModalVisible}
          onRequestClose={() => setResourceModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={isIOS ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setResourceModalVisible(false)}
            />
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              bounces={false}
            >
              <View style={styles.resourceModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Resource</Text>
                  <TouchableOpacity
                    onPress={() => setResourceModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customResourceTitle}
                    onChangeText={setCustomResourceTitle}
                    placeholder="Resource title"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>URL *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customResourceUrl}
                    onChangeText={setCustomResourceUrl}
                    placeholder="https://example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={customResourceDescription}
                    onChangeText={setCustomResourceDescription}
                    placeholder="Resource description"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
               
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddCustomResource}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>Add Resource</Text>
                  </TouchableOpacity>
                 
                  <TouchableOpacity
                    style={styles.cancelModalButton}
                    onPress={() => setResourceModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Task Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={taskModalVisible}
          onRequestClose={() => setTaskModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={isIOS ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setTaskModalVisible(false)}
            />
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              bounces={false}
            >
              <View style={styles.taskModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Task</Text>
                  <TouchableOpacity
                    onPress={() => setTaskModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customTaskTitle}
                    onChangeText={setCustomTaskTitle}
                    placeholder="Task title"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={customTaskDescription}
                    onChangeText={setCustomTaskDescription}
                    placeholder="Task description"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
               
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customTaskDuration.toString()}
                    onChangeText={(text) => setCustomTaskDuration(parseInt(text) || 60)}
                    placeholder="60"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
               
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddCustomTask}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>Add Task</Text>
                  </TouchableOpacity>
                 
                  <TouchableOpacity
                    style={styles.cancelModalButton}
                    onPress={() => setTaskModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelModalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Notes Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={notesModalVisible}
          onRequestClose={() => setNotesModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={isIOS ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setNotesModalVisible(false)}
            />
            <View style={styles.notesModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Task Notes</Text>
                <TouchableOpacity
                  onPress={() => setNotesModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
             
              <TextInput
                style={[styles.textInput, styles.notesTextArea]}
                value={taskNotes}
                onChangeText={setTaskNotes}
                placeholder="Add notes about this task..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
             
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddTaskNotes}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addButtonText}>Save Notes</Text>
                </TouchableOpacity>
               
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setNotesModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: isAndroid ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(16),
    paddingBottom: moderateScale(32),
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginBottom: moderateScale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: moderateScale(12),
    lineHeight: moderateScale(32),
  },
  subjectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(20),
    marginBottom: moderateScale(12),
  },
  subject: {
    fontSize: moderateScale(14),
    color: '#6366F1',
    fontWeight: '600',
  },
  description: {
    fontSize: moderateScale(15),
    color: '#6B7280',
    marginBottom: moderateScale(16),
    lineHeight: moderateScale(22),
  },
  progressContainer: {
    marginTop: moderateScale(12),
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  progressLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressBar: {
    height: moderateScale(10),
    backgroundColor: '#E5E7EB',
    borderRadius: moderateScale(5),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: moderateScale(5),
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: moderateScale(16),
    gap: moderateScale(12),
  },
  headerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(12),
    backgroundColor: '#F3F4F6',
    gap: moderateScale(6),
  },
  headerActionIcon: {
    fontSize: moderateScale(16),
  },
  headerActionText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteActionText: {
    color: '#EF4444',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    marginBottom: moderateScale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(16),
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  overviewText: {
    fontSize: moderateScale(15),
    color: '#374151',
    lineHeight: moderateScale(24),
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: moderateScale(12),
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: '#6366F1',
    marginTop: moderateScale(8),
    marginRight: moderateScale(12),
  },
  listItemText: {
    fontSize: moderateScale(15),
    color: '#374151',
    flex: 1,
    lineHeight: moderateScale(22),
  },
  tipCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(12),
    borderLeftWidth: moderateScale(4),
    borderLeftColor: '#3B82F6',
  },
  tipText: {
    fontSize: moderateScale(15),
    color: '#1E40AF',
    lineHeight: moderateScale(22),
  },
  weekContainer: {
    marginBottom: moderateScale(24),
    paddingBottom: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(16),
    gap: moderateScale(12),
  },
  weekTitleContainer: {
    flex: 1,
  },
  weekNumber: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    marginBottom: moderateScale(4),
  },
  weekTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: moderateScale(24),
  },
  addTaskButton: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: '#6366F1',
  },
  addTaskButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  objectivesContainer: {
    marginBottom: moderateScale(16),
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
  },
  objectivesLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: moderateScale(8),
  },
  objectiveText: {
    fontSize: moderateScale(14),
    color: '#374151',
    marginBottom: moderateScale(4),
    lineHeight: moderateScale(20),
  },
  topicsContainer: {
    marginBottom: moderateScale(16),
    backgroundColor: '#FEF3C7',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
  },
  topicsLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#92400E',
    marginBottom: moderateScale(6),
  },
  topicsText: {
    fontSize: moderateScale(14),
    color: '#78350F',
    lineHeight: moderateScale(20),
  },
  tasksContainer: {
    gap: moderateScale(12),
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pressedItem: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  taskCheckbox: {
    marginRight: moderateScale(14),
    paddingTop: moderateScale(2),
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: moderateScale(14),
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(8),
    gap: moderateScale(8),
  },
  taskTypeIcon: {
    fontSize: moderateScale(18),
  },
  taskTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: moderateScale(22),
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  priorityBadge: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
  },
  priorityLow: {
    backgroundColor: '#DBEAFE',
  },
  priorityText: {
    fontSize: moderateScale(11),
    fontWeight: 'bold',
    color: '#374151',
  },
  taskDescription: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: moderateScale(10),
    lineHeight: moderateScale(20),
  },
  taskNotesContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(10),
  },
  taskNotesLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#92400E',
    marginBottom: moderateScale(4),
  },
  taskNotesText: {
    fontSize: moderateScale(13),
    color: '#78350F',
    lineHeight: moderateScale(18),
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  taskDuration: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    fontWeight: '500',
  },
  taskActions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  taskActionButton: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: '#E5E7EB',
  },
  startButton: {
    backgroundColor: '#6366F1',
  },
  taskActionText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  startButtonText: {
    color: '#FFFFFF',
  },
  weekSummaryContainer: {
    marginTop: moderateScale(16),
    backgroundColor: '#F0F9FF',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    borderLeftWidth: moderateScale(4),
    borderLeftColor: '#3B82F6',
  },
  weekSummaryLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: moderateScale(6),
  },
  weekSummaryText: {
    fontSize: moderateScale(14),
    color: '#1E3A8A',
    lineHeight: moderateScale(20),
  },
  resourceButtonsRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
    marginBottom: moderateScale(16),
    flexWrap: 'wrap',
  },
  aiButton: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: '#8B5CF6',
  },
  aiButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verifyButton: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: '#10B981',
  },
  verifyButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addResourceButton: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: '#6366F1',
  },
  addResourceButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resourcesList: {
    gap: moderateScale(12),
  },
  resourceItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceIconContainer: {
    marginRight: moderateScale(14),
    justifyContent: 'center',
    alignItems: 'center',
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#EEF2FF',
  },
  resourceTypeIcon: {
    fontSize: moderateScale(20),
  },
  resourceContent: {
    flex: 1,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: moderateScale(8),
    gap: moderateScale(8),
  },
  resourceTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: moderateScale(22),
  },
  resourceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  resourceRatingText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    fontWeight: '600',
  },
  verifiedBadge: {
    fontSize: moderateScale(14),
    color: '#10B981',
    fontWeight: 'bold',
  },
  resourceDescription: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: moderateScale(10),
    lineHeight: moderateScale(20),
  },
  resourceFooter: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  resourceActionButton: {
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: '#E5E7EB',
  },
  openButton: {
    backgroundColor: '#6366F1',
  },
  resourceActionText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#374151',
  },
  openButtonText: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  sessionModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: moderateScale(24),
    maxHeight: height * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(20),
  },
  modalTitle: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: moderateScale(18),
    color: '#6B7280',
    fontWeight: '600',
  },
  modalTask: {
    backgroundColor: '#F9FAFB',
    borderRadius: moderateScale(14),
    padding: moderateScale(16),
    marginBottom: moderateScale(20),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTaskTitle: {
    fontSize: moderateScale(17),
    fontWeight: '600',
    color: '#111827',
    marginBottom: moderateScale(8),
    lineHeight: moderateScale(24),
  },
  modalTaskDescription: {
    fontSize: moderateScale(15),
    color: '#6B7280',
    lineHeight: moderateScale(22),
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: moderateScale(24),
    paddingVertical: moderateScale(20),
    backgroundColor: '#EEF2FF',
    borderRadius: moderateScale(16),
  },
  timerLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: moderateScale(8),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: moderateScale(48),
    fontWeight: 'bold',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  notesContainer: {
    marginBottom: moderateScale(24),
  },
  notesLabel: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(10),
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(14),
    fontSize: moderateScale(15),
    color: '#111827',
    minHeight: moderateScale(120),
    textAlignVertical: 'top',
  },
  sessionActions: {
    gap: moderateScale(12),
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: moderateScale(16),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  completeButtonText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: moderateScale(16),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#6B7280',
  },
  resourceModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: moderateScale(24),
    maxHeight: height * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputContainer: {
    marginBottom: moderateScale(20),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(8),
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(14),
    fontSize: moderateScale(15),
    color: '#111827',
  },
  textArea: {
    minHeight: moderateScale(100),
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: moderateScale(12),
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingVertical: moderateScale(16),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  addButtonText: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  taskModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: moderateScale(24),
    maxHeight: height * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  notesModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    padding: moderateScale(24),
    maxHeight: height * 0.7,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  notesTextArea: {
    minHeight: moderateScale(180),
    marginBottom: moderateScale(20),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(20),
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: moderateScale(18),
    color: '#EF4444',
    marginBottom: moderateScale(20),
    textAlign: 'center',
    fontWeight: '600',
  },
});