// F:\StudyBuddy\src\screens\calendar\CalendarScreen.tsx
// ============================================
// CALENDAR SCREEN
// Enhanced with AI features
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, RefreshControl, Dimensions, Modal } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../../services/supabase';
import { generateReminderText, generateWeeklySummary } from '../../services/calendar/calendarAI';
import { CalendarEvent, AIWeeklySummary, AIWeeklySummaryRequest } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CalendarEventComponent } from '../../components/CalendarEvent';
import { AIScheduleGenerator } from '../../components/calendar/AIScheduleGenerator';
import { AIGoalConverter } from '../../components/calendar/AIGoalConverter';
import { AIWeeklySummary as AIWeeklySummaryComponent } from '../../components/calendar/AIWeeklySummary';
import { AIReminderGenerator } from '../../components/calendar/AIReminderGenerator';

const { width, height } = Dimensions.get('window');

// Valid event types based on database constraint
const VALID_EVENT_TYPES = ['study_session', 'review', 'exam'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

export const CalendarScreen = ({ navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { calendarEvents, fetchCalendarEvents, refreshCalendarEvents, setAIReminder } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // AI feature states
  const [showAISchedule, setShowAISchedule] = useState(false);
  const [showAIGoal, setShowAIGoal] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<AIWeeklySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showAIReminder, setShowAIReminder] = useState(false);
  const [selectedEventForReminder, setSelectedEventForReminder] = useState<CalendarEvent | null>(null);
  
  // Refresh calendar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshCalendar = async () => {
        if (!user) return;
        
        try {
          const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
          
          await fetchCalendarEvents(
            user.id,
            startOfMonth.toISOString(),
            endOfMonth.toISOString()
          );
        } catch (error) {
          console.error('Error refreshing calendar events:', error);
        }
      };
      
      refreshCalendar();
    }, [user, currentMonth, fetchCalendarEvents])
  );

  // Load calendar events
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;
      
      try {
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        await fetchCalendarEvents(
          user.id,
          startOfMonth.toISOString(),
          endOfMonth.toISOString()
        );
      } catch (error) {
        console.error('Error loading calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [user, currentMonth, fetchCalendarEvents, refreshKey]);

  // Update events for selected date
  useEffect(() => {
    if (!calendarEvents.length) return;
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const filtered = calendarEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= startOfDay && eventDate <= endOfDay;
    });
    
    setEventsForSelectedDate(filtered);
  }, [selectedDate, calendarEvents]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user) {
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        await fetchCalendarEvents(
          user.id,
          startOfMonth.toISOString(),
          endOfMonth.toISOString()
        );
      }
    } catch (error) {
      console.error('Error refreshing calendar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, currentMonth, fetchCalendarEvents]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const isSelected = 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      
      // Check if there are events on this day
      const hasEvents = calendarEvents.some(event => {
        const eventDate = new Date(event.start_time);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isSelected,
        hasEvents,
      });
    }
    
    return days;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle event press
  const handleEventPress = (event: CalendarEvent) => {
    navigation.navigate('EditEvent', { eventId: event.id });
  };

  // Handle adding event
  const handleAddEvent = () => {
    navigation.navigate('AddEvent', { date: selectedDate.toISOString() });
  };

  // Handle event long press for reminder options
  const handleEventLongPress = (event: CalendarEvent) => {
    setSelectedEventForReminder(event);
    setShowAIReminder(true);
  };

  // Handle AI reminder button press
  const handleAIReminderPress = () => {
    if (eventsForSelectedDate.length > 0) {
      // Use the first event for the selected date
      setSelectedEventForReminder(eventsForSelectedDate[0]);
      setShowAIReminder(true);
    } else {
      Alert.alert('No Events', 'Please select a date with events to generate a reminder');
    }
  };

  // Validate and fix event type
  const validateEventType = (eventType: string): ValidEventType => {
    if (VALID_EVENT_TYPES.includes(eventType as ValidEventType)) {
      return eventType as ValidEventType;
    }
    
    // Default to 'study_session' if invalid
    console.warn(`Invalid event type: ${eventType}, defaulting to 'study_session'`);
    return 'study_session';
  };

  // Handle AI schedule generation
  const handleScheduleGenerated = async (schedule: any) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      console.log('Generated schedule:', schedule);
      
      // Create events from the generated schedule
      const createdEvents = [];
      for (const event of schedule.events) {
        try {
          // Validate event data
          if (!event.title || !event.subject || !event.start_time || !event.end_time) {
            console.warn('Skipping invalid event:', event);
            continue;
          }

          // Validate and fix event type
          const validEventType = validateEventType(event.event_type || 'study_session');

          // Create the calendar event with proper error handling
          const eventData = {
            user_id: user.id,
            title: event.title,
            description: event.description || '',
            start_time: event.start_time,
            end_time: event.end_time,
            subject: event.subject,
            event_type: validEventType,
          };
          
          console.log('Creating event with data:', eventData);
          
          const createdEvent = await createCalendarEvent(eventData);
          
          createdEvents.push(createdEvent);
          console.log('Created event:', createdEvent);
        } catch (eventError: any) {
          console.error('Error creating individual event:', eventError);
          console.error('Event data that failed:', event);
          
          // Try to extract more error details
          if (eventError.message) {
            console.error('Error message:', eventError.message);
          }
          
          if (eventError.details) {
            console.error('Error details:', eventError.details);
          }
          
          // Continue with other events instead of failing completely
          continue;
        }
      }
      
      if (createdEvents.length > 0) {
        // Force a complete refresh by incrementing the refresh key
        setRefreshKey(prev => prev + 1);
        
        Alert.alert(
          'Success', 
          `Successfully added ${createdEvents.length} events to your calendar!`
        );
      } else {
        Alert.alert('Warning', 'No valid events were created from the schedule');
      }
    } catch (error: any) {
      console.error('Error adding generated schedule:', error);
      Alert.alert('Error', error.message || 'Failed to add schedule to calendar');
    }
  };

  // Handle AI goal conversion
  const handleGoalConverted = async (schedule: any) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      console.log('Converted goal schedule:', schedule);
      
      // Create events from the converted schedule
      const createdEvents = [];
      for (const event of schedule.events) {
        try {
          // Validate event data
          if (!event.title || !event.subject || !event.start_time || !event.end_time) {
            console.warn('Skipping invalid event:', event);
            continue;
          }

          // Validate and fix event type
          const validEventType = validateEventType(event.event_type || 'study_session');

          // Create the calendar event with proper error handling
          const eventData = {
            user_id: user.id,
            title: event.title,
            description: event.description || '',
            start_time: event.start_time,
            end_time: event.end_time,
            subject: event.subject,
            event_type: validEventType,
          };
          
          console.log('Creating goal event with data:', eventData);
          
          const createdEvent = await createCalendarEvent(eventData);
          
          createdEvents.push(createdEvent);
          console.log('Created event from goal:', createdEvent);
        } catch (eventError: any) {
          console.error('Error creating individual event from goal:', eventError);
          console.error('Event data that failed:', event);
          
          // Try to extract more error details
          if (eventError.message) {
            console.error('Error message:', eventError.message);
          }
          
          if (eventError.details) {
            console.error('Error details:', eventError.details);
          }
          
          // Continue with other events instead of failing completely
          continue;
        }
      }
      
      if (createdEvents.length > 0) {
        // Force a complete refresh by incrementing the refresh key
        setRefreshKey(prev => prev + 1);
        
        Alert.alert(
          'Success', 
          `Successfully added ${createdEvents.length} events to your calendar!`
        );
      } else {
        Alert.alert('Warning', 'No valid events were created from the goal');
      }
    } catch (error: any) {
      console.error('Error adding converted schedule:', error);
      Alert.alert('Error', error.message || 'Failed to add schedule to calendar');
    }
  };

  // Handle generating weekly summary
  const handleGenerateWeeklySummary = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoadingSummary(true);
    
    try {
      // Calculate week start and end
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Get study sessions for the week
      const studySessions = calendarEvents
        .filter(event => {
          const eventDate = new Date(event.start_time);
          return eventDate >= weekStart && eventDate <= weekEnd;
        })
        .map(event => {
          const startDate = new Date(event.start_time);
          const endDate = new Date(event.end_time);
          const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
          
          return {
            subject: event.subject,
            duration,
            date: startDate.toISOString().split('T')[0],
            completed: true, // Assuming all calendar events are completed
          };
        });
      
      // For flashcard reviews, we would need to fetch from the database
      // For now, we'll use empty data
      const flashcardReviews: any[] = [];
      
      // For goals, we would need to fetch from the database
      // For now, we'll use empty data
      const goals: any[] = [];
      
      const request: AIWeeklySummaryRequest = {
        userName: profile?.full_name || 'Student',
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        studySessions,
        flashcardReviews,
        goals,
      };
      
      const summary = await generateWeeklySummary(request);
      setWeeklySummary(summary);
      setShowWeeklySummary(true);
    } catch (error: any) {
      console.error('Error generating weekly summary:', error);
      Alert.alert('Error', error.message || 'Failed to generate weekly summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle AI reminder generation
  const handleReminderGenerated = (eventId: string, reminder: string) => {
    // Store the reminder in the store
    setAIReminder(eventId, reminder);
    
    // Update the event with the reminder
    // This would typically update the database, but for now we'll just store it in the state
    Alert.alert('Success', 'Reminder generated and saved!');
  };

  // Format month name
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format day name
  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (loading) {
    return <LoadingSpinner message="Loading calendar..." />;
  }

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const subjects = profile?.subjects || [];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Beautiful Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerBackground} />
          <View style={styles.headerContent}>
            <View style={styles.monthNavigation}>
              <TouchableOpacity 
                onPress={goToPreviousMonth} 
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              
              <View style={styles.monthTitleContainer}>
                <Text style={styles.monthTitle}>{formatMonth(currentMonth)}</Text>
                <Text style={styles.monthSubtitle}>Study Schedule</Text>
              </View>
              
              <TouchableOpacity 
                onPress={goToNextMonth} 
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* AI Features Bar */}
        <View style={styles.aiFeaturesContainer}>
          <TouchableOpacity
            style={styles.aiFeatureButton}
            onPress={() => setShowAISchedule(true)}
            activeOpacity={0.8}
          >
            <View style={styles.aiFeatureIcon}>
              <Text style={styles.aiFeatureIconText}>🤖</Text>
            </View>
            <Text style={styles.aiFeatureText}>AI Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.aiFeatureButton}
            onPress={() => setShowAIGoal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.aiFeatureIcon}>
              <Text style={styles.aiFeatureIconText}>🎯</Text>
            </View>
            <Text style={styles.aiFeatureText}>AI Goal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.aiFeatureButton}
            onPress={handleGenerateWeeklySummary}
            activeOpacity={0.8}
            disabled={loadingSummary}
          >
            <View style={styles.aiFeatureIcon}>
              <Text style={styles.aiFeatureIconText}>📊</Text>
            </View>
            <Text style={styles.aiFeatureText}>Weekly Summary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.aiFeatureButton}
            onPress={handleAIReminderPress}
            activeOpacity={0.8}
          >
            <View style={styles.aiFeatureIcon}>
              <Text style={styles.aiFeatureIconText}>💬</Text>
            </View>
            <Text style={styles.aiFeatureText}>AI Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* Beautiful Calendar */}
        <View style={styles.calendarWrapper}>
          <View style={styles.calendarContainer}>
            {/* Week days */}
            <View style={styles.weekDaysContainer}>
              {weekDays.map(day => (
                <View key={day} style={styles.weekDay}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar days */}
            <View style={styles.daysContainer}>
              {calendarDays.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.day,
                    !day.isCurrentMonth && styles.dayOutsideMonth,
                    day.isToday && styles.today,
                    day.isSelected && styles.selectedDay,
                  ]}
                  onPress={() => handleDateSelect(day.date)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.dayTextOutsideMonth,
                      day.isToday && styles.todayText,
                      day.isSelected && styles.selectedDayText,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                  {day.hasEvents && (
                    <View style={styles.eventIndicatorContainer}>
                      <View style={styles.eventIndicator} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Beautiful Events Section - Extended */}
        <View style={styles.eventsWrapper}>
          <View style={styles.eventsContainer}>
            <View style={styles.eventsHeader}>
              <View style={styles.dateInfo}>
                <Text style={styles.eventsDate}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <Text style={styles.eventsDayName}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long' 
                  })}
                </Text>
              </View>
              <View style={styles.eventActions}>
                <TouchableOpacity 
                  onPress={handleAddEvent}
                  style={styles.addButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleAIReminderPress}
                  style={styles.reminderButton}
                  activeOpacity={0.8}
                  disabled={eventsForSelectedDate.length === 0}
                >
                  <Text style={styles.reminderButtonText}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.eventsList}>
              {eventsForSelectedDate.length > 0 ? (
                eventsForSelectedDate.map((event, index) => (
                  <View key={event.id} style={styles.eventWrapper}>
                    <CalendarEventComponent
                      event={event}
                      onPress={() => handleEventPress(event)}
                      onLongPress={() => handleEventLongPress(event)}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyIconText}>📅</Text>
                  </View>
                  <Text style={styles.emptyTitle}>No Events</Text>
                  <Text style={styles.emptySubtitle}>Tap + to add your first event or use AI to generate a schedule</Text>
                  <View style={styles.emptyButtonsContainer}>
                    <TouchableOpacity 
                      onPress={handleAddEvent}
                      style={styles.emptyAddButton}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.emptyAddButtonText}>Add Event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setShowAISchedule(true)}
                      style={styles.emptyAIButton}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.emptyAIButtonText}>AI Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* AI Schedule Generator Modal */}
      <AIScheduleGenerator
        visible={showAISchedule}
        onClose={() => setShowAISchedule(false)}
        onScheduleGenerated={handleScheduleGenerated}
        subjects={subjects}
      />
      
      {/* AI Goal Converter Modal */}
      <AIGoalConverter
        visible={showAIGoal}
        onClose={() => setShowAIGoal(false)}
        onGoalConverted={handleGoalConverted}
        subjects={subjects}
      />
      
      {/* AI Weekly Summary Modal */}
      <AIWeeklySummaryComponent
        visible={showWeeklySummary}
        onClose={() => setShowWeeklySummary(false)}
        summary={weeklySummary}
      />
      
      {/* AI Reminder Generator Modal */}
      {selectedEventForReminder && (
        <AIReminderGenerator
          visible={showAIReminder}
          onClose={() => {
            setShowAIReminder(false);
            setSelectedEventForReminder(null);
          }}
          eventId={selectedEventForReminder.id}
          eventTitle={selectedEventForReminder.title}
          eventSubject={selectedEventForReminder.subject}
          onReminderGenerated={handleReminderGenerated}
        />
      )}
      
      {loadingSummary && <LoadingSpinner message="Generating weekly summary..." />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
  },
  // Beautiful Header
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  monthSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  // AI Features Bar
  aiFeaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  aiFeatureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    minWidth: width * 0.18,
  },
  aiFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiFeatureIconText: {
    fontSize: 16,
  },
  aiFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  // Beautiful Calendar - Compact
  calendarWrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 1,
    position: 'relative',
  },
  dayOutsideMonth: {
    opacity: 0.3,
  },
  today: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDay: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dayTextOutsideMonth: {
    color: '#CBD5E1',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedDayText: {
    color: '#6366F1',
    fontWeight: '700',
  },
  eventIndicatorContainer: {
    position: 'absolute',
    bottom: 3,
  },
  eventIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  // Beautiful Events Section - Extended Height
  eventsWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    minHeight: height * 0.45, // Takes at least 45% of screen height
  },
  eventsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    minHeight: height * 0.4, // Ensures minimum height
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dateInfo: {
    flex: 1,
  },
  eventsDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  eventsDayName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  reminderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  reminderButtonText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  eventsList: {
    minHeight: 200, // Minimum height for events list
  },
  eventWrapper: {
    marginBottom: 12,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 200,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  emptyAddButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 8,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyAIButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 8,
  },
  emptyAIButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});