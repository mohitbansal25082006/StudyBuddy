// F:\StudyBuddy\src\screens\achievements\AchievementsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { getUserAchievements, getUserXP, getXPTransactions } from '../../services/supabase';
import { recommendAchievements } from '../../services/communityAI';
import { UserAchievement, UserXP, XPTransaction } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const AchievementsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const {
    userAchievements,
    userXP,
    xpTransactions,
    setUserAchievements,
    setUserXP,
    setXPTransactions,
    setLoadingAchievements,
    loadingAchievements,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [recommendedAchievements, setRecommendedAchievements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load achievements data
  const loadAchievementsData = useCallback(async (isRefresh = false) => {
    if (!user) return;

    // Don't show loading spinner on refresh
    if (!isRefresh) {
      setLoadingAchievements(true);
    }

    try {
      setError(null);
      
      // Parallel data fetching for better performance
      const [achievementsData, xpData, transactionsData] = await Promise.allSettled([
        getUserAchievements(user.id),
        getUserXP(user.id),
        getXPTransactions(user.id, 10),
      ]);

      // Handle achievements
      if (achievementsData.status === 'fulfilled') {
        setUserAchievements(achievementsData.value);
      }
      
      // Handle XP
      let fetchedXP = null;
      if (xpData.status === 'fulfilled') {
        fetchedXP = xpData.value;
        setUserXP(fetchedXP);
      }
      
      // Handle transactions
      if (transactionsData.status === 'fulfilled') {
        setXPTransactions(transactionsData.value);
      }
      
      // Get recommended achievements only if we have XP data
      if (fetchedXP && !isRefresh) {
        try {
          const userProfile = {
            full_name: user.email?.split('@')[0] || 'User',
            learning_style: 'visual',
            subjects: [],
          };
          
          const recommendations = await recommendAchievements(userProfile, fetchedXP.xp_points);
          setRecommendedAchievements(recommendations);
        } catch (error) {
          // Silently fail on recommendations
        }
      }
      
      setIsInitialized(true);
    } catch (error: any) {
      setError(error.message || 'Failed to load achievements');
    } finally {
      setLoadingAchievements(false);
      setRefreshing(false);
    }
  }, [user, setUserAchievements, setUserXP, setXPTransactions, setLoadingAchievements]);

  // Initial load
  useEffect(() => {
    if (!isInitialized) {
      loadAchievementsData(false);
    }
  }, [isInitialized]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAchievementsData(true);
  }, [loadAchievementsData]);

  // Memoized achievement items
  const achievementItems = useMemo(() => {
    return userAchievements.map((item) => (
      <View key={item.id} style={styles.achievementItem}>
        <View style={styles.achievementIconContainer}>
          <Text style={styles.achievementIcon}>{item.achievement_icon}</Text>
        </View>
        
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementName}>{item.achievement_name}</Text>
          <Text style={styles.achievementDescription}>{item.achievement_description}</Text>
          <Text style={styles.achievementDate}>
            Unlocked {new Date(item.unlocked_at).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.achievementBadge}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      </View>
    ));
  }, [userAchievements]);

  // Memoized recommended achievements
  const recommendedItems = useMemo(() => {
    return recommendedAchievements.map((item, index) => (
      <View key={index} style={styles.recommendedAchievement}>
        <View style={styles.recommendedAchievementIconContainer}>
          <Text style={styles.recommendedAchievementIcon}>{item.icon}</Text>
        </View>
        
        <View style={styles.recommendedAchievementInfo}>
          <Text style={styles.recommendedAchievementName}>{item.name}</Text>
          <Text style={styles.recommendedAchievementDescription}>{item.description}</Text>
        </View>
        
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={16} color="#6B7280" />
        </View>
      </View>
    ));
  }, [recommendedAchievements]);

  // Memoized XP transactions
  const transactionItems = useMemo(() => {
    return xpTransactions.map((item) => (
      <View key={item.id} style={styles.xpTransaction}>
        <View style={styles.xpTransactionIcon}>
          <Ionicons 
            name={item.xp_amount > 0 ? "add-circle" : "remove-circle"} 
            size={20} 
            color={item.xp_amount > 0 ? "#10B981" : "#EF4444"} 
          />
        </View>
        
        <View style={styles.xpTransactionInfo}>
          <Text style={styles.xpTransactionSource}>
            {item.source.replace('_', ' ').charAt(0).toUpperCase() + item.source.replace('_', ' ').slice(1)}
          </Text>
          <Text style={styles.xpTransactionDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={[
          styles.xpTransactionAmount,
          item.xp_amount > 0 ? styles.xpGain : styles.xpLoss
        ]}>
          {item.xp_amount > 0 ? '+' : ''}{item.xp_amount} XP
        </Text>
      </View>
    ));
  }, [xpTransactions]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!userXP) return 0;
    return Math.min(100, (userXP.xp_points % 100));
  }, [userXP]);

  // Show initial loading only if not initialized and no data
  if (!isInitialized && loadingAchievements) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
      </View>

      {/* User XP Card */}
      {userXP && (
        <View style={styles.xpCard}>
          <View style={styles.xpCardHeader}>
            <Text style={styles.xpCardTitle}>Your Progress</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Level {userXP.level}</Text>
            </View>
          </View>
          
          <View style={styles.xpProgressContainer}>
            <Text style={styles.xpAmount}>{userXP.xp_points} XP</Text>
            <View style={styles.xpProgressBar}>
              <View 
                style={[styles.xpProgressFill, { width: `${progressPercentage}%` }]} 
              />
            </View>
            <Text style={styles.xpProgressText}>
              {userXP.xp_points % 100}/100 XP to next level
            </Text>
          </View>
        </View>
      )}

      {/* Error State */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadAchievementsData(false)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
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
          {/* Achievements Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Unlocked Achievements ({userAchievements.length})
            </Text>
            
            {userAchievements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="trophy-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Achievements Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Complete activities to unlock achievements!
                </Text>
              </View>
            ) : (
              <>
                {recommendedAchievements.length > 0 && (
                  <View style={styles.recommendedSection}>
                    <Text style={styles.sectionTitle}>Recommended Achievements</Text>
                    {recommendedItems}
                  </View>
                )}
                
                {achievementItems}
              </>
            )}
          </View>

          {/* XP Transactions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            
            {xpTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptySubtitle}>No recent activity</Text>
              </View>
            ) : (
              transactionItems
            )}
          </View>
        </ScrollView>
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
  xpCard: {
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
  xpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  xpCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  levelBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  xpProgressContainer: {
    alignItems: 'center',
  },
  xpAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  xpProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  xpProgressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  recommendedSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  achievementBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedAchievement: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    opacity: 0.7,
  },
  recommendedAchievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendedAchievementIcon: {
    fontSize: 24,
  },
  recommendedAchievementInfo: {
    flex: 1,
  },
  recommendedAchievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  recommendedAchievementDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  lockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpTransaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  xpTransactionIcon: {
    marginRight: 12,
  },
  xpTransactionInfo: {
    flex: 1,
  },
  xpTransactionSource: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  xpTransactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  xpTransactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  xpGain: {
    color: '#10B981',
  },
  xpLoss: {
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
});