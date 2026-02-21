/**
 * shareStore – a lightweight reactive store that decouples the share‐
 * extension payload from navigation params.
 *
 * Why: On iOS cold start, expo‐router mounts the /import screen
 * *before* the share handler has finished reading the payload.  Navigation
 * params arrive too late (or not at all if we're already at /import).
 * The store lets the import screen subscribe to payload updates
 * regardless of navigation timing.
 */

export interface SharePayload {
  sharedType: string;
  shareNonce: string;
  url?: string;
  text?: string;
  file?: string;
  image?: string;
  video?: string;
}

type Listener = (payload: SharePayload) => void;

let _current: SharePayload | null = null;
const _listeners = new Set<Listener>();

/** Write a new payload into the store and notify all subscribers. */
export function setSharePayload(payload: SharePayload): void {
  _current = payload;
  _listeners.forEach((fn) => fn(payload));
}

/** Read the current payload (may be null if nothing shared yet). */
export function getSharePayload(): SharePayload | null {
  return _current;
}

/**
 * Subscribe to payload changes.  Returns an unsubscribe function.
 * If a payload already exists at subscribe‐time the listener is
 * called synchronously so the import screen can pick it up immediately.
 */
export function subscribeSharePayload(listener: Listener): () => void {
  _listeners.add(listener);

  // Deliver the existing payload immediately so the import screen
  // doesn't miss data that arrived before it subscribed.
  if (_current) {
    listener(_current);
  }

  return () => {
    _listeners.delete(listener);
  };
}

/** Clear the store after the import screen has consumed the payload. */
export function clearSharePayload(): void {
  _current = null;
}
