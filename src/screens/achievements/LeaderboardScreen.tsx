// F:\StudyBuddy\src\screens\achievements\LeaderboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getLeaderboard, getUserLeaderboardRank, getUserXP } from '../../services/supabase';
import { generateMotivationalMessage } from '../../services/communityAI';
import { LeaderboardEntry, UserXP } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const LeaderboardScreen: React.FC = () => {
  const { user } = useAuthStore();
  const {
    leaderboard,
    userRank,
    userXP,
    setLeaderboard,
    setUserRank,
    setUserXP,
    setLoadingLeaderboard,
    loadingLeaderboard,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load leaderboard data
  const loadLeaderboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingLeaderboard(true);
      setError(null);
      
      // Get leaderboard
      const leaderboardData = await getLeaderboard(50);
      setLeaderboard(leaderboardData);
      
      // Get user's rank
      let rankData = null;
      try {
        rankData = await getUserLeaderboardRank(user.id);
        setUserRank(rankData);
      } catch (rankError) {
        console.error('Error getting user rank:', rankError);
        // Set rank to 1 if user is the only one
        if (leaderboardData.length === 1 && leaderboardData[0].user_id === user.id) {
          setUserRank(1);
          rankData = 1;
        }
      }
      
      // Get user XP
      let xpData = null;
      try {
        xpData = await getUserXP(user.id);
        setUserXP(xpData);
      } catch (xpError) {
        console.error('Error getting user XP:', xpError);
        // Continue without XP
      }
      
      // Generate motivational message only if there are multiple users
      if (rankData && xpData && leaderboardData.length > 1) {
        try {
          const message = await generateMotivationalMessage(
            rankData,
            leaderboardData.length,
            xpData.xp_points
          );
          setMotivationalMessage(message);
        } catch (messageError) {
          console.error('Error generating message:', messageError);
          // Set default message
          setMotivationalMessage(getDefaultMotivationalMessage(rankData, leaderboardData.length));
        }
      } else if (leaderboardData.length === 1) {
        // Special message for single user
        setMotivationalMessage("You're pioneering the leaderboard! Keep learning and others will join soon.");
      } else if (leaderboardData.length === 0) {
        setMotivationalMessage("Start earning XP by asking questions and helping others!");
      }
    } catch (error: any) {
      console.error('Error loading leaderboard:', error);
      setError(error.message || 'Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
      setRefreshing(false);
    }
  }, [user, setLeaderboard, setUserRank, setUserXP, setLoadingLeaderboard]);

  // Get default motivational message
  const getDefaultMotivationalMessage = (rank: number, totalUsers: number): string => {
    if (rank === 1) {
      return `🏆 You're leading ${totalUsers} users! Keep up the great work!`;
    } else if (rank <= 3) {
      return `🥈 Great job! You're in the top 3 out of ${totalUsers} users!`;
    } else if (rank <= 10) {
      return `🌟 You're in the top 10! Keep pushing to reach the top!`;
    } else {
      const percentile = Math.round((rank / totalUsers) * 100);
      return `💪 You're in the top ${percentile}%! Keep learning to climb higher!`;
    }
  };

  // Initial load
  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Render leaderboard entry
  const renderLeaderboardEntry = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const isCurrentUser = item.user_id === user?.id;
      const rank = index + 1;
      
      // Determine medal color for top 3
      let medalColor = '#9CA3AF'; // Default gray
      let medalIcon = 'medal-outline';
      
      if (rank === 1) {
        medalColor = '#FFD700'; // Gold
        medalIcon = 'medal';
      } else if (rank === 2) {
        medalColor = '#C0C0C0'; // Silver
        medalIcon = 'medal';
      } else if (rank === 3) {
        medalColor = '#CD7F32'; // Bronze
        medalIcon = 'medal';
      }
      
      return (
        <View style={[
          styles.leaderboardEntry,
          isCurrentUser && styles.currentUserEntry
        ]}>
          <View style={styles.rankContainer}>
            <Text style={[
              styles.rankText,
              rank <= 3 && styles.topRankText
            ]}>
              {rank}
            </Text>
            {rank <= 3 && (
              <Ionicons 
                name={medalIcon as any} 
                size={20} 
                color={medalColor} 
              />
            )}
          </View>
          
          <Image
            source={{ 
              uri: item.avatar_url || `https://api.dicebear.com/7.x/initials/png?seed=${item.full_name}&backgroundColor=6366F1&textColor=ffffff` 
            }}
            style={styles.userAvatar}
          />
          
          <View style={styles.userInfo}>
            <Text style={[
              styles.userName,
              isCurrentUser && styles.currentUserName
            ]}>
              {item.full_name}
              {isCurrentUser && ' (You)'}
            </Text>
            <Text style={styles.userStats}>
              Level {item.level} • {item.answers_given} answers • {item.accepted_answers} accepted
            </Text>
          </View>
          
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>{item.xp_points}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>
      );
    },
    [user?.id]
  );

  // Render user rank card
  const renderUserRankCard = () => {
    // Don't show rank card if there's no leaderboard data
    if (leaderboard.length === 0) {
      return (
        <View style={styles.userRankCard}>
          <Text style={styles.userRankTitle}>Your Ranking</Text>
          
          <View style={styles.emptyRankContainer}>
            <Ionicons name="trophy-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyRankText}>
              Start earning XP to appear on the leaderboard!
            </Text>
            <Text style={styles.emptyRankSubtext}>
              Ask questions, provide answers, and help others to earn XP.
            </Text>
          </View>
        </View>
      );
    }
    
    if (!userRank || !userXP) return null;
    
    // Calculate total users on leaderboard
    const totalUsers = leaderboard.length;
    
    return (
      <View style={styles.userRankCard}>
        <Text style={styles.userRankTitle}>Your Ranking</Text>
        
        <View style={styles.userRankInfo}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{userRank}</Text>
          </View>
          
          <View style={styles.userXpInfo}>
            <Text style={styles.userXpText}>{userXP.xp_points} XP</Text>
            <Text style={styles.userLevelText}>Level {userXP.level}</Text>
            {totalUsers > 1 && (
              <Text style={styles.totalUsersText}>
                Out of {totalUsers} {totalUsers === 1 ? 'user' : 'users'}
              </Text>
            )}
          </View>
        </View>
        
        {motivationalMessage && (
          <View style={styles.motivationContainer}>
            <Ionicons name="bulb" size={16} color="#F59E0B" />
            <Text style={styles.motivationText}>{motivationalMessage}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render error state
  const renderError = () => {
    if (!error) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadLeaderboardData}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="trophy-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No Rankings Yet</Text>
      <Text style={styles.emptyStateText}>
        Be the first to earn XP and appear on the leaderboard!
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => {/* Navigate to Q&A or activity */}}
      >
        <Text style={styles.emptyStateButtonText}>Start Earning XP</Text>
      </TouchableOpacity>
    </View>
  );

  // Show initial loading
  if (loadingLeaderboard && leaderboard.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSubtitle}>
          {leaderboard.length} {leaderboard.length === 1 ? 'User' : 'Users'} Ranked
        </Text>
      </View>

      {/* User Rank Card */}
      {renderUserRankCard()}

      {/* Error or Leaderboard */}
      {error ? (
        renderError()
      ) : leaderboard.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardEntry}
          keyExtractor={(item) => item.user_id}
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
          ListFooterComponent={
            loadingLeaderboard ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="large" color="#6366F1" />
              </View>
            ) : null
          }
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  userRankCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userRankTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  userRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 16,
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userXpInfo: {
    flex: 1,
  },
  userXpText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  userLevelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalUsersText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyRankContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyRankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyRankSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  motivationText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentUserEntry: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  topRankText: {
    fontSize: 18,
    fontWeight: '700',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  currentUserName: {
    color: '#6366F1',
  },
  userStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  xpLabel: {
    fontSize: 12,
    color: '#6B7280',
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});