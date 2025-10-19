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
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getProfile, getUserXP, getUserAchievements, getUserLeaderboardRank } from '../../services/supabase';
import { getUserPosts } from '../../services/communityService';
import { CommunityPost, UserXP, UserAchievement } from '../../types';
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
  
  // Gamification states
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Animation
  const [fadeAnim] = useState(new Animated.Value(0));

  // Calculate level progress
  const calculateLevelProgress = () => {
    if (!userXP) return 0;
    const currentLevelXP = (userXP.level - 1) * 100;
    const nextLevelXP = userXP.level * 100;
    const progress = ((userXP.xp_points - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Get XP needed for next level
  const getXPForNextLevel = () => {
    if (!userXP) return 0;
    const nextLevelXP = userXP.level * 100;
    return nextLevelXP - userXP.xp_points;
  };

  // Load gamification stats
  const loadGamificationStats = async (profileUserId: string) => {
    try {
      setLoadingStats(true);
      
      // Load user XP
      const xpData = await getUserXP(profileUserId);
      setUserXP(xpData);
      
      // Load user rank
      const rankData = await getUserLeaderboardRank(profileUserId);
      setUserRank(rankData);
      
      // Load achievements
      const achievementsData = await getUserAchievements(profileUserId);
      setAchievements(achievementsData || []);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

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
      const userPosts = await getUserPosts(userId, 20, 0);
      setPosts(userPosts);
      
      // Load gamification stats
      await loadGamificationStats(userId);
      
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
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

  const levelProgress = calculateLevelProgress();
  const xpNeeded = getXPForNextLevel();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
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
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
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
            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{userXP?.level || 1}</Text>
            </View>
          </View>
          
          <Text style={styles.name}>{profile.full_name || 'Anonymous'}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Gamification Stats Card */}
        <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            {/* XP Progress */}
            <View style={styles.xpSection}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpLabel}>Experience Points</Text>
                <Text style={styles.xpValue}>{userXP?.xp_points || 0} XP</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${levelProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {xpNeeded} XP to Level {(userXP?.level || 1) + 1}
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trophy" size={24} color="#FCD34D" />
                </View>
                <Text style={styles.statValue}>#{userRank || '-'}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="ribbon" size={24} color="#FCD34D" />
                </View>
                <Text style={styles.statValue}>{achievements.length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="document-text" size={24} color="#FCD34D" />
                </View>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Recent Achievements Preview */}
        {achievements.length > 0 && (
          <View style={styles.achievementsPreview}>
            <View style={styles.achievementsHeader}>
              <Text style={styles.sectionTitle}>Recent Badges</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsList}
            >
              {achievements.slice(0, 5).map((achievement) => (
                <View key={achievement.id} style={styles.achievementBadge}>
                  <Text style={styles.achievementIcon}>{achievement.achievement_icon}</Text>
                  <Text style={styles.achievementName} numberOfLines={1}>
                    {achievement.achievement_name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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

        {/* Learning Info */}
        {(profile.learning_style || profile.grade_level || profile.subjects) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Learning Information</Text>
            
            {profile.learning_style && (
              <View style={styles.infoItem}>
                <Ionicons name="bulb" size={20} color="#6366F1" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Learning Style</Text>
                  <Text style={styles.infoValue}>
                    {profile.learning_style.charAt(0).toUpperCase() + profile.learning_style.slice(1)}
                  </Text>
                </View>
              </View>
            )}
            
            {profile.grade_level && (
              <View style={styles.infoItem}>
                <Ionicons name="school" size={20} color="#6366F1" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Grade Level</Text>
                  <Text style={styles.infoValue}>{profile.grade_level}</Text>
                </View>
              </View>
            )}
            
            {profile.subjects && profile.subjects.length > 0 && (
              <View style={styles.infoItem}>
                <Ionicons name="book" size={20} color="#6366F1" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Subjects</Text>
                  <View style={styles.subjectsContainer}>
                    {profile.subjects.map((subject: string, index: number) => (
                      <View key={index} style={styles.subjectTag}>
                        <Text style={styles.subjectText}>{subject}</Text>
                      </View>
                    ))}
                  </View>
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
    paddingTop: 40,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    width: 32,
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
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    marginTop: 8,
  },
  // Stats Card Styles
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsGradient: {
    padding: 20,
  },
  xpSection: {
    marginBottom: 20,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  // Achievements Preview
  achievementsPreview: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsList: {
    paddingRight: 20,
  },
  achievementBadge: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  achievementIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  // Action Buttons
  actionButtons: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Info Section
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
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#1E40AF',
  },
  // Posts Section
  postsSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 40,
  },
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
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