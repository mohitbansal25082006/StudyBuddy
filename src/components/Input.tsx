// ============================================
// CUSTOM INPUT COMPONENT
// Reusable text input with label and error
// ============================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ViewStyle } from 'react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  autoCapitalize = 'none',
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Label */}
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
      }}>
        {label}
      </Text>

      {/* Input Container */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: editable ? '#F9FAFB' : '#F3F4F6',
        borderWidth: 2,
        borderColor: error ? '#EF4444' : isFocused ? '#6366F1' : '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        opacity: editable ? 1 : 0.6,
        ...style,
      }}>
        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            paddingVertical: 16,
            fontSize: 16,
            color: editable ? '#111827' : '#6B7280',
          }}
        />

        {/* Show/Hide Password Button */}
        {secureTextEntry && editable && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ padding: 4 }}
          >
            <Text style={{ color: '#6366F1', fontSize: 14, fontWeight: '600' }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={{
          fontSize: 12,
          color: '#EF4444',
          marginTop: 4,
          marginLeft: 4,
        }}>
          {error}
        </Text>
      )}
    </View>
  );
};