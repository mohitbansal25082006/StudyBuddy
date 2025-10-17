// F:\StudyBuddy\src\screens\studyPlan\StudyPlanScreen.tsx
// ============================================
// STUDY PLAN SCREEN - ENHANCED & FULLY RESPONSIVE
// AI-powered study plan generator with advanced features
// Compatible with Android & iOS with pull-to-refresh
// ============================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  RefreshControl,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { generateStudyPlan, generateAdditionalResources, generateStudyTips } from '../../services/openai';
import { createStudyPlan, getStudyPlanCategories, getStudyPlanPreferences, getRecommendedStudyPlans } from '../../services/supabase';
import { StudyPlanForm, StudyPlan, StudyPlanCategory } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StudyPlanCard } from '../../components/StudyPlanCard';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { value: 'advanced', label: 'Advanced', emoji: '🌳' },
];

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', emoji: '👁️' },
  { value: 'auditory', label: 'Auditory', emoji: '👂' },
  { value: 'reading', label: 'Reading', emoji: '📖' },
  { value: 'kinesthetic', label: 'Kinesthetic', emoji: '✋' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Recently Created', icon: '🕒' },
  { value: 'title', label: 'Alphabetical', icon: '🔤' },
  { value: 'progress', label: 'Progress', icon: '📊' },
  { value: 'duration_weeks', label: 'Duration', icon: '📅' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Plans', icon: '📚' },
  { value: 'in_progress', label: 'In Progress', icon: '⏳' },
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'not_started', label: 'Not Started', icon: '🆕' },
];

// Fallback study tips that will be used if API fails
const FALLBACK_STUDY_TIPS = [
  "Take regular breaks every 25-30 minutes to maintain focus and prevent burnout.",
  "Use the Pomodoro Technique: 25 minutes of focused study followed by a 5-minute break.",
  "Create a dedicated study space free from distractions to improve concentration.",
  "Teach what you've learned to someone else to reinforce your understanding.",
  "Use active recall instead of passive reading to improve retention.",
  "Connect new information to what you already know to build stronger memory pathways.",
  "Use visual aids like diagrams, charts, and mind maps to organize information.",
  "Review material before sleep to help consolidate memories during the night.",
  "Stay hydrated and maintain a balanced diet to support optimal brain function.",
  "Set specific, achievable goals for each study session to stay motivated.",
  "Use mnemonic devices to remember complex information more easily.",
  "Practice spaced repetition by reviewing material at increasing intervals.",
  "Create summary notes in your own words to improve comprehension.",
  "Use background music without lyrics if it helps you focus.",
  "Practice explaining concepts out loud to identify gaps in your understanding.",
  "Use flashcards for quick, effective review of key concepts.",
  "Study during your peak energy hours when you're most alert.",
  "Break large tasks into smaller, manageable chunks to avoid feeling overwhelmed.",
  "Use different colors to highlight and categorize important information.",
  "Get adequate sleep before exams to ensure optimal cognitive performance."
];

