import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { extractFirstUrl } from '../utils/url';

/**
 * Normalizes share intent payload into { url?, text?, title?, image? }.
 * Extracts og:image from the meta JSON when available.
 */
function normalizePayload(shareIntent: {
  webUrl?: string | null;
  text?: string | null;
  meta?: { title?: string; [key: string]: unknown } | null;
}): { url?: string; text?: string; title?: string; image?: string } {
  const url = shareIntent.webUrl?.trim() || extractFirstUrl(shareIntent.text ?? '') || undefined;
  const text = shareIntent.text?.trim() || undefined;
  const title = shareIntent.meta?.title?.trim() || undefined;
  // Extract og:image from meta (expo-share-intent parses the preprocessor JSON into meta)
  const ogImage = (shareIntent.meta as Record<string, unknown> | null | undefined)?.['og:image'];
  const image = typeof ogImage === 'string' && ogImage.trim() ? ogImage.trim() : undefined;
  return { url, text, title, image };
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

    const { url, text, title, image } = normalizePayload(shareIntent);

    router.push({
      pathname: '/import',
      params: {
        ...(url && { url }),
        ...(text && { text }),
        ...(title && { title }),
        ...(image && { image }),
      },
    });

    resetShareIntent();
  }, [session, hasShareIntent, shareIntent, segments, router, resetShareIntent]);
}
