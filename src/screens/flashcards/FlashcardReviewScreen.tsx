// F:\StudyBuddy\src\screens\flashcards\FlashcardReviewScreen.tsx
// ============================================
// FLASHCARD REVIEW SCREEN
// Interactive flashcard review with spaced repetition
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { getFlashcardsForReview, updateFlashcard, createStudySession } from '../../services/supabase';
import { Flashcard as FlashcardType } from '../../types';
import { Flashcard } from '../../components/Flashcard';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const FlashcardReviewScreen = ({ route, navigation }: any) => {
  const { subject } = route.params;
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [reviewStartTime, setReviewStartTime] = useState<Date | null>(null);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
  });

  // Load flashcards for review
  useEffect(() => {
    const loadFlashcards = async () => {
      if (!user) return;
      
      try {
        const cards = await getFlashcardsForReview(user.id, subject);
        setFlashcards(cards);
        setReviewStats(prev => ({ ...prev, total: cards.length }));
        setReviewStartTime(new Date());
      } catch (error) {
        console.error('Error loading flashcards:', error);
        Alert.alert('Error', 'Failed to load flashcards');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadFlashcards();
  }, [user, subject, navigation]);

  // Handle card answer
  const handleAnswer = async (correct: boolean) => {
    if (!user || flashcards.length === 0) return;

    const currentCard = flashcards[currentCardIndex];
    
    try {
      // Calculate next review time based on spaced repetition algorithm
      const now = new Date();
      let nextReview: Date;
      
      if (correct) {
        // Correct answer - increase interval
        const reviewCount = currentCard.review_count + 1;
        const correctCount = currentCard.correct_count + 1;
        
        // Simple spaced repetition algorithm
        let intervalDays = 1;
        if (reviewCount === 2) intervalDays = 3;
        else if (reviewCount === 3) intervalDays = 7;
        else if (reviewCount === 4) intervalDays = 14;
        else if (reviewCount >= 5) intervalDays = 30;
        
        nextReview = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        
        // Update card
        await updateFlashcard(currentCard.id, {
          review_count: reviewCount,
          correct_count: correctCount,
          last_reviewed: now.toISOString(),
          next_review: nextReview.toISOString(),
        });
        
        setReviewStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      } else {
        // Incorrect answer - reset interval
        nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
        
        // Update card
        await updateFlashcard(currentCard.id, {
          review_count: currentCard.review_count + 1,
          last_reviewed: now.toISOString(),
          next_review: nextReview.toISOString(),
        });
        
        setReviewStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      }
      
      // Move to next card
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        // Review complete
        completeReview();
      }
    } catch (error) {
      console.error('Error updating flashcard:', error);
      Alert.alert('Error', 'Failed to update flashcard');
    }
  };

  // Handle skipping a card
  const handleSkip = () => {
    setReviewStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Review complete
      completeReview();
    }
  };

  // Complete the review session
  const completeReview = async () => {
    if (!user || !reviewStartTime) return;
    
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - reviewStartTime.getTime()) / 60000);
    
    try {
      // Create study session
      await createStudySession({
        user_id: user.id,
        subject: subject || 'Mixed',
        duration_minutes: durationMinutes,
        session_type: 'flashcards',
        notes: `Reviewed ${reviewStats.total} flashcards: ${reviewStats.correct} correct, ${reviewStats.incorrect} incorrect, ${reviewStats.skipped} skipped`,
      });
    } catch (error) {
      console.error('Error creating study session:', error);
    }
    
    // Show completion message
    Alert.alert(
      'Review Complete!',
      `You reviewed ${reviewStats.total} flashcards:\n${reviewStats.correct} correct\n${reviewStats.incorrect} incorrect\n${reviewStats.skipped} skipped`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No flashcards to review</Text>
        <Text style={styles.emptySubtext}>
          {subject 
            ? `You have no ${subject} flashcards due for review right now`
            : 'You have no flashcards due for review right now'
          }
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.emptyButton}
        />
      </View>
    );
  }

  const currentCard = flashcards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / flashcards.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {subject ? `${subject} Review` : 'Flashcard Review'}
        </Text>
        <Text style={styles.progress}>
          {currentCardIndex + 1} / {flashcards.length}
        </Text>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviewStats.correct}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviewStats.incorrect}</Text>
          <Text style={styles.statLabel}>Incorrect</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviewStats.skipped}</Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>
      </View>
      
      {/* Flashcard */}
      <View style={styles.flashcardContainer}>
        <Flashcard
          flashcard={currentCard}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  progress: {
    fontSize: 16,
    color: '#6B7280',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  flashcardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
});