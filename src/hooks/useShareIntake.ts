import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { extractFirstUrl } from '../utils/url';
import { shouldHandleLegacyShare } from '../utils/shareGate';
import { setPendingRedirect } from '../utils/pendingRedirect';

/** The UserDefaults key used by the share extension to store shared data. */
const SHARED_KEY = 'fitlinksShareKey';

function normalizePayload(shareIntent: {
  webUrl?: string | null;
  text?: string | null;
  meta?: { title?: string; [key: string]: unknown } | null;
}): { url?: string; text?: string; title?: string; image?: string } {
  const url = shareIntent.webUrl?.trim() || extractFirstUrl(shareIntent.text ?? '') || undefined;
  const text = shareIntent.text?.trim() || undefined;
  const title = shareIntent.meta?.title?.trim() || undefined;
  const ogImage = (shareIntent.meta as Record<string, unknown> | null | undefined)?.['og:image'];
  const image = typeof ogImage === 'string' && ogImage.trim() ? ogImage.trim() : undefined;
  return { url, text, title, image };
}

/**
 * Receive expo-share-intent payloads and navigate to /import.
 * Mount under ShareIntentProvider. Shares the legacy dataUrl TTL gate so iOS
 * does not open Import twice.
 */
export function useShareIntake(
  session: { user?: { id?: string } } | null,
  authResolved: boolean,
) {
  const router = useRouter();
  const segments = useSegments();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!authResolved) return;
    if (!hasShareIntent || !shareIntent) return;

    const path = '/' + segments.filter(Boolean).join('/');
    if (path.includes('/import')) return;
    if (!shouldHandleLegacyShare()) return;

    const { url, text, title, image } = normalizePayload(shareIntent);
    const shareNonce = Date.now().toString();
    const params: Record<string, string> = {
      sharedKey: SHARED_KEY,
      shareNonce,
    };
    if (url) params.url = url;
    if (text) params.text = text;
    if (title) params.title = title;
    if (image) params.image = image;

    console.log('[FitLinks] useShareIntake:', {
      webUrl: shareIntent.webUrl,
      text: shareIntent.text?.substring(0, 80),
      metaKeys: shareIntent.meta ? Object.keys(shareIntent.meta) : null,
      normalized: { url, text: text?.substring(0, 80), title, image: image?.substring(0, 60) },
    });

    resetShareIntent();

    if (!session?.user?.id) {
      setPendingRedirect({ pathname: '/import', params });
      return;
    }

    router.replace({
      pathname: '/import',
      params,
    });
  }, [authResolved, session, hasShareIntent, shareIntent, segments, router, resetShareIntent]);
}
