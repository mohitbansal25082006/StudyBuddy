// ============================================
// PROFILE EDIT SCREEN
// Edit profile with image upload
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { updateProfile, uploadAvatar } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';

const LEARNING_STYLES = [
  { value: 'visual', label: '👁️ Visual' },
  { value: 'auditory', label: '👂 Auditory' },
  { value: 'reading', label: '📖 Reading' },
  { value: 'kinesthetic', label: '✋ Kinesthetic' },
];

const GRADE_LEVELS = ['High School', 'Undergraduate', 'Graduate', 'Professional', 'Self-Learning'];
const COMMON_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Geography', 'Economics', 'Psychology'];

export const ProfileEditScreen = ({ navigation }: any) => {
  const { user, profile, setProfile, logout } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [learningStyle, setLearningStyle] = useState(profile?.learning_style || null);
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level || null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile?.subjects || []);
  const [studyGoals, setStudyGoals] = useState(profile?.study_goals || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || null);
  const [loading, setLoading] = useState(false);

  // Pick image from gallery
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Toggle subject
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile?.avatar_url) {
        avatarUrl = await uploadAvatar(user.id, avatarUri);
      }

      // Update profile
      const updatedProfile = await updateProfile(user.id, {
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
        learning_style: learningStyle,
        grade_level: gradeLevel,
        subjects: selectedSubjects,
        study_goals: studyGoals,
      });

      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Auth', { screen: 'SignIn' });
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 60 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24, color: '#6366F1' }}>←</Text>
            </TouchableOpacity>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#111827',
            }}>
              Edit Profile
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: '#E5E7EB',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                borderWidth: 4,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text style={{ fontSize: 48 }}>👤</Text>
                )}
              </View>
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#6366F1',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#FFFFFF',
              }}>
                <Text style={{ fontSize: 18 }}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={{
              marginTop: 12,
              fontSize: 14,
              color: '#6B7280',
            }}>
              Tap to change photo
            </Text>
          </View>

          {/* Form */}
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            autoCapitalize="words"
          />

          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={3}
          />

          <Input
            label="Email"
            value={profile?.email || ''}
            onChangeText={() => {}}
            placeholder="Email"
            editable={false}
          />

          {/* Learning Style */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Learning Style
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {LEARNING_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  onPress={() => setLearningStyle(style.value as any)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: learningStyle === style.value ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: learningStyle === style.value ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: learningStyle === style.value ? '#FFFFFF' : '#6B7280',
                  }}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grade Level */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Grade Level
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
          </View>

          {/* Subjects */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Subjects
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
          </View>

          {/* Study Goals */}
          <Input
            label="Study Goals"
            value={studyGoals}
            onChangeText={setStudyGoals}
            placeholder="What do you want to achieve?"
            multiline
            numberOfLines={3}
          />

          {/* Save Button */}
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          {/* Sign Out Button */}
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};