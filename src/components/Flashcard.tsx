// F:\StudyBuddy\src\components\Flashcard.tsx
// ============================================
// FLASHCARD COMPONENT - SIMPLIFIED VERSION
// Displays a flashcard with flip functionality
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { Flashcard as FlashcardType } from '../types';

interface FlashcardProps {
  flashcard: FlashcardType;
}

export const Flashcard: React.FC<FlashcardProps> = ({ flashcard }) => {
  const [flipAnimation] = useState(new Animated.Value(0));
  const [isFlipped, setIsFlipped] = useState(false);

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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
          
          {flashcard.image_url && (
            <Image source={{ uri: flashcard.image_url }} style={styles.cardImage} />
          )}
          
          <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
            <Text style={styles.flipButtonText}>Flip Card</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
          <Text style={styles.label}>Answer</Text>
          <Text style={styles.content}>{flashcard.answer}</Text>
          
          <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
            <Text style={styles.flipButtonText}>Flip Card</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
    justifyContent: 'space-between',
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
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
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
});