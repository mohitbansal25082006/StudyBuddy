// F:\StudyBuddy\src\screens\community\ReportContentScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { createReport, updateReport } from '../../services/supabase';
import { analyzeReport } from '../../services/communityAI';
import { useAuthStore } from '../../store/authStore';
import { AppStackParamList } from '../../types';

type ReportContentScreenRouteProp = RouteProp<AppStackParamList, 'ReportContent'>;
type ReportContentScreenNavigationProp = StackNavigationProp<AppStackParamList, 'ReportContent'>;

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate content',
  'False information',
  'Copyright violation',
  'Other',
];

export const ReportContentScreen: React.FC = () => {
  const route = useRoute<ReportContentScreenRouteProp>();
  const navigation = useNavigation<ReportContentScreenNavigationProp>();
  const { contentType, contentId, contentAuthorId } = route.params;
  const { user } = useAuthStore();
  
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) {
      Alert.alert('Error', 'Please select a reason for your report');
      return;
    }

    try {
      setSubmitting(true);

      // Create the report
      const report = await createReport({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason: selectedReason,
        description: description.trim() || null,
      });

      // In a real app, you might want to fetch the content to analyze it
      // For now, we'll use a placeholder
      const content = "Content to analyze"; // This would be the actual content
      
      // Analyze with AI
      const analysis = await analyzeReport(
        contentType,
        content,
        selectedReason,
        description.trim() || undefined
      );

      // Update the report with AI analysis
      await updateReport(report.id, {
        ai_analysis: {
          isViolation: analysis.isViolation,
          confidence: analysis.confidence,
          explanation: analysis.explanation,
        },
        status: analysis.isViolation ? 'reviewed' : 'dismissed',
      });

      // Show appropriate message based on analysis
      if (analysis.isViolation) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our AI analysis indicates this content may violate community guidelines. We will review it shortly.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our AI analysis indicates this content does not appear to violate community guidelines, but we will still review it.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Content</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Why are you reporting this {contentType}?
        </Text>

        {/* Report Reasons */}
        <View style={styles.reasonsContainer}>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonItem,
                selectedReason === reason && styles.selectedReasonItem,
              ]}
              onPress={() => setSelectedReason(reason)}
            >
              <View style={styles.radioButton}>
                {selectedReason === reason && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <Text style={[
                styles.reasonText,
                selectedReason === reason && styles.selectedReasonText,
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.descriptionLabel}>
          Additional details (optional)
        </Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Provide additional context..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        {/* Info Text */}
        <Text style={styles.infoText}>
          False reports may result in action against your account. Please only report content that genuinely violates community guidelines.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleSubmit}
          style={[
            styles.submitButton,
            (!selectedReason || submitting) && styles.disabledButton,
          ]}
          disabled={!selectedReason || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedReasonItem: {
    backgroundColor: '#EBF5FF',
    borderColor: '#6366F1',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  reasonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  selectedReasonText: {
    color: '#1E40AF',
    fontWeight: '500',
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
});