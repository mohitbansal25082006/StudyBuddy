// F:\StudyBuddy\src\components\Flashcard.tsx
// ============================================
// FLASHCARD COMPONENT
// Displays a flashcard for review
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Flashcard as FlashcardType } from '../types';

interface FlashcardProps {
  flashcard: FlashcardType;
  onAnswer: (correct: boolean) => void;
  onSkip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ flashcard, onAnswer, onSkip }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [flipAnimation] = useState(new Animated.Value(0));

  const flipCard = () => {
    Animated.timing(flipAnimation, {
      toValue: showAnswer ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowAnswer(!showAnswer);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
          <Text style={styles.label}>Question</Text>
          <Text style={styles.content}>{flashcard.question}</Text>
          <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
            <Text style={styles.flipButtonText}>Show Answer</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
          <Text style={styles.label}>Answer</Text>
          <Text style={styles.content}>{flashcard.answer}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.answerButton, styles.incorrectButton]} 
              onPress={() => onAnswer(false)}
            >
              <Text style={styles.answerButtonText}>Incorrect</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.answerButton, styles.correctButton]} 
              onPress={() => onAnswer(true)}
            >
              <Text style={styles.answerButtonText}>Correct</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    height: 300,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    zIndex: 1,
  },
  cardBack: {
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 16,
  },
  content: {
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
  },
  flipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  answerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  incorrectButton: {
    backgroundColor: '#FEE2E2',
  },
  correctButton: {
    backgroundColor: '#D1FAE5',
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});