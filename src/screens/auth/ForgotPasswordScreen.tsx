// ============================================
// FORGOT PASSWORD SCREEN
// Send password reset email
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { resetPassword } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle password reset
  const handleResetPassword = async () => {
    // Reset error
    setError('');

    // Validate email
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }

    // Send reset email
    setLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Email Sent!',
        'Please check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <View style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
      }}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <Text style={{ fontSize: 24, color: '#6366F1', marginRight: 8 }}>←</Text>
          <Text style={{ fontSize: 16, color: '#6366F1', fontWeight: '600' }}>
            Back
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: 8,
          }}>
            Forgot Password?
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            lineHeight: 24,
          }}>
            No worries! Enter your email and we'll send you instructions to reset your password.
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: 24 }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />
        </View>

        {/* Reset Button */}
        <Button
          title="Send Reset Link"
          onPress={handleResetPassword}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
};