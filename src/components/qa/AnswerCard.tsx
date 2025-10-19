// F:\StudyBuddy\src\components\qa\AnswerCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuestionAnswer } from '../../types';

interface AnswerCardProps {
  answer: QuestionAnswer;
  onVote: (voteType: 'up' | 'down') => void;
  onAccept: () => void;
  isQuestionAuthor: boolean;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ 
  answer, 
  onVote, 
  onAccept, 
  isQuestionAuthor 
}) => {
  return (
    <View style={[
      styles.container,
      answer.is_accepted && styles.acceptedContainer
    ]}>
      {answer.is_accepted && (
        <View style={styles.acceptedHeader}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.acceptedText}>Accepted Answer</Text>
        </View>
      )}
      
      <View style={styles.answerHeader}>
        <Text style={styles.authorName}>{answer.user_name}</Text>
        <Text style={styles.answerDate}>
          {new Date(answer.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={styles.answerContent}>{answer.content}</Text>
      
      <View style={styles.answerActions}>
        <TouchableOpacity
          style={[
            styles.voteButton,
            answer.voted_by_user === 'up' && styles.upvotedButton
          ]}
          onPress={() => onVote('up')}
        >
          <Ionicons
            name={answer.voted_by_user === 'up' ? "arrow-up" : "arrow-up-outline"}
            size={20}
            color={answer.voted_by_user === 'up' ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[
            styles.voteButtonText,
            answer.voted_by_user === 'up' && styles.upvotedButtonText
          ]}>
            {answer.upvotes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.voteButton,
            answer.voted_by_user === 'down' && styles.downvotedButton
          ]}
          onPress={() => onVote('down')}
        >
          <Ionicons
            name={answer.voted_by_user === 'down' ? "arrow-down" : "arrow-down-outline"}
            size={20}
            color={answer.voted_by_user === 'down' ? "#FFFFFF" : "#6B7280"}
          />
          <Text style={[
            styles.voteButtonText,
            answer.voted_by_user === 'down' && styles.downvotedButtonText
          ]}>
            {answer.downvotes}
          </Text>
        </TouchableOpacity>
        
        {isQuestionAuthor && !answer.is_accepted && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
          >
            <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  acceptedContainer: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  acceptedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    marginLeft: 4,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  answerDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  answerContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  answerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  upvotedButton: {
    backgroundColor: '#10B981',
  },
  downvotedButton: {
    backgroundColor: '#EF4444',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  upvotedButtonText: {
    color: '#FFFFFF',
  },
  downvotedButtonText: {
    color: '#FFFFFF',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});