// F:\StudyBuddy\src\components\calendar\AIWeeklySummary.tsx
// ============================================
// AI WEEKLY SUMMARY COMPONENT
// Beautiful UI for displaying weekly summaries
// ============================================

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { AIWeeklySummary as AIWeeklySummaryType } from '../../types';
import { Button } from '../Button';

const { width, height } = Dimensions.get('window');

interface AIWeeklySummaryProps {
  visible: boolean;
  onClose: () => void;
  summary: AIWeeklySummaryType | null;
}

export const AIWeeklySummary: React.FC<AIWeeklySummaryProps> = ({
  visible,
  onClose,
  summary
}) => {
  if (!visible) return null;
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };
  
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weekly Summary</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {summary ? (
            <>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{summary.title}</Text>
                <Text style={styles.overview}>{summary.overview}</Text>
              </View>
              
              <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>Your Stats</Text>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{formatTime(summary.stats.totalStudyTime)}</Text>
                    <Text style={styles.statLabel}>Total Study Time</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{summary.stats.totalSessions}</Text>
                    <Text style={styles.statLabel}>Study Sessions</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{summary.stats.successRate}%</Text>
                    <Text style={styles.statLabel}>Success Rate</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{summary.stats.streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                </View>
                
                <View style={styles.subjectStats}>
                  <View style={styles.subjectStat}>
                    <Text style={styles.subjectStatLabel}>Most Studied</Text>
                    <Text style={styles.subjectStatValue}>{summary.stats.mostStudiedSubject}</Text>
                  </View>
                  
                  <View style={styles.subjectStat}>
                    <Text style={styles.subjectStatLabel}>Least Studied</Text>
                    <Text style={styles.subjectStatValue}>{summary.stats.leastStudiedSubject}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.achievementsContainer}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                
                {summary.achievements.map((achievement, index) => (
                  <View key={index} style={styles.achievementItem}>
                    <View style={styles.achievementIcon}>
                      <Text style={styles.achievementIconText}>🏆</Text>
                    </View>
                    <Text style={styles.achievementText}>{achievement}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.recommendationsContainer}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                
                {summary.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationIcon}>
                      <Text style={styles.recommendationIconText}>💡</Text>
                    </View>
                    <Text style={styles.recommendationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.nextWeekContainer}>
                <Text style={styles.sectionTitle}>Focus for Next Week</Text>
                
                {summary.nextWeekFocus.map((focus, index) => (
                  <View key={index} style={styles.focusItem}>
                    <View style={styles.focusIcon}>
                      <Text style={styles.focusIconText}>🎯</Text>
                    </View>
                    <Text style={styles.focusText}>{focus}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No summary available</Text>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.footer}>
          <Button
            title="Close"
            onPress={onClose}
            style={styles.footerButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    height: height * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  overview: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statItem: {
    width: '50%',
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectStat: {
    width: '48%',
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  subjectStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  achievementsContainer: {
    marginBottom: 24,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementIconText: {
    fontSize: 20,
  },
  achievementText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  recommendationsContainer: {
    marginBottom: 24,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendationIconText: {
    fontSize: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  nextWeekContainer: {
    marginBottom: 24,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  focusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  focusIconText: {
    fontSize: 20,
  },
  focusText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    width: '100%',
  },
});