/**
 * Parse FitLinks share deep links.
 * Supports:
 *   - Legacy: fitlinks://dataUrl=<key>#<type>
 *   - Route-based: fitlinks://import?shareKey=<key>&type=<type>
 * Examples:
 *   fitlinks://dataUrl=fitlinksShareKey#weburl
 *   fitlinks://dataUrl=fitlinksShareKey#text
 *   fitlinks://dataUrl=fitlinksShareKey (no fragment)
 *   fitlinks://import?shareKey=fitlinksShareKey&type=weburl
 */
export function normalizeShareUrl(rawUrl: string): { sharedKey: string; sharedType?: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const legacyPrefix = 'fitlinks://dataUrl=';
  if (rawUrl.startsWith(legacyPrefix)) {
    const rest = rawUrl.slice(legacyPrefix.length);
    const hashIdx = rest.indexOf('#');
    const sharedKey = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;
    if (!sharedKey.trim()) return null;
    const sharedType = hashIdx >= 0 ? rest.slice(hashIdx + 1).trim() || undefined : undefined;
    return { sharedKey: sharedKey.trim(), sharedType };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.host ?? '';
    const path = parsed.pathname.replace(/^\/+/, '');
    if (host !== 'import' && path !== 'import') return null;

    const sharedKey = parsed.searchParams.get('shareKey')?.trim();
    if (!sharedKey) return null;

    const sharedType = parsed.searchParams.get('type')?.trim() || undefined;
    return { sharedKey, sharedType };
  } catch {
    return null;
  }
}

/**
 * Extract the first URL from a text string.
 * Handles trailing punctuation that may be included in the match.
 */
export function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0].replace(/[.,;:!?)]+$/, '') : null;
}
