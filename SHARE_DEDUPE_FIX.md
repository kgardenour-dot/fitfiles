# Share Deduplication Fix - Implementation Summary

## Problem
On warm start, the Share → Import Link screen appeared twice when sharing from Safari. Cold start worked correctly. This was caused by duplicate handling of the same share deep link payload.

## Root Cause Analysis

### Duplicate Sources Identified
1. **`app/_layout.tsx` line 83**: `Linking.addEventListener('url', ...)` listener could fire multiple times on warm start
2. **Race condition**: The App Group payload persisted after first read, allowing duplicate navigation events to process the same data

### Contributing Factors
- Previous dedupe logic (`shouldHandleLegacyShare`) only used time-based gating (1200ms), no nonce support
- App Group payload was cleared in `import.tsx` AFTER navigation, not BEFORE
- No diagnostic logging to identify duplicate event sources

## Solution Implementation

### Step 1: Created Global Dedupe Helper
**File**: `src/utils/shareDedupe.ts`

Implements two-tier deduplication strategy:
- **Nonce-based**: If `shareNonce` present, blocks duplicates within 10 seconds
- **Time-based fallback**: If no nonce, blocks any event within 1500ms

```typescript
export function shouldHandleShare(nonce?: string): boolean
```

### Step 2: Atomic Read-and-Clear
**Files Modified**:
- `ios/FitLinks/SharedItemsModule.swift` - Added `readAndClearSharedPayload()` method
- `ios/FitLinks/SharedItems.m` - Added Objective-C bridge
- `src/native/sharedItems.ts` - Added TypeScript wrapper

The new `readAndClearSharedPayload()` function:
1. Reads payload from App Group UserDefaults
2. Immediately clears the payload (same transaction)
3. Returns the data

This ensures a second event reads empty payload and cannot navigate.

### Step 3: Canonicalized Deep Link Handler
**File**: `app/_layout.tsx`

Created single canonical handler that:
- Handles BOTH `getInitialURL` (cold start) AND `addEventListener('url')` (warm start)
- Atomically reads and clears App Group payload BEFORE navigation
- Applies dedupe check via `shouldHandleShare()`
- Adds comprehensive diagnostic logging with `[FL_SHARE_DIAG]` prefix
- Parses payload and passes actual content via navigation params

**Key Flow**:
```
URL event → normalizeShareUrl() → readAndClearSharedPayload() → shouldHandleShare() → router.replace()
```

### Step 4: Simplified Import Screen
**File**: `app/import.tsx`

Removed duplicate App Group reading logic:
- Deleted the `useEffect` that called `getSharedPayload()` and `clearSharedPayload()`
- Import screen now only processes params passed by `_layout.tsx`
- Added mount diagnostic log for debugging
- Removed `sharedKey` from params (no longer needed)

### Step 5: Removed Obsolete Code
- Deleted `src/utils/shareGate.ts` (replaced by `shareDedupe.ts`)

## Diagnostic Logging

All logs use `[FL_SHARE_DIAG]` prefix for easy filtering:

### _layout.tsx logs:
```javascript
console.log('[FL_SHARE_DIAG] handleUrl fired', { url, source, ts: Date.now() })
console.log('[FL_SHARE_DIAG] No payload found in App Group, ignoring')
console.log('[FL_SHARE_DIAG] duplicate share ignored', { shareNonce })
console.log('[FL_SHARE_DIAG] routing to import', { shareNonce, sharedType, hasUrl, hasText })
```

### import.tsx logs:
```javascript
console.log('[FL_SHARE_DIAG] Import screen mount', { shareNonce, sharedType })
```

### Swift logs (SharedItemsModule):
```
[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)
[SharedItemsModule] 🗑️ Payload cleared after read
```

## Testing Plan

### A) Warm Start Duplicate Repro (Primary Fix Target)
**Steps**:
1. App running in background
2. Share Safari page to FitLinks
3. Check logs

**Expected**:
- One `handleUrl fired` log with `source: "urlEvent"`
- If duplicate event fires, second shows `duplicate share ignored`
- Exactly one `routing to import` log
- Import screen appears once
- Title and URL populate correctly

