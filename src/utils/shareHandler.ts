/**
 * shareHandler – processes incoming deep‑link / share‑extension URLs.
 *
 * Fixed:
 *  1. iOS cold‑start triple‑fire: `Linking.getInitialURL()` can deliver
 *     the same URL through multiple code‑paths (expo‑router deep‑link
 *     matching, the Linking event listener, and the explicit
 *     getInitialURL call).  We now track the last *routed* initial URL
 *     and skip duplicates.
 *
 *  2. Payload consumption race: the native share‑extension module clears
 *     the payload after the first read.  If handleUrl fires again the
 *     payload is gone.  We cache the payload keyed by URL so subsequent
 *     reads still succeed.
 *
 *  3. Nav‑param race: on cold start the import screen mounts before the
 *     share handler finishes, so navigation params are undefined.  We
 *     now write the payload to `shareStore` which the import screen
 *     subscribes to, completely decoupling delivery from nav timing.
 */

import { Linking } from "react-native";
import { router } from "expo-router";
import { setSharePayload, type SharePayload } from "./shareStore";

// ---------------------------------------------------------------------------
// Native bridge (replace with your actual native module import)
// ---------------------------------------------------------------------------
interface NativeShareData {
  url?: string;
  text?: string;
  file?: string;
  image?: string;
  video?: string;
}

/**
 * Reads the share‑extension payload from the native module.
 * Placeholder – swap in your real native call (e.g. ShareMenu.getSharedData).
 */
