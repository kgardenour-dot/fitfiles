import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="workout/[id]"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="save"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="edit/[id]"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="collection/[id]"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="upgrade"
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
    </>
  );
}