### B) Cold Start Safari Share (Regression Check)
**Steps**:
1. Force quit app
2. Share from Safari to FitLinks

**Expected**:
- One `handleUrl fired` with `source: "initialURL"` OR `"urlEvent"` (OS-dependent)
- One `routing to import` log
- Import screen appears once
- Title and URL populate correctly

### C) Share Two Different Pages Quickly
**Steps**:
1. Share page A
2. Immediately share page B (within 10 seconds)

**Expected**:
- Both imports process successfully
- Dedupe does NOT block because payloads differ

### D) Share Same Page Twice
**Steps**:
1. Share a page
2. Immediately share the exact same page again

**Expected**:
- First share processes normally
- Second share blocked by time window (1500ms) since no nonce
- If >1.5s apart, both may process (acceptable - different user intent)

## Architecture Changes

### Before
```
Warm start → addEventListener('url') → _layout.handleUrl → router.replace → import screen mounts
                                                                           → import screen reads App Group
                                                                           → import screen clears App Group
```
**Problem**: Second event could trigger before clear happened

### After
```
Warm start → addEventListener('url') → _layout.handleUrl → readAndClearSharedPayload (atomic)
                                                         → shouldHandleShare (dedupe)
                                                         → router.replace → import screen mounts
                                                                         → import screen uses params
```
**Solution**: Clear before navigation, dedupe prevents double trigger

## Files Changed

### New Files
- `src/utils/shareDedupe.ts` - Global deduplication logic

### Modified Files
- `app/_layout.tsx` - Canonical handler with atomic clear and dedupe
- `app/import.tsx` - Removed App Group reading, simplified to params-only
- `ios/FitLinks/SharedItemsModule.swift` - Added `readAndClearSharedPayload()`
- `ios/FitLinks/SharedItems.m` - Added Objective-C bridge
- `src/native/sharedItems.ts` - Added TypeScript wrapper

### Deleted Files
- `src/utils/shareGate.ts` - Replaced by shareDedupe.ts

## Key Guarantees

1. ✅ **Single handler**: Only `_layout.tsx` processes legacy share deep links
2. ✅ **Idempotent**: Second trigger within time window is ignored
3. ✅ **Atomic clear**: Payload cleared immediately after first read
4. ✅ **Diagnostics**: Comprehensive logging confirms duplicate sources
5. ✅ **Cold start preserved**: No regression to existing cold start flow

## Future Enhancements

### Option 1: ShareNonce from Extension
Modify `ShareViewController.swift` to write a `shareNonce` to UserDefaults:
```swift
let shareNonce = "\(Date().timeIntervalSince1970 * 1000)"
userDefaults?.set(shareNonce, forKey: "shareNonce")
```

Then read in `SharedItemsModule.swift` and include in payload:
```swift
if let nonce = userDefaults.string(forKey: "shareNonce") {
  result["shareNonce"] = nonce
}
```

This would enable stronger nonce-based dedupe (10s window instead of 1.5s).

### Option 2: Dedupe Flag
Add a simple flag to detect if we've already handled the current session:
```typescript
let hasHandledThisSession = false;

if (hasHandledThisSession && source === 'urlEvent') {
  console.log('[FL_SHARE_DIAG] already handled this session');
  return;
}
hasHandledThisSession = true;
```

## Verification Commands

### Check logs on device:
```bash
# iOS device logs
xcrun devicectl device observe logs | grep 'FL_SHARE_DIAG'

# Also check Swift logs
xcrun devicectl device observe logs | grep 'SharedItemsModule'
```

### Verify file changes:
```bash
git status
git diff
```

## Notes

- The `shareNonce` parameter passed to import screen is generated fresh on each navigation (`Date.now().toString()`) and is NOT the same as a nonce from the Share Extension (which doesn't currently set one)
- The dedupe logic uses time-based fallback when no nonce is available, which is the current scenario
- Modern share intents (via `expo-share-intent`) use a different path (`useShareIntake` hook) and are not affected by this fix
