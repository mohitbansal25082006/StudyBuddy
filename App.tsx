// ============================================
// MAIN APP FILE
// Entry point of the application
// ============================================

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoadingSpinner } from './src/components/LoadingSpinner';

const RootStack = createStackNavigator();

export default function App() {
  const { user, profile, loading, initialized, initialize } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    console.log('App mounting, initializing auth...');
    initialize();
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    console.log('Auth State:', { 
      initialized, 
      loading, 
      hasUser: !!user,
      userEmail: user?.email,
      profileComplete: !!(profile?.full_name && profile?.learning_style)
    });
  }, [initialized, loading, user, profile]);

  // Show loading spinner while initializing
  if (!initialized || loading) {
    return <LoadingSpinner message="Loading StudyBuddy..." />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <RootStack.Screen name="App" component={AppNavigator} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </>
  );
}