// F:\StudyBuddy\src\components\calendar\AIGoalConverter.tsx
// ============================================
// AI GOAL CONVERTER COMPONENT
// Beautiful UI for converting goals to schedules
// ============================================

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions } from 'react-native';
import { convertGoalToSchedule } from '../../services/calendar/calendarAI';
import { AIGoalRequest, AIConvertedSchedule } from '../../types';
import { Button } from '../Button';
import { Input } from '../Input';
import { LoadingSpinner } from '../LoadingSpinner';

const { width, height } = Dimensions.get('window');

interface AIGoalConverterProps {
  visible: boolean;
  onClose: () => void;
  onGoalConverted: (schedule: AIConvertedSchedule) => void;
  subjects: string[];
}

export const AIGoalConverter: React.FC<AIGoalConverterProps> = ({
  visible,
  onClose,
  onGoalConverted,
  subjects
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [goal, setGoal] = useState('');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeOptions = [
    'Morning (6AM - 12PM)',
    'Afternoon (12PM - 6PM)',
    'Evening (6PM - 10PM)',
    'Night (10PM - 6AM)'
  ];
  const difficultyOptions = ['beginner', 'intermediate', 'advanced'];
  
  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleConvertGoal();
    }
  };
  
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };
  
  const toggleTime = (time: string) => {
    if (availableTimes.includes(time)) {
      setAvailableTimes(availableTimes.filter(t => t !== time));
    } else {
      setAvailableTimes([...availableTimes, time]);
    }
  };
  
  const handleConvertGoal = async () => {
    if (!goal.trim()) {
      Alert.alert('Error', 'Please enter a goal');
      return;
    }
    
    if (!subject.trim()) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }
    
    if (!deadline.trim()) {
      Alert.alert('Error', 'Please enter a deadline');
      return;
    }
    
    if (availableDays.length === 0) {
      Alert.alert('Error', 'Please select at least one available day');
      return;
    }
    
    if (availableTimes.length === 0) {
      Alert.alert('Error', 'Please select at least one available time');
      return;
    }
    
    setLoading(true);
    
    try {
      const request: AIGoalRequest = {
        goal,
        subject,
        deadline,
        availableDays,
        availableTimes,
        sessionDuration,
        difficulty
      };
      
      const schedule = await convertGoalToSchedule(request);
      onGoalConverted(schedule);
      onClose();
    } catch (error: any) {
      console.error('Error converting goal:', error);
      Alert.alert('Error', error.message || 'Failed to convert goal to schedule');
    } finally {
      setLoading(false);
    }
  };
  
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Define Your Goal</Text>
      <Text style={styles.stepDescription}>What do you want to achieve?</Text>
      
      <Input
        label="Goal"
        value={goal}
        onChangeText={setGoal}
        placeholder="e.g., Finish 4 chapters of Physics"
        multiline
        numberOfLines={3}
      />
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Subject</Text>
        <View style={styles.optionsContainer}>
          {subjects.map(subj => (
            <TouchableOpacity
              key={subj}
              style={[
                styles.option,
                subject === subj && styles.selectedOption
              ]}
              onPress={() => setSubject(subj)}
            >
              <Text
                style={[
                  styles.optionText,
                  subject === subj && styles.selectedOptionText
                ]}
              >
                {subj}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <Input
        label="Deadline"
        value={deadline}
        onChangeText={setDeadline}
        placeholder="YYYY-MM-DD"
      />
    </View>
  );
  
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Availability</Text>
      <Text style={styles.stepDescription}>When are you available to study?</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Available Days</Text>
        <View style={styles.optionsContainer}>
          {daysOfWeek.map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.option,
                availableDays.includes(day) && styles.selectedOption
              ]}
              onPress={() => toggleDay(day)}
            >
              <Text
                style={[
                  styles.optionText,
                  availableDays.includes(day) && styles.selectedOptionText
                ]}
              >
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Available Times</Text>
        <View style={styles.optionsContainer}>
          {timeOptions.map(time => (
            <TouchableOpacity
              key={time}
              style={[
                styles.option,
                availableTimes.includes(time) && styles.selectedOption
              ]}
              onPress={() => toggleTime(time)}
            >
              <Text
                style={[
                  styles.optionText,
                  availableTimes.includes(time) && styles.selectedOptionText
                ]}
              >
                {time.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
  
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Study Preferences</Text>
      <Text style={styles.stepDescription}>Set your study session preferences</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Session Duration: {sessionDuration} minutes</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setSessionDuration(Math.max(15, sessionDuration - 15))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{sessionDuration}</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setSessionDuration(Math.min(180, sessionDuration + 15))}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Difficulty Level</Text>
        <View style={styles.optionsContainer}>
          {difficultyOptions.map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.option,
                difficulty === level && styles.selectedOption
              ]}
              onPress={() => setDifficulty(level as 'beginner' | 'intermediate' | 'advanced')}
            >
              <Text
                style={[
                  styles.optionText,
                  difficulty === level && styles.selectedOptionText
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
  
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Goal Summary</Text>
      <Text style={styles.stepDescription}>Review your goal before converting</Text>
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Goal</Text>
          <Text style={styles.summaryValue}>{goal}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Subject</Text>
          <Text style={styles.summaryValue}>{subject}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Deadline</Text>
          <Text style={styles.summaryValue}>{deadline}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Available Days</Text>
          <Text style={styles.summaryValue}>{availableDays.join(', ')}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Available Times</Text>
          <Text style={styles.summaryValue}>{availableTimes.join(', ')}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Session Duration</Text>
          <Text style={styles.summaryValue}>{sessionDuration} minutes</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Difficulty</Text>
          <Text style={styles.summaryValue}>{difficulty}</Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <Text style={styles.infoText}>AI will break down your goal into manageable study sessions and create a schedule that fits your availability.</Text>
      </View>
    </View>
  );
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Goal Converter</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((stepNumber) => (
              <View
                key={stepNumber}
                style={[
                  styles.progressStep,
                  step >= stepNumber && styles.activeProgressStep
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>Step {step} of 4</Text>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
        
        <View style={styles.footer}>
          {step > 1 && (
            <Button
              title="Previous"
              onPress={handlePrevious}
              variant="outline"
              style={styles.footerButton}
            />
          )}
          <Button
            title={step === 4 ? 'Convert Goal' : 'Next'}
            onPress={handleNext}
            loading={loading}
            style={styles.footerButton}
          />
        </View>
      </View>
      
      {loading && <LoadingSpinner message="Converting your goal to a schedule..." />}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
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
  progressContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeProgressStep: {
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    margin: 8,
  },
  selectedOption: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 60,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryItem: {
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: '#1E293B',
  },
  infoContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});