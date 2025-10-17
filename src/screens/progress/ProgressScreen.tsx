// F:\StudyBuddy\src\screens\progress\ProgressScreen.tsx
// ============================================
// PROGRESS SCREEN WITH REAL-TIME TRACKING AND AI STUDY PLAN INTEGRATION
// Beautiful progress tracking with charts, real-time session updates, and AI-powered study plan generation
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
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  FlatList,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { getFlashcards, createStudyPlan as createStudyPlanInDB } from '../../services/supabase';
import { generateStudyPlan } from '../../services/openai';
import { SubjectProgress, StudySession, Flashcard, StudyPlanForm } from '../../types';
import { ProgressChart } from '../../components/ProgressChart';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

// Difficulty levels for study plan generation
const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { value: 'advanced', label: 'Advanced', emoji: '🌳' },
];

// Learning styles for study plan generation
const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', emoji: '👁️' },
  { value: 'auditory', label: 'Auditory', emoji: '👂' },
  { value: 'reading', label: 'Reading', emoji: '📖' },
  { value: 'kinesthetic', label: 'Kinesthetic', emoji: '✋' },
];

export const ProgressScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { 
    subjectProgress, 
    studySessions, 
    studyPlans,
    fetchSubjectProgress, 
    fetchStudySessions,
    fetchStudyPlans,
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
  
  // AI Study Plan Modal State
  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [studyPlanForm, setStudyPlanForm] = useState<StudyPlanForm>({
    subject: '',
    difficulty_level: 'beginner',
    duration_weeks: 4,
    daily_hours: 1,
    goals: '',
    learning_style: profile?.learning_style || 'visual',
  });
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  
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

  // Animate modal when shown/hidden
  useEffect(() => {
    if (showStudyPlanModal) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showStudyPlanModal]);

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
      await fetchStudyPlans(user.id);
      
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
  }, [user, fetchSubjectProgress, fetchStudySessions, fetchStudyPlans]);

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

  // Handle generating study plan
  const handleGenerateStudyPlan = async () => {
    if (!studyPlanForm.subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject to create your study plan.');
      return;
    }

    if (!studyPlanForm.goals.trim()) {
      Alert.alert('Missing Information', 'Please describe your study goals to create a personalized plan.');
      return;
    }

    if (studyPlanForm.duration_weeks < 1 || studyPlanForm.duration_weeks > 52) {
      Alert.alert('Invalid Duration', 'Duration must be between 1 and 52 weeks.');
      return;
    }

    if (studyPlanForm.daily_hours < 0.5 || studyPlanForm.daily_hours > 12) {
      Alert.alert('Invalid Hours', 'Daily hours must be between 0.5 and 12 hours.');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Error', 'Please sign in to create a study plan.');
      return;
    }

    setGeneratingPlan(true);
    try {
      // Generate study plan using OpenAI
      const planData = await generateStudyPlan(studyPlanForm);
      
      // Create study plan in database
      const newPlan = await createStudyPlanInDB({
        user_id: user.id,
        title: `${studyPlanForm.subject} Study Plan`,
        description: `A ${studyPlanForm.duration_weeks}-week study plan for ${studyPlanForm.subject} at ${studyPlanForm.difficulty_level} level`,
        subject: studyPlanForm.subject,
        difficulty_level: studyPlanForm.difficulty_level,
        duration_weeks: studyPlanForm.duration_weeks,
        daily_hours: studyPlanForm.daily_hours,
        plan_data: planData,
      });

      // Refresh study plans
      await fetchStudyPlans(user.id);
      
      // Reset form
      setStudyPlanForm({
        subject: '',
        difficulty_level: 'beginner',
        duration_weeks: 4,
        daily_hours: 1,
        goals: '',
        learning_style: profile?.learning_style || 'visual',
      });
      setShowStudyPlanModal(false);
      
      Alert.alert(
        'Success! 🎉',
        `Your personalized study plan with ${studyPlanForm.duration_weeks} weeks and ${studyPlanForm.daily_hours} hours per day has been created successfully!`,
        [
          {
            text: 'View Plan',
            onPress: () => navigation.navigate('StudyPlanDetail', { planId: newPlan.id })
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error: any) {
      console.error('Error generating study plan:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate study plan. Please check your internet connection and try again.'
      );
    } finally {
      setGeneratingPlan(false);
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

  // Render difficulty level option
  const renderDifficultyOption = (level: any) => (
    <TouchableOpacity
      key={level.value}
      style={[
        styles.option,
        studyPlanForm.difficulty_level === level.value && styles.selectedOption,
      ]}
      onPress={() => setStudyPlanForm({ ...studyPlanForm, difficulty_level: level.value as any })}
    >
      <Text style={styles.optionEmoji}>{level.emoji}</Text>
      <Text
        style={[
          styles.optionText,
          studyPlanForm.difficulty_level === level.value && styles.selectedOptionText,
        ]}
      >
        {level.label}
      </Text>
    </TouchableOpacity>
  );

  // Render learning style option
  const renderLearningStyleOption = (style: any) => (
    <TouchableOpacity
      key={style.value}
      style={[
        styles.option,
        studyPlanForm.learning_style === style.value && styles.selectedOption,
      ]}
      onPress={() => setStudyPlanForm({ ...studyPlanForm, learning_style: style.value as any })}
    >
      <Text style={styles.optionEmoji}>{style.emoji}</Text>
      <Text
        style={[
          styles.optionText,
          studyPlanForm.learning_style === style.value && styles.selectedOptionText,
        ]}
      >
        {style.label}
      </Text>
    </TouchableOpacity>
  );

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

        {/* AI Study Plan Generator */}
        <View style={styles.aiPlanContainer}>
          <View style={styles.aiPlanHeader}>
            <View style={styles.aiPlanIcon}>
              <Text style={styles.aiPlanIconText}>🤖</Text>
            </View>
            <View style={styles.aiPlanTitleContainer}>
              <Text style={styles.aiPlanTitle}>AI Study Plan Generator</Text>
              <Text style={styles.aiPlanSubtitle}>Create personalized study plans based on your progress</Text>
            </View>
          </View>
          
          <View style={styles.aiPlanStats}>
            <View style={styles.aiPlanStat}>
              <Text style={styles.aiPlanStatValue}>{studyPlans.length}</Text>
              <Text style={styles.aiPlanStatLabel}>Study Plans</Text>
            </View>
            
            <View style={styles.aiPlanStat}>
              <Text style={styles.aiPlanStatValue}>
                {subjectProgress.length > 0 
                  ? subjectProgress.reduce((total, subject) => total + subject.total_minutes, 0) / 60 > 0 
                    ? Math.round(subjectProgress.reduce((total, subject) => total + subject.total_minutes, 0) / 60)
                    : 0
                  : 0
                }h
              </Text>
              <Text style={styles.aiPlanStatLabel}>Total Study</Text>
            </View>
            
            <View style={styles.aiPlanStat}>
              <Text style={styles.aiPlanStatValue}>
                {subjectProgress.length > 0 
                  ? Math.round(subjectProgress.reduce((total, subject) => total + subject.accuracy_rate, 0) / subjectProgress.length)
                  : 0
                }%
              </Text>
              <Text style={styles.aiPlanStatLabel}>Avg Accuracy</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.generatePlanButton}
            onPress={() => setShowStudyPlanModal(true)}
          >
            <Text style={styles.generatePlanButtonText}>Generate New Study Plan</Text>
          </TouchableOpacity>
          
          {studyPlans.length > 0 && (
            <View style={styles.existingPlansContainer}>
              <Text style={styles.existingPlansTitle}>Your Study Plans</Text>
              <FlatList
                data={studyPlans.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.planCard}
                    onPress={() => navigation.navigate('StudyPlanDetail', { planId: item.id })}
                  >
                    <Text style={styles.planCardTitle}>{item.title}</Text>
                    <Text style={styles.planCardSubject}>{item.subject}</Text>
                    <View style={styles.planCardFooter}>
                      <Text style={styles.planCardDuration}>{item.duration_weeks} weeks</Text>
                      <Text style={styles.planCardDifficulty}>{item.difficulty_level}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.plansListContainer}
              />
              
              {studyPlans.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllPlansButton}
                  onPress={() => navigation.navigate('StudyPlan')}
                >
                  <Text style={styles.viewAllPlansButtonText}>View All Plans</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

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

      {/* AI Study Plan Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStudyPlanModal}
        onRequestClose={() => setShowStudyPlanModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <Animated.View
                style={[
                  styles.studyPlanModalContent,
                  {
                    opacity: modalAnim,
                    transform: [
                      {
                        translateY: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Generate AI Study Plan</Text>
                  <TouchableOpacity onPress={() => setShowStudyPlanModal(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📚 Subject</Text>
                    <TextInput
                      style={styles.textInput}
                      value={studyPlanForm.subject}
                      onChangeText={(text) => setStudyPlanForm({ ...studyPlanForm, subject: text })}
                      placeholder="e.g., Mathematics, Physics, History"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🎯 Difficulty Level</Text>
                    <View style={styles.optionsContainer}>
                      {DIFFICULTY_LEVELS.map(renderDifficultyOption)}
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🎨 Learning Style</Text>
                    <View style={styles.optionsContainer}>
                      {LEARNING_STYLES.map(renderLearningStyleOption)}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>📅 Duration (weeks)</Text>
                        <TextInput
                          style={styles.textInput}
                          value={studyPlanForm.duration_weeks.toString()}
                          onChangeText={(text) => {
                            const value = parseInt(text) || 1;
                            setStudyPlanForm({ ...studyPlanForm, duration_weeks: Math.max(1, Math.min(52, value)) });
                          }}
                          placeholder="4"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.halfWidth}>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>⏰ Daily Hours</Text>
                        <TextInput
                          style={styles.textInput}
                          value={studyPlanForm.daily_hours.toString()}
                          onChangeText={(text) => {
                            const value = parseFloat(text) || 1;
                            setStudyPlanForm({ ...studyPlanForm, daily_hours: Math.max(0.5, Math.min(12, value)) });
                          }}
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🎯 Study Goals</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={studyPlanForm.goals}
                      onChangeText={(text) => setStudyPlanForm({ ...studyPlanForm, goals: text })}
                      placeholder="What do you want to achieve with this study plan?"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerateStudyPlan}
                    disabled={generatingPlan}
                  >
                    {generatingPlan ? (
                      <LoadingSpinner message="Generating your personalized study plan..." />
                    ) : (
                      <Text style={styles.generateButtonText}>✨ Generate Study Plan</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  // AI Study Plan Container
  aiPlanContainer: {
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
  aiPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiPlanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiPlanIconText: {
    fontSize: 24,
  },
  aiPlanTitleContainer: {
    flex: 1,
  },
  aiPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  aiPlanSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  aiPlanStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiPlanStat: {
    alignItems: 'center',
    flex: 1,
  },
  aiPlanStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  aiPlanStatLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  generatePlanButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generatePlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  existingPlansContainer: {
    marginTop: 8,
  },
  existingPlansTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  plansListContainer: {
    paddingRight: 16,
  },
  planCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    width: 160,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  planCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  planCardSubject: {
    fontSize: 12,
    color: '#6366F1',
    marginBottom: 8,
  },
  planCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planCardDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  planCardDifficulty: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  viewAllPlansButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewAllPlansButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
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
  studyPlanModalContent: {
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
  // Study Plan Form Styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    minWidth: 80,
  },
  selectedOption: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  generateButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});