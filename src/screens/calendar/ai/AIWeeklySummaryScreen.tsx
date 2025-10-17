// F:\StudyBuddy\src\screens\calendar\ai\AIWeeklySummaryScreen.tsx
// ============================================
// AI WEEKLY SUMMARY SCREEN
// Screen for displaying weekly summaries
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIWeeklySummary } from '../../../components/calendar/AIWeeklySummary';

export const AIWeeklySummaryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <AIWeeklySummary
        visible={true}
        onClose={() => {}}
        summary={null}
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