// F:\StudyBuddy\src\screens\qa\AskQuestionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { createQuestion } from '../../services/supabase';
import { 
  estimateQuestionDifficulty, 
  enhanceQuestion, 
  generateAnswer 
} from '../../services/communityAI';
import { AppStackParamList } from '../../types';
import { Button } from '../../components/Button';

type AskQuestionScreenNavigationProp = StackNavigationProp<AppStackParamList, 'AskQuestionScreen'>;

const COMMON_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Geography'];

export const AskQuestionScreen: React.FC = () => {
  const navigation = useNavigation<AskQuestionScreenNavigationProp>();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Estimate difficulty with AI
  const handleEstimateDifficulty = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter both title and content first');
      return;
    }

    try {
      setAiEnhancing(true);
      const estimatedDifficulty = await estimateQuestionDifficulty(title, content);
      setDifficulty(estimatedDifficulty);
      Alert.alert('AI Analysis', `Question difficulty estimated as: ${estimatedDifficulty}`);
    } catch (error) {
      console.error('Error estimating difficulty:', error);
      Alert.alert('Error', 'Failed to estimate difficulty');
    } finally {
      setAiEnhancing(false);
    }
  };

  // Enhance question with AI
  const handleEnhanceQuestion = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter both title and content first');
      return;
    }

    try {
      setAiEnhancing(true);
      const enhancedContent = await enhanceQuestion(title, content);
      setContent(enhancedContent);
    } catch (error) {
      console.error('Error enhancing question:', error);
      Alert.alert('Error', 'Failed to enhance question');
    } finally {
      setAiEnhancing(false);
    }
  };

  // Generate AI answer suggestion
  const handleGenerateAnswer = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter both title and content first');
      return;
    }

    try {
      setAiGenerating(true);
      const userProfile = {
        full_name: user?.email?.split('@')[0] || 'User',
        learning_style: 'visual',
        subjects: tags,
      };
      const aiAnswer = await generateAnswer(`${title}\n\n${content}`, userProfile);
      
      Alert.alert(
        'AI Answer Suggestion',
        aiAnswer,
        [
          { text: 'Use This', onPress: () => setContent(`${content}\n\n---\n\nAI Suggested Answer:\n${aiAnswer}`) },
          { text: 'Discard', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error generating answer:', error);
      Alert.alert('Error', 'Failed to generate answer suggestion');
    } finally {
      setAiGenerating(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle tag input submit
  const handleTagInputSubmit = () => {
    handleAddTag();
  };

  // Submit question
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Content is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      await createQuestion({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        tags,
        difficulty_level: difficulty,
      });

      Alert.alert('Success', 'Question posted successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ask a Question</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="What's your question?"
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Provide more details about your question..."
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add a tag..."
              onSubmitEditing={handleTagInputSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 5}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity
                    style={styles.removeTagButton}
                    onPress={() => handleRemoveTag(tag)}
                  >
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <Text style={styles.tagHint}>
            Add up to 5 tags to help others find your question
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.difficultyContainer}>
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyOption,
                  difficulty === level && styles.activeDifficultyOption
                ]}
                onPress={() => setDifficulty(level)}
              >
                <Text style={[
                  styles.difficultyOptionText,
                  difficulty === level && styles.activeDifficultyOptionText
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.aiToolsContainer}>
          <Text style={styles.aiToolsTitle}>AI Tools</Text>
          
          <TouchableOpacity
            style={styles.aiToolButton}
            onPress={handleEstimateDifficulty}
            disabled={aiEnhancing}
          >
            <Ionicons name="analytics-outline" size={20} color="#6366F1" />
            <Text style={styles.aiToolButtonText}>
              {aiEnhancing ? 'Analyzing...' : 'Estimate Difficulty'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiToolButton}
            onPress={handleEnhanceQuestion}
            disabled={aiEnhancing}
          >
            <Ionicons name="sparkles-outline" size={20} color="#6366F1" />
            <Text style={styles.aiToolButtonText}>
              {aiEnhancing ? 'Enhancing...' : 'Enhance Question'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiToolButton}
            onPress={handleGenerateAnswer}
            disabled={aiGenerating}
          >
            <Ionicons name="bulb-outline" size={20} color="#6366F1" />
            <Text style={styles.aiToolButtonText}>
              {aiGenerating ? 'Generating...' : 'Suggest Answer'}
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Post Question"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 50,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    marginRight: 4,
  },
  removeTagButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  activeDifficultyOption: {
    backgroundColor: '#EBF5FF',
    borderColor: '#6366F1',
  },
  difficultyOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeDifficultyOptionText: {
    color: '#1E40AF',
  },
  aiToolsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  aiToolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  aiToolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiToolButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginLeft: 8,
  },
  submitButton: {
    marginBottom: 16,
  },
});