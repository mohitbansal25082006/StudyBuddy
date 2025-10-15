// F:\StudyBuddy\src\screens\flashcards\FlashcardsScreen.tsx
// ============================================
// FLASHCARDS SCREEN - ADVANCED VERSION
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
  Platform
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { 
  getFlashcards, 
  createFlashcard, 
  updateFlashcard, 
  deleteFlashcard,
  getFlashcardsForReview 
} from '../../services/supabase';
import { generateFlashcardContent } from '../../services/openai';
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
];

export const FlashcardsScreen = ({ navigation, route }: any) => {
  const { user, profile } = useAuthStore();
  const { flashcards, fetchFlashcards, updateFlashcard: updateStoreFlashcard } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(route.params?.subject || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dueFlashcards, setDueFlashcards] = useState<Flashcard[]>([]);
  const [masteredFlashcards, setMasteredFlashcards] = useState<Flashcard[]>([]);
  const [learningFlashcards, setLearningFlashcards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'difficulty' | 'accuracy'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
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
    
    const mastered = flashcards.filter(card => 
      card.user_id === user.id && 
      card.correct_count >= 5 && 
      (card.correct_count / Math.max(card.review_count, 1)) >= 0.9
    );
    
    const learning = flashcards.filter(card => 
      card.user_id === user.id && 
      (card.correct_count < 5 || (card.correct_count / Math.max(card.review_count, 1)) < 0.9)
    );
    
    setMasteredFlashcards(mastered);
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
    }
    
    return filtered;
  }, [flashcards, user, selectedSubject, searchQuery, sortBy]);

  // Handle adding a new flashcard
  const handleAddFlashcard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim() || !newCard.subject.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
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
      Alert.alert('Error', 'Please fill in all fields');
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
    try {
      // Generate flashcard content
      const generatedCards = await generateFlashcardContent(
        generateForm.subject,
        generateForm.topic,
        generateForm.count
      );

      // Add each generated flashcard to the database
      const now = new Date();
      const nextReview = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now
      
      for (const card of generatedCards) {
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
      
      setShowGenerateModal(false);
      
      // Refresh flashcards
      await fetchFlashcards(user.id, selectedSubject || undefined);
      categorizeFlashcards();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Generated ${generatedCards.length} flashcards successfully`);
    } catch (error: any) {
      console.error('Error generating flashcards:', error);
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
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
    
    // Check if there are flashcards due for review
    if (dueFlashcards.length === 0) {
      Alert.alert(
        'No Cards to Review', 
        'All your flashcards have been reviewed recently. Check back later for cards due for review!'
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('FlashcardReview', { subject: selectedSubject });
  };

  // Handle sharing flashcards
  const handleShareFlashcards = async () => {
    const totalCards = getFilteredAndSortedFlashcards().length;
    const dueCards = dueFlashcards.length;
    const masteredCards = masteredFlashcards.length;
    
    const message = `📚 My Flashcards\n\n📖 Total Cards: ${totalCards}\n🗂️ Due for Review: ${dueCards}\n✅ Mastered: ${masteredCards}\n📚 Learning: ${learningFlashcards.length}\n\n#StudyBuddy #Flashcards`;
    
    try {
      await Share.share({
        message,
        title: 'My Flashcards',
      });
    } catch (error) {
      console.error('Error sharing flashcards:', error);
    }
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
    // Fixed: Ensure review_count is a number and handle division safely
    const reviewCount = typeof item.review_count === 'number' ? item.review_count : 0;
    const correctCount = typeof item.correct_count === 'number' ? item.correct_count : 0;
    const accuracy = reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : 0;
    const isDue = dueFlashcards.some(card => card.id === item.id);
    const isMastered = masteredFlashcards.some(card => card.id === item.id);
    
    return (
      <Animated.View
        style={[
          styles.flashcardItem,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => setExpandedCard(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.flashcardHeader}>
            <View style={styles.flashcardTitleContainer}>
              <Text style={[styles.flashcardSubject, { color: getSubjectColor(item.subject) }]}>
                {item.subject}
              </Text>
              <View style={styles.flashcardBadges}>
                {isDue && (
                  <View style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>Due</Text>
                  </View>
                )}
                {isMastered && (
                  <View style={styles.masteredBadge}>
                    <Text style={styles.masteredBadgeText}>✓</Text>
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
                  <Text style={styles.statLabel}>Reviewed</Text>
                  <Text style={styles.statValue}>{reviewCount} times</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Accuracy</Text>
                  <Text style={styles.statValue}>{accuracy}%</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Last reviewed</Text>
                  <Text style={styles.statValue}>
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
                  style={styles.reviewButton}
                  onPress={() => navigation.navigate('FlashcardReview', { subject: item.subject })}
                >
                  <Text style={styles.reviewButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
        
        {!isExpanded && (
          <View style={styles.flashcardFooter}>
            <Text style={styles.flashcardStatsText}>
              Reviewed: {reviewCount} | Correct: {correctCount} | Accuracy: {accuracy}%
            </Text>
            
            <View style={styles.flashcardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('FlashcardReview', { subject: item.subject })}
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
            <Text style={styles.statValue}>{filteredFlashcards.length}</Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dueFlashcards.length}</Text>
            <Text style={styles.statLabel}>Due Today</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{masteredFlashcards.length}</Text>
            <Text style={styles.statLabel}>Mastered</Text>
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
      </Animated.View>

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
            style={styles.reviewButton}
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
        onRequestClose={() => setShowGenerateModal(false)}
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
                <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
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
                {sortBy === option.key && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stats Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStatsModal}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Flashcard Statistics</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsModalContent}>
              <View style={styles.statsModalSection}>
                <Text style={styles.statsModalSectionTitle}>Overview</Text>
                <View style={styles.statsModalGrid}>
                  <View style={styles.statsModalItem}>
                    <Text style={styles.statsModalValue}>{filteredFlashcards.length}</Text>
                    <Text style={styles.statsModalLabel}>Total Cards</Text>
                  </View>
                  
                  <View style={styles.statsModalItem}>
                    <Text style={styles.statsModalValue}>{dueFlashcards.length}</Text>
                    <Text style={styles.statsModalLabel}>Due Today</Text>
                  </View>
                  
                  <View style={styles.statsModalItem}>
                    <Text style={styles.statsModalValue}>{masteredFlashcards.length}</Text>
                    <Text style={styles.statsModalLabel}>Mastered</Text>
                  </View>
                  
                  <View style={styles.statsModalItem}>
                    <Text style={styles.statsModalValue}>{learningFlashcards.length}</Text>
                    <Text style={styles.statsModalLabel}>Learning</Text>
                  </View>
                </View>
              </View>
              
              {subjects.length > 0 && (
                <View style={styles.statsModalSection}>
                  <Text style={styles.statsModalSectionTitle}>By Subject</Text>
                  {subjects.map(subject => {
                    const subjectCards = filteredFlashcards.filter(card => card.subject === subject);
                    const subjectDue = dueFlashcards.filter(card => card.subject === subject);
                    const subjectMastered = masteredFlashcards.filter(card => card.subject === subject);
                    
                    return (
                      <View key={subject} style={styles.subjectStatsItem}>
                        <View style={styles.subjectStatsHeader}>
                          <Text style={[styles.subjectStatsName, { color: getSubjectColor(subject) }]}>
                            {subject}
                          </Text>
                          <Text style={styles.subjectStatsCount}>{subjectCards.length} cards</Text>
                        </View>
                        
                        <View style={styles.subjectStatsBars}>
                          <View style={styles.subjectStatsBar}>
                            <View 
                              style={[
                                styles.subjectStatsBarFill, 
                                { 
                                  width: `${(subjectMastered.length / Math.max(subjectCards.length, 1)) * 100}%`,
                                  backgroundColor: '#10B981'
                                }
                              ]} 
                            />
                          </View>
                          
                          <View style={styles.subjectStatsBar}>
                            <View 
                              style={[
                                styles.subjectStatsBarFill, 
                                { 
                                  width: `${(subjectDue.length / Math.max(subjectCards.length, 1)) * 100}%`,
                                  backgroundColor: '#F59E0B'
                                }
                              ]} 
                            />
                          </View>
                        </View>
                        
                        <View style={styles.subjectStatsLegend}>
                          <View style={styles.subjectStatsLegendItem}>
                            <View style={[styles.subjectStatsLegendColor, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.subjectStatsLegendText}>Mastered: {subjectMastered.length}</Text>
                          </View>
                          
                          <View style={styles.subjectStatsLegendItem}>
                            <View style={[styles.subjectStatsLegendColor, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.subjectStatsLegendText}>Due: {subjectDue.length}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
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
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
    marginRight: 12,
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
    width: 48,
    height: 48,
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
  sortIcon: {
    fontSize: 20,
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
  reviewButton: {
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
  masteredBadge: {
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  masteredBadgeText: {
    fontSize: 12,
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
  expandedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  reviewButtonText: {
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
  checkIcon: {
    fontSize: 16,
    color: '#6366F1',
  },
  statsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  statsModalContent: {
    flex: 1,
  },
  statsModalSection: {
    marginBottom: 24,
  },
  statsModalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsModalItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statsModalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statsModalLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  subjectStatsItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subjectStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectStatsName: {
    fontSize: 16,
    fontWeight: '600',
  },
  subjectStatsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  subjectStatsBars: {
    marginBottom: 8,
  },
  subjectStatsBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
  },
  subjectStatsBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectStatsLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectStatsLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectStatsLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  subjectStatsLegendText: {
    fontSize: 12,
    color: '#6B7280',
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