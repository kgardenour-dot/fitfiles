import { NativeModules, Platform } from 'react-native';

export interface SharedPayload {
  type: string;
  value: string;
  raw?: string;
  shareNonce?: string;
}

const SharedItems = NativeModules.SharedItems as {
  getSharedPayload: (
    sharedKey: string,
    sharedType?: string | null
  ) => Promise<SharedPayload | null>;
  clearSharedPayload: (sharedKey: string) => Promise<void>;
  readAndClearSharedPayload: (
    sharedKey: string,
    sharedType?: string | null
  ) => Promise<SharedPayload | null>;
} | null;

/**
 * Read shared payload from App Group UserDefaults (iOS only).
 * Returns null on Android or when no payload exists.
 * 
 * NOTE: This does NOT clear the payload. Use readAndClearSharedPayload() for atomic read+clear.
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
 * 
 * Clears the main shared key written by the Share Extension.
 */
export async function clearSharedPayload(sharedKey: string): Promise<void> {
  if (Platform.OS !== 'ios' || !SharedItems?.clearSharedPayload) {
    return;
  }
  await SharedItems.clearSharedPayload(sharedKey);
}

/**
 * Atomically read and clear shared payload from App Group UserDefaults (iOS only).
 * Returns null on Android or when no payload exists.
 * 
 * This ensures the payload is cleared immediately after reading,
 * preventing duplicate processing on warm start.
 */
export async function readAndClearSharedPayload(
  sharedKey: string,
  sharedType?: string | null
): Promise<SharedPayload | null> {
  if (Platform.OS !== 'ios' || !SharedItems?.readAndClearSharedPayload) {
    return null;
  }
  return SharedItems.readAndClearSharedPayload(sharedKey, sharedType ?? null);
}
