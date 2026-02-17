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
import { supabase } from '../../src/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      Alert.alert('Check Your Email', 'We sent a confirmation link to your email.');
    }
  };

  return (
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
        <View style={styles.decorTop}>
          <View style={[styles.dot, styles.dotYellow, { top: 30, left: 50 }]} />
          <View style={[styles.dot, styles.dotBlue, { top: 50, right: 60 }]} />
          <View style={[styles.dotSmall, styles.dotCoral, { top: 20, right: 110 }]} />
          <View style={[styles.dotSmall, styles.dotAqua, { top: 70, left: 100 }]} />
          <View style={[styles.dot, styles.dotLavender, { top: 15, left: 160 }]} />
        </View>

        {/* Logo */}
        <Image
          source={require('../../assets/fitfiles_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Heading */}
        <Text style={styles.title}>Join FitFiles!</Text>
        <Text style={styles.subtitle}>Save, tag & organize every workout</Text>

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
            placeholder="Password (min 6 characters)"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Link>

        {/* Decorative bottom dots */}
        <View style={styles.decorBottom}>
          <View style={[styles.dot, styles.dotOrange, { bottom: 15, right: 40 }]} />
          <View style={[styles.dotSmall, styles.dotMagenta, { bottom: 30, left: 70 }]} />
          <View style={[styles.dotSmall, styles.dotBlue, { bottom: 10, left: 150 }]} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  decorTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  decorBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
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

  logo: {
    width: 260,
    height: 100,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.sunriseYellow,
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
  },
  button: {
    backgroundColor: Colors.aquaMint,
    borderRadius: BorderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    shadowColor: Colors.aquaMint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.background,
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
    color: Colors.coralPulse,
    fontWeight: '700',
  },
});
