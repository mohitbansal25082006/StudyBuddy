// F:\StudyBuddy\src\screens\flashcards\FlashcardsScreen.tsx
// ============================================
// FLASHCARDS SCREEN - FIXED VERSION
// Smart flashcard system with spaced repetition and advanced features
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Modal, 
  Animated, 
  Dimensions,
  FlatList,
  TextInput,
  RefreshControl,
  Share,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useSessionStore } from '../../store/sessionStore';
import { 
  getFlashcards, 
  createFlashcard, 
  updateFlashcard, 
  deleteFlashcard,
  getFlashcardsForReview,
  getFlashcardStats
} from '../../services/supabase';
import { 
  generateFlashcardContent, 
  optimizeStudySchedule
} from '../../services/openai';
import { Flashcard } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Subject colors for visual distinction
const SUBJECT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
  '#10B981', '#14B8A6', '#F97316', '#EF4444'
];

// Study tips for flashcards
const FLASHCARD_TIPS = [
  "Review cards just before you're about to forget them",
  "Create connections between new information and what you already know",
  "Use images and diagrams to reinforce concepts",
  "Explain concepts in your own words to test understanding",
  "Study difficult cards more frequently than easy ones",
  "Use spaced repetition to optimize memory retention",
  "Focus on understanding rather than memorization",
  "Review cards in different orders to prevent pattern recognition",
];

