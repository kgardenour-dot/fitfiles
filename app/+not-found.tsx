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

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    Linking.getInitialURL().then((initialUrl) => {
      if (cancelled) return;
      // Cold-start share URL — _layout's url listener is the single owner
      if (initialUrl?.includes('dataUrl=')) {
        return; // render "Redirecting..." only
      }
      // Warm start (initialUrl is null): likely a share URL event that
      // triggered +not-found. Delay so _layout's URL handler can navigate
      // to /import first. If _layout navigates away, this component
      // unmounts and the timeout is cancelled via cleanup below.
      const delay = initialUrl ? 0 : 600;
      timeoutId = setTimeout(() => {
        if (!cancelled) router.replace('/(tabs)');
      }, delay);
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
