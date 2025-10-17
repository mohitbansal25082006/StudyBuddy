// F:\StudyBuddy\src\screens\calendar\ai\AIScheduleScreen.tsx
// ============================================
// AI SCHEDULE SCREEN
// Screen for AI schedule generation
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIScheduleGenerator } from '../../../components/calendar/AIScheduleGenerator';
import { useAuthStore } from '../../../store/authStore';
import { createCalendarEvent } from '../../../services/supabase';

export const AIScheduleScreen: React.FC = () => {
  const { user, profile } = useAuthStore();
  const subjects = profile?.subjects || [];
  
  const handleScheduleGenerated = async (schedule: any) => {
    try {
      // Create events from the generated schedule
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
      console.error('Error adding generated schedule:', error);
      // Handle error
    }
  };
  
  return (
    <View style={styles.container}>
      <AIScheduleGenerator
        visible={true}
        onClose={() => {}}
        onScheduleGenerated={handleScheduleGenerated}
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