// F:\StudyBuddy\src\screens\community\PostDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getPostWithComments, togglePostLike, createComment, toggleCommentLike } from '../../services/communityService';
import { generateComment } from '../../services/communityAI';
import { CommunityPost, Comment, AppStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CommentItem } from '../../components/community/CommentItem';

type PostDetailScreenNavigationProp = StackNavigationProp<AppStackParamList, 'PostDetail'>;
type PostDetailScreenRouteProp = RouteProp<AppStackParamList, 'PostDetail'>;

// Helper function to generate avatar URL from user info
const getAvatarUrl = (userAvatar?: string | null, userName?: string | null, userId?: string | null): string => {
  if (userAvatar) {
    return userAvatar;
  }
  
  // Use DiceBear Avatars API - free avatar generation service
  // Using 'initials' style as fallback
  const seed = userId || userName || 'default';
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=6366F1&textColor=ffffff`;
};

export const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const { postId } = route.params;
  const { user } = useAuthStore();
  const { updatePost, addComment, updateComment, deleteComment } = useCommunityStore();
  
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [aiGeneratingComment, setAiGeneratingComment] = useState(false);

  // Load post and comments
  const loadPostAndComments = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { post: postData, comments: commentsData } = await getPostWithComments(postId, user.id);
      setPost(postData);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, user, navigation]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPostAndComments();
  }, [loadPostAndComments]);

  // Handle like post
  const handleLikePost = useCallback(async () => {
    if (!user || !post) return;
    
    try {
      const isLiked = await togglePostLike(post.id, user.id);
      
      // Update local state
      const updatedPost = {
        ...post,
        liked_by_user: isLiked,
        likes: isLiked ? post.likes + 1 : post.likes - 1
      };
      
      setPost(updatedPost);
      updatePost(post.id, updatedPost);
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    }
  }, [user, post, updatePost]);

  // Handle like comment
  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!user) return;
    
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const isLiked = await toggleCommentLike(commentId, user.id);
      
      // Update local state
      const updatedComment = {
        ...comment,
        liked_by_user: isLiked,
        likes: isLiked ? comment.likes + 1 : comment.likes - 1
      };
      
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
      updateComment(commentId, updatedComment);
    } catch (error) {
      console.error('Error liking comment:', error);
      Alert.alert('Error', 'Failed to like comment. Please try again.');
    }
  }, [user, comments, updateComment]);

  // Handle submit comment
  const handleSubmitComment = useCallback(async () => {
    if (!user || !commentText.trim()) return;
    
    try {
      setSubmittingComment(true);
      
      const newComment = await createComment({
        post_id: postId,
        user_id: user.id,
        content: commentText.trim(),
      });
      
      setComments([newComment, ...comments]);
      addComment(newComment);
      setCommentText('');
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText, postId, comments, addComment]);

  // Handle AI generate comment
  const handleGenerateComment = useCallback(async () => {
    if (!user || !post) return;
    
    try {
      setAiGeneratingComment(true);
      
      const userProfile = {
        full_name: user.email?.split('@')[0] || 'User',
        learning_style: 'visual',
        subjects: [],
      };
      
      const generatedComment = await generateComment(post.content, userProfile);
      setCommentText(generatedComment);
    } catch (error) {
      console.error('Error generating comment:', error);
      Alert.alert('Error', 'Failed to generate comment. Please try again.');
    } finally {
      setAiGeneratingComment(false);
    }
  }, [user, post]);

  // Handle profile press
  const handleProfilePress = useCallback(() => {
    if (post) {
      navigation.navigate('Profile', { userId: post.user_id });
    }
  }, [post, navigation]);

  // Handle edit post
  const handleEditPost = useCallback(() => {
    if (post) {
      navigation.navigate('EditPost', { postId: post.id });
    }
  }, [post, navigation]);

  // Load data on mount
  useEffect(() => {
    loadPostAndComments();
  }, [loadPostAndComments]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
            <Image
              source={{ uri: getAvatarUrl(post.user_avatar, post.user_name, post.user_id) }}
              style={styles.authorAvatar}
            />
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>{post.user_name}</Text>
              <Text style={styles.postDate}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
          
          {post.user_id === user?.id && (
            <TouchableOpacity
              onPress={handleEditPost}
              style={styles.optionsButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Title */}
        <Text style={styles.postTitle}>{post.title}</Text>

        {/* Post Content */}
        <Text style={styles.postContent}>{post.content}</Text>

        {/* Post Image */}
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.postImage} />
        )}

        {/* Post Tags */}
        {post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            onPress={handleLikePost}
            style={styles.actionButton}
          >
            <Ionicons
              name={post.liked_by_user ? "heart" : "heart-outline"}
              size={20}
              color={post.liked_by_user ? "#EF4444" : "#6B7280"}
            />
            <Text style={styles.actionText}>{post.likes}</Text>
          </TouchableOpacity>
          
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text style={styles.actionText}>{post.comments}</Text>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          
          {comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
            </View>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={() => handleLikeComment(comment.id)}
                onDelete={() => {
                  // Handle delete comment
                  Alert.alert(
                    'Delete Comment',
                    'Are you sure you want to delete this comment?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        onPress: () => {
                          // This would call the deleteComment function
                          // For now, we'll just show an alert
                          Alert.alert('Deleted', 'Comment deleted successfully');
                        }, 
                        style: 'destructive' 
                      },
                    ]
                  );
                }}
                isAuthor={comment.user_id === user?.id}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          multiline
          style={styles.commentInput}
        />
        
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={handleGenerateComment}
            disabled={aiGeneratingComment}
            style={[
              styles.aiCommentButton,
              { opacity: aiGeneratingComment ? 0.5 : 1 }
            ]}
          >
            <Ionicons name="sparkles" size={20} color="#6366F1" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={submittingComment || !commentText.trim()}
            style={[
              styles.submitButton,
              { opacity: (submittingComment || !commentText.trim()) ? 0.5 : 1 }
            ]}
          >
            {submittingComment ? (
              <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  optionsButton: {
    padding: 4,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  postContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
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
  },
  postActions: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  commentsSection: {
    marginTop: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noComments: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 16,
    color: '#6B7280',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiCommentButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 8,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});