// F:\StudyBuddy\src\screens\flashcards\FlashcardsScreen.tsx
// ============================================
// FLASHCARDS SCREEN
// Smart flashcard system with spaced repetition
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal } from 'react-native';
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

export const FlashcardsScreen = ({ navigation, route }: any) => {
  const { user, profile } = useAuthStore();
  const { flashcards, fetchFlashcards, updateFlashcard: updateStoreFlashcard } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(route.params?.subject || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dueFlashcards, setDueFlashcards] = useState<Flashcard[]>([]);
  
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

  // Load flashcards
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await fetchFlashcards(user.id, selectedSubject || undefined);
        
        // Get flashcards due for review
        const due = await getFlashcardsForReview(user.id, selectedSubject || undefined);
        setDueFlashcards(due);
      } catch (error) {
        console.error('Error loading flashcards:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, selectedSubject, fetchFlashcards]);

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

  // Filter flashcards by selected subject
  const getFilteredFlashcards = () => {
    if (!user) return [];
    
    return flashcards.filter(card => 
      card.user_id === user.id && 
      (!selectedSubject || card.subject === selectedSubject)
    );
  };

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
      
      Alert.alert('Success', 'Flashcard added successfully');
    } catch (error: any) {
      console.error('Error adding flashcard:', error);
      Alert.alert('Error', error.message || 'Failed to add flashcard');
    } finally {
      setAdding(false);
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
    if (dueFlashcards.length === 0) {
      Alert.alert('No Cards to Review', 'You have no flashcards due for review right now');
      return;
    }
    
    navigation.navigate('FlashcardReview', { subject: selectedSubject });
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return '#10B981'; // Green
    if (difficulty <= 3) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  if (loading) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  const subjects = getSubjects();
  const filteredFlashcards = getFilteredFlashcards();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Flashcards</Text>
        
        <View style={styles.headerActions}>
          <Button
            title="Generate"
            onPress={() => setShowGenerateModal(true)}
            variant="secondary"
            style={styles.headerButton}
          />
          <Button
            title="Add"
            onPress={() => setShowAddModal(true)}
            style={styles.headerButton}
          />
        </View>
      </View>

      {/* Subject Filter */}
      {subjects.length > 0 && (
        <View style={styles.subjectFilter}>
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
                ]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    selectedSubject === subject && styles.selectedSubjectChipText,
                  ]}
                >
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Due for Review */}
      {dueFlashcards.length > 0 && (
        <View style={styles.dueContainer}>
          <Text style={styles.dueTitle}>
            {dueFlashcards.length} card{dueFlashcards.length !== 1 ? 's' : ''} due for review
          </Text>
          <Button
            title="Start Review"
            onPress={handleStartReview}
            style={styles.reviewButton}
          />
        </View>
      )}

      {/* Flashcards List */}
      <ScrollView style={styles.flashcardsList} showsVerticalScrollIndicator={false}>
        {filteredFlashcards.length > 0 ? (
          filteredFlashcards.map(card => (
            <View key={card.id} style={styles.flashcardItem}>
              <View style={styles.flashcardHeader}>
                <Text style={styles.flashcardSubject}>{card.subject}</Text>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(card.difficulty) }]}>
                  <Text style={styles.difficultyText}>{card.difficulty}</Text>
                </View>
              </View>
              
              <Text style={styles.flashcardQuestion}>{card.question}</Text>
              <Text style={styles.flashcardAnswer}>{card.answer}</Text>
              
              <View style={styles.flashcardFooter}>
                <Text style={styles.flashcardStats}>
                  Reviewed: {card.review_count} | Correct: {card.correct_count}
                </Text>
                
                <View style={styles.flashcardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('FlashcardReview', { subject: card.subject })}
                  >
                    <Text style={styles.actionButtonText}>Review</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteFlashcard(card.id)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flashcards yet</Text>
            <Text style={styles.emptySubtext}>Create your first flashcard to get started</Text>
            <Button
              title="Add Flashcard"
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Add Flashcard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Flashcard</Text>
            
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
            
            <Button
              title="Add Flashcard"
              onPress={handleAddFlashcard}
              loading={adding}
              style={styles.modalButton}
            />
            
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={styles.modalButton}
            />
          </View>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Flashcards with AI</Text>
            
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
            
            <Button
              title="Generate Flashcards"
              onPress={handleGenerateFlashcards}
              loading={generating}
              style={styles.modalButton}
            />
            
            <Button
              title="Cancel"
              onPress={() => setShowGenerateModal(false)}
              variant="outline"
              style={styles.modalButton}
            />
          </View>
        </View>
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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 8,
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
  dueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reviewButton: {
    paddingHorizontal: 16,
  },
  flashcardsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  flashcardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  flashcardSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
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
  },
  flashcardAnswer: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  flashcardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  flashcardStats: {
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
    paddingVertical: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
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
  modalButton: {
    marginTop: 12,
  },
});