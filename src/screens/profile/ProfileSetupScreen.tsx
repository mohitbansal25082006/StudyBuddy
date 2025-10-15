// ============================================
// PROFILE SETUP SCREEN
// First-time user profile configuration
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { updateProfile } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { validateFullName, validateSubjects } from '../../utils/validation';

const LEARNING_STYLES = [
  { value: 'visual', label: '👁️ Visual', description: 'Learn through images and diagrams' },
  { value: 'auditory', label: '👂 Auditory', description: 'Learn through listening' },
  { value: 'reading', label: '📖 Reading/Writing', description: 'Learn through text' },
  { value: 'kinesthetic', label: '✋ Kinesthetic', description: 'Learn through doing' },
];

const GRADE_LEVELS = [
  'High School',
  'Undergraduate',
  'Graduate',
  'Professional',
  'Self-Learning',
];

const COMMON_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'History',
  'Geography',
  'Economics',
  'Psychology',
];

export const ProfileSetupScreen = ({ navigation }: any) => {
  const { user, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [studyGoals, setStudyGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ fullName: '', learningStyle: '', gradeLevel: '', subjects: '' });

  // Toggle subject selection
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Handle profile setup
  const handleSetup = async () => {
    // Reset errors
    setErrors({ fullName: '', learningStyle: '', gradeLevel: '', subjects: '' });

    // Validate inputs
    let hasError = false;
    const newErrors = { fullName: '', learningStyle: '', gradeLevel: '', subjects: '' };

    if (!fullName || !validateFullName(fullName)) {
      newErrors.fullName = 'Please enter your full name';
      hasError = true;
    }

    if (!learningStyle) {
      newErrors.learningStyle = 'Please select a learning style';
      hasError = true;
    }

    if (!gradeLevel) {
      newErrors.gradeLevel = 'Please select your grade level';
      hasError = true;
    }

    if (!validateSubjects(selectedSubjects)) {
      newErrors.subjects = 'Please select at least one subject';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      Alert.alert('Incomplete Profile', 'Please fill in all required fields');
      return;
    }

    // Save profile
    setLoading(true);
    try {
      const updatedProfile = await updateProfile(user!.id, {
        full_name: fullName,
        learning_style: learningStyle,
        grade_level: gradeLevel,
        subjects: selectedSubjects,
        study_goals: studyGoals,
      });

      setProfile(updatedProfile);
      Alert.alert('Success!', 'Your profile has been set up', [
        {
          text: 'Continue',
          onPress: () => navigation.replace('Main'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 60 }}>
          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: 8,
            }}>
              Complete Your Profile
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
            }}>
              Help us personalize your learning experience
            </Text>
          </View>

          {/* Full Name */}
          <Input
            label="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            error={errors.fullName}
          />

          {/* Learning Style */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Learning Style *
            </Text>

            {LEARNING_STYLES.map((style) => (
              <TouchableOpacity
                key={style.value}
                onPress={() => setLearningStyle(style.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: learningStyle === style.value ? '#EEF2FF' : '#F9FAFB',
                  borderWidth: 2,
                  borderColor: learningStyle === style.value ? '#6366F1' : '#E5E7EB',
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 4,
                  }}>
                    {style.label}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6B7280',
                  }}>
                    {style.description}
                  </Text>
                </View>
                {learningStyle === style.value && (
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#6366F1',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {errors.learningStyle && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                {errors.learningStyle}
              </Text>
            )}
          </View>

          {/* Grade Level */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Grade Level *
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {GRADE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setGradeLevel(level)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: gradeLevel === level ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: gradeLevel === level ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: gradeLevel === level ? '#FFFFFF' : '#6B7280',
                  }}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gradeLevel && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                {errors.gradeLevel}
              </Text>
            )}
          </View>

          {/* Subjects */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Subjects You're Studying *
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {COMMON_SUBJECTS.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  onPress={() => toggleSubject(subject)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: selectedSubjects.includes(subject) ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: selectedSubjects.includes(subject) ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selectedSubjects.includes(subject) ? '#FFFFFF' : '#6B7280',
                  }}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.subjects && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                {errors.subjects}
              </Text>
            )}
          </View>

          {/* Study Goals */}
          <Input
            label="Study Goals (Optional)"
            value={studyGoals}
            onChangeText={setStudyGoals}
            placeholder="e.g., Prepare for SAT, Master Calculus..."
            multiline
            numberOfLines={3}
          />

          {/* Setup Button */}
          <Button
            title="Complete Setup"
            onPress={handleSetup}
            loading={loading}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};