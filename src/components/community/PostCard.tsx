// F:\StudyBuddy\src\components\community\PostCard.tsx
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommunityPost } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../../types';
import { formatDistanceToNow } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');

interface PostCardProps {
  post: CommunityPost;
  onLike: () => void;
  onPress: () => void;
  onBookmark?: () => void;
  onReport?: () => void;
}

type PostCardNavigationProp = StackNavigationProp<AppStackParamList>;

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

const PostCardComponent: React.FC<PostCardProps> = ({ 
  post, 
  onLike, 
  onPress, 
  onBookmark,
  onReport 
}) => {
  const navigation = useNavigation<PostCardNavigationProp>();

  const handleProfilePress = () => {
    navigation.navigate('Profile', { userId: post.user_id });
  };

  const handleImagePress = (index: number = 0) => {
    if (post.images && post.images.length > 0) {
      const imageUrls = post.images.map(img => img.image_url);
      navigation.navigate('ImageViewer', { 
        images: imageUrls, 
        initialIndex: index 
      });
    } else if (post.image_url) {
      navigation.navigate('ImageViewer', { 
        images: [post.image_url], 
        initialIndex: 0 
      });
    }
  };

  const handleBookmarkPress = () => {
    if (onBookmark) {
      onBookmark();
    }
  };

  const handleLikePress = () => {
    onLike();
  };

  const renderImages = () => {
    // Handle multiple images from the new images array
    if (post.images && post.images.length > 0) {
      if (post.images.length === 1) {
        return (
          <TouchableOpacity onPress={() => handleImagePress(0)}>
            <Image source={{ uri: post.images[0].image_url }} style={styles.singleImage} />
          </TouchableOpacity>
        );
      } else if (post.images.length === 2) {
        return (
          <View style={styles.twoImagesContainer}>
            {post.images.map((image, index) => (
              <TouchableOpacity 
                key={image.id} 
                onPress={() => handleImagePress(index)}
                style={styles.halfImageContainer}
              >
                <Image source={{ uri: image.image_url }} style={styles.halfImage} />
              </TouchableOpacity>
            ))}
          </View>
        );
      } else if (post.images.length === 3) {
        return (
          <View style={styles.threeImagesContainer}>
            <TouchableOpacity 
              onPress={() => handleImagePress(0)}
              style={styles.mainImageContainer}
            >
              <Image source={{ uri: post.images[0].image_url }} style={styles.mainImage} />
            </TouchableOpacity>
            <View style={styles.sideImagesContainer}>
              {post.images.slice(1).map((image, index) => (
                <TouchableOpacity 
                  key={image.id} 
                  onPress={() => handleImagePress(index + 1)}
                  style={styles.sideImageContainer}
                >
                  <Image source={{ uri: image.image_url }} style={styles.sideImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      } else {
        // 4 or more images
        return (
          <View style={styles.multipleImagesContainer}>
            <TouchableOpacity 
              onPress={() => handleImagePress(0)}
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
                    onPress={() => handleImagePress(index + 1)}
                    style={styles.thumbnail}
                  >
                    <Image source={{ uri: image.image_url }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
                {post.images.length > 4 && (
                  <TouchableOpacity 
                    onPress={() => handleImagePress(4)}
                    style={styles.moreImagesThumbnail}
                  >
                    <Text style={styles.moreImagesText}>
                      +{post.images.length - 4}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      }
    }
    
    // Fallback to single image_url for backward compatibility
    if (post.image_url) {
      return (
        <TouchableOpacity onPress={() => handleImagePress(0)}>
          <Image source={{ uri: post.image_url }} style={styles.singleImage} />
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Post Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
          <Image
            source={{ uri: getAvatarUrl(post.user_avatar, post.user_name, post.user_id) }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{post.user_name}</Text>
            <Text style={styles.postDate}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.excerpt} numberOfLines={3}>
          {post.content}
        </Text>
        
        {/* Post Images */}
        {renderImages()}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 3).map((tag, index) => (
              <View key={`${post.id}-tag-${index}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {post.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{post.tags.length - 3} more</Text>
            )}
          </View>
        )}
      </View>

      {/* Post Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.action} 
          onPress={handleLikePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.liked_by_user ? "heart" : "heart-outline"}
            size={20}
            color={post.liked_by_user ? "#EF4444" : "#6B7280"}
          />
          <Text style={[
            styles.actionText,
            post.liked_by_user && styles.actionTextActive
          ]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </View>
        
        {onBookmark && (
          <TouchableOpacity 
            style={styles.action} 
            onPress={handleBookmarkPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={post.bookmarked_by_user ? "bookmark" : "bookmark-outline"}
              size={20}
              color={post.bookmarked_by_user ? "#6366F1" : "#6B7280"}
            />
            {post.bookmarked_by_user && (
              <Text style={[styles.actionText, styles.bookmarkActiveText]}>
                Saved
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {onReport && (
          <TouchableOpacity 
            style={styles.action} 
            onPress={onReport}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="flag-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when post data actually changes
export const PostCard = memo(PostCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.liked_by_user === nextProps.post.liked_by_user &&
    prevProps.post.bookmarked_by_user === nextProps.post.bookmarked_by_user &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.title === nextProps.post.title &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.updated_at === nextProps.post.updated_at
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    padding: 4,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  // Image styles
  imagesContainer: {
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    marginBottom: 12,
  },
  halfImageContainer: {
    width: '48%',
    height: '100%',
  },
  halfImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  threeImagesContainer: {
    flexDirection: 'row',
    height: 150,
    marginBottom: 12,
  },
  mainImageContainer: {
    width: '65%',
    height: '100%',
    marginRight: 8,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  sideImagesContainer: {
    width: '35%',
    height: '100%',
    justifyContent: 'space-between',
  },
  sideImageContainer: {
    height: '48%',
  },
  sideImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  multipleImagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
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
    marginLeft: 8,
    height: 150,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  thumbnail: {
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesThumbnail: {
    height: 48,
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
  // Tags styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  moreTagsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  // Actions styles
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  action: {
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
  actionTextActive: {
    color: '#EF4444',
  },
  bookmarkActiveText: {
    color: '#6366F1',
  },
});

export default PostCard;