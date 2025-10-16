// F:\StudyBuddy\src\screens\calendar\AddEventScreen.tsx
// ============================================
// ADD EVENT SCREEN
// Add a new calendar event
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { createCalendarEvent } from '../../services/supabase';
import { CalendarEvent } from '../../types';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const EVENT_TYPES = [
  { value: 'study_session', label: 'Study Session' },
  { value: 'review', label: 'Review' },
  { value: 'exam', label: 'Exam' },
];

export const AddEventScreen = ({ route, navigation }: any) => {
  const { user, profile } = useAuthStore();
  const { date } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [eventType, setEventType] = useState('study_session');
  const [dateValue, setDateValue] = useState(date ? new Date(date) : new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

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
    }, [])
  );

  // Handle going back
  const handleGoBack = () => {
    // Check if form has unsaved changes
    if (title || description || subject) {
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

  // Get subjects from profile
  const getSubjects = () => {
    return profile?.subjects || [];
  };

  // Handle adding event
  const handleAddEvent = async () => {
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

    setLoading(true);
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
        setLoading(false);
        return;
      }
      
      // Create event
      await createCalendarEvent({
        user_id: user.id,
        title,
        description: description.trim() || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        subject,
        event_type: eventType,
      });
      
      // Show success message
      Alert.alert('Success', 'Event added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error adding event:', error);
      Alert.alert('Error', error.message || 'Failed to add event');
    } finally {
      setLoading(false);
    }
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

  const timeOptions = generateTimeOptions();
  const subjects = getSubjects();

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Event</Text>
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
          title="Add Event"
          onPress={handleAddEvent}
          loading={loading}
          style={styles.addButton}
        />
      </ScrollView>
      
      {loading && <LoadingSpinner message="Adding event..." />}
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
  addButton: {
    marginTop: 8,
  },
});