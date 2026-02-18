import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Workout confetti */}
        <View style={styles.confettiLayer} pointerEvents="none">
          <Text style={[styles.confettiIcon, { top: '4%', left: 20, fontSize: 22, transform: [{ rotate: '-15deg' }] }]}>🏋️</Text>
          <Text style={[styles.confettiIcon, { top: '3%', right: 30, fontSize: 18, transform: [{ rotate: '20deg' }] }]}>💪</Text>
          <Text style={[styles.confettiIcon, { top: '8%', left: '40%', fontSize: 14, transform: [{ rotate: '10deg' }] }]}>⏱️</Text>
          <Text style={[styles.confettiIcon, { top: '12%', right: 60, fontSize: 20, transform: [{ rotate: '-25deg' }] }]}>🏃</Text>
          <Text style={[styles.confettiIcon, { top: '6%', left: '65%', fontSize: 16, transform: [{ rotate: '30deg' }] }]}>❤️</Text>
          <Text style={[styles.confettiIcon, { top: '15%', left: 35, fontSize: 18, transform: [{ rotate: '12deg' }] }]}>👟</Text>
          <Text style={[styles.confettiIcon, { top: '10%', right: 15, fontSize: 14, transform: [{ rotate: '-8deg' }] }]}>🔥</Text>
          <Text style={[styles.confettiIcon, { top: '18%', left: '50%', fontSize: 16, transform: [{ rotate: '-20deg' }] }]}>🧘</Text>
          <Text style={[styles.confettiIcon, { top: '2%', left: '20%', fontSize: 12, transform: [{ rotate: '45deg' }] }]}>💧</Text>
          <Text style={[styles.confettiIcon, { top: '14%', right: '30%', fontSize: 15, transform: [{ rotate: '5deg' }] }]}>🏆</Text>

          <Text style={[styles.confettiIcon, { bottom: '18%', left: 15, fontSize: 18, transform: [{ rotate: '25deg' }] }]}>🚴</Text>
          <Text style={[styles.confettiIcon, { bottom: '12%', right: 25, fontSize: 22, transform: [{ rotate: '-10deg' }] }]}>🏋️</Text>
          <Text style={[styles.confettiIcon, { bottom: '8%', left: '35%', fontSize: 16, transform: [{ rotate: '15deg' }] }]}>💪</Text>
          <Text style={[styles.confettiIcon, { bottom: '4%', right: 50, fontSize: 14, transform: [{ rotate: '-30deg' }] }]}>🔥</Text>
          <Text style={[styles.confettiIcon, { bottom: '15%', right: '40%', fontSize: 18, transform: [{ rotate: '8deg' }] }]}>👟</Text>
          <Text style={[styles.confettiIcon, { bottom: '6%', left: 45, fontSize: 20, transform: [{ rotate: '-18deg' }] }]}>❤️</Text>
          <Text style={[styles.confettiIcon, { bottom: '2%', left: '55%', fontSize: 14, transform: [{ rotate: '35deg' }] }]}>⏱️</Text>
          <Text style={[styles.confettiIcon, { bottom: '10%', left: '15%', fontSize: 12, transform: [{ rotate: '-5deg' }] }]}>🏆</Text>

          <Text style={[styles.confettiIcon, { top: '35%', left: 8, fontSize: 16, transform: [{ rotate: '22deg' }] }]}>🏃</Text>
          <Text style={[styles.confettiIcon, { top: '50%', right: 10, fontSize: 14, transform: [{ rotate: '-12deg' }] }]}>🧘</Text>
          <Text style={[styles.confettiIcon, { top: '42%', left: 12, fontSize: 12, transform: [{ rotate: '-28deg' }] }]}>💧</Text>
          <Text style={[styles.confettiIcon, { top: '60%', right: 8, fontSize: 18, transform: [{ rotate: '18deg' }] }]}>🚴</Text>
        </View>

        {/* Logo */}
        <Image
          source={require('../../assets/fitfiles_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Welcome text */}
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Your workout link library</Text>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  confettiLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confettiIcon: {
    position: 'absolute',
    opacity: 0.45,
  },

  safeArea: { flex: 1, backgroundColor: Colors.background },
  logo: {
    width: '100%',
    height: 600,
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.aquaMint,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    marginBottom: Spacing.md,
    width: '100%',
  },
  button: {
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    width: '100%',
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  linkTextBold: {
    color: Colors.aquaMint,
    fontWeight: '700',
  },
});
