/**
 * Many social CDNs (Instagram, TikTok) reject hotlinked image requests that omit
 * a browser-like Referer. React Native Image does not send Referer by default.
 */
export function getImageHeadersForThumbnailUrl(
  uri: string | null | undefined,
): Record<string, string> | undefined {
  if (!uri || !/^https?:\/\//i.test(uri)) return undefined;
  try {
    const host = new URL(uri).hostname.toLowerCase();
    if (host.includes('instagram.com') || host.includes('cdninstagram') || host.includes('fbcdn.net')) {
      return { Referer: 'https://www.instagram.com/' };
    }
    if (
      host.includes('tiktok.com')
      || host.includes('tiktokcdn')
      || host.includes('ttwstatic')
      || host.includes('muscdn')
      || host.includes('bytecdn')
    ) {
      return { Referer: 'https://www.tiktok.com/' };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** React Native `Image` `source` for a remote thumbnail URL. */
export function thumbnailImageSource(uri: string): { uri: string; headers?: Record<string, string> } {
  const headers = getImageHeadersForThumbnailUrl(uri);
  return headers ? { uri, headers } : { uri };
}
