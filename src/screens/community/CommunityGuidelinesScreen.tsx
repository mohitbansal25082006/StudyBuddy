// F:\StudyBuddy\src\screens\community\CommunityGuidelinesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { getCommunityGuidelines } from '../../services/supabase';
import { CommunityGuideline } from '../../types';
import { AppStackParamList } from '../../types';

type CommunityGuidelinesScreenNavigationProp = StackNavigationProp<
  AppStackParamList,
  'CommunityGuidelines'
>;

export const CommunityGuidelinesScreen: React.FC = () => {
  const navigation = useNavigation<CommunityGuidelinesScreenNavigationProp>();
  const [guidelines, setGuidelines] = useState<CommunityGuideline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGuidelines = async () => {
      try {
        const data = await getCommunityGuidelines();
        setGuidelines(data);
      } catch (error) {
        console.error('Error loading guidelines:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGuidelines();
  }, []);

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
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading guidelines...</Text>
        </View>
      ) : guidelines ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{guidelines.title}</Text>
          <Text style={styles.contentText}>{guidelines.content}</Text>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(guidelines.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>
            Failed to load community guidelines. Please try again later.
          </Text>
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
});