import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authService } from '../firebase/firebaseCentral';
import { createUserProfile } from '../firebase/createUserProfile';

import { Ionicons } from '@expo/vector-icons'; // ✅ Icons for password toggle

export default function SignupScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!email || !password) {
      Alert.alert('Error', 'Email and password cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const user = await authService.register(email, password, displayName);
      if (user?.uid) {
        await createUserProfile(user);
      }
      Alert.alert(
        'Verification Email Sent',
        'Please check your email to verify your account before logging in.'
      );
      await authService.logout();
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Signup Failed', error.message || 'An unknown error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minii Dairy Signup 🐮</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#888"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholderTextColor="#888"
        />
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.eyeIcon}
        >
          <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          placeholderTextColor="#888"
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword((prev) => !prev)}
          style={styles.eyeIcon}
        >
          <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f6f8b',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#222',
  },
  passwordContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 15,
  },
  inputPassword: {
    width: '100%',
    padding: 15,
    paddingRight: 45,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#222',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    backgroundColor: '#1f6f8b',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#1f6f8b',
    marginTop: 15,
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: '#ccc',
  },
});
