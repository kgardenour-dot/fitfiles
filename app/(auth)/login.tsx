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
        {/* Decorative dots */}
        <View style={styles.decorLayer} pointerEvents="none">
          {/* Top area */}
          <View style={[styles.dot, styles.dotCoral, { top: 20, left: 30 }]} />
          <View style={[styles.dot, styles.dotAqua, { top: 60, right: 40 }]} />
          <View style={[styles.dot, styles.dotYellow, { top: 10, right: 100 }]} />
          <View style={[styles.dotSmall, styles.dotLavender, { top: 80, left: 60 }]} />
          <View style={[styles.dotSmall, styles.dotOrange, { top: 40, left: 140 }]} />
          <View style={[styles.dotSmall, styles.dotBlue, { top: 25, left: '55%' }]} />
          <View style={[styles.dot, styles.dotMagenta, { top: 70, right: 90 }]} />
          {/* Middle area */}
          <View style={[styles.dotSmall, styles.dotCoral, { top: '35%', left: 15 }]} />
          <View style={[styles.dot, styles.dotLavender, { top: '40%', right: 20 }]} />
          <View style={[styles.dotSmall, styles.dotYellow, { top: '50%', left: 25 }]} />
          <View style={[styles.dot, styles.dotAqua, { top: '55%', right: 15 }]} />
          <View style={[styles.dotSmall, styles.dotOrange, { top: '45%', right: 35 }]} />
          {/* Bottom area */}
          <View style={[styles.dotSmall, styles.dotBlue, { bottom: 100, right: 50 }]} />
          <View style={[styles.dot, styles.dotMagenta, { bottom: 70, left: 40 }]} />
          <View style={[styles.dotSmall, styles.dotAqua, { bottom: 120, left: 120 }]} />
          <View style={[styles.dot, styles.dotYellow, { bottom: 50, right: 80 }]} />
          <View style={[styles.dotSmall, styles.dotCoral, { bottom: 30, left: '50%' }]} />
          <View style={[styles.dot, styles.dotOrange, { bottom: 80, left: 20 }]} />
          <View style={[styles.dotSmall, styles.dotLavender, { bottom: 140, right: 30 }]} />
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

        {/* Spacer pushes form toward the bottom */}
        <View style={styles.spacer} />

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
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  decorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spacer: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
  dotSmall: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  dotCoral: { backgroundColor: Colors.coralPulse },
  dotAqua: { backgroundColor: Colors.aquaMint },
  dotYellow: { backgroundColor: Colors.sunriseYellow },
  dotLavender: { backgroundColor: Colors.lavender },
  dotOrange: { backgroundColor: Colors.sunsetOrange },
  dotBlue: { backgroundColor: Colors.iceBlue },
  dotMagenta: { backgroundColor: Colors.softMagenta },

  safeArea: { flex: 1, backgroundColor: Colors.background },
  logo: {
    width: '100%',
    height: 300,
    marginBottom: Spacing.lg,
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
