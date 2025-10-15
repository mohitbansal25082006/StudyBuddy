// ============================================
// APP NAVIGATOR
// Main navigation after authentication
// ============================================

import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { AppStackParamList } from '../types';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator<AppStackParamList>();

// Main Screen Component
const MainScreen = ({ navigation }: any) => {
  const { profile } = useAuthStore();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 40 }}>
      {/* Success Message */}
      <View style={{
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <Text style={{ fontSize: 48 }}>✓</Text>
      </View>

      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 }}>
        Welcome to StudyBuddy!
      </Text>

      <Text style={{ fontSize: 18, fontWeight: '600', color: '#6366F1', marginBottom: 16 }}>
        {profile?.full_name || 'User'}
      </Text>

      <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
        🎉 Part 1 Complete! You've successfully set up authentication and your profile. Main features are coming in Part 2!
      </Text>

      {/* Profile Info Card */}
      <View style={{
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12 }}>
          YOUR PROFILE
        </Text>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Learning Style</Text>
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
            {profile?.learning_style ? profile.learning_style.charAt(0).toUpperCase() + profile.learning_style.slice(1) : 'Not set'}
          </Text>
        </View>
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Grade Level</Text>
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
            {profile?.grade_level || 'Not set'}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Subjects</Text>
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
            {profile?.subjects && profile.subjects.length > 0 ? profile.subjects.join(', ') : 'None selected'}
          </Text>
        </View>
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ProfileEdit')}
        style={{
          backgroundColor: '#6366F1',
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 12,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          Edit Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export const AppNavigator = () => {
  const { profile } = useAuthStore();
  
  // Determine initial route based on profile completion
  const isProfileComplete = profile?.full_name && profile?.learning_style;
  const initialRouteName = isProfileComplete ? 'Main' : 'ProfileSetup';

  console.log('AppNavigator - Profile complete:', isProfileComplete);
  console.log('AppNavigator - Initial route:', initialRouteName);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    </Stack.Navigator>
  );
};