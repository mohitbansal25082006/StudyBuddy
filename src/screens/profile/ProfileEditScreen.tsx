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
  StyleSheet 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { updateProfile, uploadAvatar } from '../../services/supabase';
import { getUserPosts, deletePost } from '../../services/communityService';
import { useAuthStore } from '../../store/authStore';
import { CommunityPost } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const LEARNING_STYLES = [
  { value: 'visual', label: '👁️ Visual' },
  { value: 'auditory', label: '👂 Auditory' },
  { value: 'reading', label: '📖 Reading' },
  { value: 'kinesthetic', label: '✋ Kinesthetic' },
];

const GRADE_LEVELS = ['High School', 'Undergraduate', 'Graduate', 'Professional', 'Self-Learning'];
const COMMON_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'History', 'Geography', 'Economics', 'Psychology'];

export const ProfileEditScreen = ({ navigation }: any) => {
  const { user, profile, setProfile, logout } = useAuthStore();
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

  // Load user posts
  useEffect(() => {
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

    loadUserPosts();
  }, [user]);

  // Refresh all data
  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      const posts = await getUserPosts(user.id, 20, 0);
      setUserPosts(posts);
    } catch (error) {
      console.error('Error refreshing posts:', error);
      Alert.alert('Error', 'Failed to refresh posts');
    } finally {
      setRefreshing(false);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture');
      return;
    }

    // Launch image picker
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

      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile?.avatar_url) {
        avatarUrl = await uploadAvatar(user.id, avatarUri);
      }

      // Update profile
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366F1']}
          />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 60 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24, color: '#6366F1' }}>←</Text>
            </TouchableOpacity>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#111827',
            }}>
              Edit Profile
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={{
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
              }}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text style={{ fontSize: 48 }}>👤</Text>
                )}
              </View>
              <View style={{
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
              }}>
                <Text style={{ fontSize: 18 }}>📷</Text>
              </View>
            </TouchableOpacity>
            <Text style={{
              marginTop: 12,
              fontSize: 14,
              color: '#6B7280',
            }}>
              Tap to change photo
            </Text>
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
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Learning Style
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {LEARNING_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.value}
                  onPress={() => setLearningStyle(style.value as any)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: learningStyle === style.value ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: learningStyle === style.value ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: learningStyle === style.value ? '#FFFFFF' : '#6B7280',
                  }}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Grade Level */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Grade Level
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {GRADE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setGradeLevel(level)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: gradeLevel === level ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: gradeLevel === level ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: gradeLevel === level ? '#FFFFFF' : '#6B7280',
                  }}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subjects */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Subjects
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {COMMON_SUBJECTS.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  onPress={() => toggleSubject(subject)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: selectedSubjects.includes(subject) ? '#6366F1' : '#F9FAFB',
                    borderWidth: 2,
                    borderColor: selectedSubjects.includes(subject) ? '#6366F1' : '#E5E7EB',
                    borderRadius: 24,
                    margin: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selectedSubjects.includes(subject) ? '#FFFFFF' : '#6B7280',
                  }}>
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
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          {/* Sign Out Button */}
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
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
});