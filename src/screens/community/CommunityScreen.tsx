// F:\StudyBuddy\src\screens\community\CommunityScreen.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getPosts, semanticSearch, togglePostLike, subscribeToPosts, unsubscribeFromPosts } from '../../services/communityService';
import { CommunityPost } from '../../types';
import { PostCard } from '../../components/community/PostCard';
import { SearchBar } from '../../components/community/SearchBar';
import { TagFilter } from '../../components/community/TagFilter';
import { EmptyState } from '../../components/community/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';

// Define route types for navigation
type CommunityStackParamList = {
  Community: undefined;
  PostDetail: { postId: string };
  CreatePost: undefined;
};

type CommunityScreenNavigationProp = StackNavigationProp<
  CommunityStackParamList,
  'Community'
>;

export const CommunityScreen: React.FC = () => {
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const { user } = useAuthStore();
  const {
    posts,
    loading,
    error,
    searchQuery,
    selectedTags,
    subscriptionActive,
    setPosts,
    updatePost,
    setLoading,
    setError,
    setSearchQuery,
    setSelectedTags,
    setSubscriptionActive,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchResults, setSearchResults] = useState<CommunityPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Use ref to track if initial load is done
  const hasLoadedRef = useRef(false);

  // Load posts function - uses functional update to avoid circular dependency
  const loadPosts = useCallback(
    async (pageNum = 0, reset = false) => {
      if (!user) return;

      try {
        if (reset) {
          setLoading(true);
          setPage(0);
          setHasMore(true);
        }

        const newPosts = await getPosts(user.id, 20, pageNum * 20);

        if (reset) {
          setPosts(newPosts);
        } else {
          // Use functional update to append to existing posts
          setPosts((prevPosts: CommunityPost[]) => [...prevPosts, ...newPosts]);
        }

        setHasMore(newPosts.length === 20);
        setPage(pageNum);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading posts:', error);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, setPosts, setLoading, setError]
  );

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Handle real-time updates
    const handlePostChange = async (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Skip if this is the current user's post (they'll see it immediately when creating)
      if (newRecord && newRecord.user_id === user.id) {
        return;
      }
      
      if (eventType === 'INSERT') {
        // New post added by another user - fetch the complete post with user info
        try {
          const fullPosts = await getPosts(user.id, 1, 0);
          if (fullPosts && fullPosts.length > 0) {
            // Check if this post is already in our list
            const postExists = posts.some(p => p.id === fullPosts[0].id);
            if (!postExists) {
              setPosts((prevPosts: CommunityPost[]) => [fullPosts[0], ...prevPosts]);
            }
          }
        } catch (error) {
          console.error('Error handling new post:', error);
        }
      } else if (eventType === 'UPDATE') {
        // Post updated
        setPosts((prevPosts: CommunityPost[]) => 
          prevPosts.map(post => 
            post.id === newRecord.id 
              ? { 
                  ...post, 
                  title: newRecord.title || post.title,
                  content: newRecord.content || post.content,
                  image_url: newRecord.image_url || post.image_url,
                  tags: newRecord.tags || post.tags,
                  likes: newRecord.likes_count || post.likes,
                  comments: newRecord.comments_count || post.comments,
                  updated_at: newRecord.updated_at || post.updated_at
                } 
              : post
          )
        );
      } else if (eventType === 'DELETE') {
        // Post deleted
        setPosts((prevPosts: CommunityPost[]) => 
          prevPosts.filter(post => post.id !== oldRecord.id)
        );
      }
    };

    // Subscribe to posts changes
    const subscription = subscribeToPosts(user.id, handlePostChange);
    setSubscriptionActive(true);

    // Cleanup on unmount
    return () => {
      unsubscribeFromPosts();
      setSubscriptionActive(false);
    };
  }, [user, setPosts, setSubscriptionActive]);

  // Initial load on mount
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      loadPosts(0, true);
    }
  }, [user, loadPosts]);

  // Reload on focus (if needed)
  useFocusEffect(
    useCallback(() => {
      if (user && hasLoadedRef.current) {
        // Only refresh if already loaded before
        loadPosts(0, true);
      }
    }, [user, loadPosts])
  );

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(0, true);
  }, [loadPosts]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !isSearching) {
      loadPosts(page + 1, false);
    }
  }, [loading, hasMore, page, isSearching, loadPosts]);

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!user || !searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    try {
      setSearching(true);
      const results = await semanticSearch(searchQuery, user.id);
      setSearchResults(results);
      setIsSearching(true);
    } catch (error) {
      console.error('Error searching posts:', error);
      setError('Failed to search posts. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [user, searchQuery, setError]);

  // Tag filter handler
  const handleTagFilter = useCallback(
    (tag: string) => {
      if (selectedTags.includes(tag)) {
        setSelectedTags(selectedTags.filter((t) => t !== tag));
      } else {
        setSelectedTags([...selectedTags, tag]);
      }
    },
    [selectedTags, setSelectedTags]
  );

  // Clear search handler
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
    setShowSearch(false);
    setSearchResults([]);
  }, [setSearchQuery]);

  // Handle post like
  const handleLikePost = useCallback(
    async (post: CommunityPost) => {
      if (!user) return;

      // Optimistic update
      const updatedPost = {
        liked_by_user: !post.liked_by_user,
        likes: post.liked_by_user ? post.likes - 1 : post.likes + 1,
      };
      
      updatePost(post.id, updatedPost);

      try {
        await togglePostLike(post.id, user.id);
      } catch (error) {
        console.error('Error liking post:', error);
        // Revert on error
        updatePost(post.id, {
          liked_by_user: post.liked_by_user,
          likes: post.likes,
        });
      }
    },
    [user, updatePost]
  );

  // Render post item
  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      />
    ),
    [handleLikePost, navigation]
  );

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loading || posts.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }, [loading, posts.length]);

  // Render list separator
  const renderSeparator = useCallback(() => {
    return <View style={styles.separator} />;
  }, []);

  // Get display posts
  const displayPosts = isSearching ? searchResults : posts;

  // Filter posts by tags
  const filteredPosts =
    selectedTags.length > 0
      ? displayPosts.filter((post) =>
          post.tags.some((tag) => selectedTags.includes(tag))
        )
      : displayPosts;

  // Show initial loading
  if (loading && posts.length === 0 && !hasLoadedRef.current) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.headerButton}
          >
            <Ionicons 
              name={showSearch ? "close" : "search"} 
              size={24} 
              color="#6B7280" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CreatePost')}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          onClear={clearSearch}
          loading={searching}
        />
      )}

      {/* Tag Filter */}
      <TagFilter selectedTags={selectedTags} onTagPress={handleTagFilter} />

      {/* Real-time indicator */}
      {subscriptionActive && (
        <View style={styles.realtimeIndicator}>
          <View style={styles.realtimeDot} />
          <Text style={styles.realtimeText}>Live updates</Text>
        </View>
      )}

      {/* Content */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              loadPosts(0, true);
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPosts.length === 0 && !loading ? (
        <EmptyState
          title={isSearching ? 'No Results Found' : 'No Posts Yet'}
          subtitle={
            isSearching
              ? 'Try adjusting your search or filters'
              : 'Be the first to share something with the community!'
          }
          icon={isSearching ? 'search' : 'chatbubble-ellipses'}
          actionLabel={isSearching ? 'Clear Search' : 'Create Post'}
          onAction={
            isSearching ? clearSearch : () => navigation.navigate('CreatePost')
          }
        />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={renderSeparator}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  realtimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 0,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});