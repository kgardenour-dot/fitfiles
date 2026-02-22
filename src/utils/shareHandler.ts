/**
 * shareHandler – processes incoming deep‑link / share‑extension URLs.
 *
 * Fixed:
 *  1. iOS cold‑start triple‑fire: `Linking.getInitialURL()` can deliver
 *     the same URL through multiple code‑paths.  We track the last
 *     *routed* URL per source and skip duplicates.
 *
 *  2. Payload consumption race: the native share‑extension module clears
 *     the payload after the first read.  We cache the payload keyed by
 *     URL so subsequent reads still succeed.
 *
 *  3. Nav‑param race: on cold start the import screen mounts before the
 *     share handler finishes, so navigation params are undefined.  We
 *     write the payload to `shareStore` which the import screen
 *     subscribes to, completely decoupling delivery from nav timing.
 *
 *  4. Warm‑start urlEvent: on warm start, expo‑router independently
 *     routes to /import when it sees the deep link, racing the share
 *     handler.  The handler now marks routing as "in‑flight" so the
 *     import screen knows to wait for the store rather than bail.
 *
 *  5. Diagnostic logging gated behind __DEV__ via logger.ts so release
 *     builds never leak debug info into the app UI.
 */

import { Linking } from "react-native";
import { router } from "expo-router";
import { setSharePayload, type SharePayload } from "./shareStore";
import { shareDiag } from "./logger";

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

/**
 * The last URL we have already routed, keyed by source.
 * Prevents triple‑fire on cold start AND double‑fire on warm start.
 */
const _routedUrls = new Map<string, string>();

/**
 * Cache of payloads keyed by URL.  On iOS the native module clears data
 * after the first read, so we keep a copy here.
 */
const _payloadCache = new Map<string, NativeShareData>();

/** Dedupe map: dedupeKey → timestamp of last route. */
const _dedupeMap = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2_000;

/**
 * Set to `true` while handleUrl is processing.  The import screen checks
 * this to decide whether to wait for the store vs. bail immediately.
 */
let _handlingInFlight = false;
export function isShareHandlingInFlight(): boolean {
  return _handlingInFlight;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type UrlSource = "initialURL" | "urlEvent" | "listener";

/**
 * Main entry point.  Call from both `Linking.getInitialURL()` and the
 * `Linking.addEventListener('url', …)` callback.
 */
export async function handleUrl(
  url: string,
  source: UrlSource,
): Promise<void> {
  const ts = Date.now();
  shareDiag("handleUrl fired", { url, source, ts });

  // -----------------------------------------------------------------------
  // FIX 1 – duplicate guard (cold‑start AND warm‑start)
  //
  // On cold start the same initialURL fires up to 3 times.  On warm start
  // the same urlEvent can fire twice.  Once we have successfully routed
  // for a URL from a given source we skip further deliveries.
  // -----------------------------------------------------------------------
  if (_routedUrls.get(source) === url) {
    shareDiag("skipping duplicate URL", { ts, url, source });
    return;
  }

  _handlingInFlight = true;

  try {
    await _processUrl(url, source, ts);
  } finally {
    _handlingInFlight = false;
  }
}

async function _processUrl(
  url: string,
  source: UrlSource,
  ts: number,
): Promise<void> {
  // -----------------------------------------------------------------------
  // Parse
  // -----------------------------------------------------------------------
  const parsed = parseShareUrl(url);
  if (!parsed) return;

  const { type: sharedType } = parsed;
  shareDiag("handleUrl parsed", { ...parsed, source, ts });

  if (!parsed.isImportLink) return;

  // -----------------------------------------------------------------------
  // FIX 2 – payload read with cache fallback
  // -----------------------------------------------------------------------
  let native: NativeShareData;
  if (_payloadCache.has(url)) {
    native = _payloadCache.get(url)!;
  } else {
    native = await readNativePayload();
    if (native.url || native.text || native.file || native.image || native.video) {
      _payloadCache.set(url, native);
    }
  }

  const hasUrl = !!native.url;
  const hasText = !!native.text;
  const hasFile = !!native.file;
  const hasImage = !!native.image;
  const hasVideo = !!native.video;

  shareDiag("payload read", {
    hasUrl,
    hasText,
    hasFile,
    hasImage,
    hasVideo,
    sharedType,
    shareNonce: undefined,
    status: hasUrl || hasText || hasFile || hasImage || hasVideo ? "found" : "empty",
  });

  if (!hasUrl && !hasText && !hasFile && !hasImage && !hasVideo) {
    shareDiag("not routing (empty payload)", { source, ts: Date.now() });
    return;
  }

  // -----------------------------------------------------------------------
  // Dedupe
  // -----------------------------------------------------------------------
  const dedupeKey = `${url}|${sharedType}|${native.url ?? native.text ?? ""}`;
  const lastRouted = _dedupeMap.get(dedupeKey);
  const now = Date.now();
  const allowed = !lastRouted || now - lastRouted > DEDUPE_WINDOW_MS;

  shareDiag("dedupe decision", {
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

  shareDiag("routing to import", { hasText, hasUrl, shareNonce, sharedType });

  router.replace({
    pathname: "/import",
    params: { shareNonce, sharedType },
  });

  // Mark as routed so subsequent deliveries of the same URL are skipped.
  _routedUrls.set(source, url);
}

// ---------------------------------------------------------------------------
// URL setup – call once from your root layout / _layout.tsx
// ---------------------------------------------------------------------------

export function setupUrlHandling(): () => void {
  Linking.getInitialURL().then((url) => {
    if (url) handleUrl(url, "initialURL");
  });

  const sub = Linking.addEventListener("url", ({ url }) => {
    handleUrl(url, "urlEvent");
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
    shareDiag("failed to parse URL", url);
    return null;
  }
}
