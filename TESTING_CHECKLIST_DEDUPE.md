# Share Deduplication Fix - Testing & Verification Checklist

## Pre-Test Setup

### 1. Rebuild iOS App
```bash
# Clean build
cd ios
rm -rf build/
xcodebuild clean -workspace FitLinks.xcworkspace -scheme FitLinks

# Rebuild
cd ..
npx expo prebuild --clean
npx expo run:ios
```

### 2. Enable Console Logging
- Open Xcode
- Run app on physical device (required for Share Extension testing)
- Open Console app on Mac
- Filter for: `FL_SHARE_DIAG OR SharedItemsModule`

## Test Cases

### ✅ Test A: Warm Start Duplicate (PRIMARY BUG FIX)

**Setup**:
- App running in background
- Open Safari
- Navigate to any webpage

**Steps**:
1. Tap Share button in Safari
2. Select FitLinks
3. Observe logs and UI

**Expected Results**:
- [ ] Console shows: `[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: ... }`
- [ ] Console shows: `[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)`
- [ ] Console shows: `[SharedItemsModule] 🗑️ Payload cleared after read`
- [ ] Console shows: `[FL_SHARE_DIAG] routing to import { shareNonce: '...', hasUrl: true }`
- [ ] Console shows: `[FL_SHARE_DIAG] Import screen mount { shareNonce: '...' }`
- [ ] Import screen appears **ONCE** (not twice)
- [ ] URL field is populated
- [ ] Title auto-fills from OpenGraph

**If duplicate event fires** (acceptable):
- [ ] Console shows second: `[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent' }`
- [ ] Console shows: `[SharedItemsModule] ⚠️ No payload found for key: fitlinksShareKey`
- [ ] Console shows: `[FL_SHARE_DIAG] No payload found in App Group, ignoring`
- [ ] Import screen still appears **ONCE**

### ✅ Test B: Cold Start (REGRESSION CHECK)

**Setup**:
- Force quit FitLinks app (swipe up in app switcher)
- Open Safari
- Navigate to any webpage

**Steps**:
1. Tap Share button in Safari
2. Select FitLinks
3. App launches from scratch
4. Observe logs and UI

**Expected Results**:
- [ ] Console shows: `[FL_SHARE_DIAG] handleUrl fired { source: 'initialURL' OR 'urlEvent' }`
- [ ] Console shows: `[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)`
- [ ] Console shows: `[FL_SHARE_DIAG] routing to import`
- [ ] If not logged in: Shows login screen, then import after login
- [ ] If logged in: Shows import screen directly
- [ ] Import screen appears **ONCE**
- [ ] URL field is populated
- [ ] Title auto-fills

### ✅ Test C: Share Two Different Pages Quickly

**Setup**:
- App running in background
- Open Safari with two tabs (different URLs)

**Steps**:
1. Share Tab 1 to FitLinks
2. Complete or dismiss import screen
3. Immediately share Tab 2 to FitLinks (within 5 seconds)
4. Observe both imports

**Expected Results**:
- [ ] First share: Import screen appears with URL from Tab 1
- [ ] Second share: Import screen appears with URL from Tab 2
- [ ] Both shares process successfully
- [ ] No `duplicate share ignored` logs
- [ ] URLs are different in each import

### ✅ Test D: Share Same Page Twice

**Setup**:
- App running in background
- Safari on any page

