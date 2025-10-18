// F:\StudyBuddy\src\screens\community\CreatePostScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { createPost, uploadPostImage } from '../../services/communityService';
import { tagPostContent, improvePostContent, advancedModerateContent } from '../../services/communityAI';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { TagInput } from '../../components/community/TagInput';
import { MultiImageUpload } from '../../components/community/MultiImageUpload';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { addPost } = useCommunityStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  // Handle AI tag suggestion
  const handleSuggestTags = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content first.');
      return;
    }

    try {
      setAiLoading(true);
      const suggestedTags = await tagPostContent(content);
      setTagSuggestions(suggestedTags);
      setSelectedSuggestions([]); // Reset selected suggestions
      setShowTagModal(true); // Show modal with suggestions
    } catch (error) {
      console.error('Error suggesting tags:', error);
      Alert.alert('Error', 'Failed to suggest tags. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }, [content]);

  // Handle AI content improvement
  const handleImproveContent = useCallback(async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content first.');
      return;
    }

    try {
      setAiLoading(true);
      const improvedContent = await improvePostContent(content);
      setContent(improvedContent);
      Alert.alert('Success', 'Content has been improved with AI!');
    } catch (error) {
      console.error('Error improving content:', error);
      Alert.alert('Error', 'Failed to improve content. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }, [content]);

  // Handle create post
  const handleCreatePost = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter a title and content.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }

    try {
      setLoading(true);

      // Moderate content and images
      const moderation = await advancedModerateContent(content, images);
      if (!moderation.isAppropriate) {
        Alert.alert('Content Flagged', moderation.reason || 'Your content may not be appropriate for the community.');
        return;
      }

      // Upload images first if any
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        try {
          const uploadResults = await Promise.all(
            images.map(async (imageUri) => {
              const imageUrl = await uploadPostImage(imageUri, user.id);
              return imageUrl;
            })
          );
          // Filter out any undefined values
          uploadedImageUrls = uploadResults.filter((url): url is string => url !== undefined);
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          Alert.alert('Error', 'Failed to upload images. Please try again.');
          return;
        }
      }

      // Create post with uploaded image URLs
      const newPost = await createPost({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        tags,
        image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : undefined,
      });

      // Add to local state
      addPost(newPost);

      // Show success message
      Alert.alert(
        'Success',
        'Your post has been published successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [title, content, tags, images, user, addPost, navigation]);

  // Handle toggle tag suggestion selection
  const handleToggleSuggestion = useCallback((tag: string) => {
    if (selectedSuggestions.includes(tag)) {
      setSelectedSuggestions(selectedSuggestions.filter(t => t !== tag));
    } else {
      setSelectedSuggestions([...selectedSuggestions, tag]);
    }
  }, [selectedSuggestions]);

  // Handle add selected suggestions
  const handleAddSelectedSuggestions = useCallback(() => {
    // Add only the selected suggestions that aren't already in tags
    const newTags = selectedSuggestions.filter(tag => !tags.includes(tag));
    setTags([...tags, ...newTags]);
    setShowTagModal(false);
    setSelectedSuggestions([]);
  }, [selectedSuggestions, tags]);

  // Handle add all suggestions
  const handleAddAllSuggestions = useCallback(() => {
    // Add all suggestions that aren't already in tags
    const newTags = tagSuggestions.filter(tag => !tags.includes(tag));
    setTags([...tags, ...newTags]);
    setShowTagModal(false);
    setSelectedSuggestions([]);
  }, [tagSuggestions, tags]);

  // Render tag suggestion item
  const renderTagSuggestion = useCallback(({ item }: { item: string }) => {
    const isSelected = selectedSuggestions.includes(item);
    const isAlreadyAdded = tags.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.suggestionItem,
          isSelected && styles.selectedSuggestionItem,
          isAlreadyAdded && styles.alreadyAddedSuggestionItem
        ]}
        onPress={() => !isAlreadyAdded && handleToggleSuggestion(item)}
        disabled={isAlreadyAdded}
      >
        <Text style={[
          styles.suggestionItemText,
          isSelected && styles.selectedSuggestionItemText,
          isAlreadyAdded && styles.alreadyAddedSuggestionItemText
        ]}>
          {item}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
        )}
        {isAlreadyAdded && (
          <Ionicons name="checkmark-done" size={20} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  }, [selectedSuggestions, tags, handleToggleSuggestion]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Create Post</Text>
          
          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={loading || !title.trim() || !content.trim()}
            style={[
              styles.headerButton,
              { opacity: (loading || !title.trim() || !content.trim()) ? 0.5 : 1 }
            ]}
          >
            <Text style={styles.postButton}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a catchy title..."
            style={styles.input}
          />

          {/* Content Input */}
          <View style={styles.contentInputContainer}>
            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share your thoughts, tips, or questions..."
              multiline
              numberOfLines={8}
              style={styles.contentInput}
              textAlignVertical="top"
            />
            
            {/* AI Actions */}
            <View style={styles.aiActions}>
              <TouchableOpacity
                onPress={handleImproveContent}
                disabled={aiLoading || !content.trim()}
                style={[
                  styles.aiButton,
                  { opacity: (aiLoading || !content.trim()) ? 0.5 : 1 }
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#6366F1" />
                <Text style={styles.aiButtonText}>Improve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSuggestTags}
                disabled={aiLoading || !content.trim()}
                style={[
                  styles.aiButton,
                  { opacity: (aiLoading || !content.trim()) ? 0.5 : 1 }
                ]}
              >
                <Ionicons name="pricetag" size={16} color="#6366F1" />
                <Text style={styles.aiButtonText}>Suggest Tags</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tag Input */}
          <TagInput
            label="Tags"
            value={tags}
            onChange={setTags}
            placeholder="Add tags (e.g., Math, Physics)"
          />

          {/* Tag Suggestions Preview */}
          {tagSuggestions.length > 0 && !showTagModal && (
            <View style={styles.tagSuggestionsPreview}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>AI Suggested Tags:</Text>
                <TouchableOpacity
                  onPress={() => setShowTagModal(true)}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllButtonText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.suggestionsPreviewList}>
                {tagSuggestions.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{tag}</Text>
                  </View>
                ))}
                {tagSuggestions.length > 3 && (
                  <Text style={styles.moreTagsText}>+{tagSuggestions.length - 3} more</Text>
                )}
              </View>
            </View>
          )}

          {/* Multi-Image Upload */}
          <MultiImageUpload
            images={images}
            onChange={setImages}
            maxImages={5}
          />
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <LoadingSpinner />
          </View>
        )}

        {/* AI Tag Suggestions Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showTagModal}
          onRequestClose={() => setShowTagModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>AI Suggested Tags</Text>
                <TouchableOpacity
                  onPress={() => setShowTagModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Select the tags you want to add to your post:
              </Text>

              {aiLoading ? (
                <View style={styles.modalLoading}>
                  <LoadingSpinner />
                  <Text style={styles.modalLoadingText}>Generating tags...</Text>
                </View>
              ) : (
                <>
                  <FlatList
                    data={tagSuggestions}
                    renderItem={renderTagSuggestion}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.suggestionsList}
                    showsVerticalScrollIndicator={false}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setShowTagModal(false)}
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.modalAddAllButton,
                        tagSuggestions.every(tag => tags.includes(tag)) && styles.disabledButton
                      ]}
                      onPress={handleAddAllSuggestions}
                      disabled={tagSuggestions.every(tag => tags.includes(tag))}
                    >
                      <Text style={styles.modalAddAllButtonText}>Add All</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.modalAddSelectedButton,
                        selectedSuggestions.length === 0 && styles.disabledButton
                      ]}
                      onPress={handleAddSelectedSuggestions}
                      disabled={selectedSuggestions.length === 0}
                    >
                      <Text style={styles.modalAddSelectedButtonText}>
                        Add Selected ({selectedSuggestions.length})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  contentInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  contentInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  },
  aiActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginLeft: 4,
  },
  tagSuggestionsPreview: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  viewAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  viewAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0284C7',
  },
  suggestionsPreviewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  previewTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0C4A6E',
  },
  moreTagsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  suggestionsList: {
    paddingBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  selectedSuggestionItem: {
    backgroundColor: '#EBF5FF',
    borderColor: '#6366F1',
  },
  alreadyAddedSuggestionItem: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  suggestionItemText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedSuggestionItemText: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  alreadyAddedSuggestionItemText: {
    color: '#047857',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalAddAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 8,
  },
  modalAddAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modalAddSelectedButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  modalAddSelectedButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
});