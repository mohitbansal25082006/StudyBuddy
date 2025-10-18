// F:\StudyBuddy\src\services\communityService.ts
import { supabase } from './supabase';
import { CommunityPost, Comment } from '../store/communityStore';
import { semanticSearch } from './communityAI';

// Real-time subscription for posts
let postsSubscription: any = null;

// Subscribe to posts changes
export const subscribeToPosts = (userId: string, callback: (payload: any) => void) => {
  // Unsubscribe from any existing subscription
  if (postsSubscription) {
    postsSubscription.unsubscribe();
  }

  // Create new subscription - include all posts, we'll filter in the callback
  postsSubscription = supabase
    .channel('public:community_posts')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'community_posts'
      }, 
      callback
    )
    .subscribe();

  return postsSubscription;
};

// Unsubscribe from posts
export const unsubscribeFromPosts = () => {
  if (postsSubscription) {
    postsSubscription.unsubscribe();
    postsSubscription = null;
  }
};

// Get all posts
export const getPosts = async (userId: string, limit = 20, offset = 0): Promise<CommunityPost[]> => {
  try {
    // First, get the posts
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) return [];

    // Get user profiles for all posts
    const userIds = [...new Set(posts.map(post => post.user_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Get like status for all posts
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likesError) throw likesError;

    const likedPostIds = likes ? likes.map(like => like.post_id) : [];

    // Transform data to match our interface
    return posts.map(post => {
      const profile = profiles?.find(p => p.id === post.user_id);
      return {
        id: post.id,
        user_id: post.user_id,
        user_name: profile?.full_name || 'Anonymous',
        user_avatar: profile?.avatar_url || null,
        title: post.title,
        content: post.content,
        image_url: post.image_url || null,
        tags: post.tags || [],
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        liked_by_user: likedPostIds.includes(post.id),
        created_at: post.created_at,
        updated_at: post.updated_at
      };
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

// Get a single post with comments
export const getPostWithComments = async (postId: string, userId: string): Promise<{ post: CommunityPost; comments: Comment[] }> => {
  try {
    // Get the post
    const { data: postData, error: postError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError) throw postError;

    // Get user profile for the post
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', postData.user_id)
      .single();

    if (profileError) throw profileError;

    // Get like status for the post
    const { data: like, error: likeError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    // Get comments for the post
    const { data: commentsData, error: commentsError } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    // Get user profiles for all comments
    const commentUserIds = [...new Set(commentsData.map(comment => comment.user_id))];
    const { data: commentProfiles, error: commentProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', commentUserIds);

    if (commentProfilesError) throw commentProfilesError;

    // Get like status for all comments
    const { data: commentLikes, error: commentLikesError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId);

    if (commentLikesError) throw commentLikesError;

    const likedCommentIds = commentLikes ? commentLikes.map(like => like.comment_id) : [];

    // Transform post data
    const post: CommunityPost = {
      id: postData.id,
      user_id: postData.user_id,
      user_name: profile?.full_name || 'Anonymous',
      user_avatar: profile?.avatar_url || null,
      title: postData.title,
      content: postData.content,
      image_url: postData.image_url || null,
      tags: postData.tags || [],
      likes: postData.likes_count || 0,
      comments: postData.comments_count || 0,
      liked_by_user: !!like,
      created_at: postData.created_at,
      updated_at: postData.updated_at
    };

    // Transform comments data
    const comments: Comment[] = commentsData.map(comment => {
      const commentProfile = commentProfiles?.find(p => p.id === comment.user_id);
      return {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        user_name: commentProfile?.full_name || 'Anonymous',
        user_avatar: commentProfile?.avatar_url || null,
        content: comment.content,
        likes: comment.likes_count || 0,
        liked_by_user: likedCommentIds.includes(comment.id),
        created_at: comment.created_at,
        updated_at: comment.updated_at
      };
    });

    return { post, comments };
  } catch (error) {
    console.error('Error fetching post with comments:', error);
    throw error;
  }
};

// Create a new post
export const createPost = async (post: {
  user_id: string;
  title: string;
  content: string;
  image_url?: string;
  tags: string[];
}): Promise<CommunityPost> => {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;

    // Get user profile for the post
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', post.user_id)
      .single();

    // Transform data to match our interface
    return {
      id: data.id,
      user_id: data.user_id,
      user_name: profile?.full_name || 'Anonymous',
      user_avatar: profile?.avatar_url || null,
      title: data.title,
      content: data.content,
      image_url: data.image_url || null,
      tags: data.tags || [],
      likes: 0,
      comments: 0,
      liked_by_user: false,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Update a post
export const updatePost = async (postId: string, updates: {
  title?: string;
  content?: string;
  image_url?: string;
  tags?: string[];
}): Promise<CommunityPost> => {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;

    // Get user profile for the post
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', data.user_id)
      .single();

    // Transform data to match our interface
    return {
      id: data.id,
      user_id: data.user_id,
      user_name: profile?.full_name || 'Anonymous',
      user_avatar: profile?.avatar_url || null,
      title: data.title,
      content: data.content,
      image_url: data.image_url || null,
      tags: data.tags || [],
      likes: data.likes_count || 0,
      comments: data.comments_count || 0,
      liked_by_user: false, // We'll update this separately
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

// Delete a post
export const deletePost = async (postId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Like or unlike a post
export const togglePostLike = async (postId: string, userId: string): Promise<boolean> => {
  try {
    // Check if user already liked the post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // User already liked, so unlike
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      return false;
    } else {
      // User hasn't liked, so like
      const { error } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
};

// Create a comment
export const createComment = async (comment: {
  post_id: string;
  user_id: string;
  content: string;
}): Promise<Comment> => {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert(comment)
      .select()
      .single();

    if (error) throw error;

    // Get user profile for the comment
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', comment.user_id)
      .single();

    // Transform data to match our interface
    return {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      user_name: profile?.full_name || 'Anonymous',
      user_avatar: profile?.avatar_url || null,
      content: data.content,
      likes: 0,
      liked_by_user: false,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
};

// Like or unlike a comment
export const toggleCommentLike = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    // Check if user already liked the comment
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // User already liked, so unlike
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (error) throw error;
      return false;
    } else {
      // User hasn't liked, so like
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId
        });

      if (error) throw error;
      return true;
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// Upload post image
export const uploadPostImage = async (userId: string, uri: string): Promise<string | undefined> => {
  try {
    // Get file extension from URI
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/post-${Date.now()}.${fileExt}`;

    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Convert blob to ArrayBuffer
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to ArrayBuffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('community-images')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('community-images')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading post image:', error);
    return undefined; // Return undefined instead of null
  }
};

// Get user's posts
export const getUserPosts = async (userId: string, limit = 20, offset = 0): Promise<CommunityPost[]> => {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) return [];

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get like status for all posts
    const { data: likes, error: likesError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likesError) throw likesError;

    const likedPostIds = likes ? likes.map(like => like.post_id) : [];

    // Transform data to match our interface
    return posts.map(post => ({
      id: post.id,
      user_id: post.user_id,
      user_name: profile?.full_name || 'Anonymous',
      user_avatar: profile?.avatar_url || null,
      title: post.title,
      content: post.content,
      image_url: post.image_url || null,
      tags: post.tags || [],
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      liked_by_user: likedPostIds.includes(post.id),
      created_at: post.created_at,
      updated_at: post.updated_at
    }));
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
};

// Export semanticSearch from communityAI
export { semanticSearch };