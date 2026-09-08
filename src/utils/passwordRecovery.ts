let recoveryActive = false;

export function setPasswordRecoveryActive(value: boolean): void {
  recoveryActive = value;
}

export function isPasswordRecoveryActive(): boolean {
  return recoveryActive;
}

export type AuthCallbackParams = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  type?: string;
};

/**
 * Parse a Supabase auth redirect (password recovery).
 * Ignores share-extension URLs (`fitlinks://dataUrl=...`).
 */
export function parseAuthCallbackUrl(rawUrl: string): AuthCallbackParams | null {
  if (!rawUrl || rawUrl.includes('dataUrl=')) return null;

  const hashIdx = rawUrl.indexOf('#');
  const queryIdx = rawUrl.indexOf('?');
  let search = '';
  if (hashIdx >= 0) {
    search = rawUrl.slice(hashIdx + 1);
  } else if (queryIdx >= 0) {
    search = rawUrl.slice(queryIdx + 1);
  }
  if (!search) return null;

  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const accessToken = params.get('access_token') ?? undefined;
  const refreshToken = params.get('refresh_token') ?? undefined;
  const code = params.get('code') ?? undefined;
  const type = params.get('type') ?? undefined;

  if (!accessToken && !refreshToken && !code) return null;
  return { accessToken, refreshToken, code, type };
}

export function isPasswordRecoveryCallback(parsed: AuthCallbackParams, rawUrl: string): boolean {
  if (parsed.type === 'recovery') return true;
  const isResetPath = /reset-password/i.test(rawUrl);
  if (isResetPath && (parsed.code || (parsed.accessToken && parsed.refreshToken))) return true;
  return false;
}
