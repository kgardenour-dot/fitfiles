/**
 * /import screen – receives shared content and saves it.
 *
 * Fixed:
 *  1. Cold‑start race: subscribes to shareStore so it receives the
 *     payload even when nav params arrive late (or never).
 *
 *  2. Warm‑start save hang (Chrome): the screen dispatches a second
 *     router.replace to add sourceText/text to params.  This re‑render
 *     could cancel in‑flight saves whose useEffect cleanup ran.
 *     Fix: save state is tracked at *module* level (survives remounts
 *     and re‑renders) and the save is only started once per nonce.
 *
 *  3. Debug info leak (Safari): all diagnostic logging is gated behind
 *     __DEV__ via the logger utility.  Release builds never emit these
 *     messages, so debug overlays can't forward them to the UI.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  clearSharePayload,
  getSharePayload,
  subscribeSharePayload,
  type SharePayload,
} from "../src/utils/shareStore";
import { isShareHandlingInFlight } from "../src/utils/shareHandler";
import { navDiag, shareDiag } from "../src/utils/logger";

// ---------------------------------------------------------------------------
// Module‑level save lock.
//
// React refs reset on remount and useEffect closures can go stale during
// re‑renders caused by param updates (the second router.replace that adds
// sourceText/text).  By tracking the save at module scope the lock
// survives any number of remounts or re‑renders for the same nonce.
// ---------------------------------------------------------------------------
let _saveInProgressNonce: string | null = null;
let _saveCompletedNonces = new Set<string>();

const PAYLOAD_TIMEOUT_MS = 3_000;
const SAVE_TIMEOUT_MS = 15_000;

export default function ImportScreen() {
  const params = useLocalSearchParams<{
    shareNonce?: string;
    sharedType?: string;
  }>();

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Track which nonces this component instance has accepted, so we don't
  // re‑set state for a nonce that was already handed off to save.
  const acceptedNonce = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Subscribe to the share store (handles both cold and warm start).
  //
  // On cold start the store gets written *after* this screen mounts.
  // On warm start the store is written before the replace navigation
  // triggers a remount, so `subscribeSharePayload` delivers it
  // synchronously via the existing‐payload check.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeSharePayload((incoming) => {
      if (acceptedNonce.current === incoming.shareNonce) return;
      if (_saveCompletedNonces.has(incoming.shareNonce)) return;
      acceptedNonce.current = incoming.shareNonce;
      setPayload(incoming);
    });

    return unsubscribe;
  }, []);

  // 2. Fallback: if the store was written before this instance mounted
  //    AND the subscription's synchronous delivery was missed (e.g. a
  //    fast remount), check params + store on param change.
  useEffect(() => {
    if (payload) return; // already have it
    if (!params.shareNonce) return;

    const stored = getSharePayload();
    if (stored && stored.shareNonce === params.shareNonce) {
      if (acceptedNonce.current !== stored.shareNonce &&
          !_saveCompletedNonces.has(stored.shareNonce)) {
        acceptedNonce.current = stored.shareNonce;
        setPayload(stored);
      }
    }
  }, [params.shareNonce, payload]);

  // 3. Last resort: if the share handler is still in‑flight (warm start
  //    race), poll briefly until the store is populated.
  useEffect(() => {
    if (payload) return;

    // Only poll if the handler is actively processing.
    if (!isShareHandlingInFlight()) return;

    const interval = setInterval(() => {
      const stored = getSharePayload();
      if (stored && acceptedNonce.current !== stored.shareNonce &&
          !_saveCompletedNonces.has(stored.shareNonce)) {
        acceptedNonce.current = stored.shareNonce;
        setPayload(stored);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [payload]);

  // ---------------------------------------------------------------------------
  // Focus / mount diagnostics (dev only)
  // ---------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      navDiag("import focus", {
        params: { shareNonce: params.shareNonce, sharedType: params.sharedType },
        ts: Date.now(),
      });
    }, [params.shareNonce, params.sharedType]),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      navDiag("import still mounted after 500ms", { ts: Date.now() });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Payload timeout – if we STILL have nothing after PAYLOAD_TIMEOUT_MS,
  // show an error rather than spinning forever.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (payload) return;

    const timer = setTimeout(() => {
      if (!payload) {
        navDiag("import timed out waiting for payload", { ts: Date.now() });
        setError("Unable to read shared content. Please try again.");
      }
    }, PAYLOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [payload]);

  // ---------------------------------------------------------------------------
  // Save logic – module‑level lock ensures exactly one save per nonce.
  //
  // Key invariant: even if the component re‑renders (from the second
  // router.replace that adds sourceText/text) or fully remounts, the
  // module‑level `_saveInProgressNonce` prevents a second concurrent save
  // for the same nonce.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!payload) return;

    const { shareNonce } = payload;

    // Already saved or saving this nonce – nothing to do.
    if (_saveCompletedNonces.has(shareNonce)) return;
    if (_saveInProgressNonce === shareNonce) return;

    _saveInProgressNonce = shareNonce;
    setSaving(true);

    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      _saveInProgressNonce = null;
      setSaving(false);
      setError("Save timed out. Please try again.");
    }, SAVE_TIMEOUT_MS);

    (async () => {
      try {
        shareDiag("performSave start", { shareNonce });
        await performSave(payload);

        if (didTimeout) return; // timeout already fired, bail
        clearTimeout(timeoutId);

        _saveCompletedNonces.add(shareNonce);
        _saveInProgressNonce = null;
        clearSharePayload();

        shareDiag("performSave success", { shareNonce });

        // Navigate away on success.
        router.replace("/");
      } catch (e: any) {
        if (didTimeout) return;
        clearTimeout(timeoutId);

        _saveInProgressNonce = null;
        setSaving(false);
        shareDiag("performSave error", { shareNonce, error: e.message });
        setError(e.message ?? "Save failed. Please try again.");
      }
    })();

    // Cleanup: if the component unmounts while the save is in‑flight we
    // do NOT cancel it.  The module‑level lock keeps running and the
    // next mount will see _saveInProgressNonce === shareNonce and skip.
    return () => {
      clearTimeout(timeoutId);
    };
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
      <Text style={styles.label}>
        {saving ? "Saving\u2026" : "Loading\u2026"}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Placeholder save – replace with your real persistence logic.
// ---------------------------------------------------------------------------
async function performSave(payload: SharePayload): Promise<void> {
  // TODO: implement actual save logic
  shareDiag("performSave", payload);
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "red", fontSize: 16, textAlign: "center", padding: 20 },
  label: { marginTop: 12, fontSize: 16 },
});
