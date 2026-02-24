import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../src/constants/theme';

export default function NotFoundScreen() {
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    Linking.getInitialURL().then((initialUrl) => {
      // Cold-start share URL — _layout's url listener is the single owner
      if (initialUrl?.includes('dataUrl=')) {
        return; // render "Redirecting..." only
      }
      // Warm start (initialUrl is null): likely a share URL event that
      // triggered +not-found. Delay so _layout's URL handler can navigate
      // to /import first. If it doesn't, fall back to Library.
      const delay = initialUrl ? 0 : 600;
      setTimeout(() => router.replace('/(tabs)'), delay);
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
