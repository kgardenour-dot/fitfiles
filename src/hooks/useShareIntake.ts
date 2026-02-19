import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { extractFirstUrl } from '../utils/url';

/**
 * Normalizes share intent payload into { url?, text?, title? }.
 */
function normalizePayload(shareIntent: {
  webUrl?: string | null;
  text?: string | null;
  meta?: { title?: string } | null;
}): { url?: string; text?: string; title?: string } {
  const url = shareIntent.webUrl?.trim() || extractFirstUrl(shareIntent.text ?? '') || undefined;
  const text = shareIntent.text?.trim() || undefined;
  const title = shareIntent.meta?.title?.trim() || undefined;
  return { url, text, title };
}

/**
 * Hook to receive share intents and navigate to /import.
 * Mount once at the root of the Stack layout.
 * Only navigates when there is a new share payload, current route is not /import,
 * and user is logged in.
 */
export function useShareIntake(session: { user?: { id?: string } } | null) {
  const router = useRouter();
  const segments = useSegments();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!session?.user?.id || !hasShareIntent || !shareIntent) return;

    const path = '/' + segments.filter(Boolean).join('/');
    const isImportRoute = path.includes('/import');
    if (isImportRoute) return;

    const { url, text, title } = normalizePayload(shareIntent);

    router.push({
      pathname: '/import',
      params: {
        ...(url && { url }),
        ...(text && { text }),
        ...(title && { title }),
      },
    });

    resetShareIntent();
  }, [session, hasShareIntent, shareIntent, segments, router, resetShareIntent]);
}