export const FlashcardsScreen = ({ navigation, route }: any) => {
  const { user, profile } = useAuthStore();
  const { flashcards, fetchFlashcards, updateFlashcard: updateStoreFlashcard } = useStudyStore();
  const { todayFlashcardReviews, todayCorrectAnswers, todayIncorrectAnswers } = useSessionStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(route.params?.subject || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showAIFeaturesModal, setShowAIFeaturesModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [dueFlashcards, setDueFlashcards] = useState<Flashcard[]>([]);
  const [learningFlashcards, setLearningFlashcards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty' | 'accuracy' | 'next_review'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchActionsModal, setShowBatchActionsModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [showAIPreviewModal, setShowAIPreviewModal] = useState(false);
  const [aiPreviewCards, setAiPreviewCards] = useState<Array<{question: string, answer: string}>>([]);
  const [studyStreak, setStudyStreak] = useState(0);
  const [stats, setStats] = useState<any>(null);
  
  const [newCard, setNewCard] = useState({
    subject: selectedSubject || '',
    question: '',
    answer: '',
    difficulty: 3,
  });
  
  const [generateForm, setGenerateForm] = useState({
    subject: selectedSubject || '',
    topic: '',
    count: 5,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchFlashcards(user.id, selectedSubject || undefined);
        
        // Get flashcards due for review
        const due = await getFlashcardsForReview(user.id, selectedSubject || undefined);
        setDueFlashcards(due);
        
        // Get flashcard stats
        const flashcardStats = await getFlashcardStats(user.id);
        setStats(flashcardStats);
        
        // Calculate study streak
        if (flashcardStats && flashcardStats.lastStudyDate) {
          const lastStudy = new Date(flashcardStats.lastStudyDate);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - lastStudy.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            setStudyStreak(flashcardStats.currentStreak || 0);
          } else if (diffDays === 1) {
            setStudyStreak((flashcardStats.currentStreak || 0) + 1);
          } else {
            setStudyStreak(1);
          }
        }
        
        // Categorize flashcards
        categorizeFlashcards();
        
        // Set random tip
        const randomTip = FLASHCARD_TIPS[Math.floor(Math.random() * FLASHCARD_TIPS.length)];
        setCurrentTip(randomTip);
        
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start();
      } catch (error) {
        console.error('Error loading flashcards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, selectedSubject, fetchFlashcards]);

  // Categorize flashcards based on performance
  const categorizeFlashcards = () => {
    if (!user) return;
    
    const learning = flashcards.filter(card => 
      card.user_id === user.id && 
      (card.correct_count < 5 || (card.correct_count / Math.max(card.review_count, 1)) < 0.9)
    );
    
    setLearningFlashcards(learning);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await fetchFlashcards(user.id, selectedSubject || undefined);
      const due = await getFlashcardsForReview(user.id, selectedSubject || undefined);
      setDueFlashcards(due);
      categorizeFlashcards();
      
      // Get updated stats
      const flashcardStats = await getFlashcardStats(user.id);
      setStats(flashcardStats);
    }
    setRefreshing(false);
  };

  // Get unique subjects from flashcards
  const getSubjects = () => {
    if (!user) return [];
    
    const subjects = new Set<string>();
    flashcards.forEach(card => {
      if (card.user_id === user.id) {
        subjects.add(card.subject);
      }
    });
    
    return Array.from(subjects);
  };

  // Filter and sort flashcards
  const getFilteredAndSortedFlashcards = useCallback(() => {
    if (!user) return [];
    
    let filtered = flashcards.filter(card => 
      card.user_id === user.id && 
      (!selectedSubject || card.subject === selectedSubject)
    );
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(card => 
        card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'difficulty':
        filtered.sort((a, b) => b.difficulty - a.difficulty);
        break;
      case 'accuracy':
        filtered.sort((a, b) => {
          const aAccuracy = a.review_count > 0 ? a.correct_count / a.review_count : 0;
          const bAccuracy = b.review_count > 0 ? b.correct_count / b.review_count : 0;
          return aAccuracy - bAccuracy;
        });
        break;
      case 'next_review':
        filtered.sort((a, b) => {
          const aNext = new Date(a.next_review || '9999-12-31').getTime();
          const bNext = new Date(b.next_review || '9999-12-31').getTime();
          return aNext - bNext;
        });
        break;
    }
    
    return filtered;
  }, [flashcards, user, selectedSubject, searchQuery, sortBy]);

  // Handle adding a new flashcard
  const handleAddFlashcard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim() || !newCard.subject.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setAdding(true);
    try {
      // Calculate next review time based on difficulty
      const now = new Date();
      const nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
      
      await createFlashcard({
        user_id: user.id,
        subject: newCard.subject,
        question: newCard.question,
        answer: newCard.answer,
        difficulty: newCard.difficulty,
        next_review: nextReview.toISOString(),
      });

      // Reset form
      setNewCard({
        subject: selectedSubject || '',
        question: '',
        answer: '',
        difficulty: 3,
      });
      
      setShowAddModal(false);
      
      // Refresh flashcards
      await fetchFlashcards(user.id, selectedSubject || undefined);
      categorizeFlashcards();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Flashcard added successfully');
    } catch (error: any) {
      console.error('Error adding flashcard:', error);
      Alert.alert('Error', error.message || 'Failed to add flashcard');
    } finally {
      setAdding(false);
    }
  };

  // Handle editing a flashcard
  const handleEditFlashcard = async () => {
    if (!editingCard || !editingCard.question.trim() || !editingCard.answer.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      await updateFlashcard(editingCard.id, {
        question: editingCard.question,
        answer: editingCard.answer,
        difficulty: editingCard.difficulty,
      });
      
      setShowEditModal(false);
      setEditingCard(null);
      
      // Refresh flashcards
      await fetchFlashcards(user.id, selectedSubject || undefined);
      categorizeFlashcards();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Flashcard updated successfully');
    } catch (error: any) {
      console.error('Error updating flashcard:', error);
      Alert.alert('Error', error.message || 'Failed to update flashcard');
    }
  };

  // Handle generating flashcards with AI
  const handleGenerateFlashcards = async () => {
    if (!generateForm.subject.trim() || !generateForm.topic.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setGenerating(true);
    setAiPreviewCards([]);
    
    try {
      console.log('Starting flashcard generation...');
      
      // Generate flashcard content with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 30000)
      );
      
      const generationPromise = generateFlashcardContent(
        generateForm.subject,
        generateForm.topic,
        generateForm.count
      );
      
      const generatedCards = await Promise.race([generationPromise, timeoutPromise]) as Array<{question: string, answer: string}>;
      
      console.log('Flashcards generated successfully:', generatedCards.length);

      // Set preview cards and show modal
      setAiPreviewCards(generatedCards);
      setShowGenerateModal(false);
      setShowAIPreviewModal(true);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      
      let errorMessage = 'Failed to generate flashcards';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('API key')) {
        errorMessage = 'API key not configured. Please check your settings.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
      setShowGenerateModal(false);
    } finally {
      setGenerating(false);
    }
  };

  // Confirm and add AI generated flashcards
  const handleConfirmAIGeneratedCards = async () => {
    if (!user) return;
    
    setAdding(true);
    
    try {
      const now = new Date();
      const nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
      
      console.log(`Adding ${aiPreviewCards.length} flashcards to database...`);
      
      // Add each generated flashcard to the database
      for (const card of aiPreviewCards) {
        await createFlashcard({
          user_id: user.id,
          subject: generateForm.subject,
          question: card.question,
          answer: card.answer,
          difficulty: 3,
          next_review: nextReview.toISOString(),
        });
      }

      // Reset form
      setGenerateForm({
        subject: selectedSubject || '',
        topic: '',
        count: 5,
      });
      
      setShowAIPreviewModal(false);
      setAiPreviewCards([]);
      
      // Refresh flashcards
      await fetchFlashcards(user.id, selectedSubject || undefined);
      categorizeFlashcards();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Generated ${aiPreviewCards.length} flashcards successfully`);
    } catch (error: any) {
      console.error('Error adding generated flashcards:', error);
      Alert.alert('Error', error.message || 'Failed to add generated flashcards');
    } finally {
      setAdding(false);
    }
  };

  // Handle optimizing study schedule with AI
  const handleOptimizeStudySchedule = async () => {
    if (!user) return;
    
    setOptimizing(true);
    try {
      const userFlashcards = flashcards.filter(card => card.user_id === user.id);
      
      if (userFlashcards.length === 0) {
        Alert.alert('No Flashcards', 'You need to have flashcards before optimizing your study schedule');
        setOptimizing(false);
        return;
      }
      
      // Get optimized schedule from AI
      const optimizedSchedule = await optimizeStudySchedule(userFlashcards, profile?.learning_style || 'visual');
      
      // Apply the optimized schedule
      for (const cardUpdate of optimizedSchedule) {
        await updateFlashcard(cardUpdate.id, {
          next_review: cardUpdate.next_review,
          difficulty: cardUpdate.difficulty,
        });
      }
      
      // Refresh flashcards
      await fetchFlashcards(user.id, selectedSubject || undefined);
      const due = await getFlashcardsForReview(user.id, selectedSubject || undefined);
      setDueFlashcards(due);
      categorizeFlashcards();
      
      setShowOptimizeModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your study schedule has been optimized with AI');
    } catch (error: any) {
      console.error('Error optimizing study schedule:', error);
      Alert.alert('Error', error.message || 'Failed to optimize study schedule');
    } finally {
      setOptimizing(false);
    }
  };

  // Handle deleting a flashcard
  const handleDeleteFlashcard = async (cardId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Delete Flashcard',
      'Are you sure you want to delete this flashcard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlashcard(cardId);
              await fetchFlashcards(user?.id || '', selectedSubject || undefined);
              categorizeFlashcards();
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting flashcard:', error);
              Alert.alert('Error', 'Failed to delete flashcard');
            }
          },
        },
      ]
    );
  };

  // Handle starting a review session
  const handleStartReview = () => {
    // Check if there are any flashcards for the selected subject
    const subjectFlashcards = selectedSubject 
      ? flashcards.filter(card => card.subject === selectedSubject)
      : flashcards;
    
    if (subjectFlashcards.length === 0) {
      Alert.alert(
        'No Flashcards Available', 
        `You don't have any flashcards ${selectedSubject ? `for ${selectedSubject}` : ''} yet. Create some flashcards first to start reviewing!`
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to review screen with all flashcards for the subject
    navigation.navigate('FlashcardReview', { 
      subject: selectedSubject,
      flashcards: subjectFlashcards 
    });
  };

  // Handle sharing flashcards
  const handleShareFlashcards = async () => {
    const totalCards = getFilteredAndSortedFlashcards().length;
    const dueCards = dueFlashcards.length;
    
    const message = `📚 My Flashcards\n\n📖 Total Cards: ${totalCards}\n🗂️ Due for Review: ${dueCards}\n📚 Learning: ${learningFlashcards.length}\n🔥 Study Streak: ${studyStreak} days\n\n#StudyBuddy #Flashcards`;
    
    try {
      await Share.share({
        message,
        title: 'My Flashcards',
      });
    } catch (error) {
      console.error('Error sharing flashcards:', error);
    }
  };

  // Handle batch operations
  const handleSelectCard = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleSelectAll = () => {
    const filtered = getFilteredAndSortedFlashcards();
    if (selectedCards.length === filtered.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filtered.map(card => card.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedCards.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'Delete Flashcards',
      `Are you sure you want to delete ${selectedCards.length} flashcard${selectedCards.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const cardId of selectedCards) {
                await deleteFlashcard(cardId);
              }
              
              await fetchFlashcards(user?.id || '', selectedSubject || undefined);
              categorizeFlashcards();
              setSelectedCards([]);
              setSelectMode(false);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `${selectedCards.length} flashcard${selectedCards.length > 1 ? 's' : ''} deleted`);
            } catch (error) {
              console.error('Error deleting flashcards:', error);
              Alert.alert('Error', 'Failed to delete flashcards');
            }
          },
        },
      ]
    );
  };

  const handleBatchChangeDifficulty = (difficulty: number) => {
    if (selectedCards.length === 0) return;
    
    Alert.alert(
      'Change Difficulty',
      `Set difficulty to ${difficulty} for ${selectedCards.length} flashcard${selectedCards.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              for (const cardId of selectedCards) {
                await updateFlashcard(cardId, { difficulty });
              }
              
              await fetchFlashcards(user?.id || '', selectedSubject || undefined);
              categorizeFlashcards();
              setSelectedCards([]);
              setSelectMode(false);
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `Difficulty updated for ${selectedCards.length} flashcard${selectedCards.length > 1 ? 's' : ''}`);
            } catch (error) {
              console.error('Error updating difficulty:', error);
              Alert.alert('Error', 'Failed to update difficulty');
            }
          },
        },
      ]
    );
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return '#10B981'; // Green
    if (difficulty <= 3) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  // Get subject color
  const getSubjectColor = (subject: string) => {
    const index = getSubjects().indexOf(subject);
    return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Render flashcard item
  const renderFlashcardItem = ({ item, index }: { item: Flashcard; index: number }) => {
    const isExpanded = expandedCard === item.id;
    const isSelected = selectedCards.includes(item.id);
    const reviewCount = typeof item.review_count === 'number' ? item.review_count : 0;
    const correctCount = typeof item.correct_count === 'number' ? item.correct_count : 0;
    const accuracy = reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : 0;
    const isDue = dueFlashcards.some(card => card.id === item.id);
    
    return (
      <Animated.View
        style={[
          styles.flashcardItem,
          isSelected && styles.selectedFlashcardItem,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (selectMode) {
              handleSelectCard(item.id);
            } else {
              setExpandedCard(isExpanded ? null : item.id);
            }
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectMode(true);
            handleSelectCard(item.id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.flashcardHeader}>
            <View style={styles.flashcardTitleContainer}>
              {selectMode && (
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
              )}
              <Text style={[styles.flashcardSubject, { color: getSubjectColor(item.subject) }]}>
                {item.subject}
              </Text>
              <View style={styles.flashcardBadges}>
                {isDue && (
                  <View style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>Due</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          </View>
          
          <Text style={styles.flashcardQuestion} numberOfLines={isExpanded ? undefined : 2}>
            {item.question}
          </Text>
          
          {!isExpanded && (
            <Text style={styles.flashcardAnswer} numberOfLines={1}>
              {item.answer}
            </Text>
          )}
          
          {isExpanded && (
            <View style={styles.expandedContent}>
              <Text style={styles.expandedAnswer}>{item.answer}</Text>
              
              <View style={styles.flashcardStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Reviewed</Text>
                  <Text style={styles.statItemValue}>{reviewCount} times</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Accuracy</Text>
                  <Text style={styles.statItemValue}>{accuracy}%</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Last reviewed</Text>
                  <Text style={styles.statItemValue}>
                    {item.last_reviewed ? formatDate(item.last_reviewed) : 'Never'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.expandedActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setEditingCard(item);
                    setShowEditModal(true);
                  }}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cardReviewButton}
                  onPress={() => navigation.navigate('FlashcardReview', { 
                    subject: item.subject,
                    flashcards: [item] // Start review with just this card
                  })}
                >
                  <Text style={styles.cardReviewButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
        
        {!isExpanded && (
          <View style={styles.flashcardFooter}>
            <Text style={styles.flashcardStatsText}>
              Reviewed: {reviewCount} | Accuracy: {accuracy}%
            </Text>
            
            <View style={styles.flashcardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('FlashcardReview', { 
                  subject: item.subject,
                  flashcards: [item] // Start review with just this card
                })}
              >
                <Text style={styles.actionButtonText}>Review</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteFlashcard(item.id)}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  const subjects = getSubjects();
  const filteredFlashcards = getFilteredAndSortedFlashcards();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Flashcards</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowTipModal(true)}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>💡</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowAIFeaturesModal(true)}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>🤖</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleShareFlashcards}
              style={styles.iconButton}
            >
              <Text style={styles.iconButtonText}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{filteredFlashcards.length}</Text>
            <Text style={styles.statCardLabel}>Total Cards</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{dueFlashcards.length}</Text>
            <Text style={styles.statCardLabel}>Due Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{learningFlashcards.length}</Text>
            <Text style={styles.statCardLabel}>Learning</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{studyStreak}</Text>
            <Text style={styles.statCardLabel}>Day Streak</Text>
          </View>
        </View>
      </Animated.View>

      {/* Subject Filter */}
      {subjects.length > 0 && (
        <Animated.View style={[styles.subjectFilter, { opacity: fadeAnim }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.subjectChip,
                !selectedSubject && styles.selectedSubjectChip,
              ]}
              onPress={() => setSelectedSubject(null)}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  !selectedSubject && styles.selectedSubjectChipText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            
            {subjects.map(subject => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.subjectChip,
                  selectedSubject === subject && styles.selectedSubjectChip,
                  { borderColor: getSubjectColor(subject) }
                ]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    selectedSubject === subject && styles.selectedSubjectChipText,
                    { color: selectedSubject === subject ? '#FFFFFF' : getSubjectColor(subject) }
                  ]}
                >
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Search and Filter */}
      <Animated.View style={[styles.searchFilterContainer, { opacity: fadeAnim }]}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search flashcards..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Text style={styles.sortIcon}>📊</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.batchButton}
          onPress={() => {
            setSelectMode(!selectMode);
            setSelectedCards([]);
          }}
        >
          <Text style={styles.batchIcon}>☑️</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Batch Actions */}
      {selectMode && (
        <Animated.View style={[styles.batchActionsContainer, { opacity: fadeAnim }]}>
          <View style={styles.batchActionsContent}>
            <Text style={styles.batchActionsTitle}>
              {selectedCards.length} selected
            </Text>
            
            <View style={styles.batchActionsButtons}>
              <TouchableOpacity
                style={styles.batchActionButton}
                onPress={handleSelectAll}
              >
                <Text style={styles.batchActionButtonText}>Select All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.batchActionButton}
                onPress={() => handleBatchChangeDifficulty(1)}
              >
                <Text style={styles.batchActionButtonText}>Set Easy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.batchActionButton}
                onPress={() => handleBatchChangeDifficulty(3)}
              >
                <Text style={styles.batchActionButtonText}>Set Medium</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.batchActionButton}
                onPress={() => handleBatchChangeDifficulty(5)}
              >
                <Text style={styles.batchActionButtonText}>Set Hard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.batchActionButton, styles.batchDeleteButton]}
                onPress={handleBatchDelete}
              >
                <Text style={[styles.batchActionButtonText, styles.batchDeleteButtonText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Due for Review */}
      {dueFlashcards.length > 0 && (
        <Animated.View style={[styles.dueContainer, { opacity: fadeAnim }]}>
          <View style={styles.dueContent}>
            <Text style={styles.dueTitle}>
              {dueFlashcards.length} card{dueFlashcards.length !== 1 ? 's' : ''} due for review
            </Text>
            <Text style={styles.dueSubtext}>
              Review now to strengthen your memory
            </Text>
          </View>
          <Button
            title="Start Review"
            onPress={handleStartReview}
            style={styles.startReviewButton}
          />
        </Animated.View>
      )}

      {/* Flashcards List */}
      {filteredFlashcards.length > 0 ? (
        <FlatList
          data={filteredFlashcards}
          renderItem={renderFlashcardItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.flashcardsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      ) : (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
          <Text style={styles.emptyText}>No flashcards yet</Text>
          <Text style={styles.emptySubtext}>Create your first flashcard to get started</Text>
          <Button
            title="Add Flashcard"
            onPress={() => setShowAddModal(true)}
            style={styles.emptyButton}
          />
        </Animated.View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Flashcard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
            keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Flashcard</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Input
                label="Subject"
                value={newCard.subject}
                onChangeText={(text) => setNewCard({ ...newCard, subject: text })}
                placeholder="e.g., Mathematics"
              />
              
              <Input
                label="Question"
                value={newCard.question}
                onChangeText={(text) => setNewCard({ ...newCard, question: text })}
                placeholder="What is...?"
                multiline
                numberOfLines={2}
              />
              
              <Input
                label="Answer"
                value={newCard.answer}
                onChangeText={(text) => setNewCard({ ...newCard, answer: text })}
                placeholder="The answer is..."
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.difficultyContainer}>
                <Text style={styles.difficultyLabel}>Difficulty</Text>
                <View style={styles.difficultyOptions}>
                  {[1, 2, 3, 4, 5].map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyOption,
                        newCard.difficulty === level && styles.selectedDifficultyOption,
                        { backgroundColor: getDifficultyColor(level) }
                      ]}
                      onPress={() => setNewCard({ ...newCard, difficulty: level })}
                    >
                      <Text
                        style={[
                          styles.difficultyOptionText,
                          newCard.difficulty === level && styles.selectedDifficultyOptionText,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAddModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Add Flashcard"
                  onPress={handleAddFlashcard}
                  loading={adding}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Flashcard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
            keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Flashcard</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              {editingCard && (
                <>
                  <Input
                    label="Question"
                    value={editingCard.question}
                    onChangeText={(text) => setEditingCard({ ...editingCard, question: text })}
                    placeholder="What is...?"
                    multiline
                    numberOfLines={2}
                  />
                  
                  <Input
                    label="Answer"
                    value={editingCard.answer}
                    onChangeText={(text) => setEditingCard({ ...editingCard, answer: text })}
                    placeholder="The answer is..."
                    multiline
                    numberOfLines={3}
                  />
                  
                  <View style={styles.difficultyContainer}>
                    <Text style={styles.difficultyLabel}>Difficulty</Text>
                    <View style={styles.difficultyOptions}>
                      {[1, 2, 3, 4, 5].map(level => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.difficultyOption,
                            editingCard.difficulty === level && styles.selectedDifficultyOption,
                            { backgroundColor: getDifficultyColor(level) }
                          ]}
                          onPress={() => setEditingCard({ ...editingCard, difficulty: level })}
                        >
                          <Text
                            style={[
                              styles.difficultyOptionText,
                              editingCard.difficulty === level && styles.selectedDifficultyOptionText,
                            ]}
                          >
                            {level}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Cancel"
                      onPress={() => setShowEditModal(false)}
                      variant="outline"
                      style={styles.modalButton}
                    />
                    <Button
                      title="Save Changes"
                      onPress={handleEditFlashcard}
                      style={styles.modalButton}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Generate Flashcards Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGenerateModal}
        onRequestClose={() => !generating && setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
            keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Generate Flashcards with AI</Text>
                {!generating && (
                  <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {generating ? (
                <View style={styles.generatingContainer}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.generatingText}>Generating flashcards...</Text>
                  <Text style={styles.generatingSubtext}>This may take a few moments</Text>
                </View>
              ) : (
                <>
                  <Input
                    label="Subject"
                    value={generateForm.subject}
                    onChangeText={(text) => setGenerateForm({ ...generateForm, subject: text })}
                    placeholder="e.g., Mathematics"
                  />
                  
                  <Input
                    label="Topic"
                    value={generateForm.topic}
                    onChangeText={(text) => setGenerateForm({ ...generateForm, topic: text })}
                    placeholder="e.g., Algebra, World War II, etc."
                  />
                  
                  <Input
                    label="Number of Flashcards"
                    value={generateForm.count.toString()}
                    onChangeText={(text) => setGenerateForm({ ...generateForm, count: parseInt(text) || 5 })}
                    placeholder="5"
                    keyboardType="numeric"
                  />
                  
                  <View style={styles.modalActions}>
                    <Button
                      title="Cancel"
                      onPress={() => setShowGenerateModal(false)}
                      variant="outline"
                      style={styles.modalButton}
                    />
                    <Button
                      title="Generate"
                      onPress={handleGenerateFlashcards}
                      loading={generating}
                      style={styles.modalButton}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAIPreviewModal}
        onRequestClose={() => !adding && setShowAIPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiPreviewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Generated Flashcards</Text>
              {!adding && (
                <TouchableOpacity onPress={() => setShowAIPreviewModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.aiPreviewContainer}>
              {aiPreviewCards.map((card, index) => (
                <View key={index} style={styles.aiPreviewCard}>
                  <Text style={styles.aiPreviewCardLabel}>Card {index + 1}</Text>
                  <Text style={styles.aiPreviewQuestion}>Q: {card.question}</Text>
                  <Text style={styles.aiPreviewAnswer}>A: {card.answer}</Text>
                </View>
              ))}
            </ScrollView>
            
            {adding ? (
              <View style={styles.addingContainer}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.addingText}>Adding flashcards to your collection...</Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAIPreviewModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Add All"
                  onPress={handleConfirmAIGeneratedCards}
                  style={styles.modalButton}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* AI Features Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAIFeaturesModal}
        onRequestClose={() => setShowAIFeaturesModal(false)}
      >
        <TouchableOpacity
          style={styles.aiFeaturesModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAIFeaturesModal(false)}
        >
          <View style={styles.aiFeaturesModalContent}>
            <Text style={styles.aiFeaturesModalTitle}>AI Features</Text>
            
            <TouchableOpacity
              style={styles.aiFeatureButton}
              onPress={() => {
                setShowAIFeaturesModal(false);
                setShowGenerateModal(true);
              }}
            >
              <Text style={styles.aiFeatureButtonText}>🤖 Generate Flashcards</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.aiFeatureButton}
              onPress={() => {
                setShowAIFeaturesModal(false);
                setShowOptimizeModal(true);
              }}
            >
              <Text style={styles.aiFeatureButtonText}>📈 Optimize Study Schedule</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Optimize Study Schedule Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOptimizeModal}
        onRequestClose={() => setShowOptimizeModal(false)}
      >
        <TouchableOpacity
          style={styles.optimizeModalOverlay}
          activeOpacity={1}
          onPress={() => !optimizing && setShowOptimizeModal(false)}
        >
          <View style={styles.optimizeModalContent}>
            <Text style={styles.optimizeModalTitle}>Optimize Study Schedule</Text>
            <Text style={styles.optimizeModalText}>
              AI will analyze your flashcard performance and optimize your review schedule for maximum retention.
            </Text>
            
            <View style={styles.optimizeModalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowOptimizeModal(false)}
                variant="outline"
                style={styles.optimizeModalButton}
                disabled={optimizing}
              />
              <Button
                title="Optimize"
                onPress={handleOptimizeStudySchedule}
                loading={optimizing}
                style={styles.optimizeModalButton}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort Flashcards</Text>
            
            {[
              { key: 'newest', label: '🆕 Newest First' },
              { key: 'oldest', label: '📅 Oldest First' },
              { key: 'difficulty', label: '⭐ Difficulty' },
              { key: 'accuracy', label: '🎯 Accuracy' },
              { key: 'next_review', label: '⏰ Next Review' },
            ].map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.selectedSortOption
                ]}
                onPress={() => {
                  setSortBy(option.key as any);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.selectedSortOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
            <Text style={styles.tipTitle}>💡 Flashcard Tip</Text>
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButtonText: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  subjectFilter: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSubjectChip: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedSubjectChipText: {
    color: '#FFFFFF',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sortIcon: {
    fontSize: 18,
  },
  batchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  batchIcon: {
    fontSize: 18,
  },
  batchActionsContainer: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  batchActionsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  batchActionsButtons: {
    flexDirection: 'row',
  },
  batchActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    marginLeft: 6,
  },
  batchActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  batchDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  batchDeleteButtonText: {
    color: '#FFFFFF',
  },
  dueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dueContent: {
    flex: 1,
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  dueSubtext: {
    fontSize: 14,
    color: '#B45309',
  },
  startReviewButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  flashcardsList: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  flashcardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedFlashcardItem: {
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  flashcardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flashcardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  flashcardSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  flashcardBadges: {
    flexDirection: 'row',
  },
  dueBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  flashcardQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 22,
  },
  flashcardAnswer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedAnswer: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  flashcardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  expandedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  cardReviewButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardReviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  flashcardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  flashcardStatsText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  flashcardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  difficultyContainer: {
    marginBottom: 16,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  difficultyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedDifficultyOption: {
    borderWidth: 0,
  },
  difficultyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  selectedDifficultyOptionText: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  generatingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  generatingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  generatingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  addingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
  aiPreviewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  aiPreviewContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  aiPreviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiPreviewCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  aiPreviewQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  aiPreviewAnswer: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  aiFeaturesModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiFeaturesModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  aiFeaturesModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  aiFeatureButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiFeatureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optimizeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optimizeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  optimizeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  optimizeModalText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  optimizeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optimizeModalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#EEF2FF',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedSortOptionText: {
    color: '#6366F1',
    fontWeight: '600',
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

export default FlashcardsScreen;