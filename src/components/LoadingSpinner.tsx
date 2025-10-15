// ============================================
// LOADING SPINNER COMPONENT
// Full screen loading indicator
// ============================================

import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    }}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={{
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
      }}>
        {message}
      </Text>
    </View>
  );
};