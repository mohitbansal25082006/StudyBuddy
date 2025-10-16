// F:\StudyBuddy\src\screens\calendar\CalendarScreen.tsx
// ============================================
// CALENDAR SCREEN
// Google Calendar integration for study scheduling
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, RefreshControl } from 'react-native';
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

export const CalendarScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { calendarEvents, fetchCalendarEvents } = useStudyStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // For forcing re-renders
  
  // Refresh calendar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshCalendar = async () => {
        if (!user) return;
        
        try {
          // Get events for the current month
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
        // Get events for the current month
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
      {/* Header */}
      <View style={styles.header}>
        <Button
          title="<"
          onPress={goToPreviousMonth}
          variant="outline"
          style={styles.navButton}
        />
        <Text style={styles.monthTitle}>{formatMonth(currentMonth)}</Text>
        <Button
          title=">"
          onPress={goToNextMonth}
          variant="outline"
          style={styles.navButton}
        />
      </View>

      {/* Calendar */}
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
                <View style={styles.eventIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected Date Events */}
      <View style={styles.eventsContainer}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <Button
            title="Add Event"
            onPress={handleAddEvent}
            variant="outline"
            style={styles.addButton}
          />
        </View>
        
        <ScrollView 
          style={styles.eventsList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {eventsForSelectedDate.length > 0 ? (
            eventsForSelectedDate.map(event => (
              <CalendarEventComponent
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events scheduled</Text>
              <Button
                title="Add Event"
                onPress={handleAddEvent}
                variant="outline"
                style={styles.emptyButton}
              />
            </View>
          )}
        </ScrollView>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
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
    borderRadius: 8,
    marginVertical: 2,
  },
  dayOutsideMonth: {
    opacity: 0.3,
  },
  today: {
    backgroundColor: '#EEF2FF',
  },
  selectedDay: {
    backgroundColor: '#6366F1',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dayTextOutsideMonth: {
    color: '#9CA3AF',
  },
  todayText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 2,
  },
  eventsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 16,
  },
  eventsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
});