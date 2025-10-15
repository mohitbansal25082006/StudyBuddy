// ============================================
// SIGN UP SCREEN
// Create new account with validation
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { signUp } from '../../services/supabase';
import { validateEmail, validatePassword, validateFullName } from '../../utils/validation';

export const SignUpScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Handle sign up
  const handleSignUp = async () => {
    // Reset errors
    setErrors({ fullName: '', email: '', password: '', confirmPassword: '' });

    // Validate inputs
    let hasError = false;
    const newErrors = { fullName: '', email: '', password: '', confirmPassword: '' };

    if (!fullName) {
      newErrors.fullName = 'Full name is required';
      hasError = true;
    } else if (!validateFullName(fullName)) {
      newErrors.fullName = 'Please enter your full name';
      hasError = true;
    }

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
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.error || '';
        hasError = true;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      hasError = true;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Attempt sign up
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      Alert.alert(
        'Success!',
        'Account created successfully. Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
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
              Create Account
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
            }}>
              Join StudyBuddy and start learning smarter
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: 24 }}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              autoCapitalize="words"
              error={errors.fullName}
            />

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
              placeholder="Create a strong password"
              secureTextEntry
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              secureTextEntry
              error={errors.confirmPassword}
            />
          </View>

          {/* Sign Up Button */}
          <Button
            title="Sign Up"
            onPress={handleSignUp}
            loading={loading}
            style={{ marginBottom: 16 }}
          />

          {/* Sign In Link */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 16,
          }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={{
                fontSize: 14,
                color: '#6366F1',
                fontWeight: '600',
              }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};