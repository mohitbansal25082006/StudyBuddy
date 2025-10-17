// F:\StudyBuddy\src\components\StudyPlanCard.tsx
// ============================================
// STUDY PLAN CARD COMPONENT - ENHANCED
// Displays a study plan in a card format with more details
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { StudyPlan } from '../types';

interface StudyPlanCardProps {
  studyPlan: StudyPlan;
  onPress: () => void;
  onStartPlan?: () => void;
  showStartButton?: boolean;
}

export const StudyPlanCard: React.FC<StudyPlanCardProps> = ({ 
  studyPlan, 
  onPress, 
  onStartPlan,
  showStartButton = false 
}) => {
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

  const getProgressPercentage = () => {
    if (!studyPlan.plan_data || !studyPlan.plan_data.weeks) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    studyPlan.plan_data.weeks.forEach(week => {
      if (week.tasks) {
        week.tasks.forEach(task => {
          totalTasks++;
          if (task.completed) completedTasks++;
        });
      }
    });

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const getProgressColor = () => {
    const progress = getProgressPercentage();
    if (progress < 33) return '#EF4444'; // Red
    if (progress < 66) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{studyPlan.title}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(studyPlan.difficulty_level) }]}>
            <Text style={styles.difficultyText}>{studyPlan.difficulty_level}</Text>
          </View>
        </View>
        
        {studyPlan.plan_data && studyPlan.plan_data.resources && (
          <View style={styles.resourceCount}>
            <Text style={styles.resourceCountText}>
              {studyPlan.plan_data.resources.length} resources
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.subject}>{studyPlan.subject}</Text>
      
      {studyPlan.description && (
        <Text style={styles.description} numberOfLines={2}>{studyPlan.description}</Text>
      )}
      
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Progress: {getProgressPercentage()}%</Text>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { 
              width: `${getProgressPercentage()}%`,
              backgroundColor: getProgressColor()
            }]} 
          />
        </View>
      </View>
      
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
      
      {showStartButton && (
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={(e) => {
            e.stopPropagation();
            if (onStartPlan) onStartPlan();
          }}
        >
          <Text style={styles.startButtonText}>Start Plan</Text>
        </TouchableOpacity>
      )}
      
      {studyPlan.plan_data && studyPlan.plan_data.resources && (
        <ScrollView horizontal style={styles.resourcesScroll} showsHorizontalScrollIndicator={false}>
          {studyPlan.plan_data.resources.slice(0, 3).map((resource, index) => (
            <View key={index} style={styles.resourcePreview}>
              <Text style={styles.resourceTypeIcon}>
                {resource.type === 'video' && '🎥'}
                {resource.type === 'article' && '📄'}
                {resource.type === 'book' && '📚'}
                {resource.type === 'website' && '🌐'}
                {resource.type === 'tool' && '🛠️'}
                {resource.type === 'course' && '🎓'}
                {resource.type === 'podcast' && '🎧'}
                {resource.type === 'interactive' && '🎮'}
              </Text>
              <Text style={styles.resourceTitle} numberOfLines={1}>{resource.title}</Text>
            </View>
          ))}
          {studyPlan.plan_data.resources.length > 3 && (
            <View style={styles.moreResources}>
              <Text style={styles.moreResourcesText}>+{studyPlan.plan_data.resources.length - 3} more</Text>
            </View>
          )}
        </ScrollView>
      )}
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
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
  resourceCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resourceCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
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
  progressContainer: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  startButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resourcesScroll: {
    marginTop: 8,
  },
  resourcePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: 120,
  },
  resourceTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resourceTitle: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  moreResources: {
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  moreResourcesText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});