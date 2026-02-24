import * as SecureStore from 'expo-secure-store';

const PENDING_REDIRECT_KEY = 'PENDING_REDIRECT';

export interface PendingRedirect {
  pathname: string;
  params?: Record<string, string>;
}

export async function setPendingRedirect(data: { pathname: string; params?: Record<string, string> }): Promise<void> {
  try {
    await SecureStore.setItemAsync(PENDING_REDIRECT_KEY, JSON.stringify(data));
  } catch {
    // Keychain may be unavailable during app transitions (e.g. share extension → foreground)
  }
}

export async function getPendingRedirect(): Promise<PendingRedirect | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_REDIRECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingRedirect;
    if (typeof parsed.pathname !== 'string') return null;
    if (parsed.params != null && typeof parsed.params !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingRedirect(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_REDIRECT_KEY);
  } catch {
    // Keychain may be unavailable during app transitions
  }
}