async function readNativePayload(): Promise<NativeShareData> {
  // e.g. return await ShareMenu.getSharedData();
  return {};
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** The initialURL we have already routed – prevents triple‑fire. */
let _routedInitialUrl: string | null = null;

/**
 * Cache of payloads keyed by URL.  On iOS the native module clears data
 * after the first read, so we keep a copy here.
 */
const _payloadCache = new Map<string, NativeShareData>();

/** Dedupe map: dedupeKey → timestamp of last route. */
const _dedupeMap = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type UrlSource = "initialURL" | "listener";

/**
 * Main entry point.  Call from both `Linking.getInitialURL()` and the
 * `Linking.addEventListener('url', …)` callback.
 */
export async function handleUrl(
  url: string,
  source: UrlSource,
): Promise<void> {
  const ts = Date.now();
  console.log("[FL_SHARE_DIAG] handleUrl fired", { url, source, ts });

  // -----------------------------------------------------------------------
  // FIX 1 – cold‑start duplicate guard
  //
  // On iOS cold start the same initialURL is delivered up to 3 times.
  // Once we have successfully routed for a given initialURL we skip all
  // subsequent deliveries of the same URL from the "initialURL" source.
  // -----------------------------------------------------------------------
  if (source === "initialURL" && _routedInitialUrl === url) {
    console.log("[FL_SHARE_DIAG] skipping duplicate initialURL", { ts, url });
    return;
  }

  // -----------------------------------------------------------------------
  // Parse
  // -----------------------------------------------------------------------
  const parsed = parseShareUrl(url);
  if (!parsed) return;

  const { shareKey, type: sharedType } = parsed;
  console.log("[FL_SHARE_DIAG] handleUrl parsed", {
    ...parsed,
    source,
    ts,
  });

  if (!parsed.isImportLink) return;

  // -----------------------------------------------------------------------
  // FIX 2 – payload read with cache fallback
  //
  // The native share module clears data after the first read.  If we
  // already read this URL's payload we return the cached copy.
  // -----------------------------------------------------------------------
  let native: NativeShareData;
  if (_payloadCache.has(url)) {
    native = _payloadCache.get(url)!;
  } else {
    native = await readNativePayload();
    // Only cache if we actually got something.
    if (native.url || native.text || native.file || native.image || native.video) {
      _payloadCache.set(url, native);
    }
  }

  const hasUrl = !!native.url;
  const hasText = !!native.text;
  const hasFile = !!native.file;
  const hasImage = !!native.image;
  const hasVideo = !!native.video;

  console.log("[FL_SHARE_DIAG] payload read", {
    hasUrl,
    hasText,
    hasFile,
    hasImage,
    hasVideo,
    sharedType,
    shareNonce: undefined, // assigned below if we route
    status: hasUrl || hasText || hasFile || hasImage || hasVideo ? "found" : "empty",
  });

  if (!hasUrl && !hasText && !hasFile && !hasImage && !hasVideo) {
    console.log("[FL_SHARE_DIAG] not routing (empty payload)", { source, ts: Date.now() });
    return;
  }

  // -----------------------------------------------------------------------
  // Dedupe – prevent the same share from being saved twice within the
  // dedupe window (e.g. if the listener and getInitialURL both fire).
  // -----------------------------------------------------------------------
  const dedupeKey = `${url}|${sharedType}|${native.url ?? native.text ?? ""}`;
  const lastRouted = _dedupeMap.get(dedupeKey);
  const now = Date.now();
  const allowed = !lastRouted || now - lastRouted > DEDUPE_WINDOW_MS;

  console.log("[FL_SHARE_DIAG] dedupe decision", {
    allowed,
    dedupeKey,
    reason: allowed ? "ok" : "duplicate",
    ts: now,
    url,
  });

  if (!allowed) return;

  _dedupeMap.set(dedupeKey, now);
  const shareNonce = String(now);

  // -----------------------------------------------------------------------
  // FIX 3 – write payload to the store *before* navigating
  //
  // The import screen subscribes to the store, so even if it mounted
  // earlier with undefined params it will receive the payload.
  // -----------------------------------------------------------------------
  const payload: SharePayload = {
    sharedType,
    shareNonce,
    url: native.url,
    text: native.text,
    file: native.file,
    image: native.image,
    video: native.video,
  };

  setSharePayload(payload);

  console.log("[FL_SHARE_DIAG] routing to import", {
    hasText,
    hasUrl,
    shareNonce,
    sharedType,
  });

  // Navigate.  Using `replace` ensures that if expo‑router already pushed
  // /import from the deep‑link match, we update the params in place
  // rather than pushing a second instance.
  router.replace({
    pathname: "/import",
    params: { shareNonce, sharedType },
  });

  // Mark this initialURL as routed so subsequent deliveries are skipped.
  if (source === "initialURL") {
    _routedInitialUrl = url;
  }
}

// ---------------------------------------------------------------------------
// URL setup – call once from your root layout / _layout.tsx
// ---------------------------------------------------------------------------

export function setupUrlHandling(): () => void {
  // Handle the initial URL that launched the app (cold start).
  Linking.getInitialURL().then((url) => {
    if (url) handleUrl(url, "initialURL");
  });

  // Handle URLs received while the app is in the foreground.
  const sub = Linking.addEventListener("url", ({ url }) => {
    handleUrl(url, "listener");
  });

  return () => sub.remove();
}

// ---------------------------------------------------------------------------
// URL parsing helpers
// ---------------------------------------------------------------------------

interface ParsedShareUrl {
  host: string;
  pathname: string;
  shareKey: string | null;
  type: string;
  isImportLink: boolean;
}

function parseShareUrl(url: string): ParsedShareUrl | null {
  try {
    // fitlinks://import?shareKey=abc&type=weburl
    // We can't use `new URL()` because RN doesn't handle custom schemes
    // consistently, so do a manual parse.
    const withoutScheme = url.replace(/^[a-z]+:\/\//, "");
    const [hostAndPath, queryString] = withoutScheme.split("?");
    const [host, ...pathParts] = hostAndPath.split("/");
    const pathname = pathParts.join("/");
    const params = new URLSearchParams(queryString ?? "");

    return {
      host,
      pathname,
      shareKey: params.get("shareKey"),
      type: params.get("type") ?? "",
      isImportLink: host === "import",
    };
  } catch {
    console.warn("[FL_SHARE_DIAG] failed to parse URL", url);
    return null;
  }
}
