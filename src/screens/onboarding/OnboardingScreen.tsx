// ============================================
// ONBOARDING SCREEN
// 3 slides introducing app features
// ============================================

import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    emoji: '🎯',
    title: 'Personalized Study Plans',
    description: 'AI-powered study schedules tailored to your learning style and goals',
    color: '#6366F1',
  },
  {
    id: 2,
    emoji: '💡',
    title: 'Smart Flashcards',
    description: 'Generate interactive flashcards automatically and master any subject',
    color: '#8B5CF6',
  },
  {
    id: 3,
    emoji: '👥',
    title: 'Study Together',
    description: 'Join study rooms, collaborate with peers, and achieve more together',
    color: '#EC4899',
  },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  // Go to next slide
  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: SCREEN_WIDTH * (currentIndex + 1),
        animated: true,
      });
    } else {
      // Last slide, go to sign in
      navigation.navigate('SignIn');
    }
  };

  // Skip to sign in
  const skip = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity
          onPress={skip}
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            zIndex: 10,
            padding: 8,
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#6B7280',
          }}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={{
              width: SCREEN_WIDTH,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}
          >
            {/* Emoji Circle */}
            <View style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: slide.color,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 40,
            }}>
              <Text style={{ fontSize: 80 }}>{slide.emoji}</Text>
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#111827',
              textAlign: 'center',
              marginBottom: 16,
            }}>
              {slide.title}
            </Text>

            {/* Description */}
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
              textAlign: 'center',
              lineHeight: 24,
            }}>
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View style={{
        paddingHorizontal: 40,
        paddingBottom: 50,
      }}>
        {/* Pagination Dots */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 40,
        }}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={{
                width: currentIndex === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentIndex === index ? '#6366F1' : '#E5E7EB',
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <Button
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={goToNext}
        />
      </View>
    </View>
  );
};