// F:\StudyBuddy\src\screens\calendar\ai\AIGoalScreen.tsx
// ============================================
// AI GOAL SCREEN
// Screen for AI goal conversion
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIGoalConverter } from '../../../components/calendar/AIGoalConverter';
import { useAuthStore } from '../../../store/authStore';
import { createCalendarEvent } from '../../../services/supabase';

export const AIGoalScreen: React.FC = () => {
  const { user, profile } = useAuthStore();
  const subjects = profile?.subjects || [];
  
  const handleGoalConverted = async (schedule: any) => {
    try {
      // Create events from the converted schedule
      for (const event of schedule.events) {
        await createCalendarEvent({
          user_id: user?.id || '',
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          subject: event.subject,
          event_type: event.event_type,
        });
      }
      
      // Navigate back to calendar
      // navigation.navigate('Calendar');
    } catch (error: any) {
      console.error('Error adding converted schedule:', error);
      // Handle error
    }
  };
  
  return (
    <View style={styles.container}>
      <AIGoalConverter
        visible={true}
        onClose={() => {}}
        onGoalConverted={handleGoalConverted}
        subjects={subjects}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});