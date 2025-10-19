// F:\StudyBuddy\src\screens\qa\QuestionDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { 
  getQuestionWithAnswers, 
  voteOnQuestion, 
  voteOnAnswer, 
  acceptAnswer,
  createAnswer
} from '../../services/supabase';
import { generateAnswer } from '../../services/communityAI';
import { CommunityQuestion, QuestionAnswer, AppStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AnswerCard } from '../../components/qa/AnswerCard';

type QuestionDetailScreenRouteProp = RouteProp<AppStackParamList, 'QuestionDetailScreen'>;
type QuestionDetailScreenNavigationProp = NavigationProp<AppStackParamList, 'QuestionDetailScreen'>;

export const QuestionDetailScreen: React.FC = () => {
  const route = useRoute<QuestionDetailScreenRouteProp>();
  const navigation = useNavigation<QuestionDetailScreenNavigationProp>();
  const { questionId } = route.params;
  const { user } = useAuthStore();
  const {
    currentQuestion,
    questionAnswers,
    setCurrentQuestion,
    setQuestionAnswers,
    addQuestionAnswer,
    setLoadingQuestion,
    setLoadingAnswers,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Load question and answers
  const loadQuestionAndAnswers = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingQuestion(true);
      setLoadingAnswers(true);
      
      const { question, answers } = await getQuestionWithAnswers(questionId, user.id);
      setCurrentQuestion(question);
      setQuestionAnswers(answers);
    } catch (error) {
      console.error('Error loading question:', error);
      Alert.alert('Error', 'Failed to load question. Please try again.');
      navigation.goBack();
    } finally {
      setLoadingQuestion(false);
      setLoadingAnswers(false);
      setRefreshing(false);
    }
  }, [questionId, user, setCurrentQuestion, setQuestionAnswers, setLoadingQuestion, setLoadingAnswers, navigation]);

  // Initial load
  useEffect(() => {
    loadQuestionAndAnswers();
  }, [loadQuestionAndAnswers]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadQuestionAndAnswers();
  }, [loadQuestionAndAnswers]);

  // Handle vote on question
  const handleVoteQuestion = useCallback(async (voteType: 'up' | 'down') => {
    if (!user || !currentQuestion) return;
    
    try {
      const newVoteType = await voteOnQuestion(questionId, user.id, voteType);
      
      // Update local state
      const updatedQuestion = {
        ...currentQuestion,
        voted_by_user: newVoteType,
        upvotes: newVoteType === 'up' 
          ? (currentQuestion.voted_by_user === 'down' ? currentQuestion.upvotes + 1 : currentQuestion.upvotes + 1)
          : (currentQuestion.voted_by_user === 'up' ? currentQuestion.upvotes - 1 : currentQuestion.upvotes),
        downvotes: newVoteType === 'down' 
          ? (currentQuestion.voted_by_user === 'up' ? currentQuestion.downvotes + 1 : currentQuestion.downvotes + 1)
          : (currentQuestion.voted_by_user === 'down' ? currentQuestion.downvotes - 1 : currentQuestion.downvotes),
      };
      
      setCurrentQuestion(updatedQuestion);
    } catch (error) {
      console.error('Error voting on question:', error);
      Alert.alert('Error', 'Failed to vote. Please try again.');
    }
  }, [user, currentQuestion, questionId, setCurrentQuestion]);

  // Handle vote on answer
  const handleVoteAnswer = useCallback(async (answerId: string, voteType: 'up' | 'down') => {
    if (!user) return;
    
    try {
      const newVoteType = await voteOnAnswer(answerId, user.id, voteType);
      
      // Update local state
      const updatedAnswers = questionAnswers.map((answer: QuestionAnswer) => {
        if (answer.id === answerId) {
          return {
            ...answer,
            voted_by_user: newVoteType,
            upvotes: newVoteType === 'up' 
              ? (answer.voted_by_user === 'down' ? answer.upvotes + 1 : answer.upvotes + 1)
              : (answer.voted_by_user === 'up' ? answer.upvotes - 1 : answer.upvotes),
            downvotes: newVoteType === 'down' 
              ? (answer.voted_by_user === 'up' ? answer.downvotes + 1 : answer.downvotes + 1)
              : (answer.voted_by_user === 'down' ? answer.downvotes - 1 : answer.downvotes),
          };
        }
        return answer;
      });
      
      setQuestionAnswers(updatedAnswers);
    } catch (error) {
      console.error('Error voting on answer:', error);
      Alert.alert('Error', 'Failed to vote. Please try again.');
    }
  }, [user, questionAnswers, setQuestionAnswers]);

  // Handle accept answer
  const handleAcceptAnswer = useCallback(async (answerId: string) => {
    if (!user || !currentQuestion) return;
    
    try {
      await acceptAnswer(answerId, questionId, user.id);
      
      // Update local state
      const updatedAnswers = questionAnswers.map((answer: QuestionAnswer) => ({
        ...answer,
        is_accepted: answer.id === answerId
      }));
      
      setQuestionAnswers(updatedAnswers);
      
      setCurrentQuestion({
        ...currentQuestion,
        has_accepted_answer: true
      });
      
      Alert.alert('Success', 'Answer accepted successfully');
    } catch (error) {
      console.error('Error accepting answer:', error);
      Alert.alert('Error', 'Failed to accept answer. Please try again.');
    }
  }, [user, currentQuestion, questionId, questionAnswers, setQuestionAnswers, setCurrentQuestion]);

  // Handle submit answer
  const handleSubmitAnswer = useCallback(async () => {
    if (!user || !answerText.trim()) return;
    
    try {
      setSubmittingAnswer(true);
      
      const newAnswer = await createAnswer({
        question_id: questionId,
        user_id: user.id,
        content: answerText.trim(),
      });
      
      // Get user profile for the new answer
      const userProfile = {
        full_name: user.email?.split('@')[0] || 'You',
        avatar_url: null,
      };
      
      // Format new answer
      const formattedAnswer: QuestionAnswer = {
        ...newAnswer,
        user_name: userProfile.full_name,
        user_avatar: userProfile.avatar_url,
        voted_by_user: null,
      };
      
      const updatedAnswers = [...questionAnswers, formattedAnswer];
      setQuestionAnswers(updatedAnswers);
      setAnswerText('');
      
      Alert.alert('Success', 'Answer posted successfully');
    } catch (error) {
      console.error('Error creating answer:', error);
      Alert.alert('Error', 'Failed to post answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  }, [user, answerText, questionId, questionAnswers, setQuestionAnswers]);

  // Handle AI generate answer
  const handleGenerateAnswer = useCallback(async () => {
    if (!user || !currentQuestion) return;
    
    try {
      setAiGenerating(true);
      
      const userProfile = {
        full_name: user.email?.split('@')[0] || 'User',
        learning_style: 'visual',
        subjects: currentQuestion.tags,
      };
      
      const generatedAnswer = await generateAnswer(
        `${currentQuestion.title}\n\n${currentQuestion.content}`,
        userProfile
      );
      
      setAnswerText(generatedAnswer);
    } catch (error) {
      console.error('Error generating answer:', error);
      Alert.alert('Error', 'Failed to generate answer. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  }, [user, currentQuestion]);

  if (!currentQuestion) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Question */}
        <View style={styles.questionContainer}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                {currentQuestion.difficulty_level.charAt(0).toUpperCase() + currentQuestion.difficulty_level.slice(1)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.questionContent}>{currentQuestion.content}</Text>
          
          <View style={styles.questionTags}>
            {currentQuestion.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.questionActions}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                currentQuestion.voted_by_user === 'up' && styles.upvotedButton
              ]}
              onPress={() => handleVoteQuestion('up')}
            >
              <Ionicons
                name={currentQuestion.voted_by_user === 'up' ? "arrow-up" : "arrow-up-outline"}
                size={20}
                color={currentQuestion.voted_by_user === 'up' ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[
                styles.voteButtonText,
                currentQuestion.voted_by_user === 'up' && styles.upvotedButtonText
              ]}>
                {currentQuestion.upvotes}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.voteButton,
                currentQuestion.voted_by_user === 'down' && styles.downvotedButton
              ]}
              onPress={() => handleVoteQuestion('down')}
            >
              <Ionicons
                name={currentQuestion.voted_by_user === 'down' ? "arrow-down" : "arrow-down-outline"}
                size={20}
                color={currentQuestion.voted_by_user === 'down' ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[
                styles.voteButtonText,
                currentQuestion.voted_by_user === 'down' && styles.downvotedButtonText
              ]}>
                {currentQuestion.downvotes}
              </Text>
            </TouchableOpacity>
          </View>
          
          {currentQuestion.has_accepted_answer && (
            <View style={styles.acceptedAnswerIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.acceptedAnswerText}>Accepted Answer</Text>
            </View>
          )}
        </View>

        {/* Answers Section */}
        <View style={styles.answersSection}>
          <Text style={styles.answersTitle}>
            {questionAnswers.length} {questionAnswers.length === 1 ? 'Answer' : 'Answers'}
          </Text>
          
          {questionAnswers.length === 0 ? (
            <View style={styles.noAnswers}>
              <Text style={styles.noAnswersText}>No answers yet. Be the first to answer!</Text>
            </View>
          ) : (
            questionAnswers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                onVote={(voteType) => handleVoteAnswer(answer.id, voteType)}
                onAccept={() => handleAcceptAnswer(answer.id)}
                isQuestionAuthor={currentQuestion.user_id === user?.id}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Answer Input */}
      <View style={styles.answerInputContainer}>
        <TextInput
          value={answerText}
          onChangeText={setAnswerText}
          placeholder="Write your answer..."
          multiline
          style={styles.answerInput}
        />
        
        <View style={styles.answerActions}>
          <TouchableOpacity
            onPress={handleGenerateAnswer}
            disabled={aiGenerating}
            style={[
              styles.aiButton,
              { opacity: aiGenerating ? 0.5 : 1 }
            ]}
          >
            <Ionicons name="sparkles-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmitAnswer}
            disabled={submittingAnswer || !answerText.trim()}
            style={[
              styles.submitAnswerButton,
              { opacity: (submittingAnswer || !answerText.trim()) ? 0.5 : 1 }
            ]}
          >
            {submittingAnswer ? (
              <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  questionContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  questionContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  questionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  questionActions: {
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
  acceptedAnswerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  acceptedAnswerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    marginLeft: 4,
  },
  answersSection: {
    marginBottom: 16,
  },
  answersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  noAnswers: {
    padding: 20,
    alignItems: 'center',
  },
  noAnswersText: {
    fontSize: 16,
    color: '#6B7280',
  },
  answerInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  answerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 8,
    marginRight: 8,
  },
  submitAnswerButton: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 8,
  },
});