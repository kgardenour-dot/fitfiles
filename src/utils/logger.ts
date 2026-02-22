/**
 * Diagnostic logger – gates [FL_SHARE_DIAG] / [FL_NAV_DIAG] output behind
 * __DEV__ so that diagnostic messages never appear in production builds.
 *
 * This fixes the "I saw debugging info on my app" issue: in release builds
 * these calls become no-ops, so even if a debug overlay forwards
 * console.log to the UI, these messages won't appear.
 */

/* eslint-disable no-console */

function noop(..._args: unknown[]): void {
  // intentionally empty
}

export const shareDiag: typeof console.log = __DEV__
  ? (...args: unknown[]) => console.log("[FL_SHARE_DIAG]", ...args)
  : noop;

export const navDiag: typeof console.log = __DEV__
  ? (...args: unknown[]) => console.log("[FL_NAV_DIAG]", ...args)
  : noop;