export const StudyPlanScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { studyPlans, fetchStudyPlans } = useStudyStore();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('created_at');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [categories, setCategories] = useState<StudyPlanCategory[]>([]);
  const [recommendedPlans, setRecommendedPlans] = useState<StudyPlan[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [studyTips, setStudyTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [animatedValue] = useState(new Animated.Value(0));
  const [formHeight] = useState(new Animated.Value(0));
  
  const [formData, setFormData] = useState<StudyPlanForm>({
    subject: '',
    difficulty_level: 'beginner',
    duration_weeks: 4,
    daily_hours: 1,
    goals: '',
    learning_style: profile?.learning_style || 'visual',
  });

  // Refs for input fields
  const subjectInputRef = useRef<TextInput>(null);
  const durationInputRef = useRef<TextInput>(null);
  const hoursInputRef = useRef<TextInput>(null);
  const goalsInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Animate screen entrance
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate form show/hide
  useEffect(() => {
    Animated.timing(formHeight, {
      toValue: showForm ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showForm]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStudyPlans(user?.id || ''),
        loadCategories(),
        loadPreferences(),
        loadRecommendations(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAllData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getStudyPlanCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const preferencesData = await getStudyPlanPreferences(user?.id || '');
      setPreferences(preferencesData);
      
      if (preferencesData) {
        setFormData(prev => ({
          ...prev,
          difficulty_level: preferencesData.preferred_difficulty || 'beginner',
          learning_style: profile?.learning_style || 'visual',
        }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recommendationsData = await getRecommendedStudyPlans(user?.id || '');
      setRecommendedPlans(recommendationsData);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleGeneratePlan = async () => {
    dismissKeyboard();

    if (!formData.subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject to create your study plan.');
      return;
    }

    if (!formData.goals.trim()) {
      Alert.alert('Missing Information', 'Please describe your study goals to create a personalized plan.');
      return;
    }

    if (formData.duration_weeks < 1 || formData.duration_weeks > 52) {
      Alert.alert('Invalid Duration', 'Duration must be between 1 and 52 weeks.');
      return;
    }

    if (formData.daily_hours < 0.5 || formData.daily_hours > 12) {
      Alert.alert('Invalid Hours', 'Daily hours must be between 0.5 and 12 hours.');
      return;
    }

    if (!user) {
      Alert.alert('Authentication Error', 'Please sign in to create a study plan.');
      return;
    }

    setGenerating(true);
    try {
      // Generate study plan using OpenAI
      const planData = await generateStudyPlan(formData);
      
      // Generate additional resources
      const additionalResources = await generateAdditionalResources(
        formData.subject,
        planData.weeks.flatMap(week => week.topics),
        formData.difficulty_level,
        formData.learning_style,
        planData.resources
      );
      
      // Generate study tips
      const tips = await generateStudyTips(
        formData.subject,
        formData.difficulty_level,
        formData.learning_style
      );
      
      // Merge resources
      planData.resources = [...planData.resources, ...additionalResources];
      planData.tips = tips;
      
      // Create study plan in database
      const newPlan = await createStudyPlan({
        user_id: user.id,
        title: `${formData.subject} Study Plan`,
        description: `A ${formData.duration_weeks}-week study plan for ${formData.subject} at ${formData.difficulty_level} level`,
        subject: formData.subject,
        difficulty_level: formData.difficulty_level,
        duration_weeks: formData.duration_weeks,
        daily_hours: formData.daily_hours,
        plan_data: planData,
      });

      // Refresh study plans
      await fetchStudyPlans(user.id);
      
      // Reset form
      setFormData({
        subject: '',
        difficulty_level: 'beginner',
        duration_weeks: 4,
        daily_hours: 1,
        goals: '',
        learning_style: profile?.learning_style || 'visual',
      });
      setShowForm(false);
      
      Alert.alert(
        'Success! 🎉',
        `Your personalized study plan with ${formData.duration_weeks} weeks and ${formData.daily_hours} hours per day has been created successfully!`,
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
      setGenerating(false);
    }
  };

  const handleViewPlan = (planId: string) => {
    navigation.navigate('StudyPlanDetail', { planId });
  };

  const handleStartPlan = (planId: string) => {
    navigation.navigate('StudyPlanDetail', { planId, startSession: true });
  };

  const handleShowForm = () => {
    const newShowForm = !showForm;
    setShowForm(newShowForm);
    if (!newShowForm) {
      dismissKeyboard();
    } else {
      // Scroll to top when opening form
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const handleSort = (sortValue: string) => {
    setSelectedSort(sortValue);
    setShowSortModal(false);
  };

  const handleFilter = (filterValue: string) => {
    setSelectedFilter(filterValue);
    setShowFilterModal(false);
  };

  const handleShowTips = async () => {
    setShowTips(true);
    setLoadingTips(true);
    
    try {
      // Generate new tips each time the modal is opened
      const tips = await generateStudyTips(
        'General Study', // Use a general subject for tips
        'beginner', // Use beginner difficulty for broader appeal
        profile?.learning_style || 'visual'
      );
      
      // If API succeeds, use the generated tips
      setStudyTips(tips);
    } catch (error) {
      console.error('Error generating study tips:', error);
      
      // If API fails, use random fallback tips
      const shuffledTips = [...FALLBACK_STUDY_TIPS].sort(() => 0.5 - Math.random());
      const selectedTips = shuffledTips.slice(0, 5);
      setStudyTips(selectedTips);
    } finally {
      setLoadingTips(false);
    }
  };

  const getFilteredAndSortedPlans = () => {
    let filteredPlans = [...studyPlans];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filteredPlans = filteredPlans.filter(plan => 
        plan.title.toLowerCase().includes(query) ||
        plan.subject.toLowerCase().includes(query) ||
        (plan.description && plan.description.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      filteredPlans = filteredPlans.filter(plan => {
        const progress = getPlanProgress(plan);
        if (selectedFilter === 'in_progress') return progress > 0 && progress < 100;
        if (selectedFilter === 'completed') return progress === 100;
        if (selectedFilter === 'not_started') return progress === 0;
        return true;
      });
    }
    
    // Apply sorting
    filteredPlans.sort((a, b) => {
      if (selectedSort === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (selectedSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (selectedSort === 'progress') {
        return getPlanProgress(b) - getPlanProgress(a);
      }
      if (selectedSort === 'duration_weeks') {
        return a.duration_weeks - b.duration_weeks;
      }
      return 0;
    });
    
    return filteredPlans;
  };

  const getPlanProgress = (plan: StudyPlan) => {
    if (!plan.plan_data || !plan.plan_data.weeks) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    plan.plan_data.weeks.forEach(week => {
      if (week.tasks) {
        week.tasks.forEach(task => {
          totalTasks++;
          if (task.completed) completedTasks++;
        });
      }
    });

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const renderStudyPlanCard = ({ item }: { item: StudyPlan }) => (
    <StudyPlanCard
      key={item.id}
      studyPlan={item}
      onPress={() => handleViewPlan(item.id)}
      onStartPlan={() => handleStartPlan(item.id)}
      showStartButton={getPlanProgress(item) === 0}
    />
  );

  const renderRecommendedPlanCard = ({ item }: { item: StudyPlan }) => (
    <View style={styles.recommendedCardWrapper}>
      <StudyPlanCard
        key={item.id}
        studyPlan={item}
        onPress={() => {
          setShowRecommended(false);
          handleViewPlan(item.id);
        }}
      />
    </View>
  );

  const renderSortOption = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        selectedSort === item.value && styles.selectedOptionItem
      ]}
      onPress={() => handleSort(item.value)}
      activeOpacity={0.7}
    >
      <Text style={styles.optionIcon}>{item.icon}</Text>
      <Text style={[
        styles.optionItemText,
        selectedSort === item.value && styles.selectedOptionItemText
      ]}>
        {item.label}
      </Text>
      {selectedSort === item.value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderFilterOption = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        selectedFilter === item.value && styles.selectedOptionItem
      ]}
      onPress={() => handleFilter(item.value)}
      activeOpacity={0.7}
    >
      <Text style={styles.optionIcon}>{item.icon}</Text>
      <Text style={[
        styles.optionItemText,
        selectedFilter === item.value && styles.selectedOptionItemText
      ]}>
        {item.label}
      </Text>
      {selectedFilter === item.value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderStudyTip = ({ item, index }: { item: string, index: number }) => (
    <View key={index} style={styles.tipItem}>
      <View style={styles.tipBulletContainer}>
        <Text style={styles.tipBullet}>💡</Text>
      </View>
      <Text style={styles.tipText}>{item}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Animated.View style={[styles.container, { opacity: animatedValue }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Study Plans</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleShowTips}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iconButtonText}>💡</Text>
                </TouchableOpacity>
                {recommendedPlans.length > 0 && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowRecommended(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.iconButtonText}>⭐</Text>
                  </TouchableOpacity>
                )}
                <Button
                  title={showForm ? "Cancel" : "Create"}
                  onPress={handleShowForm}
                  variant="outline"
                />
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6366F1']}
                  tintColor="#6366F1"
                  title="Pull to refresh"
                  titleColor="#6B7280"
                />
              }
            >
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search study plans..."
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="search"
                    onSubmitEditing={dismissKeyboard}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Filter and Sort Options */}
              <View style={styles.filterSortContainer}>
                <TouchableOpacity
                  style={styles.filterSortButton}
                  onPress={() => setShowFilterModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterSortButtonText}>
                    {FILTER_OPTIONS.find(o => o.value === selectedFilter)?.icon} {FILTER_OPTIONS.find(o => o.value === selectedFilter)?.label}
                  </Text>
                  <Text style={styles.filterSortButtonIcon}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.filterSortButton}
                  onPress={() => setShowSortModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterSortButtonText}>
                    {SORT_OPTIONS.find(o => o.value === selectedSort)?.icon} {SORT_OPTIONS.find(o => o.value === selectedSort)?.label}
                  </Text>
                  <Text style={styles.filterSortButtonIcon}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              {showForm && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>✨ Generate AI Study Plan</Text>
                  
                  {/* Subject Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>📚 Subject</Text>
                    <TextInput
                      ref={subjectInputRef}
                      style={styles.textInput}
                      value={formData.subject}
                      onChangeText={(text) => setFormData({ ...formData, subject: text })}
                      placeholder="e.g., Mathematics, Physics, History"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="next"
                      onSubmitEditing={() => durationInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* Difficulty Level */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>🎯 Difficulty Level</Text>
                    <View style={styles.optionsContainer}>
                      {DIFFICULTY_LEVELS.map((level) => (
                        <TouchableOpacity
                          key={level.value}
                          style={[
                            styles.option,
                            formData.difficulty_level === level.value && styles.selectedOption,
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, difficulty_level: level.value as any });
                            dismissKeyboard();
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.optionEmoji}>{level.emoji}</Text>
                          <Text
                            style={[
                              styles.optionText,
                              formData.difficulty_level === level.value && styles.selectedOptionText,
                            ]}
                          >
                            {level.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Learning Style */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>🎨 Learning Style</Text>
                    <View style={styles.optionsContainer}>
                      {LEARNING_STYLES.map((style) => (
                        <TouchableOpacity
                          key={style.value}
                          style={[
                            styles.option,
                            formData.learning_style === style.value && styles.selectedOption,
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, learning_style: style.value as any });
                            dismissKeyboard();
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.optionEmoji}>{style.emoji}</Text>
                          <Text
                            style={[
                              styles.optionText,
                              formData.learning_style === style.value && styles.selectedOptionText,
                            ]}
                          >
                            {style.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfWidth}>
                      {/* Duration Input */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>📅 Duration (weeks)</Text>
                        <TextInput
                          ref={durationInputRef}
                          style={styles.textInput}
                          value={formData.duration_weeks.toString()}
                          onChangeText={(text) => {
                            const value = parseInt(text) || 1;
                            setFormData({ ...formData, duration_weeks: Math.max(1, Math.min(52, value)) });
                          }}
                          placeholder="4"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          returnKeyType="next"
                          onSubmitEditing={() => hoursInputRef.current?.focus()}
                          blurOnSubmit={false}
                        />
                      </View>
                    </View>

                    <View style={styles.halfWidth}>
                      {/* Daily Hours Input */}
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>⏰ Daily Hours</Text>
                        <TextInput
                          ref={hoursInputRef}
                          style={styles.textInput}
                          value={formData.daily_hours.toString()}
                          onChangeText={(text) => {
                            const value = parseFloat(text) || 1;
                            setFormData({ ...formData, daily_hours: Math.max(0.5, Math.min(12, value)) });
                          }}
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          returnKeyType="next"
                          onSubmitEditing={() => goalsInputRef.current?.focus()}
                          blurOnSubmit={false}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Goals Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>🎯 Study Goals</Text>
                    <TextInput
                      ref={goalsInputRef}
                      style={[styles.textInput, styles.textArea]}
                      value={formData.goals}
                      onChangeText={(text) => setFormData({ ...formData, goals: text })}
                      placeholder="What do you want to achieve with this study plan?"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      returnKeyType="done"
                      onSubmitEditing={dismissKeyboard}
                      blurOnSubmit={true}
                    />
                  </View>

                  <Button
                    title="✨ Generate Plan"
                    onPress={handleGeneratePlan}
                    loading={generating}
                    style={styles.generateButton}
                  />
                </View>
              )}

              {/* Study Plans List */}
              <View style={styles.plansListContainer}>
                {loading && studyPlans.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <LoadingSpinner message="Loading study plans..." />
                  </View>
                ) : getFilteredAndSortedPlans().length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text style={styles.emptyText}>
                      {searchQuery || selectedFilter !== 'all'
                        ? 'No plans found'
                        : 'No study plans yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                      {searchQuery 
                        ? 'Try adjusting your search or filters' 
                        : 'Create your first AI-powered study plan to get started'}
                    </Text>
                  </View>
                ) : (
                  getFilteredAndSortedPlans().map((plan) => (
                    <StudyPlanCard
                      key={plan.id}
                      studyPlan={plan}
                      onPress={() => handleViewPlan(plan.id)}
                      onStartPlan={() => handleStartPlan(plan.id)}
                      showStartButton={getPlanProgress(plan) === 0}
                    />
                  ))
                )}
              </View>
            </ScrollView>

            {generating && <LoadingSpinner message="Generating your personalized study plan..." />}

            {/* Sort Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showSortModal}
              onRequestClose={() => setShowSortModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowSortModal(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sort By</Text>
                    <TouchableOpacity
                      onPress={() => setShowSortModal(false)}
                      style={styles.modalCloseButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={SORT_OPTIONS}
                    renderItem={renderSortOption}
                    keyExtractor={(item) => item.value}
                    style={styles.optionsList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Filter Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showFilterModal}
              onRequestClose={() => setShowFilterModal(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowFilterModal(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Filter Plans</Text>
                    <TouchableOpacity
                      onPress={() => setShowFilterModal(false)}
                      style={styles.modalCloseButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={FILTER_OPTIONS}
                    renderItem={renderFilterOption}
                    keyExtractor={(item) => item.value}
                    style={styles.optionsList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Recommended Plans Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showRecommended}
              onRequestClose={() => setShowRecommended(false)}
            >
              <View style={styles.fullScreenModalOverlay}>
                <View style={styles.fullScreenModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>⭐ Recommended For You</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowRecommended(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {recommendedPlans.length > 0 ? (
                    <FlatList
                      data={recommendedPlans}
                      renderItem={renderRecommendedPlanCard}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.recommendedListContent}
                    />
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyEmoji}>⭐</Text>
                      <Text style={styles.emptyText}>No recommendations yet</Text>
                      <Text style={styles.emptySubtext}>
                        Create more study plans to get personalized recommendations
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Modal>

            {/* Study Tips Modal */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={showTips}
              onRequestClose={() => setShowTips(false)}
            >
              <View style={styles.fullScreenModalOverlay}>
                <View style={styles.fullScreenModalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>💡 Study Tips</Text>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowTips(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {loadingTips ? (
                    <View style={styles.tipsLoadingContainer}>
                      <LoadingSpinner message="Generating study tips..." />
                    </View>
                  ) : studyTips.length > 0 ? (
                    <FlatList
                      data={studyTips}
                      renderItem={renderStudyTip}
                      keyExtractor={(item, index) => index.toString()}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.tipsListContent}
                    />
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyEmoji}>💡</Text>
                      <Text style={styles.emptyText}>No tips available</Text>
                      <Text style={styles.emptySubtext}>
                        Try again later to get personalized study tips
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Modal>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: isSmallDevice ? 22 : 26,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconButtonText: {
    fontSize: 18,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  filterSortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  filterSortButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterSortButtonText: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  filterSortButtonIcon: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: isSmallDevice ? 16 : 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  formTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
    minWidth: isSmallDevice ? 70 : 80,
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
    fontSize: isSmallDevice ? 11 : 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  generateButton: {
    marginTop: 8,
  },
  plansListContainer: {
    paddingHorizontal: 20,
    minHeight: 200,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
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
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  optionsList: {
    flexGrow: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedOptionItem: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionItemText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: height * 0.8,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recommendedCardWrapper: {
    marginBottom: 12,
  },
  recommendedListContent: {
    paddingBottom: 20,
  },
  tipsListContent: {
    paddingBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    ...Platform.select({
      ios: {
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tipBulletContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  tipBullet: {
    fontSize: 20,
  },
  tipText: {
    fontSize: 15,
    color: '#1E3A8A',
    flex: 1,
    lineHeight: 22,
  },
  tipsLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});