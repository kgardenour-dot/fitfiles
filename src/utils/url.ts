/**
 * Parse legacy FitLinks share deep link: fitlinks://dataUrl=<key>#<type>
 * Examples:
 *   fitlinks://dataUrl=fitlinksShareKey#weburl
 *   fitlinks://dataUrl=fitlinksShareKey#text
 *   fitlinks://dataUrl=fitlinksShareKey (no fragment)
 */
export function normalizeShareUrl(rawUrl: string): { sharedKey: string; sharedType?: string } | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const prefix = 'fitlinks://dataUrl=';
  if (!rawUrl.startsWith(prefix)) return null;
  const rest = rawUrl.slice(prefix.length);
  const hashIdx = rest.indexOf('#');
  const sharedKey = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;
  if (!sharedKey.trim()) return null;
  const sharedType = hashIdx >= 0 ? rest.slice(hashIdx + 1).trim() || undefined : undefined;
  return { sharedKey: sharedKey.trim(), sharedType };
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
