let lastHandledAt = 0;

export function shouldHandleLegacyShare(ttlMs = 1200): boolean {
  const now = Date.now();
  if (now - lastHandledAt < ttlMs) return false;
  lastHandledAt = now;
  return true;
}
