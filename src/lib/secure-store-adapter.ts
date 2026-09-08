import * as SecureStore from 'expo-secure-store';

/** Stay under the iOS Keychain 2048-byte limit per value. */
const CHUNK_SIZE = 1800;
const KEYS_SUFFIX = '_keys';
const CHUNK_SUFFIX = '_chunk_';

function isChunkedMarker(value: string): boolean {
  return value.startsWith('CHUNKED:');
}

async function deleteQuietly(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Key may not exist.
  }
}

/**
 * SecureStore adapter that splits large values (Supabase session JSON)
 * so iOS persistence does not fail silently at the 2048-byte cap.
 */
export const chunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const keysJson = await SecureStore.getItemAsync(`${key}${KEYS_SUFFIX}`);
    if (keysJson) {
      try {
        const chunkKeys = JSON.parse(keysJson) as unknown;
        if (Array.isArray(chunkKeys) && chunkKeys.every((k) => typeof k === 'string')) {
          const parts = await Promise.all(chunkKeys.map((k) => SecureStore.getItemAsync(k)));
          if (parts.some((p) => p == null)) return null;
          return parts.join('');
        }
      } catch {
        return null;
      }
    }

    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    if (isChunkedMarker(raw)) {
      const count = Number.parseInt(raw.slice('CHUNKED:'.length), 10);
      if (!Number.isFinite(count) || count < 1) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(`${key}${CHUNK_SUFFIX}${i}`);
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    }
    return raw;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await chunkedSecureStoreAdapter.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunkKeys: string[] = [];
    for (let i = 0, chunkIndex = 0; i < value.length; i += CHUNK_SIZE, chunkIndex += 1) {
      const chunkKey = `${key}${CHUNK_SUFFIX}${chunkIndex}`;
      chunkKeys.push(chunkKey);
      await SecureStore.setItemAsync(chunkKey, value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}${KEYS_SUFFIX}`, JSON.stringify(chunkKeys));
  },

  removeItem: async (key: string): Promise<void> => {
    const keysJson = await SecureStore.getItemAsync(`${key}${KEYS_SUFFIX}`);
    if (keysJson) {
      try {
        const chunkKeys = JSON.parse(keysJson) as unknown;
        if (Array.isArray(chunkKeys)) {
          await Promise.all(
            chunkKeys.filter((k): k is string => typeof k === 'string').map(deleteQuietly),
          );
        }
      } catch {
        // Ignore malformed keys index and still drop the primary entries.
      }
      await deleteQuietly(`${key}${KEYS_SUFFIX}`);
    }

    const raw = await SecureStore.getItemAsync(key);
    if (raw && isChunkedMarker(raw)) {
      const count = Number.parseInt(raw.slice('CHUNKED:'.length), 10);
      if (Number.isFinite(count) && count > 0) {
        await Promise.all(
          Array.from({ length: count }, (_, i) => deleteQuietly(`${key}${CHUNK_SUFFIX}${i}`)),
        );
      }
    }
    await deleteQuietly(key);
  },
};
