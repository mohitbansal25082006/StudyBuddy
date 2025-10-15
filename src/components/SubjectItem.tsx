// F:\StudyBuddy\src\components\SubjectItem.tsx
// ============================================
// SUBJECT ITEM COMPONENT
// Displays a subject with progress information
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SubjectProgress } from '../types';

interface SubjectItemProps {
  subject: SubjectProgress;
  onPress: () => void;
}

export const SubjectItem: React.FC<SubjectItemProps> = ({ subject, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subjectName}>{subject.subject}</Text>
        <View style={[styles.accuracyBadge, { backgroundColor: getProgressColor(subject.accuracy_rate) }]}>
          <Text style={styles.accuracyText}>{subject.accuracy_rate}%</Text>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Study Time</Text>
          <Text style={styles.statValue}>{Math.round(subject.total_minutes / 60)}h</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Sessions</Text>
          <Text style={styles.statValue}>{subject.session_count}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Flashcards</Text>
          <Text style={styles.statValue}>{subject.flashcard_count}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.lastStudied}>Last studied: {formatDate(subject.last_studied)}</Text>
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
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  accuracyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  lastStudied: {
    fontSize: 14,
    color: '#6B7280',
  },
});