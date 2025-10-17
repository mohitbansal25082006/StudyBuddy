// F:\StudyBuddy\src\components\calendar\AIScheduleGenerator.tsx
// ============================================
// AI SCHEDULE GENERATOR COMPONENT
// Beautiful UI for AI-powered schedule generation
// ============================================

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions } from 'react-native';
import { generateStudySchedule } from '../../services/calendar/calendarAI';
import { AIScheduleRequest, AIGeneratedSchedule } from '../../types';
import { Button } from '../Button';
import { Input } from '../Input';
import { LoadingSpinner } from '../LoadingSpinner';

const { width, height } = Dimensions.get('window');

interface AIScheduleGeneratorProps {
  visible: boolean;
  onClose: () => void;
  onScheduleGenerated: (schedule: AIGeneratedSchedule) => void;
  subjects: string[];
}

export const AIScheduleGenerator: React.FC<AIScheduleGeneratorProps> = ({
  visible,
  onClose,
  onScheduleGenerated,
  subjects
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState(7);
  const [dailyHours, setDailyHours] = useState(2);
  const [deadlines, setDeadlines] = useState<{ subject: string; date: string; description: string }[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<{ subject: string; level: string }[]>([]);
  const [avoidTimes, setAvoidTimes] = useState<string[]>([]);
  
  // Temporary input states
  const [newDeadline, setNewDeadline] = useState({ subject: '', date: '', description: '' });
  const [newDifficulty, setNewDifficulty] = useState({ subject: '', level: 'intermediate' });
  const [newAvoidTime, setNewAvoidTime] = useState('');
  
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
      handleGenerateSchedule();
    }
  };
  
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };
  
  const toggleTime = (time: string) => {
    if (preferredTimes.includes(time)) {
      setPreferredTimes(preferredTimes.filter(t => t !== time));
    } else {
      setPreferredTimes([...preferredTimes, time]);
    }
  };
  
  const addDeadline = () => {
    if (newDeadline.subject && newDeadline.date) {
      setDeadlines([...deadlines, { ...newDeadline }]);
      setNewDeadline({ subject: '', date: '', description: '' });
    }
  };
  
  const removeDeadline = (index: number) => {
    setDeadlines(deadlines.filter((_, i) => i !== index));
  };
  
  const addDifficulty = () => {
    if (newDifficulty.subject) {
      setDifficultyLevels([...difficultyLevels, { ...newDifficulty }]);
      setNewDifficulty({ subject: '', level: 'intermediate' });
    }
  };
  
  const removeDifficulty = (index: number) => {
    setDifficultyLevels(difficultyLevels.filter((_, i) => i !== index));
  };
  
  const addAvoidTime = () => {
    if (newAvoidTime) {
      setAvoidTimes([...avoidTimes, newAvoidTime]);
      setNewAvoidTime('');
    }
  };
  
  const removeAvoidTime = (index: number) => {
    setAvoidTimes(avoidTimes.filter((_, i) => i !== index));
  };
  
  const handleGenerateSchedule = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert('Error', 'Please select at least one subject');
      return;
    }
    
    if (preferredTimes.length === 0) {
      Alert.alert('Error', 'Please select at least one preferred study time');
      return;
    }
    
    setLoading(true);
    
    try {
      const request: AIScheduleRequest = {
        subjects: selectedSubjects,
        preferredStudyTimes: preferredTimes,
        durationDays,
        dailyHours,
        upcomingDeadlines: deadlines.length > 0 ? deadlines : undefined,
        difficultyLevels: difficultyLevels.length > 0 ? difficultyLevels : undefined,
        avoidTimes: avoidTimes.length > 0 ? avoidTimes : undefined
      };
      
      const schedule = await generateStudySchedule(request);
      onScheduleGenerated(schedule);
      onClose();
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      Alert.alert('Error', error.message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };
  
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Subjects</Text>
      <Text style={styles.stepDescription}>Choose the subjects you want to study</Text>
      
      <View style={styles.optionsContainer}>
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.option,
              selectedSubjects.includes(subject) && styles.selectedOption
            ]}
            onPress={() => toggleSubject(subject)}
          >
            <Text
              style={[
                styles.optionText,
                selectedSubjects.includes(subject) && styles.selectedOptionText
              ]}
            >
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Study Preferences</Text>
      <Text style={styles.stepDescription}>Set your study schedule preferences</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Preferred Study Times</Text>
        <View style={styles.optionsContainer}>
          {timeOptions.map(time => (
            <TouchableOpacity
              key={time}
              style={[
                styles.option,
                preferredTimes.includes(time) && styles.selectedOption
              ]}
              onPress={() => toggleTime(time)}
            >
              <Text
                style={[
                  styles.optionText,
                  preferredTimes.includes(time) && styles.selectedOptionText
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Schedule Duration: {durationDays} days</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setDurationDays(Math.max(1, durationDays - 1))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{durationDays}</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setDurationDays(Math.min(30, durationDays + 1))}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Daily Study Hours: {dailyHours} hours</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setDailyHours(Math.max(0.5, dailyHours - 0.5))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{dailyHours}</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setDailyHours(Math.min(8, dailyHours + 0.5))}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Deadlines & Difficulty</Text>
      <Text style={styles.stepDescription}>Add any upcoming deadlines or difficulty levels</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Upcoming Deadlines</Text>
        
        {deadlines.map((deadline, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{deadline.subject}</Text>
              <Text style={styles.listItemSubtitle}>{deadline.date} - {deadline.description}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeDeadline(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Input
              label="Subject"
              placeholder="e.g., Mathematics"
              value={newDeadline.subject}
              onChangeText={(text) => setNewDeadline({ ...newDeadline, subject: text })}
            />
          </View>
          <View style={styles.inputContainer}>
            <Input
              label="Date"
              placeholder="YYYY-MM-DD"
              value={newDeadline.date}
              onChangeText={(text) => setNewDeadline({ ...newDeadline, date: text })}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addDeadline}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Difficulty Levels</Text>
        
        {difficultyLevels.map((difficulty, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{difficulty.subject}</Text>
              <Text style={styles.listItemSubtitle}>{difficulty.level}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeDifficulty(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Input
              label="Subject"
              placeholder="e.g., Physics"
              value={newDifficulty.subject}
              onChangeText={(text) => setNewDifficulty({ ...newDifficulty, subject: text })}
            />
          </View>
          <View style={styles.pickerContainer}>
            {difficultyOptions.map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.pickerOption,
                  newDifficulty.level === level && styles.selectedPickerOption
                ]}
                onPress={() => setNewDifficulty({ ...newDifficulty, level })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    newDifficulty.level === level && styles.selectedPickerOptionText
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addDifficulty}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Times to Avoid</Text>
      <Text style={styles.stepDescription}>Add any times you want to avoid studying</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Avoid Times</Text>
        
        {avoidTimes.map((time, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{time}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeAvoidTime(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Input
              label="Time to avoid"
              placeholder="e.g., Friday evenings"
              value={newAvoidTime}
              onChangeText={setNewAvoidTime}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addAvoidTime}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Schedule Summary</Text>
        <Text style={styles.summaryText}>Subjects: {selectedSubjects.join(', ')}</Text>
        <Text style={styles.summaryText}>Duration: {durationDays} days</Text>
        <Text style={styles.summaryText}>Daily hours: {dailyHours} hours</Text>
        <Text style={styles.summaryText}>Preferred times: {preferredTimes.join(', ')}</Text>
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
          <Text style={styles.headerTitle}>AI Schedule Generator</Text>
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
            title={step === 4 ? 'Generate Schedule' : 'Next'}
            onPress={handleNext}
            loading={loading}
            style={styles.footerButton}
          />
        </View>
      </View>
      
      {loading && <LoadingSpinner message="Generating your schedule..." />}
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
    backgroundColor: '#6366F1',
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
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectedOptionText: {
    color: '#FFFFFF',
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
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
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
    minWidth: 40,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    marginRight: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 8,
  },
  selectedPickerOption: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pickerOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  selectedPickerOptionText: {
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
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