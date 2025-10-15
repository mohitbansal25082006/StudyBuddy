// F:\StudyBuddy\src\components/CalendarEvent.tsx
// ============================================
// CALENDAR EVENT COMPONENT
// Displays a calendar event
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '../types';

interface CalendarEventProps {
  event: CalendarEvent;
  onPress: () => void;
}

export const CalendarEventComponent: React.FC<CalendarEventProps> = ({ event, onPress }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'study_session':
        return '#6366F1'; // Indigo
      case 'review':
        return '#10B981'; // Green
      case 'exam':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.timeContainer}>
        <Text style={styles.startTime}>{formatTime(event.start_time)}</Text>
        <Text style={styles.endTime}>{formatTime(event.end_time)}</Text>
      </View>
      
      <View style={styles.eventContainer}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <View style={[styles.eventTypeBadge, { backgroundColor: getEventTypeColor(event.event_type) }]}>
            <Text style={styles.eventTypeText}>
              {event.event_type.replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.eventSubject}>{event.subject}</Text>
        
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  timeContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    marginRight: 12,
  },
  startTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  endTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  eventContainer: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  eventSubject: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});