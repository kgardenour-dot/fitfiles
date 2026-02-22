/**
 * Global share deduplication utility to prevent duplicate processing
 * of the same share payload on warm start.
 * 
 * Implements two strategies:
 * 1. Key-based: If a dedupe key is present, block duplicates within 10 seconds
 * 2. Time-based fallback: If no key, block any event within 1500ms
 */

interface LastHandled {
  key?: string;
  ts: number;
}

export interface ShareDedupeDecision {
  allowed: boolean;
  reason: 'key_duplicate_10s' | 'time_duplicate_1500ms' | 'ok';
}

let lastHandled: LastHandled = { ts: 0 };

/**
 * Check if a share should be handled based on key or time window.
 * Updates internal state on accept.
 * 
 * @param key - Optional dedupe key for the share payload/event
 * @returns dedupe decision with allow/block reason
 */
export function shouldHandleShare(key?: string): ShareDedupeDecision {
  const now = Date.now();

  if (key) {
    // Key-based dedupe: block same key within 10 seconds
    if (lastHandled.key === key && now - lastHandled.ts < 10000) {
      return { allowed: false, reason: 'key_duplicate_10s' };
    }
  } else {
    // Time-based fallback: block any event within 1500ms
    if (now - lastHandled.ts < 1500) {
      return { allowed: false, reason: 'time_duplicate_1500ms' };
    }
  }

  // Accept and record
  lastHandled = { key, ts: now };
  return { allowed: true, reason: 'ok' };
}

/**
 * Reset dedupe state (for testing only)
 */
export function resetShareDedupe(): void {
  lastHandled = { ts: 0 };
}
