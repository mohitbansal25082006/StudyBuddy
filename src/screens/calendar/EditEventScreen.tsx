// F:\StudyBuddy\src\screens\calendar\EditEventScreen.tsx
// ============================================
// EDIT EVENT SCREEN
// Edit an existing calendar event
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { getCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../../services/supabase';
import { CalendarEvent } from '../../types';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const EVENT_TYPES = [
  { value: 'study_session', label: 'Study Session' },
  { value: 'review', label: 'Review' },
  { value: 'exam', label: 'Exam' },
];

export const EditEventScreen = ({ route, navigation }: any) => {
  const { eventId } = route.params;
  const { user, profile } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [eventType, setEventType] = useState('study_session');
  const [dateValue, setDateValue] = useState(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [hasChanges, setHasChanges] = useState(false);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleGoBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        subscription.remove();
      };
    }, [hasChanges])
  );

  // Handle going back
  const handleGoBack = () => {
    // Check if form has unsaved changes
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Track changes
  useEffect(() => {
    if (event) {
      const originalTitle = event.title;
      const originalDescription = event.description || '';
      const originalSubject = event.subject;
      const originalEventType = event.event_type;
      
      const hasChanged = 
        title !== originalTitle ||
        description !== originalDescription ||
        subject !== originalSubject ||
        eventType !== originalEventType;
      
      setHasChanges(hasChanged);
    }
  }, [title, description, subject, eventType, event]);

  // Load event
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const eventData = await getCalendarEvent(eventId);
        setEvent(eventData);
        
        // Set form values
        setTitle(eventData.title);
        setDescription(eventData.description || '');
        setSubject(eventData.subject);
        setEventType(eventData.event_type);
        
        const startDate = new Date(eventData.start_time);
        const endDate = new Date(eventData.end_time);
        
        setDateValue(startDate);
        setStartTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
        setEndTime(`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
      } catch (error) {
        console.error('Error loading event:', error);
        Alert.alert('Error', 'Failed to load event');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId, navigation]);

  // Handle updating event
  const handleUpdateEvent = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSaving(true);
    try {
      // Parse start and end times
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startDateTime = new Date(dateValue);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(dateValue);
      endDateTime.setHours(endHour, endMinute, 0, 0);
      
      // Validate times
      if (endDateTime <= startDateTime) {
        Alert.alert('Error', 'End time must be after start time');
        setSaving(false);
        return;
      }
      
      // Update event
      await updateCalendarEvent(eventId, {
        title,
        description: description.trim() || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        subject,
        event_type: eventType,
      });
      
      // Show success message
      Alert.alert('Success', 'Event updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error updating event:', error);
      Alert.alert('Error', error.message || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting event
  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCalendarEvent(eventId);
              
              // Show success message
              Alert.alert('Success', 'Event deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', error.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate time options
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  // Get subjects from profile
  const getSubjects = () => {
    return profile?.subjects || [];
  };

  const timeOptions = generateTimeOptions();
  const subjects = getSubjects();

  if (loading) {
    return <LoadingSpinner message="Loading event..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Math Study Session"
        />
        
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
          numberOfLines={3}
        />
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{formatDate(dateValue)}</Text>
            </View>
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Event Type</Text>
            <View style={styles.optionsContainer}>
              {EVENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.option,
                    eventType === type.value && styles.selectedOption,
                  ]}
                  onPress={() => setEventType(type.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      eventType === type.value && styles.selectedOptionText,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Start Time</Text>
            <View style={styles.timeContainer}>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {timeOptions.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeOption,
                      startTime === time && styles.selectedTimeOption,
                    ]}
                    onPress={() => setStartTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        startTime === time && styles.selectedTimeOptionText,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <View style={styles.halfWidth}>
            <Text style={styles.label}>End Time</Text>
            <View style={styles.timeContainer}>
              <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
                {timeOptions.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeOption,
                      endTime === time && styles.selectedTimeOption,
                    ]}
                    onPress={() => setEndTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        endTime === time && styles.selectedTimeOptionText,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
        
        {subjects.length > 0 ? (
          <View style={styles.subjectContainer}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.optionsContainer}>
              {subjects.map(subj => (
                <TouchableOpacity
                  key={subj}
                  style={[
                    styles.option,
                    subject === subj && styles.selectedOption,
                  ]}
                  onPress={() => setSubject(subj)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      subject === subj && styles.selectedOptionText,
                    ]}
                  >
                    {subj}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g., Mathematics"
          />
        )}
        
        <Button
          title="Update Event"
          onPress={handleUpdateEvent}
          loading={saving}
          style={styles.updateButton}
        />
        
        <Button
          title="Delete Event"
          onPress={handleDeleteEvent}
          variant="outline"
          style={styles.deleteButton}
        />
      </ScrollView>
      
      {saving && <LoadingSpinner message="Updating event..." />}
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
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    margin: 4,
  },
  selectedOption: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  timeContainer: {
    height: 120,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  timeScroll: {
    flex: 1,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  selectedTimeOption: {
    backgroundColor: '#EEF2FF',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#111827',
  },
  selectedTimeOptionText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  subjectContainer: {
    marginBottom: 24,
  },
  updateButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
});