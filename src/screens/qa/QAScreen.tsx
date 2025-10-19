// F:\StudyBuddy\src\screens\qa\QAScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getCommunityQuestions } from '../../services/supabase';
import { CommunityQuestion, AppStackParamList } from '../../types';
import { QuestionCard } from '../../components/qa/QuestionCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type QAScreenNavigationProp = StackNavigationProp<AppStackParamList, 'QAScreen'>;

export const QAScreen: React.FC = () => {
  const navigation = useNavigation<QAScreenNavigationProp>();
  const { user } = useAuthStore();
  const {
    questions,
    loadingQuestions,
    questionsInitialized,
    setQuestions,
    setLoadingQuestions,
    resetQuestions,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'unanswered'>('latest');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load questions
  const loadQuestions = useCallback(
    async (pageNum = 0, reset = false) => {
      if (!user) return;

      try {
        if (reset) {
          setLoadingQuestions(true);
          setPage(0);
          setHasMore(true);
          setError(null);
        }

        console.log('Loading questions with params:', { userId: user.id, pageNum, sortBy });
        const newQuestions = await getCommunityQuestions(user.id, 20, pageNum * 20, sortBy);
        console.log('Received questions:', newQuestions?.length || 0);

        if (reset) {
          setQuestions(newQuestions || []);
        } else {
          setQuestions((prevQuestions) => [...prevQuestions, ...(newQuestions || [])]);
        }

        setHasMore((newQuestions || []).length === 20);
        setPage(pageNum);
      } catch (error: any) {
        console.error('Error loading questions:', error);
        setError(error.message || 'Failed to load questions. Please try again.');
      } finally {
        setLoadingQuestions(false);
        setRefreshing(false);
      }
    },
    [user, sortBy, setQuestions, setLoadingQuestions]
  );

  // Initial load and user change handler
  useEffect(() => {
    if (user) {
      if (!questionsInitialized) {
        console.log('User available, initializing Q&A screen');
        loadQuestions(0, true);
      }
    } else {
      // Reset questions when user logs out
      resetQuestions();
    }
  }, [user, questionsInitialized, loadQuestions, resetQuestions]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadQuestions(0, true);
  }, [loadQuestions]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loadingQuestions && hasMore) {
      loadQuestions(page + 1, false);
    }
  }, [loadingQuestions, hasMore, page, loadQuestions]);

  // Sort by handler
  const handleSortBy = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy !== sortBy) {
      setSortBy(newSortBy);
      resetQuestions();
      loadQuestions(0, true);
    }
  }, [sortBy, loadQuestions, resetQuestions]);

  // Render question item
  const renderQuestion = useCallback(
    ({ item }: { item: CommunityQuestion }) => (
      <QuestionCard
        question={item}
        onPress={() => navigation.navigate('QuestionDetailScreen', { questionId: item.id })}
      />
    ),
    [navigation]
  );

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loadingQuestions || questions.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }, [loadingQuestions, questions.length]);

  // Render error state
  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadQuestions(0, true)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  console.log('Rendering Q&A screen with state:', { 
    loadingQuestions, 
    questionsLength: questions.length, 
    error, 
    questionsInitialized 
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Q&A</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AskQuestionScreen')}
          style={styles.askButton}
        >
          <Ionicons name="add-circle" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'latest' && styles.activeSortOption
          ]}
          onPress={() => handleSortBy('latest')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'latest' && styles.activeSortOptionText
          ]}>
            Latest
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'popular' && styles.activeSortOption
          ]}
          onPress={() => handleSortBy('popular')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'popular' && styles.activeSortOptionText
          ]}>
            Popular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortBy === 'unanswered' && styles.activeSortOption
          ]}
          onPress={() => handleSortBy('unanswered')}
        >
          <Text style={[
            styles.sortOptionText,
            sortBy === 'unanswered' && styles.activeSortOptionText
          ]}>
            Unanswered
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {error ? (
        renderError()
      ) : loadingQuestions && !questionsInitialized ? (
        <LoadingSpinner />
      ) : questions.length === 0 && questionsInitialized ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Questions Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to ask a question!
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AskQuestionScreen')}
            style={styles.askQuestionButton}
          >
            <Text style={styles.askQuestionButtonText}>Ask a Question</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={questions}
          renderItem={renderQuestion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            questionsInitialized && !loadingQuestions && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="help-circle-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Questions Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first to ask a question!
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AskQuestionScreen')}
                  style={styles.askQuestionButton}
                >
                  <Text style={styles.askQuestionButtonText}>Ask a Question</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  askButton: {
    padding: 4,
  },
  sortContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
  },
  activeSortOption: {
    backgroundColor: '#EBF5FF',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSortOptionText: {
    color: '#1E40AF',
  },
  listContent: {
    padding: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  askQuestionButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  askQuestionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});