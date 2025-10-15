// F:\StudyBuddy\src\screens\flashcards\FlashcardReviewScreen.tsx
// ============================================
// FLASHCARD REVIEW SCREEN - ADVANCED VERSION
// Interactive flashcard review with spaced repetition and real-time tracking
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  Animated, 
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { getFlashcardsForReview, updateFlashcard, createStudySession } from '../../services/supabase';
import { Flashcard as FlashcardType } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Study tips for review sessions
const REVIEW_TIPS = [
  "Try to recall the answer before flipping the card",
  "Be honest with yourself about whether you really knew the answer",
  "If you get a card wrong, review it more frequently",
  "Connect new information with what you already know",
  "Take short breaks between review sessions",
];

export const FlashcardReviewScreen = ({ route, navigation }: any) => {
  const { subject } = route.params;
  const { user } = useAuthStore();
  const { activeSession, startSession, stopSession, updateDuration, incrementFlashcardReviews } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewStartTime, setReviewStartTime] = useState<Date | null>(null);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  });
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [sessionPaused, setSessionPaused] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState(new Animated.Value(0));
  const [progressAnimation, setProgressAnimation] = useState(new Animated.Value(0));
  
  // Load flashcards for review
  useEffect(() => {
    const loadFlashcards = async () => {
      if (!user) return;
      
      try {
        // Get all flashcards for the subject, not just due ones
        const allSubjectCards = await getFlashcardsForReview(user.id, subject);
        
        // If no flashcards for this subject, show appropriate message
        if (allSubjectCards.length === 0) {
          setFlashcards([]);
          setReviewStats(prev => ({ ...prev, total: 0 }));
        } else {
          setFlashcards(allSubjectCards);
          setReviewStats(prev => ({ ...prev, total: allSubjectCards.length }));
        }
        
        setReviewStartTime(new Date());
        
        // Set random tip
        const randomTip = REVIEW_TIPS[Math.floor(Math.random() * REVIEW_TIPS.length)];
        setCurrentTip(randomTip);
        
        // Start tracking session if not already active
        if (!activeSession || activeSession.type !== 'flashcards') {
          startSession(subject || 'Mixed', 'flashcards');
        }
      } catch (error) {
        console.error('Error loading flashcards:', error);
        Alert.alert('Error', 'Failed to load flashcards');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadFlashcards();
  }, [user, subject, navigation, activeSession, startSession]);

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

  // Handle card flip
  const handleFlipCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.timing(flipAnimation, {
      toValue: showAnswer ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setShowAnswer(!showAnswer);
  }, [showAnswer, flipAnimation]);

  // Handle card answer with difficulty rating
  const handleAnswer = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!user || flashcards.length === 0) return;

    const currentCard = flashcards[currentCardIndex];
    const isCorrect = difficulty !== 'hard';
    
    try {
      // Calculate next review time based on spaced repetition algorithm
      const now = new Date();
      let nextReview: Date;
      let intervalDays = 1;
      
      if (isCorrect) {
        // Correct answer - increase interval based on difficulty
        const reviewCount = currentCard.review_count + 1;
        const correctCount = currentCard.correct_count + 1;
        
        if (difficulty === 'easy') {
          // Easy - longer interval
          if (reviewCount === 1) intervalDays = 4;
          else if (reviewCount === 2) intervalDays = 7;
          else if (reviewCount === 3) intervalDays = 15;
          else if (reviewCount === 4) intervalDays = 30;
          else intervalDays = 60;
        } else if (difficulty === 'medium') {
          // Medium - standard interval
          if (reviewCount === 1) intervalDays = 3;
          else if (reviewCount === 2) intervalDays = 6;
          else if (reviewCount === 3) intervalDays = 12;
          else if (reviewCount === 4) intervalDays = 20;
          else intervalDays = 40;
        }
        
        nextReview = new Date(now.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        
        // Update card
        await updateFlashcard(currentCard.id, {
          review_count: reviewCount,
          correct_count: correctCount,
          last_reviewed: now.toISOString(),
          next_review: nextReview.toISOString(),
          difficulty: Math.max(1, currentCard.difficulty - 1),
        });
        
        setReviewStats(prev => ({ 
          ...prev, 
          correct: prev.correct + 1,
          [difficulty]: prev[difficulty] + 1
        }));
        
        incrementFlashcardReviews(true);
      } else {
        // Incorrect answer - reset interval
        nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
        
        // Update card
        await updateFlashcard(currentCard.id, {
          review_count: currentCard.review_count + 1,
          last_reviewed: now.toISOString(),
          next_review: nextReview.toISOString(),
          difficulty: Math.min(5, currentCard.difficulty + 1),
        });
        
        setReviewStats(prev => ({ 
          ...prev, 
          incorrect: prev.incorrect + 1,
          hard: prev.hard + 1
        }));
        
        incrementFlashcardReviews(false);
      }
      
      // Reset flip animation
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setShowAnswer(false);
      
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setReviewStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    // Reset flip animation
    Animated.timing(flipAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowAnswer(false);
    
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Review complete
      completeReview();
    }
  };

  // Handle pausing the session
  const handlePauseSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSessionPaused(true);
    setShowPauseModal(true);
  };

  // Handle resuming the session
  const handleResumeSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionPaused(false);
    setShowPauseModal(false);
  };

  // Handle ending the session early
  const handleEndSessionEarly = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowPauseModal(false);
    completeReview(true);
  };

  // Complete the review session
  const completeReview = async (earlyEnd: boolean = false) => {
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
      
      // Stop the session in the store
      stopSession();
      
      // Show completion modal
      setShowCompleteModal(true);
    } catch (error) {
      console.error('Error creating study session:', error);
    }
  };

  // Handle closing the completion modal
  const handleCloseCompleteModal = () => {
    setShowCompleteModal(false);
    navigation.goBack();
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get accuracy percentage
  const getAccuracyPercentage = () => {
    const totalAnswered = reviewStats.correct + reviewStats.incorrect;
    if (totalAnswered === 0) return 0;
    return Math.round((reviewStats.correct / totalAnswered) * 100);
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    if (flashcards.length === 0) return 0;
    return Math.round(((currentCardIndex + 1) / flashcards.length) * 100);
  };

  // Interpolate flip animation
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

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
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.emptyButton}
        />
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
          <TouchableOpacity onPress={handlePauseSession} style={styles.pauseButton}>
            <Text style={styles.pauseButtonText}>⏸️</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              {subject ? `${subject} Review` : 'Flashcard Review'}
            </Text>
            <Text style={styles.progress}>
              {currentCardIndex + 1} / {flashcards.length}
            </Text>
          </View>
          
          <TouchableOpacity onPress={() => setShowTipModal(true)} style={styles.tipButton}>
            <Text style={styles.tipButtonText}>💡</Text>
          </TouchableOpacity>
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
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{getAccuracyPercentage()}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>
      
      {/* Flashcard */}
      <View style={styles.flashcardContainer}>
        <Animated.View
          style={[
            styles.flashcard,
            {
              transform: [{ rotateY: frontInterpolate }],
            }
          ]}
        >
          <View style={styles.flashcardContent}>
            <Text style={styles.flashcardLabel}>Question</Text>
            <Text style={styles.flashcardText}>{currentCard.question}</Text>
            <TouchableOpacity style={styles.flipButton} onPress={handleFlipCard}>
              <Text style={styles.flipButtonText}>Show Answer</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.flashcard,
            styles.flashcardBack,
            {
              transform: [{ rotateY: backInterpolate }],
            }
          ]}
        >
          <View style={styles.flashcardContent}>
            <Text style={styles.flashcardLabel}>Answer</Text>
            <Text style={styles.flashcardText}>{currentCard.answer}</Text>
            
            <View style={styles.difficultyButtons}>
              <TouchableOpacity
                style={[styles.difficultyButton, styles.easyButton]}
                onPress={() => handleAnswer('easy')}
              >
                <Text style={styles.difficultyButtonText}>Easy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.difficultyButton, styles.mediumButton]}
                onPress={() => handleAnswer('medium')}
              >
                <Text style={styles.difficultyButtonText}>Medium</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.difficultyButton, styles.hardButton]}
                onPress={() => handleAnswer('hard')}
              >
                <Text style={styles.difficultyButtonText}>Hard</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
      {/* Pause Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPauseModal}
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={styles.pauseModalOverlay}>
          <View style={styles.pauseModalContent}>
            <Text style={styles.pauseModalTitle}>Session Paused</Text>
            <Text style={styles.pauseModalText}>
              Your progress is saved. You can resume your session anytime.
            </Text>
            
            <View style={styles.pauseModalActions}>
              <Button
                title="Resume"
                onPress={handleResumeSession}
                style={styles.pauseModalButton}
              />
              
              <Button
                title="End Session"
                onPress={handleEndSessionEarly}
                variant="outline"
                style={styles.pauseModalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Complete Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCompleteModal}
        onRequestClose={handleCloseCompleteModal}
      >
        <View style={styles.completeModalOverlay}>
          <View style={styles.completeModalContent}>
            <Text style={styles.completeModalTitle}>Review Complete!</Text>
            
            <View style={styles.completeStats}>
              <View style={styles.completeStatItem}>
                <Text style={styles.completeStatValue}>{reviewStats.total}</Text>
                <Text style={styles.completeStatLabel}>Cards Reviewed</Text>
              </View>
              
              <View style={styles.completeStatItem}>
                <Text style={styles.completeStatValue}>{getAccuracyPercentage()}%</Text>
                <Text style={styles.completeStatLabel}>Accuracy</Text>
              </View>
            </View>
            
            <View style={styles.difficultyBreakdown}>
              <Text style={styles.difficultyBreakdownTitle}>Difficulty Breakdown</Text>
              
              <View style={styles.difficultyBreakdownItem}>
                <Text style={styles.difficultyBreakdownLabel}>Easy:</Text>
                <Text style={styles.difficultyBreakdownValue}>{reviewStats.easy}</Text>
              </View>
              
              <View style={styles.difficultyBreakdownItem}>
                <Text style={styles.difficultyBreakdownLabel}>Medium:</Text>
                <Text style={styles.difficultyBreakdownValue}>{reviewStats.medium}</Text>
              </View>
              
              <View style={styles.difficultyBreakdownItem}>
                <Text style={styles.difficultyBreakdownLabel}>Hard:</Text>
                <Text style={styles.difficultyBreakdownValue}>{reviewStats.hard}</Text>
              </View>
            </View>
            
            <Button
              title="Continue"
              onPress={handleCloseCompleteModal}
              style={styles.completeModalButton}
            />
          </View>
        </View>
      </Modal>
      
      {/* Tip Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTipModal}
        onRequestClose={() => setShowTipModal(false)}
      >
        <TouchableOpacity
          style={styles.tipModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTipModal(false)}
        >
          <View style={styles.tipModal}>
            <Text style={styles.tipTitle}>💡 Review Tip</Text>
            <Text style={styles.tipText}>{currentTip}</Text>
            <TouchableOpacity 
              onPress={() => setShowTipModal(false)}
              style={styles.tipCloseButton}
            >
              <Text style={styles.tipCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 18,
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
  },
  tipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipButtonText: {
    fontSize: 18,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flashcard: {
    width: width * 0.9,
    height: height * 0.5,
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
    top: 0,
    left: 0,
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
  },
  flashcardText: {
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  flipButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  flipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  easyButton: {
    backgroundColor: '#D1FAE5',
  },
  mediumButton: {
    backgroundColor: '#FED7AA',
  },
  hardButton: {
    backgroundColor: '#FEE2E2',
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
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
  pauseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  pauseModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  pauseModalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  pauseModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  pauseModalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  completeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  completeModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  completeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  completeStatItem: {
    alignItems: 'center',
  },
  completeStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  completeStatLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  difficultyBreakdown: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  difficultyBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  difficultyBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyBreakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  difficultyBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  completeModalButton: {
    width: '100%',
  },
  tipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  tipModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  tipCloseButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tipCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});