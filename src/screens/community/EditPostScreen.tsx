// F:\StudyBuddy\src\screens\community\EditPostScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getPostWithComments, updatePost, uploadPostImage } from '../../services/communityService';
import { 
  uploadPostImages, 
  deletePostImages, 
  getPostImages 
} from '../../services/supabase';
import { tagPostContent, improvePostContent, moderateContent } from '../../services/communityAI';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { TagInput } from '../../components/community/TagInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CommunityPost, PostImage } from '../../types';

interface SelectedImage {
  id?: string; // ID if it's an existing image from database
  uri: string;
  isNew: boolean; // true if it's a newly selected image
}

export const EditPostScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params as { postId: string };
  const { user } = useAuthStore();
  const { updatePost: updatePostInStore } = useCommunityStore();
  
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const MAX_IMAGES = 5;

  // Load post data
  useEffect(() => {
    const loadPost = async () => {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to edit a post');
        navigation.goBack();
        return;
      }

      try {
        const { post: postData } = await getPostWithComments(postId, user.id);
        
        // Check if user is the author
        if (postData.user_id !== user.id) {
          Alert.alert('Error', 'You can only edit your own posts');
          navigation.goBack();
          return;
        }
        
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
        setTags(postData.tags);
        
        // Load images
        const existingImages: SelectedImage[] = [];
        
        // Add images from post_images table
        if (postData.images && postData.images.length > 0) {
          postData.images.forEach(img => {
            existingImages.push({
              id: img.id,
              uri: img.image_url,
              isNew: false,
            });
          });
        }
        // Fallback to old image_url if no images in post_images
        else if (postData.image_url) {
          existingImages.push({
            uri: postData.image_url,
            isNew: false,
          });
        }
        
        setImages(existingImages);
      } catch (error) {
        console.error('Error loading post:', error);
        Alert.alert('Error', 'Failed to load post. Please try again.');
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    loadPost();
  }, [postId, user, navigation]);

  // Handle image selection
  const handleSelectImages = useCallback(async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_IMAGES} images per post.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: MAX_IMAGES - images.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: SelectedImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          isNew: true,
        }));
        
        setImages([...images, ...newImages].slice(0, MAX_IMAGES));
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  }, [images]);

  // Handle remove image
  const handleRemoveImage = useCallback((index: number) => {
    const imageToRemove = images[index];
    
    // If it's an existing image from database, add to deleted list
    if (imageToRemove.id) {
      setDeletedImageIds([...deletedImageIds, imageToRemove.id]);
    }
    
    // Remove from images array
    setImages(images.filter((_, i) => i !== index));
  }, [images, deletedImageIds]);

  // Handle reorder images
  const handleReorderImages = useCallback((fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImages(newImages);
  }, [images]);

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

  // Handle update post
  const handleUpdatePost = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter a title and content.');
      return;
    }

    if (!user || !post) {
      Alert.alert('Error', 'You must be logged in to edit a post.');
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

      // Delete removed images from database
      if (deletedImageIds.length > 0) {
        for (const imageId of deletedImageIds) {
          try {
            await deletePostImages(postId);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
      }

      // Upload new images
      const newImageUris = images.filter(img => img.isNew).map(img => img.uri);
      if (newImageUris.length > 0) {
        try {
          await uploadPostImages(user.id, postId, newImageUris);
        } catch (error) {
          console.error('Error uploading images:', error);
          Alert.alert('Warning', 'Some images may not have been uploaded correctly.');
        }
      }

      // Determine image_url for backward compatibility
      let imageUrl: string | null = null;
      if (images.length > 0) {
        // Use the first image as the primary image_url
        imageUrl = images[0].uri;
      }

      // Update post
      const updatedPost = await updatePost(postId, {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
        tags,
      });

      // Update in local state
      updatePostInStore(postId, updatedPost);

      Alert.alert('Success', 'Post updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [title, content, tags, images, deletedImageIds, post, user, postId, updatePostInStore, navigation]);

  // Handle add tag from suggestions
  const handleAddSuggestedTag = useCallback((tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setShowTagSuggestions(false);
  }, [tags]);

  // Handle delete post
  const handleDeletePost = useCallback(() => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
              const { deletePost } = await import('../../services/communityService');
              await deletePost(postId);
              Alert.alert('Success', 'Post deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }, 
          style: 'destructive' 
        },
      ]
    );
  }, [postId, navigation]);

  // Render image item
  const renderImageItem = useCallback(({ item, index }: { item: SelectedImage; index: number }) => (
    <View style={styles.imageItem}>
      <Image source={{ uri: item.uri }} style={styles.imagePreview} />
      
      {/* Remove button */}
      <TouchableOpacity
        onPress={() => handleRemoveImage(index)}
        style={styles.removeImageButton}
      >
        <Ionicons name="close-circle" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Image order indicator */}
      <View style={styles.imageOrderBadge}>
        <Text style={styles.imageOrderText}>{index + 1}</Text>
      </View>
      
      {/* New image indicator */}
      {item.isNew && (
        <View style={styles.newImageBadge}>
          <Text style={styles.newImageText}>NEW</Text>
        </View>
      )}
    </View>
  ), [handleRemoveImage]);

  if (initialLoading) {
    return <LoadingSpinner />;
  }

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
          
          <Text style={styles.headerTitle}>Edit Post</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleDeletePost}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUpdatePost}
              disabled={loading || !title.trim() || !content.trim()}
              style={[
                styles.headerButton,
                { opacity: (loading || !title.trim() || !content.trim()) ? 0.5 : 1 }
              ]}
            >
              <Text style={styles.postButton}>Update</Text>
            </TouchableOpacity>
          </View>
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

          {/* Images Section */}
          <View style={styles.imagesSection}>
            <View style={styles.imagesSectionHeader}>
              <Text style={styles.inputLabel}>
                Images ({images.length}/{MAX_IMAGES})
              </Text>
              {images.length < MAX_IMAGES && (
                <TouchableOpacity
                  onPress={handleSelectImages}
                  style={styles.addImageButton}
                >
                  <Ionicons name="add-circle" size={20} color="#6366F1" />
                  <Text style={styles.addImageButtonText}>Add Images</Text>
                </TouchableOpacity>
              )}
            </View>

            {images.length > 0 ? (
              <FlatList
                data={images}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => item.id || `image-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesList}
              />
            ) : (
              <TouchableOpacity
                onPress={handleSelectImages}
                style={styles.emptyImagesContainer}
              >
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyImagesText}>
                  Tap to add images
                </Text>
                <Text style={styles.emptyImagesSubtext}>
                  You can add up to {MAX_IMAGES} images
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpText}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.helpTextContent}>
              The first image will be used as the cover image. Drag to reorder.
            </Text>
          </View>
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
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 4,
    marginRight: 8,
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
  imagesSection: {
    marginBottom: 16,
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addImageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginLeft: 4,
  },
  imagesList: {
    paddingVertical: 8,
  },
  imageItem: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  imageOrderBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOrderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newImageBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newImageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyImagesContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImagesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyImagesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  helpTextContent: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
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