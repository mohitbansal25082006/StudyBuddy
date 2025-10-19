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
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getPosts, semanticSearch, togglePostLike, subscribeToPosts, unsubscribeFromPosts } from '../../services/communityService';
import { getUserBookmarks, togglePostBookmark } from '../../services/supabase';
import { CommunityPost, AppStackParamList } from '../../types';
import { PostCard } from '../../components/community/PostCard';
import { SearchBar } from '../../components/community/SearchBar';
import { TagFilter } from '../../components/community/TagFilter';
import { EmptyState } from '../../components/community/EmptyState';
import { LoadingSpinner } from '../../components/LoadingSpinner';

// Define navigation prop type using the existing AppStackParamList
type CommunityScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Community'>;

// Define type for bookmark data from Supabase
interface BookmarkData {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
  community_posts?: {
    id: string;
    user_id: string;
    title: string;
    content: string;
    image_url: string | null;
    tags: string[];
    likes_count: number;
    comments_count: number;
    created_at: string;
    updated_at: string;
    profiles?: {
      full_name: string;
      avatar_url: string | null;
    };
    post_images?: Array<{
      id: string;
      image_url: string;
      image_order: number;
      created_at: string;
    }>;
    post_likes?: any[];
    post_bookmarks?: any[];
  };
}

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
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<CommunityPost[]>([]);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  
  // Use ref to track if initial load is done
  const hasLoadedRef = useRef(false);
  const bookmarksLoadedRef = useRef(false);

  // Convert bookmark data to CommunityPost format
  const convertBookmarkToPost = useCallback((bookmark: BookmarkData): CommunityPost | null => {
    if (!bookmark.community_posts) return null;
    
    const post = bookmark.community_posts;
    
    return {
      id: post.id,
      user_id: post.user_id,
      user_name: post.profiles?.full_name || 'Unknown User',
      user_avatar: post.profiles?.avatar_url || null,
      title: post.title,
      content: post.content,
      image_url: post.image_url,
      images: post.post_images?.map(img => ({
        id: img.id,
        post_id: post.id,
        image_url: img.image_url,
        image_order: img.image_order,
        created_at: img.created_at,
      })) || [],
      tags: post.tags || [],
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      liked_by_user: !!post.post_likes?.length,
      bookmarked_by_user: true,
      created_at: post.created_at,
      updated_at: post.updated_at,
    };
  }, []);

  // Load bookmarks function - updates the bookmarked post IDs set
  const loadBookmarks = useCallback(async () => {
    if (!user) return;
    
    try {
      const userBookmarks = await getUserBookmarks(user.id);
      // Safely cast to unknown first, then to BookmarkData[]
      const bookmarks = userBookmarks as unknown as BookmarkData[];
      
      // Validate and convert bookmarks
      const convertedPosts = bookmarks
        .map(convertBookmarkToPost)
        .filter((post): post is CommunityPost => post !== null);
      
      setBookmarkedPosts(convertedPosts);
      
      // Update bookmarked post IDs set
      const bookmarkedIds = new Set(convertedPosts.map(post => post.id));
      setBookmarkedPostIds(bookmarkedIds);
      
      bookmarksLoadedRef.current = true;
      
      return bookmarkedIds;
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      setError('Failed to load bookmarks. Please try again.');
      return new Set<string>();
    }
  }, [user, convertBookmarkToPost, setError]);

  // Apply bookmark status to posts
  const applyBookmarkStatus = useCallback((postsToUpdate: CommunityPost[], bookmarkIds: Set<string>): CommunityPost[] => {
    return postsToUpdate.map(post => ({
      ...post,
      bookmarked_by_user: bookmarkIds.has(post.id)
    }));
  }, []);

  // Load posts function - applies bookmark status after loading
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

        // Apply bookmark status to new posts
        const postsWithBookmarkStatus = applyBookmarkStatus(newPosts, bookmarkedPostIds);

        if (reset) {
          setPosts(postsWithBookmarkStatus);
        } else {
          // Use functional update to append to existing posts
          setPosts((prevPosts: CommunityPost[]) => [...prevPosts, ...postsWithBookmarkStatus]);
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
    [user, setPosts, setLoading, setError, bookmarkedPostIds, applyBookmarkStatus]
  );

  // Toggle between posts and bookmarks view
  const toggleBookmarksView = useCallback(() => {
    setShowBookmarks(!showBookmarks);
    if (!showBookmarks) {
      loadBookmarks();
    }
  }, [showBookmarks, loadBookmarks]);

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
              // Apply bookmark status
              const postWithBookmarkStatus = applyBookmarkStatus([fullPosts[0]], bookmarkedPostIds)[0];
              
              setPosts((prevPosts: CommunityPost[]) => [postWithBookmarkStatus, ...prevPosts]);
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
                  updated_at: newRecord.updated_at || post.updated_at,
                  bookmarked_by_user: bookmarkedPostIds.has(post.id)
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
  }, [user, setPosts, setSubscriptionActive, bookmarkedPostIds, applyBookmarkStatus, posts]);

  // Initial load on mount - load bookmarks first, then posts
  useEffect(() => {
    const initializeData = async () => {
      if (user && !hasLoadedRef.current) {
        // Load bookmarks first to get the bookmark IDs
        const bookmarkIds = await loadBookmarks();
        
        // Then load posts with bookmark status
        if (bookmarkIds) {
          // Wait a bit for state to update
          setTimeout(() => {
            loadPosts(0, true);
          }, 100);
        } else {
          // Load posts anyway even if bookmarks failed
          loadPosts(0, true);
        }
      }
    };
    
    initializeData();
  }, [user, loadBookmarks, loadPosts]);

  // Update posts with bookmark status whenever bookmarkedPostIds changes
  useEffect(() => {
    if (bookmarksLoadedRef.current && posts.length > 0) {
      setPosts((prevPosts) => applyBookmarkStatus(prevPosts, bookmarkedPostIds));
    }
  }, [bookmarkedPostIds, applyBookmarkStatus, setPosts]);

  // Reload on focus (if needed)
  useFocusEffect(
    useCallback(() => {
      if (user && hasLoadedRef.current) {
        // Refresh bookmarks first
        const refreshData = async () => {
          await loadBookmarks();
          // Small delay to ensure bookmark state is updated before refreshing posts
          setTimeout(() => {
            loadPosts(0, true);
          }, 100);
        };
        refreshData();
      }
    }, [user, loadBookmarks, loadPosts])
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (showBookmarks) {
      await loadBookmarks();
      setRefreshing(false);
    } else {
      // Load bookmarks first, then posts
      await loadBookmarks();
      setTimeout(() => {
        loadPosts(0, true);
      }, 100);
    }
  }, [loadPosts, loadBookmarks, showBookmarks]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && !isSearching && !showBookmarks) {
      loadPosts(page + 1, false);
    }
  }, [loading, hasMore, page, isSearching, loadPosts, showBookmarks]);

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!user || !searchQuery.trim()) {
      setIsSearching(false);
      return;
    }

    try {
      setSearching(true);
      const results = await semanticSearch(searchQuery, user.id);
      
      // Apply bookmark status to search results
      const resultsWithBookmarkStatus = applyBookmarkStatus(results, bookmarkedPostIds);
      
      setSearchResults(resultsWithBookmarkStatus);
      setIsSearching(true);
    } catch (error) {
      console.error('Error searching posts:', error);
      setError('Failed to search posts. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [user, searchQuery, setError, bookmarkedPostIds, applyBookmarkStatus]);

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

  // Handle bookmark toggle
  const handleToggleBookmark = useCallback(
    async (post: CommunityPost) => {
      if (!user) return;

      try {
        const isBookmarked = await togglePostBookmark(post.id, user.id);
        
        // Update bookmarked post IDs set immediately
        setBookmarkedPostIds(prev => {
          const newSet = new Set(prev);
          if (isBookmarked) {
            newSet.add(post.id);
          } else {
            newSet.delete(post.id);
          }
          return newSet;
        });
        
        // Update the specific post in all relevant states
        const updatePostBookmarkStatus = (posts: CommunityPost[]) => 
          posts.map(p => p.id === post.id ? { ...p, bookmarked_by_user: isBookmarked } : p);
        
        // Update in main posts
        setPosts(updatePostBookmarkStatus);
        
        // Update in search results if searching
        if (isSearching) {
          setSearchResults(updatePostBookmarkStatus);
        }
        
        // If we're showing bookmarks, refresh the bookmarks list
        if (showBookmarks) {
          loadBookmarks();
        }
      } catch (error) {
        console.error('Error toggling bookmark:', error);
        Alert.alert('Error', 'Failed to bookmark post. Please try again.');
      }
    },
    [user, setPosts, showBookmarks, loadBookmarks, isSearching, setSearchResults]
  );

  // Handle report
  const handleReport = useCallback((postId: string, authorId: string) => {
    navigation.navigate('ReportContent', { 
      contentType: 'post', 
      contentId: postId,
      contentAuthorId: authorId
    });
  }, [navigation]);

  // Navigate to bookmarks screen
  const navigateToBookmarks = useCallback(() => {
    navigation.navigate('Bookmarks');
  }, [navigation]);

  // Render post item - single render function for all cases
  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard
        post={item}
        onLike={() => handleLikePost(item)}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        onBookmark={() => handleToggleBookmark(item)}
        onReport={() => handleReport(item.id, item.user_id)}
      />
    ),
    [handleLikePost, navigation, handleToggleBookmark, handleReport]
  );

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loading || (showBookmarks ? bookmarkedPosts.length : posts.length) === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }, [loading, posts.length, bookmarkedPosts.length, showBookmarks]);

  // Render list separator
  const renderSeparator = useCallback(() => {
    return <View style={styles.separator} />;
  }, []);

  // Get display data - now always returns CommunityPost[]
  const displayData: CommunityPost[] = showBookmarks 
    ? bookmarkedPosts
    : (isSearching ? searchResults : posts);

  // Filter by tags (only for posts, not bookmarks)
  const filteredData = showBookmarks
    ? displayData
    : (selectedTags.length > 0
        ? displayData.filter((post: CommunityPost) =>
            post.tags.some((tag) => selectedTags.includes(tag))
          )
        : displayData);

  // Show initial loading
  if (loading && posts.length === 0 && !hasLoadedRef.current) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {showBookmarks ? 'Bookmarks' : 'Community'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleBookmarksView}
            style={[
              styles.headerButton,
              showBookmarks && styles.activeHeaderButton
            ]}
          >
            <Ionicons 
              name={showBookmarks ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={showBookmarks ? "#6366F1" : "#6B7280"} 
            />
          </TouchableOpacity>

          {!showBookmarks && (
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
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('CreatePost')}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={24} color="#6366F1" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CommunityGuidelines')}
            style={styles.headerButton}
          >
            <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar - only show when not in bookmarks view */}
      {showSearch && !showBookmarks && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          onClear={clearSearch}
          loading={searching}
        />
      )}

      {/* Tag Filter - only show when not in bookmarks view */}
      {!showBookmarks && (
        <TagFilter selectedTags={selectedTags} onTagPress={handleTagFilter} />
      )}

      {/* Real-time indicator - only show when not in bookmarks view */}
      {!showBookmarks && subscriptionActive && (
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
              if (showBookmarks) {
                loadBookmarks();
              } else {
                loadPosts(0, true);
              }
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredData.length === 0 && !loading ? (
        <EmptyState
          title={
            showBookmarks 
              ? 'No Bookmarked Posts' 
              : (isSearching ? 'No Results Found' : 'No Posts Yet')
          }
          subtitle={
            showBookmarks
              ? 'Posts you bookmark will appear here for easy access.'
              : (isSearching
                ? 'Try adjusting your search or filters'
                : 'Be the first to share something with the community!')
          }
          icon={showBookmarks ? 'bookmark' : (isSearching ? 'search' : 'chatbubble-ellipses')}
          actionLabel={
            showBookmarks 
              ? 'Explore Community' 
              : (isSearching ? 'Clear Search' : 'Create Post')
          }
          onAction={
            showBookmarks 
              ? toggleBookmarksView
              : (isSearching ? clearSearch : () => navigation.navigate('CreatePost'))
          }
        />
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderPost}
          keyExtractor={(item, index) => item.id || `post-${index}`}
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
          extraData={bookmarkedPostIds}
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
  activeHeaderButton: {
    backgroundColor: '#EBF5FF',
    borderRadius: 16,
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