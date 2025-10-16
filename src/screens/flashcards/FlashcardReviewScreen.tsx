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
  StatusBar,
  Image,
  Vibration
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import { 
  getFlashcardsForReview, 
  updateFlashcard, 
  createStudySession,
  getFlashcardHint,
  getFlashcardExplanation
} from '../../services/supabase';
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
  "Focus on understanding rather than memorization",
  "Use visual cues to help remember information",
  "Explain the concept in your own words",
];

export const FlashcardReviewScreen = ({ route, navigation }: any) => {
  const { subject } = route.params;
  const { user } = useAuthStore();
  const { activeSession, startSession, stopSession, updateDuration, incrementFlashcardReviews } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [reviewStartTime, setReviewStartTime] = useState<Date | null>(null);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    hintsUsed: 0,
    explanationsUsed: 0,
  });
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [sessionPaused, setSessionPaused] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState(new Animated.Value(0));
  const [progressAnimation, setProgressAnimation] = useState(new Animated.Value(0));
  const [sessionTime, setSessionTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [cardStartTime, setCardStartTime] = useState<Date | null>(null);
  const [cardTimes, setCardTimes] = useState<number[]>([]);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<'normal' | 'difficult' | 'new'>('normal');
  const [aiHint, setAiHint] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [generatingHint, setGeneratingHint] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  
  // Load flashcards for review
  useEffect(() => {
    const loadFlashcards = async () => {
      if (!user) return;
      
      try {
        // Get all flashcards for the subject, not just due ones
        let allSubjectCards = await getFlashcardsForReview(user.id, subject);
        
        // If no flashcards for this subject, show appropriate message
        if (allSubjectCards.length === 0) {
          setFlashcards([]);
          setReviewStats(prev => ({ ...prev, total: 0 }));
        } else {
          // Filter based on review mode
          let filteredCards = allSubjectCards;
          
          if (reviewMode === 'difficult') {
            // Show cards with difficulty >= 4 or accuracy < 70%
            filteredCards = allSubjectCards.filter(card => {
              const accuracy = card.review_count > 0 ? (card.correct_count / card.review_count) : 0;
              return card.difficulty >= 4 || accuracy < 0.7;
            });
          } else if (reviewMode === 'new') {
            // Show cards that have never been reviewed
            filteredCards = allSubjectCards.filter(card => card.review_count === 0);
          }
          
          // If filtered cards is empty, fall back to all cards
          if (filteredCards.length === 0) {
            filteredCards = allSubjectCards;
          }
          
          setFlashcards(filteredCards);
          setReviewStats(prev => ({ ...prev, total: filteredCards.length }));
        }
        
        setReviewStartTime(new Date());
        setCardStartTime(new Date());
        
        // Set random tip
        const randomTip = REVIEW_TIPS[Math.floor(Math.random() * REVIEW_TIPS.length)];
        setCurrentTip(randomTip);
        
        // Start tracking session if not already active
        if (!activeSession || activeSession.type !== 'flashcards') {
          startSession(subject || 'Mixed', 'flashcards');
        }
        
        // Start timer
        const interval = setInterval(() => {
          setSessionTime(prev => prev + 1);
        }, 1000);
        setTimerInterval(interval);
      } catch (error) {
        console.error('Error loading flashcards:', error);
        Alert.alert('Error', 'Failed to load flashcards');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadFlashcards();
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [user, subject, navigation, activeSession, startSession, reviewMode]);

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

  // Handle showing hint
  const handleShowHint = async () => {
    if (!flashcards[currentCardIndex]) return;
    
    const currentCard = flashcards[currentCardIndex];
    
    if (currentCard.hint) {
      setShowHint(true);
      setReviewStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Generate AI hint
      setGeneratingHint(true);
      try {
        const hint = await getFlashcardHint(currentCard.id);
        setAiHint(hint);
        setShowHint(true);
        setReviewStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error generating hint:', error);
        Alert.alert('Error', 'Failed to generate hint');
      } finally {
        setGeneratingHint(false);
      }
    }
  };

  // Handle showing explanation
  const handleShowExplanation = async () => {
    if (!flashcards[currentCardIndex]) return;
    
    const currentCard = flashcards[currentCardIndex];
    
    if (currentCard.explanation) {
      setShowExplanation(true);
      setReviewStats(prev => ({ ...prev, explanationsUsed: prev.explanationsUsed + 1 }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Generate AI explanation
      setGeneratingExplanation(true);
      try {
        const explanation = await getFlashcardExplanation(currentCard.id);
        setAiExplanation(explanation);
        setShowExplanation(true);
        setReviewStats(prev => ({ ...prev, explanationsUsed: prev.explanationsUsed + 1 }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error generating explanation:', error);
        Alert.alert('Error', 'Failed to generate explanation');
      } finally {
        setGeneratingExplanation(false);
      }
    }
  };

  // Handle card answer with difficulty rating
  const handleAnswer = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!user || flashcards.length === 0) return;

    const currentCard = flashcards[currentCardIndex];
    const isCorrect = difficulty !== 'hard';
    
    // Record card time
    if (cardStartTime) {
      const cardTime = Math.floor((new Date().getTime() - cardStartTime.getTime()) / 1000);
      setCardTimes([...cardTimes, cardTime]);
    }
    
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
      setShowHint(false);
      setShowExplanation(false);
      setAiHint('');
      setAiExplanation('');
      setCardStartTime(new Date());
      
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
    
    // Record card time
    if (cardStartTime) {
      const cardTime = Math.floor((new Date().getTime() - cardStartTime.getTime()) / 1000);
      setCardTimes([...cardTimes, cardTime]);
    }
    
    setReviewStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    // Reset flip animation
    Animated.timing(flipAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowAnswer(false);
    setShowHint(false);
    setShowExplanation(false);
    setAiHint('');
    setAiExplanation('');
    setCardStartTime(new Date());
    
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
    
    // Pause timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Handle resuming the session
  const handleResumeSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionPaused(false);
    setShowPauseModal(false);
    
    // Resume timer
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    setTimerInterval(interval);
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
    
    // Stop timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - reviewStartTime.getTime()) / 60000);
    
    try {
      // Create study session
      await createStudySession({
        user_id: user.id,
        subject: subject || 'Mixed',
        duration_minutes: durationMinutes,
        session_type: 'flashcards',
        notes: `Reviewed ${reviewStats.total} flashcards: ${reviewStats.correct} correct, ${reviewStats.incorrect} incorrect, ${reviewStats.skipped} skipped. Hints used: ${reviewStats.hintsUsed}, Explanations used: ${reviewStats.explanationsUsed}`,
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

  // Get average card time
  const getAverageCardTime = () => {
    if (cardTimes.length === 0) return 0;
    const totalSeconds = cardTimes.reduce((sum, time) => sum + time, 0);
    return Math.round(totalSeconds / cardTimes.length);
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
  const displayHint = currentCard.hint || aiHint;
  const displayExplanation = currentCard.explanation || aiExplanation;

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
          
          <TouchableOpacity onPress={() => setShowStatsModal(true)} style={styles.statsButton}>
            <Text style={styles.statsButtonText}>📊</Text>
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
        
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>⏱️ {formatTime(sessionTime)}</Text>
        </View>
      </View>
      
      {/* Review Mode Selector */}
      <View style={styles.modeSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            reviewMode === 'normal' && styles.selectedModeButton
          ]}
          onPress={() => setReviewMode('normal')}
        >
          <Text style={[
            styles.modeButtonText,
            reviewMode === 'normal' && styles.selectedModeButtonText
          ]}>
            Normal
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeButton,
            reviewMode === 'difficult' && styles.selectedModeButton
          ]}
          onPress={() => setReviewMode('difficult')}
        >
          <Text style={[
            styles.modeButtonText,
            reviewMode === 'difficult' && styles.selectedModeButtonText
          ]}>
            Difficult
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeButton,
            reviewMode === 'new' && styles.selectedModeButton
          ]}
          onPress={() => setReviewMode('new')}
        >
          <Text style={[
            styles.modeButtonText,
            reviewMode === 'new' && styles.selectedModeButtonText
          ]}>
            New
          </Text>
        </TouchableOpacity>
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
            
            {currentCard.image_url && (
              <Image source={{ uri: currentCard.image_url }} style={styles.flashcardImage} />
            )}
            
            <View style={styles.flashcardActions}>
              <TouchableOpacity style={styles.flipButton} onPress={handleFlipCard}>
                <Text style={styles.flipButtonText}>Show Answer</Text>
              </TouchableOpacity>
              
              {!showAnswer && (
                <TouchableOpacity 
                  style={styles.hintButton} 
                  onPress={handleShowHint}
                  disabled={generatingHint}
                >
                  <Text style={styles.hintButtonText}>
                    {generatingHint ? 'Generating...' : '💡 Hint'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {showHint && (
              <View style={styles.hintContainer}>
                <Text style={styles.hintTitle}>💡 Hint</Text>
                <Text style={styles.hintText}>{displayHint}</Text>
              </View>
            )}
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
            
            <View style={styles.flashcardActions}>
              <TouchableOpacity 
                style={styles.explanationButton} 
                onPress={handleShowExplanation}
                disabled={generatingExplanation}
              >
                <Text style={styles.explanationButtonText}>
                  {generatingExplanation ? 'Generating...' : '📝 Explanation'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>
            
            {showExplanation && (
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationTitle}>📝 Explanation</Text>
                <Text style={styles.explanationText}>{displayExplanation}</Text>
              </View>
            )}
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
              
              <View style={styles.completeStatItem}>
                <Text style={styles.completeStatValue}>{formatTime(sessionTime)}</Text>
                <Text style={styles.completeStatLabel}>Time Spent</Text>
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
            
            <View style={styles.aiStatsBreakdown}>
              <Text style={styles.aiStatsBreakdownTitle}>AI Assistance</Text>
              
              <View style={styles.aiStatsBreakdownItem}>
                <Text style={styles.aiStatsBreakdownLabel}>Hints Used:</Text>
                <Text style={styles.aiStatsBreakdownValue}>{reviewStats.hintsUsed}</Text>
              </View>
              
              <View style={styles.aiStatsBreakdownItem}>
                <Text style={styles.aiStatsBreakdownLabel}>Explanations Used:</Text>
                <Text style={styles.aiStatsBreakdownValue}>{reviewStats.explanationsUsed}</Text>
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
      
      {/* Stats Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStatsModal}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <TouchableOpacity
          style={styles.statsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatsModal(false)}
        >
          <View style={styles.statsModalContent}>
            <Text style={styles.statsModalTitle}>Session Stats</Text>
            
            <View style={styles.statsModalSection}>
              <Text style={styles.statsModalSectionTitle}>Performance</Text>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Cards Reviewed</Text>
                <Text style={styles.statsModalValue}>{reviewStats.total}</Text>
              </View>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Correct</Text>
                <Text style={styles.statsModalValue}>{reviewStats.correct}</Text>
              </View>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Incorrect</Text>
                <Text style={styles.statsModalValue}>{reviewStats.incorrect}</Text>
              </View>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Skipped</Text>
                <Text style={styles.statsModalValue}>{reviewStats.skipped}</Text>
              </View>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Accuracy</Text>
                <Text style={styles.statsModalValue}>{getAccuracyPercentage()}%</Text>
              </View>
            </View>
            
            <View style={styles.statsModalSection}>
              <Text style={styles.statsModalSectionTitle}>Time</Text>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Session Time</Text>
                <Text style={styles.statsModalValue}>{formatTime(sessionTime)}</Text>
              </View>
              
              <View style={styles.statsModalItem}>
                <Text style={styles.statsModalLabel}>Avg. Card Time</Text>
                <Text style={styles.statsModalValue}>{formatTime(getAverageCardTime())}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={() => setShowStatsModal(false)}
              style={styles.statsModalCloseButton}
            >
              <Text style={styles.statsModalCloseButtonText}>Close</Text>
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
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsButtonText: {
    fontSize: 18,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  selectedModeButton: {
    backgroundColor: '#6366F1',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedModeButtonText: {
    color: '#FFFFFF',
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
    height: height * 0.6,
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
    marginBottom: 16,
  },
  flashcardImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  flashcardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flipButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  hintButton: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  hintContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: '#0C4A6E',
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
  explanationButton: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  explanationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  skipButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  explanationContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: '#14532D',
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
    marginBottom: 16,
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
  aiStatsBreakdown: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aiStatsBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  aiStatsBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiStatsBreakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  aiStatsBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  completeModalButton: {
    width: '100%',
  },
  statsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  statsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsModalSection: {
    marginBottom: 20,
  },
  statsModalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsModalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsModalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsModalCloseButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  statsModalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});