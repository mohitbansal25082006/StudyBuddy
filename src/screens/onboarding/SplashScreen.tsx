// ============================================
// SPLASH SCREEN
// Shows app logo while checking auth status
// ============================================

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export const SplashScreen = ({ navigation }: any) => {
  const { initialized, user, profile } = useAuthStore();

  useEffect(() => {
    // Wait for auth initialization
    if (initialized) {
      // Navigate based on auth state
      setTimeout(() => {
        if (user) {
          // User is logged in
          console.log('User found:', user.email);
          console.log('Profile:', profile);
          
          // Check if profile setup is complete
          // Profile is complete if they have full_name AND learning_style
          const isProfileComplete = profile?.full_name && profile?.learning_style;
          
          if (isProfileComplete) {
            // Profile is complete, go to main app
            console.log('Profile complete, navigating to Main');
            navigation.replace('Main');
          } else {
            // Profile needs setup
            console.log('Profile incomplete, navigating to ProfileSetup');
            navigation.replace('ProfileSetup');
          }
        } else {
          // User not logged in, show onboarding
          console.log('No user, navigating to Onboarding');
          navigation.replace('Onboarding');
        }
      }, 1500); // Show splash for 1.5 seconds
    }
  }, [initialized, user, profile, navigation]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#6366F1',
    }}>
      {/* App Logo */}
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}>
        <Text style={{
          fontSize: 48,
          fontWeight: 'bold',
        }}>
          📚
        </Text>
      </View>

      {/* App Name */}
      <Text style={{
        marginTop: 24,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
      }}>
        StudyBuddy
      </Text>

      {/* Tagline */}
      <Text style={{
        marginTop: 8,
        fontSize: 16,
        color: '#E0E7FF',
        textAlign: 'center',
        paddingHorizontal: 40,
      }}>
        Your AI-Powered Study Companion
      </Text>

      {/* Loading Indicator */}
      <ActivityIndicator
        size="large"
        color="#FFFFFF"
        style={{ marginTop: 40 }}
      />
    </View>
  );
};