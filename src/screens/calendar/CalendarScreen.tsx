// F:\StudyBuddy\src\screens\calendar\CalendarScreen.tsx
// ============================================
// CALENDAR SCREEN
// Beautiful Google Calendar integration for study scheduling
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useStudyStore } from '../../store/studyStore';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../../services/supabase';
import { CalendarEvent } from '../../types';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { CalendarEventComponent } from '../../components/CalendarEvent';

const { width, height } = Dimensions.get('window');

export const CalendarScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { calendarEvents, fetchCalendarEvents } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
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
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      await fetchCalendarEvents(
        user?.id || '',
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      );
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

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
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
              <TouchableOpacity 
                onPress={handleAddEvent}
                style={styles.addButton}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.eventsList}>
              {eventsForSelectedDate.length > 0 ? (
                eventsForSelectedDate.map((event, index) => (
                  <View key={event.id} style={styles.eventWrapper}>
                    <CalendarEventComponent
                      event={event}
                      onPress={() => handleEventPress(event)}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <Text style={styles.emptyIconText}>📅</Text>
                  </View>
                  <Text style={styles.emptyTitle}>No Events</Text>
                  <Text style={styles.emptySubtitle}>Tap + to add your first event</Text>
                  <TouchableOpacity 
                    onPress={handleAddEvent}
                    style={styles.emptyAddButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyAddButtonText}>Add Event</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
  // Beautiful Calendar - Compact
  calendarWrapper: {
    paddingHorizontal: 16,
    marginTop: -10,
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
    minHeight: height * 0.55, // Takes at least 55% of screen height
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
    minHeight: height * 0.5, // Ensures minimum height
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  eventsList: {
    minHeight: 300, // Minimum height for events list
  },
  eventWrapper: {
    marginBottom: 12,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 300,
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
  emptyAddButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});