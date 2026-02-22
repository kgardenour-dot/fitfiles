import { useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
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
import { shouldHandleShare } from '../src/utils/shareDedupe';
import { getLastShareHandledAtMs, markShareHandledNow } from '../src/utils/shareNavState';
import { readAndClearSharedPayload, SharedPayload } from '../src/native/sharedItems';

function pickParam(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const params = useGlobalSearchParams<{
    url?: string;
    text?: string;
    title?: string;
    sourceUrl?: string;
    sourceText?: string;
    fileUrl?: string;
    shareNonce?: string;
  }>();
  const hasStoredRedirectRef = useRef(false);

  useEffect(() => {
    console.log('[FL_NAV_DIAG] route', { pathname, segments, params });
    if (Date.now() - getLastShareHandledAtMs() < 2000) {
      console.log('[FL_NAV_DIAG] route change within 2s of share', { pathname, segments });
    }
  }, [pathname, JSON.stringify(segments), JSON.stringify(params)]);

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

  // Single canonical handler for legacy share deep links (cold + warm start)
  // Handles both getInitialURL and addEventListener('url') events
  useEffect(() => {
    let isMounted = true;

    const isLegacyShareLink = (candidate: string) => candidate.startsWith('fitlinks://dataUrl=');

    const handleUrl = async (url: string | null, source: 'initialURL' | 'urlEvent') => {
      const ts = Date.now();
      console.log('[FL_SHARE_DIAG] handleUrl fired', { source, ts, url });
      if (!url) return;
      if (loading) return;

      let host = '';
      let path = '';
      let parsedShareKey: string | undefined;
      let parsedType: string | undefined;
      try {
        const parsedUrl = new URL(url);
        host = parsedUrl.host ?? '';
        path = parsedUrl.pathname ?? '';
        parsedShareKey = parsedUrl.searchParams.get('shareKey') ?? undefined;
        parsedType = parsedUrl.searchParams.get('type') ?? undefined;
      } catch {
        // Keep defaults; legacy links may not parse reliably via URL in all environments.
      }

      const isImportLink = host === 'import' || path === '/import';
      console.log('[FL_SHARE_DIAG] handleUrl parsed', {
        source,
        host,
        pathname: path,
        isImportLink,
        shareKey: parsedShareKey,
        type: parsedType,
        ts: Date.now(),
      });

      if (!isImportLink && !isLegacyShareLink(url)) {
        console.log('[FL_SHARE_DIAG] ignore non-share url', { source, url, ts: Date.now() });
        return;
      }

      const norm = normalizeShareUrl(url);
      const sharedKey = parsedShareKey || norm?.sharedKey || 'fitlinksShareKey';
      const sharedTypeHint = parsedType || norm?.sharedType;

      // Read payload from App Group (atomic read+clear)
      const payload = await readAndClearSharedPayload(sharedKey, sharedTypeHint);

      const payloadType = payload?.type ?? sharedTypeHint ?? undefined;
      const payloadValue = payload?.value ?? '';
      const isFile = payloadType === 'file' || payloadValue.startsWith('file://');
      const isMedia = payloadType === 'media';
      const hasImage = isMedia && /"type"\s*:\s*0/.test(payload?.raw ?? '');
      const hasVideo = isMedia && /"type"\s*:\s*1/.test(payload?.raw ?? '');
      console.log('[FL_SHARE_DIAG] payload read', {
        status: payload?.value ? 'found' : 'empty',
        sharedType: payloadType,
        shareNonce: payload?.shareNonce,
        hasText: payload?.type === 'text',
        hasUrl: payload?.type === 'weburl' || payloadValue.startsWith('http://') || payloadValue.startsWith('https://'),
        hasFile: isFile,
        hasImage,
        hasVideo,
      });

      if (!payload?.value) {
        console.log('[FL_SHARE_DIAG] not routing (empty payload)', { source, ts: Date.now() });
        return;
      }

      // Check dedupe: block duplicate share processing
      const dedupeKey = `${url}|${payloadType ?? ''}|${payloadValue || ''}`;
      const dedupeDecision = shouldHandleShare(dedupeKey);
      console.log('[FL_SHARE_DIAG] dedupe decision', {
        allowed: dedupeDecision.allowed,
        reason: dedupeDecision.reason,
        ts: Date.now(),
        url,
        dedupeKey,
      });
      if (!dedupeDecision.allowed) {
        console.log('[FL_SHARE_DIAG] not routing (dedupe blocked)', { source, ts: Date.now() });
        return;
      }

      // Mark as handled immediately after dedupe allow, before any navigation.
      markShareHandledNow(ts);

      // Parse the payload value to extract URL or text
      const payloadWithExtras = payload as SharedPayload & {
        text?: string;
        title?: string;
        imageUri?: string;
        fileUri?: string;
        url?: string;
      };
      const val = payload.value.trim();
      let sourceUrl: string | undefined;
      let sourceText: string | undefined;

      if (payloadWithExtras.url) {
        sourceUrl = payloadWithExtras.url;
      } else if (val.startsWith('http://') || val.startsWith('https://')) {
        sourceUrl = val;
      } else if (val.startsWith('file://')) {
        sourceUrl = val;
      } else {
        sourceText = payloadWithExtras.text ?? val;
      }

      // Generate a new nonce for this navigation (used by import screen to prevent double consumption)
      const navNonce = Date.now().toString();
      const importParams: Record<string, string> = {
        shareNonce: navNonce,
      };
      
      if (sourceUrl) importParams.sourceUrl = sourceUrl;
      if (sourceText) {
        importParams.sourceText = sourceText;
        importParams.text = sourceText;
      }
      if (payloadWithExtras.title) importParams.title = payloadWithExtras.title;
      if (payloadWithExtras.imageUri) importParams.screenshotUri = payloadWithExtras.imageUri;
      if (payloadWithExtras.fileUri) importParams.fileUri = payloadWithExtras.fileUri;
      if (payloadType) importParams.sharedType = payloadType;

      console.log('[FL_SHARE_DIAG] routing to import', { 
        shareNonce: navNonce, 
        sharedType: payloadType,
        hasUrl: !!sourceUrl,
        hasText: !!sourceText
      });

      if (!session) {
        console.log('[FL_NAV_DIAG] nav->import', { ts: Date.now(), from: pathname, mode: 'pendingRedirect' });
        setPendingRedirect({ pathname: '/import', params: importParams });
        setTimeout(() => {
          console.log('[FL_NAV_DIAG] nav->import dispatched', { ts: Date.now(), mode: 'pendingRedirect' });
        }, 0);
        return;
      }

      if (!isMounted) return;

      if (pathname === '/import') {
        console.log('[FL_NAV_DIAG] import setParams', {
          ts: Date.now(),
          from: pathname,
          params: importParams,
        });
        router.setParams(importParams);
      } else {
        console.log('[FL_NAV_DIAG] nav->import', { ts: Date.now(), from: pathname, mode: 'replace' });
        router.replace({
          pathname: '/import',
          params: importParams,
        });
        setTimeout(() => {
          console.log('[FL_NAV_DIAG] nav->import dispatched', { ts: Date.now(), mode: 'replace' });
        }, 0);
      }
    };

    // Handle initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url, 'initialURL');
    });

    // Handle URL events (warm start)
    const sub = Linking.addEventListener('url', (event) => {
      handleUrl(event.url, 'urlEvent');
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
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
          const lastShareHandledAt = getLastShareHandledAtMs();
          const ageMs = Date.now() - lastShareHandledAt;
          console.log('[FL_NAV_DIAG] redirect->library (_layout post-login fallback)', {
            file: 'app/_layout.tsx',
            reason: 'session_in_auth_group_no_pending_redirect',
            within2sOfShare: ageMs >= 0 && ageMs < 2000,
            ageMsSinceShareHandled: ageMs,
            ts: Date.now(),
          });
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
        const shareNonce = pickParam(params.shareNonce);
        const redirectParams: Record<string, string> = {};
        if (url) redirectParams.url = url;
        if (text) redirectParams.text = text;
        if (title) redirectParams.title = title;
        if (fileUrl) redirectParams.fileUrl = fileUrl;
        if (shareNonce) redirectParams.shareNonce = shareNonce;
        setPendingRedirect({ pathname: '/import', params: redirectParams });
      }
      router.replace('/(auth)/login');
    }
  }, [session, loading, segments, params.url, params.text, params.title, params.sourceUrl, params.sourceText, params.fileUrl, params.shareNonce]);

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
