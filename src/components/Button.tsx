// ============================================
// CUSTOM BUTTON COMPONENT
// Reusable button with loading state
// ============================================

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: any;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  // Define colors based on variant
  const getBackgroundColor = () => {
    if (disabled || loading) return '#CCCCCC';
    
    switch (variant) {
      case 'primary':
        return '#6366F1'; // Indigo
      case 'secondary':
        return '#8B5CF6'; // Purple
      case 'outline':
        return 'transparent';
      default:
        return '#6366F1';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return '#6366F1';
    return '#FFFFFF';
  };

  const getBorderColor = () => {
    if (variant === 'outline') return '#6366F1';
    return 'transparent';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        backgroundColor: getBackgroundColor(),
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderWidth: variant === 'outline' ? 2 : 0,
        borderColor: getBorderColor(),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        ...style,
      }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={{
          color: getTextColor(),
          fontSize: 16,
          fontWeight: '600',
        }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};