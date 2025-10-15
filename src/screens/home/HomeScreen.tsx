// F:\StudyBuddy\src\screens\home\HomeScreen.tsx
// ============================================
// HOME SCREEN
// Main dashboard with today's schedule
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { getCalendarEvents, getStudySessions, getFlashcardsForReview } from '../../services/supabase';
import { CalendarEvent, StudySession, Flashcard } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Button } from '../../components/Button';
import { CalendarEventComponent } from '../../components/CalendarEvent';

export const HomeScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { studySessions, calendarEvents, addStudySession } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [dueFlashcards, setDueFlashcards] = useState<Flashcard[]>([]);
  const [todayStudyTime, setTodayStudyTime] = useState(0);

  // Load data
  const loadData = async () => {
    if (!user) return;
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      // Get today's calendar events
      const events = await getCalendarEvents(user.id, startOfDay, endOfDay);
      setTodayEvents(events);
      
      // Get recent study sessions (last 5)
      const sessions = await getStudySessions(user.id, 5);
      setRecentSessions(sessions);
      
      // Get flashcards due for review
      const flashcards = await getFlashcardsForReview(user.id);
      setDueFlashcards(flashcards);
      
      // Calculate today's study time
      const todaySessions = sessions.filter(session => {
        const sessionDate = new Date(session.completed_at);
        return sessionDate.toDateString() === today.toDateString();
      });
      
      const totalMinutes = todaySessions.reduce((total, session) => total + session.duration_minutes, 0);
      setTodayStudyTime(totalMinutes);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}, {profile?.full_name || 'Student'}!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </View>

      {/* Today's Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatStudyTime(todayStudyTime)}</Text>
          <Text style={styles.statLabel}>Today's Study Time</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dueFlashcards.length}</Text>
          <Text style={styles.statLabel}>Cards to Review</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayEvents.length}</Text>
          <Text style={styles.statLabel}>Today's Events</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <Button
            title="Start Study Session"
            onPress={() => navigation.navigate('Subjects')}
            style={styles.actionButton}
          />
          <Button
            title="Review Flashcards"
            onPress={() => navigation.navigate('Flashcards')}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </View>

      {/* Today's Schedule */}
      <View style={styles.scheduleContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todayEvents.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {todayEvents.length > 0 ? (
          todayEvents.map(event => (
            <CalendarEventComponent
              key={event.id}
              event={event}
              onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled for today</Text>
            <Button
              title="Add Event"
              onPress={() => navigation.navigate('AddEvent')}
              variant="outline"
              style={styles.emptyButton}
            />
          </View>
        )}
      </View>

      {/* Recent Study Sessions */}
      <View style={styles.sessionsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Study Sessions</Text>
          {recentSessions.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {recentSessions.length > 0 ? (
          recentSessions.map(session => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionSubject}>{session.subject}</Text>
                <Text style={styles.sessionDuration}>{formatStudyTime(session.duration_minutes)}</Text>
              </View>
              <Text style={styles.sessionType}>
                {session.session_type.replace('_', ' ')}
              </Text>
              <Text style={styles.sessionDate}>
                {new Date(session.completed_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No study sessions yet</Text>
            <Button
              title="Start Studying"
              onPress={() => navigation.navigate('Subjects')}
              variant="outline"
              style={styles.emptyButton}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  scheduleContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  sessionsContainer: {
    marginBottom: 24,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  sessionType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});