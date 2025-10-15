// F:\StudyBuddy\src\screens\studyPlan\StudyPlanScreen.tsx
// ============================================
// STUDY PLAN SCREEN
// AI-powered study plan generator
// ============================================

import React, { useState, useRef } from 'react';
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
  TextInput
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { generateStudyPlan } from '../../services/openai';
import { createStudyPlan } from '../../services/supabase';
import { StudyPlanForm } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { StudyPlanCard } from '../../components/StudyPlanCard';

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual' },
  { value: 'auditory', label: 'Auditory' },
  { value: 'reading', label: 'Reading' },
  { value: 'kinesthetic', label: 'Kinesthetic' },
];

export const StudyPlanScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { studyPlans, fetchStudyPlans } = useStudyStore();
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
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

  // Load study plans
  React.useEffect(() => {
    if (user) {
      fetchStudyPlans(user.id);
    }
  }, [user, fetchStudyPlans]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleGeneratePlan = async () => {
    // Dismiss keyboard before generating plan
    dismissKeyboard();

    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!formData.goals.trim()) {
      Alert.alert('Error', 'Please describe your study goals');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setGenerating(true);
    try {
      // Generate study plan using OpenAI
      const planData = await generateStudyPlan(formData);
      
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
      
      Alert.alert('Success', 'Study plan generated successfully!');
      
      // Navigate to the new plan
      navigation.navigate('StudyPlanDetail', { planId: newPlan.id });
    } catch (error: any) {
      console.error('Error generating study plan:', error);
      Alert.alert('Error', error.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewPlan = (planId: string) => {
    navigation.navigate('StudyPlanDetail', { planId });
  };

  const handleShowForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      dismissKeyboard();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Study Plans</Text>
            <Button
              title={showForm ? "Cancel" : "Create New"}
              onPress={handleShowForm}
              variant="outline"
            />
          </View>

          {showForm && (
            <ScrollView 
              style={styles.formScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Generate AI Study Plan</Text>
                
                {/* Subject Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Subject</Text>
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

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Difficulty Level</Text>
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
                        >
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

                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Learning Style</Text>
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
                        >
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
                </View>

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    {/* Duration Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Duration (weeks)</Text>
                      <TextInput
                        ref={durationInputRef}
                        style={styles.textInput}
                        value={formData.duration_weeks.toString()}
                        onChangeText={(text) => setFormData({ ...formData, duration_weeks: parseInt(text) || 1 })}
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
                      <Text style={styles.label}>Daily Hours</Text>
                      <TextInput
                        ref={hoursInputRef}
                        style={styles.textInput}
                        value={formData.daily_hours.toString()}
                        onChangeText={(text) => setFormData({ ...formData, daily_hours: parseInt(text) || 1 })}
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        returnKeyType="next"
                        onSubmitEditing={() => goalsInputRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>
                </View>

                {/* Goals Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Study Goals</Text>
                  <TextInput
                    ref={goalsInputRef}
                    style={[styles.textInput, styles.textArea]}
                    value={formData.goals}
                    onChangeText={(text) => setFormData({ ...formData, goals: text })}
                    placeholder="What do you want to achieve with this study plan?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                    blurOnSubmit={true}
                  />
                </View>

                <Button
                  title="Generate Plan"
                  onPress={handleGeneratePlan}
                  loading={generating}
                  style={styles.generateButton}
                />
              </View>
            </ScrollView>
          )}

          <ScrollView 
            style={styles.plansContainer} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={studyPlans.length === 0 ? styles.emptyScrollContainer : undefined}
          >
            {studyPlans.length > 0 ? (
              studyPlans.map((plan) => (
                <StudyPlanCard
                  key={plan.id}
                  studyPlan={plan}
                  onPress={() => handleViewPlan(plan.id)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No study plans yet</Text>
                <Text style={styles.emptySubtext}>Create your first AI-powered study plan to get started</Text>
              </View>
            )}
          </ScrollView>

          {generating && <LoadingSpinner message="Generating your study plan..." />}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'ios' ? 60 : 20, // Extra padding for iOS notch
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  formScrollContainer: {
    flex: 0,
    maxHeight: '70%', // Limit form height to prevent overflow
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
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
    marginHorizontal: -4,
    marginBottom: 16,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    margin: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  generateButton: {
    marginTop: 8,
  },
  plansContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 200,
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
  },
});