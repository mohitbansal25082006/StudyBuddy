// F:\StudyBuddy\src\components\qa\QuestionCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityQuestion } from '../../types';

interface QuestionCardProps {
  question: CommunityQuestion;
  onPress: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onPress }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'hard':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {question.title}
        </Text>
        <View style={[
          styles.difficultyBadge,
          { backgroundColor: getDifficultyColor(question.difficulty_level) }
        ]}>
          <Text style={styles.difficultyText}>
            {question.difficulty_level.charAt(0).toUpperCase() + question.difficulty_level.slice(1)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.content} numberOfLines={3}>
        {question.content}
      </Text>
      
      <View style={styles.tags}>
        {question.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
        {question.tags.length > 3 && (
          <Text style={styles.moreTagsText}>+{question.tags.length - 3}</Text>
        )}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="arrow-up" size={16} color="#6B7280" />
          <Text style={styles.statText}>{question.upvotes}</Text>
        </View>
        
        <View style={styles.stat}>
          <Ionicons name="arrow-down" size={16} color="#6B7280" />
          <Text style={styles.statText}>{question.downvotes}</Text>
        </View>
        
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>{question.views} views</Text>
        </View>
        
        {question.has_accepted_answer && (
          <View style={styles.acceptedIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.acceptedText}>Answered</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  acceptedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  acceptedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
  },
});