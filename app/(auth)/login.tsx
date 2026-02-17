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
} from 'react-native';
import { Link } from 'expo-router';
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Fitfiles</Text>
        <Text style={styles.subtitle}>Your workout link library</Text>

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
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.primary,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 50,
    marginBottom: Spacing.md,
    width: '100%',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    width: '100%',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  linkTextBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
