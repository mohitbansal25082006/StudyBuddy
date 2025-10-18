// F:\StudyBuddy\src\screens\community\BookmarksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getUserBookmarks, togglePostBookmark } from '../../services/supabase';
import { PostCard } from '../../components/community/PostCard';
import { EmptyState } from '../../components/community/EmptyState';
import { AppStackParamList } from '../../types';

type BookmarksScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'Bookmarks'
>;

export const BookmarksScreen: React.FC = () => {
  const navigation = useNavigation<BookmarksScreenNavigationProp>();
  const { user } = useAuthStore();
  
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load bookmarks
  const loadBookmarks = useCallback(
    async (pageNum = 0, reset = false) => {
      if (!user) return;

      try {
        if (reset) {
          setLoading(true);
          setPage(0);
          setHasMore(true);
        }

        const userBookmarks = await getUserBookmarks(user.id, 20, pageNum * 20);

        if (reset) {
          setBookmarks(userBookmarks);
        } else {
          setBookmarks((prevBookmarks) => [...prevBookmarks, ...userBookmarks]);
        }

        setHasMore(userBookmarks.length === 20);
        setPage(pageNum);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  // Filter bookmarks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBookmarks(bookmarks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bookmarks.filter((bookmark) => {
        const post = bookmark.community_posts;
        if (!post) return false;
        
        return (
          post.title?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          post.tags?.some((tag: string) => tag.toLowerCase().includes(query)) ||
          post.profiles?.full_name?.toLowerCase().includes(query)
        );
      });
      setFilteredBookmarks(filtered);
    }
  }, [bookmarks, searchQuery]);

  // Initial load on mount
  useEffect(() => {
    loadBookmarks(0, true);
  }, [loadBookmarks]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadBookmarks(0, true);
    }, [loadBookmarks])
  );

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookmarks(0, true);
  }, [loadBookmarks]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadBookmarks(page + 1, false);
    }
  }, [loading, hasMore, page, loadBookmarks]);

  // Handle bookmark toggle
  const handleToggleBookmark = useCallback(
    async (postId: string) => {
      if (!user) return;

      try {
        await togglePostBookmark(postId, user.id);
        
        // Remove from bookmarks list
        setBookmarks((prevBookmarks) =>
          prevBookmarks.filter((bookmark) => 
            bookmark.community_posts?.id !== postId
          )
        );
      } catch (error) {
        console.error('Error toggling bookmark:', error);
      }
    },
    [user]
  );

  // Handle report
  const handleReport = useCallback((postId: string, authorId: string) => {
    navigation.navigate('ReportContent', { 
      contentType: 'post', 
      contentId: postId,
      contentAuthorId: authorId
    });
  }, [navigation]);

  // Handle search
  const handleSearch = useCallback(() => {
    // Search is already handled by the useEffect
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Navigate to Community tab
  const navigateToCommunity = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Community',
                },
              ],
            },
          },
        ],
      })
    );
  }, [navigation]);

  // Render bookmark item
  const renderBookmark = useCallback(
    ({ item }: { item: any }) => {
      // Extract post data from bookmark
      const post = item.community_posts;
      
      if (!post) return null;
      
      return (
        <PostCard
          post={{
            id: post.id,
            user_id: post.user_id,
            user_name: post.profiles?.full_name || 'Unknown User',
            user_avatar: post.profiles?.avatar_url || null,
            title: post.title,
            content: post.content,
            image_url: post.image_url,
            images: post.post_images || [],
            tags: post.tags || [],
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            liked_by_user: !!post.post_likes?.length,
            bookmarked_by_user: true,
            created_at: post.created_at,
            updated_at: post.updated_at,
          }}
          onLike={() => {}} // We don't need to handle likes here
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          onBookmark={() => handleToggleBookmark(post.id)}
          onReport={() => handleReport(post.id, post.user_id)}
        />
      );
    },
    [navigation, handleToggleBookmark, handleReport]
  );

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loading || filteredBookmarks.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }, [loading, filteredBookmarks.length]);

  // Show initial loading
  if (loading && bookmarks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your bookmarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          style={styles.searchButton}
        >
          <Ionicons 
            name={showSearch ? "close" : "search"} 
            size={24} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {filteredBookmarks.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No Results Found" : "No Bookmarked Posts"}
          subtitle={
            searchQuery 
              ? "Try adjusting your search terms" 
              : "Posts you bookmark will appear here for easy access."
          }
          icon={searchQuery ? "search" : "bookmark"}
          actionLabel={searchQuery ? "Clear Search" : "Explore Community"}
          onAction={() => searchQuery ? clearSearch() : navigateToCommunity()}
        />
      ) : (
        <FlatList
          data={filteredBookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366F1']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});