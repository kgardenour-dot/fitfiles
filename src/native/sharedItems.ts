import { NativeModules, Platform } from 'react-native';

export interface SharedPayload {
  type: string;
  value: string;
  raw?: string;
  meta?: string;
}

const SharedItems = NativeModules.SharedItems as {
  getSharedPayload: (
    sharedKey: string,
    sharedType?: string | null
  ) => Promise<SharedPayload | null>;
  clearSharedPayload: (sharedKey: string) => Promise<void>;
} | null;

/**
 * Read shared payload from App Group UserDefaults (iOS only).
 * Returns null on Android or when no payload exists.
 */
export async function getSharedPayload(
  sharedKey: string,
  sharedType?: string | null
): Promise<SharedPayload | null> {
  if (Platform.OS !== 'ios' || !SharedItems?.getSharedPayload) {
    return null;
  }
  return SharedItems.getSharedPayload(sharedKey, sharedType ?? null);
}

/**
 * Clear shared payload from App Group UserDefaults (iOS only).
 * No-op on Android.
 */
export async function clearSharedPayload(sharedKey: string): Promise<void> {
  if (Platform.OS !== 'ios' || !SharedItems?.clearSharedPayload) {
    return;
  }
  await SharedItems.clearSharedPayload(sharedKey);
}
