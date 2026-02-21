/**
 * /import screen – receives shared content and saves it.
 *
 * Fixed for iOS cold‑start:
 *  - On cold start, expo‑router mounts this screen from the deep link
 *    *before* the share handler has processed the payload, so navigation
 *    params (shareNonce, sharedType) are undefined on first render.
 *  - We now subscribe to `shareStore` which delivers the payload as soon
 *    as the share handler writes it, regardless of mount timing.
 *  - Navigation params are still honoured as a secondary source for warm
 *    starts where the share handler runs before the screen mounts.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  clearSharePayload,
  getSharePayload,
  subscribeSharePayload,
  type SharePayload,
} from "../src/utils/shareStore";

const MOUNT_TIMEOUT_MS = 3_000;

export default function ImportScreen() {
  const params = useLocalSearchParams<{
    shareNonce?: string;
    sharedType?: string;
  }>();

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processedNonce = useRef<string | null>(null);
  const mountedAt = useRef(Date.now());

  // ---------------------------------------------------------------------------
  // FIX: Subscribe to the share store so we get the payload even if
  // nav params arrive late (or never, on cold start).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeSharePayload((incoming) => {
      // Only accept each nonce once.
      if (processedNonce.current === incoming.shareNonce) return;
      processedNonce.current = incoming.shareNonce;
      setPayload(incoming);
    });

    return unsubscribe;
  }, []);

  // Also check nav params for warm‑start cases where the store was
  // written *before* this screen mounted and subscribed.
  useEffect(() => {
    if (params.shareNonce && !payload) {
      const stored = getSharePayload();
      if (stored && stored.shareNonce === params.shareNonce) {
        if (processedNonce.current !== stored.shareNonce) {
          processedNonce.current = stored.shareNonce;
          setPayload(stored);
        }
      }
    }
  }, [params.shareNonce, payload]);

  // ---------------------------------------------------------------------------
  // Focus diagnostics (matches existing FL_NAV_DIAG logs)
  // ---------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      console.log("[FL_NAV_DIAG] import focus", {
        params: {
          shareNonce: params.shareNonce,
          sharedType: params.sharedType,
        },
        ts: Date.now(),
      });
    }, [params.shareNonce, params.sharedType]),
  );

  // ---------------------------------------------------------------------------
  // Timeout: if we still have no payload after MOUNT_TIMEOUT_MS, show error.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!payload) {
        console.log("[FL_NAV_DIAG] import timed out waiting for payload", {
          ts: Date.now(),
        });
        setError("Unable to read shared content. Please try again.");
      }
    }, MOUNT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [payload]);

  // Log the 500ms "still mounted" diagnostic.
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[FL_NAV_DIAG] import still mounted after 500ms", {
        ts: Date.now(),
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Save logic – runs once when we have a payload.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!payload) return;

    (async () => {
      try {
        await performSave(payload);
        clearSharePayload();
        // Navigate away on success, e.g. router.replace('/');
      } catch (e: any) {
        setError(e.message ?? "Save failed");
      }
    })();
  }, [payload]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.label}>Saving…</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Placeholder save – replace with your real persistence logic.
// ---------------------------------------------------------------------------
async function performSave(payload: SharePayload): Promise<void> {
  // TODO: implement actual save logic
  console.log("[FL_SHARE_DIAG] performSave", payload);
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "red", fontSize: 16, textAlign: "center", padding: 20 },
  label: { marginTop: 12, fontSize: 16 },
});
