// F:\StudyBuddy\src\screens\flashcards\FlashcardReviewScreen.tsx
// ============================================
// FLASHCARD REVIEW SCREEN - UPDATED VERSION
// Enhanced flashcard review with spaced repetition
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { getFlashcardsForReview, updateFlashcard } from '../../services/supabase';
import { Flashcard as FlashcardType } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export const FlashcardReviewScreen = ({ route, navigation }: any) => {
  const { subject, flashcards: passedFlashcards } = route.params;
  const { user } = useAuthStore();
  const { activeSession, startSession, stopSession, incrementFlashcardReviews } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewResults, setReviewResults] = useState<{[key: string]: 'correct' | 'incorrect'}>({});
  
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  
  // Load flashcards for review
  useEffect(() => {
    const loadFlashcards = async () => {
      if (!user) return;
      
      try {
        let cardsToReview: FlashcardType[] = [];
        
        // If flashcards are passed as params, use them
        if (passedFlashcards && passedFlashcards.length > 0) {
          cardsToReview = passedFlashcards;
        } else {
          // Otherwise get flashcards for the subject
          cardsToReview = await getFlashcardsForReview(user.id, subject);
        }
        
        if (cardsToReview.length === 0) {
          setFlashcards([]);
        } else {
          setFlashcards(cardsToReview);
        }
        
        // Start tracking session if not already active
        if (!activeSession || activeSession.type !== 'flashcards') {
          startSession(subject || 'Mixed', 'flashcards');
        }
      } catch (error) {
        console.error('Error loading flashcards:', error);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadFlashcards();
  }, [user, subject, navigation, startSession, activeSession, passedFlashcards]);
  
  // Update progress animation
  useEffect(() => {
    if (flashcards.length > 0) {
      const progress = (currentCardIndex / flashcards.length);
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentCardIndex, flashcards.length]);

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    flipAnimation.setValue(0);
  }, [currentCardIndex]);

  // Handle card flip
  const handleFlipCard = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const toValue = isFlipped ? 0 : 1;
    
    Animated.spring(flipAnimation, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    
    setIsFlipped(!isFlipped);
  };

  // Handle card rating
  const handleRateCard = async (rating: 'easy' | 'medium' | 'hard') => {
    if (!user || currentCardIndex >= flashcards.length) return;
    
    const currentCard = flashcards[currentCardIndex];
    const isCorrect = rating !== 'hard';
    
    // Update review results
    setReviewResults(prev => ({
      ...prev,
      [currentCard.id]: isCorrect ? 'correct' : 'incorrect'
    }));
    
    // Increment flashcard reviews in session store
    incrementFlashcardReviews(isCorrect);
    
    // Update flashcard in database
    try {
      const now = new Date();
      const reviewCount = (currentCard.review_count || 0) + 1;
      const correctCount = (currentCard.correct_count || 0) + (isCorrect ? 1 : 0);
      
      // Calculate next review time based on rating
      let nextReviewInterval = 1; // Default to 1 day
      
      if (rating === 'easy') {
        // Easy cards get reviewed less frequently
        nextReviewInterval = Math.min(7, Math.pow(2, Math.floor(reviewCount / 3)));
      } else if (rating === 'medium') {
        // Medium cards get reviewed at a moderate pace
        nextReviewInterval = Math.min(5, Math.pow(1.5, Math.floor(reviewCount / 2)));
      } else {
        // Hard cards get reviewed more frequently
        nextReviewInterval = 1;
      }
      
      const nextReview = new Date(now.getTime() + (nextReviewInterval * 24 * 60 * 60 * 1000));
      
      await updateFlashcard(currentCard.id, {
        last_reviewed: now.toISOString(),
        next_review: nextReview.toISOString(),
        review_count: reviewCount,
        correct_count: correctCount,
      });
      
      // Update local flashcard data
      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentCardIndex] = {
        ...currentCard,
        last_reviewed: now.toISOString(),
        next_review: nextReview.toISOString(),
        review_count: reviewCount,
        correct_count: correctCount,
      };
      setFlashcards(updatedFlashcards);
      
      // Move to next card
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
      } else {
        // Review complete
        handleCompleteReview();
      }
    } catch (error) {
      console.error('Error updating flashcard:', error);
      Alert.alert('Error', 'Failed to update flashcard progress');
    }
  };

  // Handle next card
  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Review complete
      handleCompleteReview();
    }
  };

  // Handle previous card
  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  // Complete the review session
  const handleCompleteReview = () => {
    // Calculate review statistics
    const totalReviewed = Object.keys(reviewResults).length;
    const correctCount = Object.values(reviewResults).filter(result => result === 'correct').length;
    const accuracy = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;
    
    // Stop the session in the store
    stopSession();
    
    // Show completion message
    Alert.alert(
      'Review Complete!',
      `You reviewed ${totalReviewed} flashcards with ${accuracy}% accuracy.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Interpolate flip animation for smooth 3D flip
  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  const backAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
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
            ? `You have no ${subject} flashcards yet. Create some flashcards first to start reviewing!`
            : 'You have no flashcards yet. Create your first flashcard to get started!'
          }
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.emptyButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCard = flashcards[currentCardIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              {subject ? `${subject} Review` : 'Flashcard Review'}
            </Text>
            <Text style={styles.progress}>
              {currentCardIndex + 1} / {flashcards.length}
            </Text>
          </View>
          
          <View style={styles.placeholder} />
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { 
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                })
              }
            ]} 
          />
        </View>
      </View>
      
      {/* Flashcard */}
      <View style={styles.flashcardContainer}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={handleFlipCard}
          style={styles.cardTouchable}
        >
          {/* Front of Card */}
          <Animated.View
            style={[
              styles.flashcard,
              frontAnimatedStyle,
              { opacity: isFlipped ? 0 : 1 }
            ]}
            pointerEvents={isFlipped ? 'none' : 'auto'}
          >
            <View style={styles.flashcardContent}>
              <Text style={styles.flashcardLabel}>Question</Text>
              <View style={styles.flashcardTextContainer}>
                <Text style={styles.flashcardText}>{currentCard.question}</Text>
              </View>
              
              {currentCard.image_url && (
                <Image source={{ uri: currentCard.image_url }} style={styles.flashcardImage} />
              )}
              
              <View style={styles.flipHintContainer}>
                <Text style={styles.flipHintText}>Tap to reveal answer</Text>
              </View>
            </View>
          </Animated.View>
          
          {/* Back of Card */}
          <Animated.View
            style={[
              styles.flashcard,
              styles.flashcardBack,
              backAnimatedStyle,
              { opacity: isFlipped ? 1 : 0 }
            ]}
            pointerEvents={isFlipped ? 'auto' : 'none'}
          >
            <View style={styles.flashcardContent}>
              <Text style={styles.flashcardLabel}>Answer</Text>
              <View style={styles.flashcardTextContainer}>
                <Text style={styles.flashcardText}>{currentCard.answer}</Text>
              </View>
              
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>How well did you know this?</Text>
                <View style={styles.ratingButtons}>
                  <TouchableOpacity
                    style={[styles.ratingButton, styles.hardButton]}
                    onPress={() => handleRateCard('hard')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ratingButtonText}>Hard</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.ratingButton, styles.mediumButton]}
                    onPress={() => handleRateCard('medium')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ratingButtonText}>Medium</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.ratingButton, styles.easyButton]}
                    onPress={() => handleRateCard('easy')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ratingButtonText}>Easy</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.flipHintContainer}>
                <Text style={styles.flipHintText}>Tap to see question</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
      
      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentCardIndex === 0 && styles.disabledButton
          ]}
          onPress={handlePreviousCard}
          disabled={currentCardIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleNextCard}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>
            {currentCardIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: '#6366F1',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progress: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  flashcardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardTouchable: {
    width: width * 0.9,
    height: height * 0.6,
  },
  flashcard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    backfaceVisibility: 'hidden',
  },
  flashcardBack: {
    position: 'absolute',
  },
  flashcardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  flashcardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  flashcardTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashcardText: {
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  flashcardImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginVertical: 16,
    resizeMode: 'cover',
  },
  flipHintContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  flipHintText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  ratingContainer: {
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  easyButton: {
    backgroundColor: '#10B981',
  },
  mediumButton: {
    backgroundColor: '#F59E0B',
  },
  hardButton: {
    backgroundColor: '#EF4444',
  },
  ratingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
  },
  navButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 20,
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
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});