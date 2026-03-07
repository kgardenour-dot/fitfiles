import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../src/constants/theme';
import { normalizeShareUrl } from '../src/utils/url';

export default function NotFoundScreen() {
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    Linking.getInitialURL().then((initialUrl) => {
      if (!initialUrl) {
        router.replace('/(tabs)');
        return;
      }
      // Legacy share URL — do NOT navigate; _layout's url listener is the single owner.
      // Support both old and current share URL formats.
      if (initialUrl.includes('dataUrl=') || normalizeShareUrl(initialUrl)?.sharedKey) {
        return; // render "Redirecting..." only
      }
      router.replace('/(tabs)');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
