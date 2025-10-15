// ============================================
// SIGN IN SCREEN
// Email/password login with validation
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { signIn } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';

export const SignInScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Handle sign in
  const handleSignIn = async () => {
    // Reset errors
    setErrors({ email: '', password: '' });

    // Validate inputs
    let hasError = false;
    const newErrors = { email: '', password: '' };

    if (!email) {
      newErrors.email = 'Email is required';
      hasError = true;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
      hasError = true;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Attempt sign in
    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation handled by auth state listener
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 60,
        }}>
          {/* Header */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: 8,
            }}>
              Welcome Back!
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
            }}>
              Sign in to continue your learning journey
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
              error={errors.email}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
            >
              <Text style={{
                fontSize: 14,
                color: '#6366F1',
                fontWeight: '600',
              }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            style={{ marginBottom: 16 }}
          />

          {/* Sign Up Link */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 16,
          }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={{
                fontSize: 14,
                color: '#6366F1',
                fontWeight: '600',
              }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};