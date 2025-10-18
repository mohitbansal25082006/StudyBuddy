// F:\StudyBuddy\src\screens\community\CreatePostScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { createPost, uploadPostImage } from '../../services/communityService';
import { tagPostContent, improvePostContent, moderateContent } from '../../services/communityAI';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { TagInput } from '../../components/community/TagInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { addPost } = useCommunityStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Handle image selection
  const handleSelectImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, []);

  // Handle remove image
  const handleRemoveImage = useCallback(() => {
    setImage(null);
  }, []);

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
      setShowTagSuggestions(true);
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

      // Moderate content
      const moderation = await moderateContent(content);
      if (!moderation.isAppropriate) {
        Alert.alert('Content Flagged', moderation.reason || 'Your content may not be appropriate for the community.');
        return;
      }

      // Upload image if selected
      let imageUrl: string | undefined = undefined;
      if (image) {
        imageUrl = await uploadPostImage(user.id, image);
      }

      // Create post
      const newPost = await createPost({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl, // Now undefined instead of null
        tags,
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
  }, [title, content, tags, image, user, addPost, navigation]);

  // Handle add tag from suggestions
  const handleAddSuggestedTag = useCallback((tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setShowTagSuggestions(false);
  }, [tags]);

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

          {/* Tag Suggestions */}
          {showTagSuggestions && (
            <View style={styles.tagSuggestions}>
              <Text style={styles.suggestionsTitle}>Suggested Tags:</Text>
              <View style={styles.suggestionsList}>
                {tagSuggestions.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleAddSuggestedTag(tag)}
                    style={styles.suggestionTag}
                  >
                    <Text style={styles.suggestionTagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Image */}
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={styles.removeImageButton}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSelectImage}
              style={styles.addImageButton}
            >
              <Ionicons name="image" size={24} color="#9CA3AF" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <LoadingSpinner />
          </View>
        )}
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
  tagSuggestions: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  suggestionTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 8,
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
});