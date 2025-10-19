// F:\StudyBuddy\src\screens\profile\ProfileEditScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Image, 
  RefreshControl,
  StyleSheet,
  Animated,
  Dimensions 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { updateProfile, uploadAvatar } from '../../services/supabase';
import { getUserPosts, deletePost } from '../../services/communityService';
import { getUserBookmarks } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { CommunityPost, PostBookmark, PostImage } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LEARNING_STYLES = [
  { value: 'visual', label: '👁️ Visual' },
  { value: 'auditory', label: '👂 Auditory' },
  { value: 'reading', label: '📖 Reading' },
  { value: 'kinesthetic', label: '✋ Kinesthetic' },
];

const GRADE_LEVELS = ['High School', 'Undergraduate', 'Graduate', 'Professional', 'Self-Learning'];
const COMMON_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Geography', 'Economics', 'Psychology'];

// Define a type for the bookmark data with post information
interface BookmarkWithPost extends PostBookmark {
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
      created_at?: string;
    }>;
    post_likes?: any[];
  };
}

export const ProfileEditScreen = ({ navigation }: any) => {
  const { user, profile, setProfile, logout } = useAuthStore();
  const { 
    userXP, 
    userRank, 
    userAchievements,
    loadLeaderboardData,
    loadAchievementsData 
  } = useCommunityStore();
  const navigator = useNavigation<any>();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [learningStyle, setLearningStyle] = useState(profile?.learning_style || null);
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level || null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile?.subjects || []);
  const [studyGoals, setStudyGoals] = useState(profile?.study_goals || '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  
  // Posts management states
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Bookmarks states
  const [bookmarks, setBookmarks] = useState<CommunityPost[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Load user data on mount
  useEffect(() => {
    if (user) {
      loadAllData();
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [user]);

  // Load all user data
  const loadAllData = async () => {
    if (!user) return;
    
    try {
      // Load posts
      loadUserPosts();
      
      // Load bookmarks
      loadBookmarks();
      
      // Load XP and achievements
      await loadLeaderboardData(user.id);
      await loadAchievementsData(user.id);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Load user posts
  const loadUserPosts = async () => {
    if (!user) return;
    
    try {
      setLoadingPosts(true);
      const posts = await getUserPosts(user.id, 20, 0);
      setUserPosts(posts);
    } catch (error) {
      console.error('Error loading user posts:', error);
      Alert.alert('Error', 'Failed to load your posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load bookmarks
  const loadBookmarks = async () => {
    if (!user) return;
    
    try {
      setLoadingBookmarks(true);
      const userBookmarksRaw = await getUserBookmarks(user.id, 5, 0);
      
      const userBookmarks = userBookmarksRaw as unknown as BookmarkWithPost[];
      
      const bookmarkedPosts = userBookmarks.map((bookmark: BookmarkWithPost) => {
        if (!bookmark.community_posts) {
          console.warn('Bookmark without post data:', bookmark.id);
          return null;
        }
        
        const post = bookmark.community_posts;
        
        const images: PostImage[] = (post.post_images || []).map(img => ({
          id: img.id,
          post_id: post.id,
          image_url: img.image_url,
          image_order: img.image_order,
          created_at: img.created_at || new Date().toISOString(),
        }));
        
        return {
          id: post.id,
          user_id: post.user_id,
          user_name: post.profiles?.full_name || 'Unknown User',
          user_avatar: post.profiles?.avatar_url || null,
          title: post.title,
          content: post.content,
          image_url: post.image_url,
          images: images,
          tags: post.tags || [],
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          liked_by_user: !!post.post_likes?.length,
          bookmarked_by_user: true,
          created_at: post.created_at,
          updated_at: post.updated_at,
        };
      }).filter(Boolean) as CommunityPost[];
      
      setBookmarks(bookmarkedPosts);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setLoadingBookmarks(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      await loadAllData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Toggle subject
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarUri && avatarUri !== profile?.avatar_url) {
        avatarUrl = await uploadAvatar(user.id, avatarUri);
      }

      const updatedProfile = await updateProfile(user.id, {
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
        learning_style: learningStyle,
        grade_level: gradeLevel,
        subjects: selectedSubjects,
        study_goals: studyGoals,
      });

      setProfile(updatedProfile);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Auth', { screen: 'SignIn' });
          },
        },
      ]
    );
  };

  // Handle post deletion
  const handleDeletePost = (postId: string) => {
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
              setUserPosts(userPosts.filter(post => post.id !== postId));
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

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

  // Render stats card
  const renderStatsCard = () => {
    const levelProgress = calculateLevelProgress();
    const xpNeeded = getXPForNextLevel();

    return (
      <Animated.View 
        style={[
          styles.statsCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsGradient}
        >
          {/* Level & XP Section */}
          <View style={styles.levelSection}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Level {userXP?.level || 1}</Text>
            </View>
            <Text style={styles.xpText}>{userXP?.xp_points || 0} XP</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${levelProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{xpNeeded} XP to Level {(userXP?.level || 1) + 1}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={24} color="#FCD34D" />
              <Text style={styles.statValue}>{userRank || '-'}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="ribbon" size={24} color="#FCD34D" />
              <Text style={styles.statValue}>{userAchievements?.length || 0}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="document-text" size={24} color="#FCD34D" />
              <Text style={styles.statValue}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bookmark" size={24} color="#FCD34D" />
              <Text style={styles.statValue}>{bookmarks.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigator.navigate('LeaderboardScreen')}
            >
              <Ionicons name="podium" size={18} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigator.navigate('AchievementsScreen')}
            >
              <Ionicons name="medal" size={18} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Achievements</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Render a post item
  const renderPostItem = (item: CommunityPost) => (
    <View key={item.id} style={styles.postItem}>
      <View style={styles.postHeader}>
        <View style={styles.postTitleContainer}>
          <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.postDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.postActions}>
          <TouchableOpacity
            onPress={() => navigator.navigate('PostDetail', { postId: item.id })}
            style={styles.actionButton}
          >
            <Ionicons name="eye-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigator.navigate('EditPost', { postId: item.id })}
            style={styles.actionButton}
          >
            <Ionicons name="create-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePost(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.postExcerpt} numberOfLines={3}>{item.content}</Text>
      <View style={styles.postStatsContainer}>
        <View style={styles.postStat}>
          <Ionicons name="heart" size={14} color="#EF4444" />
          <Text style={styles.postStats}> {item.likes}</Text>
        </View>
        <View style={styles.postStat}>
          <Ionicons name="chatbubble" size={14} color="#6B7280" />
          <Text style={styles.postStats}> {item.comments}</Text>
        </View>
      </View>
      {item.tags.length > 0 && (
        <View style={styles.postTagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.postTag}>
              <Text style={styles.postTagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
    </View>
  );

  // Render a bookmarked post
  const renderBookmarkedPost = (item: CommunityPost) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.bookmarkedPostItem}
      onPress={() => navigator.navigate('PostDetail', { postId: item.id })}
    >
      <Text style={styles.bookmarkedPostTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.bookmarkedPostDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Stats Card */}
          {renderStatsCard()}

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                  />
                ) : (
                  <Text style={styles.avatarPlaceholder}>👤</Text>
                )}
              </View>
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Form */}
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            autoCapitalize="words"
          />

          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={3}
          />

          <Input
            label="Email"
            value={profile?.email || ''}
            onChangeText={() => {}}
            placeholder="Email"
            editable={false}
          />

          {/* Learning Style */}
          <View style={styles.optionSection}>
            <Text style={styles.optionLabel}>Learning Style</Text>
            <View style={styles.optionsContainer}>
              {LEARNING_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  onPress={() => setLearningStyle(style.value as any)}
                  style={[
                    styles.optionButton,
                    learningStyle === style.value && styles.optionButtonActive
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    learningStyle === style.value && styles.optionTextActive
                  ]}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grade Level */}
          <View style={styles.optionSection}>
            <Text style={styles.optionLabel}>Grade Level</Text>
            <View style={styles.optionsContainer}>
              {GRADE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setGradeLevel(level)}
                  style={[
                    styles.optionButton,
                    gradeLevel === level && styles.optionButtonActive
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    gradeLevel === level && styles.optionTextActive
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subjects */}
          <View style={styles.optionSection}>
            <Text style={styles.optionLabel}>Subjects</Text>
            <View style={styles.optionsContainer}>
              {COMMON_SUBJECTS.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  onPress={() => toggleSubject(subject)}
                  style={[
                    styles.optionButton,
                    selectedSubjects.includes(subject) && styles.optionButtonActive
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    selectedSubjects.includes(subject) && styles.optionTextActive
                  ]}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Study Goals */}
          <Input
            label="Study Goals"
            value={studyGoals}
            onChangeText={setStudyGoals}
            placeholder="What do you want to achieve?"
            multiline
            numberOfLines={3}
          />

          {/* Bookmarks Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bookmarked Posts</Text>
              <TouchableOpacity
                onPress={() => navigator.navigate('Bookmarks')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
            {loadingBookmarks ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading bookmarks...</Text>
              </View>
            ) : bookmarks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>You haven't bookmarked any posts yet.</Text>
              </View>
            ) : (
              <View style={styles.bookmarksContainer}>
                {bookmarks.map(renderBookmarkedPost)}
              </View>
            )}
          </View>

          {/* My Posts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Posts</Text>
              <TouchableOpacity
                onPress={() => navigator.navigate('CreatePost')}
                style={styles.createPostButton}
              >
                <Ionicons name="add-circle" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>
            {loadingPosts ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your posts...</Text>
              </View>
            ) : userPosts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>You haven't created any posts yet.</Text>
                <TouchableOpacity
                  onPress={() => navigator.navigate('CreatePost')}
                  style={styles.createButton}
                >
                  <Text style={styles.createButtonText}>Create Your First Post</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.postsContainer}>
                {userPosts.map(renderPostItem)}
              </View>
            )}
          </View>

          {/* Save Button */}
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            style={styles.saveButton}
          />

          {/* Sign Out Button */}
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Stats Card Styles
  statsCard: {
    marginBottom: 24,
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
  levelSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelBadgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  xpText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Avatar Styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    fontSize: 48,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Option Section Styles
  optionSection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    margin: 4,
  },
  optionButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  createPostButton: {
    padding: 4,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  viewAllButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  // Posts Styles
  postsContainer: {
    marginBottom: 8,
  },
  postItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  postActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  postExcerpt: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  postStatsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  postStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  postTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  postTag: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  postTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  // Bookmarks Styles
  bookmarksContainer: {
    marginBottom: 8,
  },
  bookmarkedPostItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookmarkedPostTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookmarkedPostDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Loading & Empty States
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Button Styles
  saveButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  signOutButton: {
    marginBottom: 16,
  },
});