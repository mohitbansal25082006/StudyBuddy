// F:\StudyBuddy\src\components\calendar\AIReminderGenerator.tsx
// ============================================
// AI REMINDER GENERATOR COMPONENT
// Beautiful UI for AI-powered reminder generation
// ============================================

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions } from 'react-native';
import { generateReminderText } from '../../services/calendar/calendarAI';
import { AIReminderRequest } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

interface AIReminderGeneratorProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventSubject: string;
  onReminderGenerated: (eventId: string, reminder: string) => void;
}

export const AIReminderGenerator: React.FC<AIReminderGeneratorProps> = ({
  visible,
  onClose,
  eventId,
  eventTitle,
  eventSubject,
  onReminderGenerated
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [generatedReminder, setGeneratedReminder] = useState('');
  
  // Form state
  const [topic, setTopic] = useState(eventTitle);
  const [progress, setProgress] = useState(50);
  const [streak, setStreak] = useState(1);
  const [studyTime, setStudyTime] = useState(30);
  const [reminderType, setReminderType] = useState<'motivational' | 'contextual' | 'break' | 'deadline'>('contextual');
  
  const reminderTypes = [
    { value: 'motivational', label: 'Motivational', description: 'Encouraging and positive' },
    { value: 'contextual', label: 'Contextual', description: 'Informative about what to study' },
    { value: 'break', label: 'Break Reminder', description: 'Remind to take a break' },
    { value: 'deadline', label: 'Deadline', description: 'Urgent deadline reminder' }
  ];
  
  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleGenerateReminder();
    }
  };
  
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleGenerateReminder = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }
    
    setLoading(true);
    
    try {
      const request: AIReminderRequest = {
        userName: 'Student', // This would come from user profile
        subject: eventSubject,
        topic,
        progress,
        streak,
        studyTime,
        reminderType
      };
      
      const reminder = await generateReminderText(request);
      setGeneratedReminder(reminder);
      setStep(4); // Move to results step
    } catch (error: any) {
      console.error('Error generating reminder:', error);
      Alert.alert('Error', error.message || 'Failed to generate reminder');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUseReminder = () => {
    if (generatedReminder.trim()) {
      onReminderGenerated(eventId, generatedReminder);
      onClose();
    }
  };
  
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Reminder Details</Text>
      <Text style={styles.stepDescription}>Provide details about your study session</Text>
      
      <Input
        label="Topic"
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g., Newton's Laws of Motion"
      />
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Progress: {progress}%</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setProgress(Math.max(0, progress - 10))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{progress}%</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setProgress(Math.min(100, progress + 10))}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Study Time: {studyTime} minutes</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setStudyTime(Math.max(5, studyTime - 5))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{studyTime}m</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setStudyTime(Math.min(180, studyTime + 5))}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Current Streak: {streak} days</Text>
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setStreak(Math.max(0, streak - 1))}
          >
            <Text style={styles.sliderButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.sliderValue}>{streak}</Text>
          <TouchableOpacity
            style={styles.sliderButton}
            onPress={() => setStreak(streak + 1)}
          >
            <Text style={styles.sliderButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Reminder Type</Text>
      <Text style={styles.stepDescription}>Choose the type of reminder you want</Text>
      
      <View style={styles.optionsContainer}>
        {reminderTypes.map(type => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.optionCard,
              reminderType === type.value && styles.selectedOptionCard
            ]}
            onPress={() => setReminderType(type.value as any)}
          >
            <Text style={[
              styles.optionTitle,
              reminderType === type.value && styles.selectedOptionTitle
            ]}>
              {type.label}
            </Text>
            <Text style={styles.optionDescription}>
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
  
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Summary</Text>
      <Text style={styles.stepDescription}>Review your reminder details</Text>
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Subject:</Text>
          <Text style={styles.summaryValue}>{eventSubject}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Topic:</Text>
          <Text style={styles.summaryValue}>{topic}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Progress:</Text>
          <Text style={styles.summaryValue}>{progress}%</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Study Time:</Text>
          <Text style={styles.summaryValue}>{studyTime} minutes</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Streak:</Text>
          <Text style={styles.summaryValue}>{streak} days</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Reminder Type:</Text>
          <Text style={styles.summaryValue}>
            {reminderTypes.find(t => t.value === reminderType)?.label}
          </Text>
        </View>
      </View>
    </View>
  );
  
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Generated Reminder</Text>
      <Text style={styles.stepDescription}>Your AI-generated reminder is ready</Text>
      
      <View style={styles.reminderContainer}>
        <Text style={styles.reminderText}>{generatedReminder}</Text>
      </View>
      
      <View style={styles.actionButtons}>
        <Button
          title="Regenerate"
          onPress={handleGenerateReminder}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="Use This Reminder"
          onPress={handleUseReminder}
          style={styles.actionButton}
        />
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
          <Text style={styles.headerTitle}>AI Reminder Generator</Text>
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
          {step > 1 && step < 4 && (
            <Button
              title="Previous"
              onPress={handlePrevious}
              variant="outline"
              style={styles.footerButton}
            />
          )}
          {step < 3 && (
            <Button
              title="Next"
              onPress={handleNext}
              style={styles.footerButton}
            />
          )}
          {step === 3 && (
            <Button
              title="Generate"
              onPress={handleGenerateReminder}
              loading={loading}
              style={styles.footerButton}
            />
          )}
        </View>
      </View>
      
      {loading && <LoadingSpinner message="Generating your reminder..." />}
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
  optionsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  selectedOptionCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  selectedOptionTitle: {
    color: '#047857',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  summaryValue: {
    fontSize: 16,
    color: '#111827',
  },
  reminderContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  reminderText: {
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 26,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
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