**Steps**:
1. Share to FitLinks
2. Return to Safari (don't complete import)
3. Immediately share same page again (within 2 seconds)
4. Observe behavior

**Expected Results**:
- [ ] First share: Import screen appears
- [ ] Second share within 1.5s: Console shows `[FL_SHARE_DIAG] duplicate share ignored`
- [ ] Second share after 1.5s but <10s: May process (acceptable - no nonce from extension yet)
- [ ] Import screen does not duplicate stack

### ✅ Test E: Text Share

**Setup**:
- App running in background
- Safari on any page

**Steps**:
1. Select text on page
2. Tap Share → FitLinks
3. Observe import screen

**Expected Results**:
- [ ] Import screen appears
- [ ] URL extracted from text (if present)
- [ ] Otherwise text goes to notes field
- [ ] No duplicate screens

### ✅ Test F: Multiple Shares (Rapid Fire)

**Setup**:
- App running in background

**Steps**:
1. Share page 1
2. Dismiss import screen
3. Share page 2 immediately
4. Dismiss import screen
5. Share page 3 immediately
6. Complete import

**Expected Results**:
- [ ] All three shares queue properly
- [ ] Each gets its own import screen
- [ ] No crashes
- [ ] No stuck states

## Log Analysis Guide

### ✅ Healthy Single Import
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://dataUrl=fitlinksShareKey#weburl', source: 'urlEvent', ts: 1708473521000 }
[SharedItemsModule] 📦 AppGroup containerURL: file:///... for group.com.banditinnovations.fitlinks
[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)
[SharedItemsModule] Suite: group.com.banditinnovations.fitlinks
[SharedItemsModule] Key: fitlinksShareKey
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: 156 bytes
[SharedItemsModule] 🗑️ Payload cleared after read
[FL_SHARE_DIAG] routing to import { shareNonce: '1708473521000', sharedType: 'weburl', hasUrl: true, hasText: false }
[FL_SHARE_DIAG] Import screen mount { shareNonce: '1708473521000', sharedType: 'weburl' }
```

### ✅ Duplicate Event (Empty Payload)
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: 1708473521050 }
[SharedItemsModule] 📦 AppGroup containerURL: file:///...
[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)
[SharedItemsModule] ⚠️ No payload found for key: fitlinksShareKey
[FL_SHARE_DIAG] No payload found in App Group, ignoring
```

### ✅ Duplicate Event (Time Window)
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: 1708473521000 }
[FL_SHARE_DIAG] routing to import ...
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: 1708473521200 }
[FL_SHARE_DIAG] duplicate share ignored { shareNonce: undefined }
```

### ❌ Bad: Double Import (Should Not Happen)
```
[FL_SHARE_DIAG] handleUrl fired { source: 'urlEvent', ts: 1000 }
[FL_SHARE_DIAG] routing to import ...
[FL_SHARE_DIAG] Import screen mount ...
[FL_SHARE_DIAG] handleUrl fired { source: 'urlEvent', ts: 1050 }  ← Second event
[SharedItemsModule] ✅ Payload exists  ← Still has payload! BUG
[FL_SHARE_DIAG] routing to import ...  ← Second navigation! BUG
[FL_SHARE_DIAG] Import screen mount ...  ← Second mount! BUG
```

## Verification Commands

### Watch logs in real-time
```bash
# Mac Console app or command line:
xcrun devicectl device observe logs --device <UDID> | grep -E 'FL_SHARE_DIAG|SharedItemsModule'
```

### Check code changes
```bash
git status
git diff app/_layout.tsx
git diff app/import.tsx
git diff ios/FitLinks/SharedItemsModule.swift
git diff src/utils/shareDedupe.ts
```

## Rollback Plan

If tests fail:
```bash
git checkout app/_layout.tsx
git checkout app/import.tsx
git checkout ios/FitLinks/SharedItemsModule.swift
git checkout ios/FitLinks/SharedItems.m
git checkout src/native/sharedItems.ts
git restore src/utils/shareGate.ts  # Restore old dedupe
rm src/utils/shareDedupe.ts
```

## Success Criteria

All 6 tests (A-F) must pass:
- ✅ Warm start: Import appears once
- ✅ Cold start: Import appears once
- ✅ Different pages: Both import
- ✅ Same page twice: Second blocked or empty payload
- ✅ Text share: Works correctly
- ✅ Rapid shares: No crashes

## Known Limitations

1. **Time-based dedupe**: Currently uses 1.5s window (no nonce from Share Extension yet)
2. **Multiple quick shares of different pages**: Will process all (expected behavior)
3. **Native logs**: Require physical device and Console app

## Next Steps After Success

1. Commit changes with descriptive message
2. Consider implementing shareNonce in Share Extension (see SHARE_DEDUPE_FIX.md)
3. Monitor production for any edge cases
4. Update user documentation if needed
