import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { ShareIntentProvider } from 'expo-share-intent';
import { supabase } from '../src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Colors } from '../src/constants/theme';
import { useShareIntake } from '../src/hooks/useShareIntake';
import { WorkoutsProvider } from '../src/contexts/WorkoutsContext';
import { getPendingRedirect, setPendingRedirect, clearPendingRedirect } from '../src/utils/pendingRedirect';
import { normalizeShareUrl } from '../src/utils/url';
import { shouldHandleLegacyShare } from '../src/utils/shareGate';

function pickParam(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams<{
    url?: string;
    text?: string;
    title?: string;
    sourceUrl?: string;
    sourceText?: string;
    fileUrl?: string;
    sharedKey?: string;
    sharedType?: string;
    shareNonce?: string;
  }>();
  const hasStoredRedirectRef = useRef(false);

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

  // Single owner for legacy share navigation (cold + warm). +not-found does NOT navigate for legacy shares.
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (loading) return;

      const norm = normalizeShareUrl(url);
      if (!norm?.sharedKey) return;

      if (!shouldHandleLegacyShare()) return;

      const shareNonce = Date.now().toString();
      const importParams = {
        sharedKey: norm.sharedKey,
        ...(norm.sharedType && { sharedType: norm.sharedType }),
        shareNonce,
      };

      if (!session) {
        setPendingRedirect({ pathname: '/import', params: importParams });
        return;
      }

      console.log('[FitLinks] NAV to import', { sharedKey: norm.sharedKey, shareNonce });
      router.replace({
        pathname: '/import',
        params: importParams,
      });
    };

    // Cold start: check the URL that launched the app
    Linking.getInitialURL().then(handleUrl);

    // Warm start: listen for incoming URL events
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, [router, session, loading]);

  // Redirect based on auth state — this ensures logout always works
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const path = '/' + (segments.filter(Boolean).join('/') || '');

    if (session && inAuthGroup) {
      // Post-login: check for pending redirect from deep link
      getPendingRedirect().then(async (pending) => {
        if (pending) {
          await clearPendingRedirect();
          router.replace({ pathname: pending.pathname, params: pending.params ?? {} });
        } else {
          router.replace('/(tabs)');
        }
      });
      return;
    }

    if (!session && !inAuthGroup) {
      // Capture /import, /share, /import-share intent before redirecting to login (once per launch)
      const isShareIntent = path === '/import' || path === '/share' || path === '/import-share';
      if (isShareIntent && !hasStoredRedirectRef.current) {
        hasStoredRedirectRef.current = true;
        const url = pickParam(params.sourceUrl ?? params.url);
        const text = pickParam(params.sourceText ?? params.text);
        const title = pickParam(params.title);
        const fileUrl = pickParam(params.fileUrl);
        const sharedKey = pickParam(params.sharedKey);
        const sharedType = pickParam(params.sharedType);
        const shareNonce = pickParam(params.shareNonce);
        const redirectParams: Record<string, string> = {};
        if (url) redirectParams.url = url;
        if (text) redirectParams.text = text;
        if (title) redirectParams.title = title;
        if (fileUrl) redirectParams.fileUrl = fileUrl;
        if (sharedKey) redirectParams.sharedKey = sharedKey;
        if (sharedType) redirectParams.sharedType = sharedType;
        if (shareNonce) redirectParams.shareNonce = shareNonce;
        setPendingRedirect({ pathname: '/import', params: redirectParams });
      }
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments, params.url, params.text, params.title, params.sourceUrl, params.sourceText, params.fileUrl, params.sharedKey, params.sharedType, params.shareNonce]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.coralPulse} />
      </View>
    );
  }

  return (
    <ShareIntentProvider>
      <WorkoutsProvider>
        <RootStack session={session} />
      </WorkoutsProvider>
    </ShareIntentProvider>
  );
}

function RootStack({ session }: { session: Session | null }) {
  useShareIntake(session);
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
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
        <Stack.Screen
          name="import"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="share"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="import-share"
          options={{ headerShown: false, presentation: 'card' }}
        />
      </Stack>
    </>
  );
}
