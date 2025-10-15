// F:\StudyBuddy\src\navigation\AppNavigator.tsx
// ============================================
// APP NAVIGATOR
// Main navigation after authentication
// ============================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';
import { ProfileEditScreen } from '../screens/profile/ProfileEditScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { StudyPlanScreen } from '../screens/studyPlan/StudyPlanScreen';
import { StudyPlanDetailScreen } from '../screens/studyPlan/StudyPlanDetailScreen';
import { FlashcardsScreen } from '../screens/flashcards/FlashcardsScreen';
import { FlashcardReviewScreen } from '../screens/flashcards/FlashcardReviewScreen';
import { CalendarScreen } from '../screens/calendar/CalendarScreen';
import { AddEventScreen } from '../screens/calendar/AddEventScreen';
import { EditEventScreen } from '../screens/calendar/EditEventScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { SubjectsScreen } from '../screens/subjects/SubjectsScreen';

// Types & Store
import { AppStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';

// ============================================
// CONSTANTS & TYPES
// ============================================

const Stack = createStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator();

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  tabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70, // Fixed width for each tab
    paddingHorizontal: 2,
  },
  icon: {
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
  labelFocused: {
    color: '#6366F1',
  },
  labelUnfocused: {
    color: '#9CA3AF',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 70, // Reduced height
    paddingBottom: 8,
    paddingTop: 8,
  },
});

// ============================================
// TAB ICON COMPONENT
// ============================================

interface TabIconProps {
  name: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const getIcon = (tabName: string): string => {
    const iconMap: { [key: string]: string } = {
      'Home': '🏠',
      'Subjects': '📖',
      'StudyPlan': '📚',
      'Flashcards': '🗂️',
      'Calendar': '📅',
      'Progress': '📊',
    };
    
    return iconMap[tabName] || '📱';
  };

  const getShortLabel = (tabName: string): string => {
    const labelMap: { [key: string]: string } = {
      'Home': 'Home',
      'Subjects': 'Subjects',
      'StudyPlan': 'Plan',
      'Flashcards': 'Cards',
      'Calendar': 'Calendar',
      'Progress': 'Progress',
    };
    
    return labelMap[tabName] || tabName;
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.icon}>
        {getIcon(name)}
      </Text>
      
      <Text 
        style={[
          styles.label,
          focused ? styles.labelFocused : styles.labelUnfocused
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {getShortLabel(name)}
      </Text>
    </View>
  );
};

// ============================================
// TAB NAVIGATOR
// ============================================

const TabNavigator: React.FC = () => {
  const tabScreenOptions = ({ route }: any) => ({
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <TabIcon name={route.name} focused={focused} />
    ),
    tabBarLabel: () => null, // Hide default labels
    tabBarActiveTintColor: '#6366F1',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: styles.tabBar,
    headerShown: false,
  });

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Subjects" 
        component={SubjectsScreen}
        options={{
          title: 'Subjects',
        }}
      />
      <Tab.Screen 
        name="StudyPlan" 
        component={StudyPlanScreen}
        options={{
          title: 'Study Plan',
        }}
      />
      <Tab.Screen 
        name="Flashcards" 
        component={FlashcardsScreen}
        options={{
          title: 'Flashcards',
        }}
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          title: 'Calendar',
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{
          title: 'Progress',
        }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// MAIN APP NAVIGATOR
// ============================================

export const AppNavigator: React.FC = () => {
  const { profile } = useAuthStore();
  
  // Determine initial route based on profile completion
  const isProfileComplete = profile?.full_name && profile?.learning_style;
  const initialRouteName = isProfileComplete ? 'Main' : 'ProfileSetup';

  console.log('AppNavigator - Profile complete:', isProfileComplete);
  console.log('AppNavigator - Initial route:', initialRouteName);

  const stackScreenOptions = {
    headerShown: false,
    gestureEnabled: true,
    cardStyle: { backgroundColor: '#FFFFFF' },
  };

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={stackScreenOptions}
    >
      {/* Profile Screens */}
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen} 
        options={{
          gestureEnabled: false, // Disable back gesture on profile setup
        }}
      />
      <Stack.Screen 
        name="ProfileEdit" 
        component={ProfileEditScreen} 
      />
      
      {/* Main Tab Navigator */}
      <Stack.Screen 
        name="Main" 
        component={TabNavigator} 
      />
      
      {/* Study Plan Screens */}
      <Stack.Screen 
        name="StudyPlanDetail" 
        component={StudyPlanDetailScreen} 
        options={{
          presentation: 'card',
        }}
      />
      
      {/* Flashcard Screens */}
      <Stack.Screen 
        name="FlashcardReview" 
        component={FlashcardReviewScreen} 
        options={{
          presentation: 'card',
        }}
      />
      
      {/* Calendar Screens */}
      <Stack.Screen 
        name="AddEvent" 
        component={AddEventScreen} 
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen} 
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;