// F:\StudyBuddy\src\components\StudyPlanCard.tsx
// ============================================
// STUDY PLAN CARD COMPONENT
// Displays a study plan in a card format
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StudyPlan } from '../types';

interface StudyPlanCardProps {
  studyPlan: StudyPlan;
  onPress: () => void;
}

export const StudyPlanCard: React.FC<StudyPlanCardProps> = ({ studyPlan, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '#10B981'; // Green
      case 'intermediate':
        return '#F59E0B'; // Amber
      case 'advanced':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{studyPlan.title}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(studyPlan.difficulty_level) }]}>
          <Text style={styles.difficultyText}>{studyPlan.difficulty_level}</Text>
        </View>
      </View>
      
      <Text style={styles.subject}>{studyPlan.subject}</Text>
      
      {studyPlan.description && (
        <Text style={styles.description} numberOfLines={2}>{studyPlan.description}</Text>
      )}
      
      <View style={styles.footer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Duration</Text>
          <Text style={styles.infoValue}>{studyPlan.duration_weeks} weeks</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Daily</Text>
          <Text style={styles.infoValue}>{studyPlan.daily_hours}h</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>{formatDate(studyPlan.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  subject: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});