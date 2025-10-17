// F:\StudyBuddy\src\components/CalendarEvent.tsx
// ============================================
// CALENDAR EVENT COMPONENT
// Beautiful display of calendar event with long press support
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '../types';

interface CalendarEventProps {
  event: CalendarEvent;
  onPress: () => void;
  onLongPress?: () => void;
}

export const CalendarEventComponent: React.FC<CalendarEventProps> = ({ 
  event, 
  onPress, 
  onLongPress 
}) => {
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
    <TouchableOpacity 
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.container} 
      activeOpacity={0.8}
    >
      <View style={[styles.leftBorder, { backgroundColor: getEventTypeColor(event.event_type) }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.timeContainer}>
            <Text style={styles.startTime}>{formatTime(event.start_time)}</Text>
            <Text style={styles.endTime}>{formatTime(event.end_time)}</Text>
          </View>
          <View style={[styles.eventTypeBadge, { backgroundColor: getEventTypeColor(event.event_type) }]}>
            <Text style={styles.eventTypeText}>
              {event.event_type.replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        
        <View style={styles.subjectRow}>
          <View style={styles.subjectIcon}>
            <Text style={styles.subjectIconText}>📚</Text>
          </View>
          <Text style={styles.eventSubject}>{event.subject}</Text>
        </View>
        
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
        
        {/* AI Reminder Indicator */}
        {event.ai_reminder && (
          <View style={styles.aiReminderContainer}>
            <View style={styles.aiReminderIcon}>
              <Text style={styles.aiReminderIconText}>🤖</Text>
            </View>
            <Text style={styles.aiReminderText} numberOfLines={1}>
              {event.ai_reminder}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  leftBorder: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  startTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  endTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  subjectIconText: {
    fontSize: 12,
  },
  eventSubject: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  aiReminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  aiReminderIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiReminderIconText: {
    fontSize: 10,
  },
  aiReminderText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    fontStyle: 'italic',
  },
});