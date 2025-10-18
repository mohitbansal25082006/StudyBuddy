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
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { 
  supabase,
  togglePostLike, 
  createComment, 
  toggleCommentLike, 
  deleteComment,
  createReply,
  toggleReplyLike,
  deleteReply,
  deletePost,
} from '../../services/supabase';
import { generateComment, generateReply } from '../../services/communityAI';
import { CommunityPost, Comment, AppStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CommentItem } from '../../components/community/CommentItem';
import { ImageViewer } from '../../components/community/ImageViewer';
import { ReportModal } from '../../components/community/ReportModal';

type PostDetailScreenNavigationProp = StackNavigationProp<AppStackParamList, 'PostDetail'>;
type PostDetailScreenRouteProp = RouteProp<AppStackParamList, 'PostDetail'>;

// Helper function to generate avatar URL from user info
const getAvatarUrl = (userAvatar?: string | null, userName?: string | null, userId?: string | null): string => {
  if (userAvatar) {
    return userAvatar;
  }
  
  // Use DiceBear Avatars API - free avatar generation service
  const seed = userId || userName || 'default';
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=6366F1&textColor=ffffff`;
};

export const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const { postId } = route.params;
  const { user } = useAuthStore();
  const { updatePost, addComment, updateComment, deleteComment: deleteCommentFromStore } = useCommunityStore();
  
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [aiGeneratingComment, setAiGeneratingComment] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Image viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContentType, setReportContentType] = useState<'post' | 'comment' | 'reply'>('post');
  const [reportContentId, setReportContentId] = useState('');
  const [reportContentAuthorId, setReportContentAuthorId] = useState('');
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [aiGeneratingReply, setAiGeneratingReply] = useState(false);

  // Load post and comments
  const loadPostAndComments = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get the post
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url
          ),
          post_images (
            id,
            image_url,
            image_order
          )
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Get total post likes count
      const { count: postLikesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      // Check if user liked the post
      const { data: userPostLike } = await supabase
        .from('post_likes')
        .select('user_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if user bookmarked the post
      const { data: postBookmarks } = await supabase
        .from('post_bookmarks')
        .select('user_id')
        .eq('post_id', postId)
        .eq('user_id', user.id);

      // Get total comments count
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      // Get comments for the post
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // For each comment, get likes count and replies
      const commentsWithDetails = await Promise.all((commentsData || []).map(async (comment) => {
        // Get total comment likes count
        const { count: commentLikesCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        // Check if user liked this comment
        const { data: userCommentLike } = await supabase
          .from('comment_likes')
          .select('user_id')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .maybeSingle();

        // Get replies for the comment
        const { data: replies } = await supabase
          .from('comment_replies')
          .select(`
            *,
            profiles!comment_replies_user_id_fkey (
              full_name,
              avatar_url
            )
          `)
          .eq('comment_id', comment.id)
          .order('created_at', { ascending: true });

        // For each reply, get likes count and check if user liked it
        const repliesWithLikes = await Promise.all((replies || []).map(async (reply) => {
          // Get total reply likes count
          const { count: replyLikesCount } = await supabase
            .from('reply_likes')
            .select('*', { count: 'exact', head: true })
            .eq('reply_id', reply.id);

          // Check if user liked this reply
          const { data: userReplyLike } = await supabase
            .from('reply_likes')
            .select('user_id')
            .eq('reply_id', reply.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...reply,
            user_name: reply.profiles?.full_name || 'Unknown User',
            user_avatar: reply.profiles?.avatar_url || null,
            liked_by_user: !!userReplyLike,
            likes: replyLikesCount || 0,
          };
        }));

        return {
          ...comment,
          user_name: comment.profiles?.full_name || 'Unknown User',
          user_avatar: comment.profiles?.avatar_url || null,
          liked_by_user: !!userCommentLike,
          likes: commentLikesCount || 0,
          replies: repliesWithLikes || [],
        };
      }));
      
      // Format post with required fields
      const formattedPost: CommunityPost = {
        ...postData,
        images: postData.post_images || [],
        liked_by_user: !!userPostLike,
        bookmarked_by_user: postBookmarks && postBookmarks.length > 0,
        user_name: postData.profiles?.full_name || 'Unknown User',
        user_avatar: postData.profiles?.avatar_url || null,
        likes: postLikesCount || 0,
        comments: commentsCount || 0,
      };
      
      setPost(formattedPost);
      setComments(commentsWithDetails);
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

  // Handle image viewing
  const handleViewImages = (images: string[], initialIndex = 0) => {
    setCurrentImages(images);
    setCurrentImageIndex(initialIndex);
    setShowImageViewer(true);
  };

  // Handle reporting
  const handleReport = (contentType: 'post' | 'comment' | 'reply', contentId: string, contentAuthorId: string) => {
    setReportContentType(contentType);
    setReportContentId(contentId);
    setReportContentAuthorId(contentAuthorId);
    setShowReportModal(true);
  };

  // Handle like post
  const handleLikePost = useCallback(async () => {
    if (!user || !post) return;
    
    try {
      const isLiked = await togglePostLike(post.id, user.id);
      
      // Update local state
      const updatedPost = {
        ...post,
        liked_by_user: isLiked,
        likes: isLiked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1)
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
        likes: isLiked ? (comment.likes || 0) + 1 : Math.max(0, (comment.likes || 0) - 1)
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
      
      // Format new comment
      const formattedComment = {
        ...newComment,
        user_name: user.email?.split('@')[0] || 'You',
        user_avatar: null,
        liked_by_user: false,
        likes: 0,
        replies: [],
      };
      
      setComments([formattedComment, ...comments]);
      addComment(formattedComment);
      setCommentText('');
      
      // Update post comment count
      if (post) {
        setPost({ ...post, comments: post.comments + 1 });
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText, postId, comments, addComment, post]);

  // Handle delete comment
  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await deleteComment(commentId);
      deleteCommentFromStore(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      
      // Update post comment count
      if (post) {
        setPost({ ...post, comments: Math.max(0, post.comments - 1) });
      }
      
      Alert.alert('Success', 'Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  }, [deleteCommentFromStore, comments, post]);

  // Handle reply submission
  const handleSubmitReply = useCallback(async (commentId: string) => {
    if (!user || !replyText.trim()) return;
    
    try {
      setSubmittingReply(true);
      
      const newReply = await createReply({
        comment_id: commentId,
        user_id: user.id,
        content: replyText.trim(),
      });
      
      // Format new reply
      const formattedReply = {
        ...newReply,
        user_name: user.email?.split('@')[0] || 'You',
        user_avatar: null,
        liked_by_user: false,
        likes: 0,
      };
      
      // Update local state
      setComments(comments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              replies: [...(comment.replies || []), formattedReply] 
            } 
          : comment
      ));
      
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating reply:', error);
      Alert.alert('Error', 'Failed to post reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  }, [user, replyText, comments]);

  // Handle AI reply generation
  const handleGenerateReply = useCallback(async (commentId: string, commentContent: string) => {
    if (!user) return;
    
    try {
      setAiGeneratingReply(true);
      
      const userProfile = {
        full_name: user.email?.split('@')[0] || 'User',
        learning_style: 'visual',
        subjects: [],
      };
      
      const generatedReply = await generateReply(commentContent, userProfile);
      setReplyText(generatedReply);
      setReplyingTo(commentId);
    } catch (error) {
      console.error('Error generating reply:', error);
      Alert.alert('Error', 'Failed to generate reply. Please try again.');
    } finally {
      setAiGeneratingReply(false);
    }
  }, [user]);

  // Handle reply like
  const handleLikeReply = useCallback(async (replyId: string) => {
    if (!user) return;
    
    try {
      const isLiked = await toggleReplyLike(replyId, user.id);
      
      // Update local state
      setComments(comments.map(comment => ({
        ...comment,
        replies: (comment.replies || []).map(reply => 
          reply.id === replyId 
            ? { 
                ...reply, 
                liked_by_user: isLiked,
                likes: isLiked ? (reply.likes || 0) + 1 : Math.max(0, (reply.likes || 0) - 1)
              } 
            : reply
        )
      })));
    } catch (error) {
      console.error('Error liking reply:', error);
      Alert.alert('Error', 'Failed to like reply. Please try again.');
    }
  }, [user, comments]);

  // Handle reply deletion
  const handleDeleteReply = useCallback(async (commentId: string, replyId: string) => {
    try {
      await deleteReply(replyId);
      
      // Update local state
      setComments(comments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              replies: (comment.replies || []).filter(reply => reply.id !== replyId) 
            } 
          : comment
      ));
      
      Alert.alert('Success', 'Reply deleted successfully');
    } catch (error) {
      console.error('Error deleting reply:', error);
      Alert.alert('Error', 'Failed to delete reply. Please try again.');
    }
  }, [comments]);

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
    setShowOptionsMenu(false);
    if (post) {
      navigation.navigate('EditPost', { postId: post.id });
    }
  }, [post, navigation]);

  // Handle delete post
  const handleDeletePost = useCallback(() => {
    setShowOptionsMenu(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
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

  // Load data on mount
  useEffect(() => {
    loadPostAndComments();
  }, [loadPostAndComments]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Post images section
  const postImagesSection = post.images && post.images.length > 0 ? (
    <View style={styles.imagesContainer}>
      {post.images.length === 1 ? (
        <TouchableOpacity onPress={() => handleViewImages([post.images[0].image_url])}>
          <Image source={{ uri: post.images[0].image_url }} style={styles.postImage} />
        </TouchableOpacity>
      ) : post.images.length === 2 ? (
        <View style={styles.twoImagesContainer}>
          {post.images.map((image, index) => (
            <TouchableOpacity 
              key={image.id} 
              onPress={() => handleViewImages(post.images.map(img => img.image_url), index)}
              style={styles.halfImageContainer}
            >
              <Image source={{ uri: image.image_url }} style={styles.halfImage} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.multipleImagesContainer}>
          <TouchableOpacity 
            onPress={() => handleViewImages(post.images.map(img => img.image_url), 0)}
            style={styles.mainImageContainer}
          >
            <Image source={{ uri: post.images[0].image_url }} style={styles.mainImage} />
            {post.images.length > 1 && (
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>
                  +{post.images.length - 1} more
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {post.images.length > 1 && (
            <View style={styles.thumbnailContainer}>
              {post.images.slice(1, 4).map((image, index) => (
                <TouchableOpacity 
                  key={image.id} 
                  onPress={() => handleViewImages(post.images.map(img => img.image_url), index + 1)}
                  style={styles.thumbnail}
                >
                  <Image source={{ uri: image.image_url }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
              {post.images.length > 4 && (
                <View style={styles.moreImagesThumbnail}>
                  <Text style={styles.moreImagesText}>
                    +{post.images.length - 4}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  ) : post.image_url ? (
    <TouchableOpacity onPress={() => handleViewImages([post.image_url!])}>
      <Image source={{ uri: post.image_url }} style={styles.postImage} />
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
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
                onPress={() => setShowOptionsMenu(true)}
                style={styles.optionsButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
              </TouchableOpacity>
            )}
          </View>

          {/* Post Title */}
          <Text style={styles.postTitle}>{post.title}</Text>

          {/* Post Content */}
          <Text style={styles.postContent}>{post.content}</Text>

          {/* Post Images */}
          {postImagesSection}

          {/* Post Tags */}
          {post.tags && post.tags.length > 0 && (
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
            
            <TouchableOpacity
              onPress={() => handleReport('post', post.id, post.user_id)}
              style={styles.actionButton}
            >
              <Ionicons name="flag-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
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
                <View key={comment.id} style={styles.commentContainer}>
                  <CommentItem
                    comment={comment}
                    onLike={() => handleLikeComment(comment.id)}
                    onDelete={() => handleDeleteComment(comment.id)}
                    onReply={() => setReplyingTo(comment.id)}
                    onReplyLike={(replyId) => handleLikeReply(replyId)}
                    onReplyDelete={(replyId) => handleDeleteReply(comment.id, replyId)}
                    isAuthor={comment.user_id === user?.id}
                    userId={user?.id || ''}
                  />
                  
                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <View style={styles.replyInputContainer}>
                      <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write a reply..."
                        multiline
                        style={styles.replyInput}
                      />
                      
                      <View style={styles.replyActions}>
                        <TouchableOpacity
                          onPress={() => handleGenerateReply(comment.id, comment.content)}
                          disabled={aiGeneratingReply}
                          style={[
                            styles.aiReplyButton,
                            { opacity: aiGeneratingReply ? 0.5 : 1 }
                          ]}
                        >
                          <Ionicons name="sparkles" size={16} color="#6366F1" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={() => setReplyingTo(null)}
                          style={styles.cancelReplyButton}
                        >
                          <Ionicons name="close" size={16} color="#6B7280" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          onPress={() => handleSubmitReply(comment.id)}
                          disabled={submittingReply || !replyText.trim()}
                          style={[
                            styles.submitReplyButton,
                            { opacity: (submittingReply || !replyText.trim()) ? 0.5 : 1 }
                          ]}
                        >
                          {submittingReply ? (
                            <Ionicons name="hourglass-outline" size={16} color="#FFFFFF" />
                          ) : (
                            <Ionicons name="send" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
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

        {/* Options Menu Modal */}
        <Modal
          visible={showOptionsMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.optionsMenu}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleEditPost}
              >
                <Ionicons name="create-outline" size={22} color="#374151" />
                <Text style={styles.optionText}>Edit Post</Text>
              </TouchableOpacity>
              
              <View style={styles.optionDivider} />
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
              
              <View style={styles.optionDivider} />
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setShowOptionsMenu(false)}
              >
                <Ionicons name="close-outline" size={22} color="#6B7280" />
                <Text style={[styles.optionText, { color: '#6B7280' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Image Viewer Modal */}
        <ImageViewer
          visible={showImageViewer}
          images={currentImages}
          initialIndex={currentImageIndex}
          onClose={() => setShowImageViewer(false)}
        />

        {/* Report Modal */}
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentType={reportContentType}
          contentId={reportContentId}
          contentAuthorId={reportContentAuthorId}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    flex: 1,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  imagesContainer: {
    marginBottom: 16,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfImageContainer: {
    width: '48%',
  },
  halfImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  multipleImagesContainer: {
    flexDirection: 'row',
  },
  mainImageContainer: {
    width: '65%',
    marginRight: 8,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  thumbnailContainer: {
    width: '35%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  thumbnail: {
    height: 64,
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesThumbnail: {
    height: 64,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
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
  commentContainer: {
    marginBottom: 8,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginLeft: 40,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
    maxHeight: 80,
    backgroundColor: '#FFFFFF',
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiReplyButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 8,
    marginRight: 8,
  },
  cancelReplyButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 8,
    marginRight: 8,
  },
  submitReplyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    padding: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  optionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
});