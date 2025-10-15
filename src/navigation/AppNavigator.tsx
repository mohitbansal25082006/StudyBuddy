// F:\StudyBuddy\src\navigation\AppNavigator.tsx
// ============================================
// APP NAVIGATOR
// Main navigation after authentication
// ============================================

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

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
      'StudyPlan': '📚',
      'Flashcards': '🗂️',
      'Calendar': '📅',
      'Progress': '📊',
      'Subjects': '📖',
    };
    
    return iconMap[tabName] || '📱';
  };

  const formatTabName = (tabName: string): string => {
    return tabName.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Text style={{ 
        fontSize: 24, 
        marginBottom: 4 
      }}>
        {getIcon(name)}
      </Text>
      
      <Text style={{ 
        fontSize: 12, 
        color: focused ? '#6366F1' : '#9CA3AF',
        fontWeight: focused ? '600' : '400'
      }}>
        {formatTabName(name)}
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
    tabBarActiveTintColor: '#6366F1',
    tabBarInactiveTintColor: '#9CA3AF',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      height: 80,
      paddingBottom: 10,
      paddingTop: 10,
    },
    headerShown: false,
  });

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
      />
      <Tab.Screen 
        name="Subjects" 
        component={SubjectsScreen} 
      />
      <Tab.Screen 
        name="StudyPlan" 
        component={StudyPlanScreen} 
      />
      <Tab.Screen 
        name="Flashcards" 
        component={FlashcardsScreen} 
      />
      <Tab.Screen 
        name="Calendar" 
        component={CalendarScreen} 
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen} 
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
      />
      
      {/* Flashcard Screens */}
      <Stack.Screen 
        name="FlashcardReview" 
        component={FlashcardReviewScreen} 
      />
      
      {/* Calendar Screens */}
      <Stack.Screen 
        name="AddEvent" 
        component={AddEventScreen} 
      />
      <Stack.Screen 
        name="EditEvent" 
        component={EditEventScreen} 
      />
    </Stack.Navigator>
  );
};