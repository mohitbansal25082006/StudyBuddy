// F:\StudyBuddy\src\screens\community\ProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getProfile } from '../../services/supabase';
import { getPosts } from '../../services/communityService';
import { CommunityPost } from '../../types';
import { AppStackParamList } from '../../types';
import { PostCard } from '../../components/community/PostCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/community/EmptyState';

type ProfileScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Profile'>;
type ProfileScreenRouteProp = RouteProp<AppStackParamList, 'Profile'>;

// Helper function to generate avatar URL from user info
const getAvatarUrl = (avatarUrl?: string | null, fullName?: string | null, email?: string | null, userId?: string | null): string => {
  if (avatarUrl) {
    return avatarUrl;
  }
  
  // Use DiceBear Avatars API - free avatar generation service
  // Using 'initials' style as fallback
  const seed = fullName || email?.split('@')[0] || userId || 'default';
  return `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=6366F1&textColor=ffffff`;
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { userId } = route.params;
  const { user } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Load profile data
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const profileData = await getProfile(userId);
      setProfile(profileData);
      
      // Check if it's the user's own profile
      setIsOwnProfile(user?.id === userId);
      
      // Get user's posts
      const userPosts = await getPosts(userId, 20, 0);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, user]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  // Handle edit profile
  const handleEditProfile = useCallback(() => {
    navigation.navigate('ProfileEdit');
  }, [navigation]);

  // Handle message user
  const handleMessageUser = useCallback(() => {
    // This would navigate to a messaging screen
    Alert.alert('Message', 'Messaging feature coming soon!');
  }, []);

  // Load data on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Profile</Text>
        
        {isOwnProfile && (
          <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
            <Ionicons name="create" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {!isOwnProfile && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: getAvatarUrl(
                  profile.avatar_url, 
                  profile.full_name, 
                  profile.email, 
                  userId
                ) 
              }}
              style={styles.avatar}
            />
          </View>
          
          <Text style={styles.name}>{profile.full_name || 'Anonymous'}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {posts.reduce((sum, post) => sum + post.likes, 0)}
              </Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {posts.reduce((sum, post) => sum + post.comments, 0)}
              </Text>
              <Text style={styles.statLabel}>Comments</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleMessageUser}
                style={styles.messageButton}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Learning Info */}
        {(profile.learning_style || profile.grade_level || profile.subjects) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Learning Information</Text>
            
            {profile.learning_style && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Learning Style:</Text>
                <Text style={styles.infoValue}>
                  {profile.learning_style.charAt(0).toUpperCase() + profile.learning_style.slice(1)}
                </Text>
              </View>
            )}
            
            {profile.grade_level && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Grade Level:</Text>
                <Text style={styles.infoValue}>{profile.grade_level}</Text>
              </View>
            )}
            
            {profile.subjects && profile.subjects.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Subjects:</Text>
                <View style={styles.subjectsContainer}>
                  {profile.subjects.map((subject: string, index: number) => (
                    <View key={index} style={styles.subjectTag}>
                      <Text style={styles.subjectText}>{subject}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
          
          {posts.length === 0 ? (
            <EmptyState
              title="No Posts Yet"
              subtitle={isOwnProfile 
                ? "Share your first post with the community!" 
                : "This user hasn't posted anything yet."
              }
              icon="chatbubble-ellipses"
              actionLabel={isOwnProfile ? "Create Post" : undefined}
              onAction={isOwnProfile ? () => navigation.navigate('CreatePost') : undefined}
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => {
                  // Handle like post
                }}
                onPress={() => {
                  navigation.navigate('PostDetail', { postId: post.id });
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40, // For status bar
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButton: {
    padding: 4,
  },
  headerSpacer: {
    width: 32, // Same width as edit button to keep title centered
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
  },
  postsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 40,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});