# App Groups Runtime Diagnostics - Implementation Summary

## ✅ Changes Made

### 1. Share Extension Diagnostics (`ios/ShareExtension/ShareViewController.swift`)

Added containerURL verification logs **before every UserDefaults write** in these handlers:
- `handleText()` - line ~106
- `handleUrl()` - line ~134
- `handlePrepocessing()` - line ~180 (weburl from preprocessing)
- `handleImages()` - line ~331
- `handleVideos()` - line ~424
- `handleFileURL()` - line ~500

**Log format:**
```swift
let groupId = "group.com.banditinnovations.fitlinks"
let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
```

### 2. Host App Diagnostics (`ios/FitLinks/SharedItemsModule.swift`)

Added containerURL verification at the **start of `getSharedPayload()`** method (line ~14):

```swift
let groupId = "group.com.banditinnovations.fitlinks"
let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
NSLog("[SharedItemsModule] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
```

### 3. Verification Script (`verify-app-groups-runtime.sh`)

Created automated script that:
- Finds built `.app` and `.appex` bundles in `ios/build/`
- Extracts signed entitlements using `codesign`
- Verifies presence of:
  - `com.apple.security.application-groups`
  - `group.com.banditinnovations.fitlinks`
- Provides clear ✅/❌ status for each target

**Usage:**
```bash
./verify-app-groups-runtime.sh
```

### 4. Verification Guide (`APP_GROUPS_VERIFICATION.md`)

Complete testing workflow documentation including:
- Step-by-step testing instructions
- How to interpret containerURL logs
- Decision tree for diagnosis
- What to share for debugging

## 🎯 What This Achieves

### Definitive Runtime Verification
The containerURL logs will show **exactly** whether App Groups resolve at runtime:
- `file://...` = ✅ Working
- `nil` = ❌ Not working (entitlements issue)

### Distinguishes Two Root Causes

**Scenario A: containerURL = nil**
- Entitlements not active at runtime
- Even if Xcode UI shows capability enabled
- Fix: Team ID, provisioning profile, Apple Developer portal setup

**Scenario B: containerURL = valid path**
- App Groups work correctly
- Issue is in payload handling:
  - Key mismatch
  - Data type mismatch  
  - Deeplink routing
- Fix: Debug payload parsing logic

## 🔄 Next Steps

### 1. Clean Build
```bash
rm -rf ios/build
npx expo run:ios --device
```

### 2. Run Verification Script
```bash
./verify-app-groups-runtime.sh
```

Check output for ✅/❌ on entitlements in both targets.

### 3. Test Share on Device

**Terminal 1 - Device Logs:**
```bash
xcrun devicectl device observe logs | grep -E 'ShareViewController|SharedItemsModule'
```

**Device - Test Share:**
1. Open Safari/Chrome
2. Navigate to any workout URL
3. Tap Share → FitLinks

**Watch for:**
```
[ShareViewController] 📦 AppGroup containerURL: <FILE_PATH_OR_NIL>
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Payload length: XXX bytes

[SharedItemsModule] 📦 AppGroup containerURL: <FILE_PATH_OR_NIL>
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] ✅ Payload exists / ⚠️ No payload found
```

### 4. Analyze Results

**If both containerURLs show valid `file://` paths:**
- ✅ App Groups work!
- Issue is payload handling
- Share the write/read logs for next debugging phase

**If either shows `nil`:**
- ❌ App Groups don't work at runtime
- Check Team, provisioning, Apple Developer portal
- Fix entitlements until containerURL resolves

## 📊 Expected Log Output (Success Case)

```
[ShareViewController] 📦 AppGroup containerURL: file:///private/var/mobile/Containers/Shared/AppGroup/... for group.com.banditinnovations.fitlinks
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Suite: group.com.banditinnovations.fitlinks
[ShareViewController] Key: fitlinksShareKey
[ShareViewController] URL: https://example.com/workout/123
[ShareViewController] Payload length: 156 bytes
[ShareViewController] Payload preview: [{"url":"https://example.com/workout/123","meta":""}]

[SharedItemsModule] 📦 AppGroup containerURL: file:///private/var/mobile/Containers/Shared/AppGroup/... for group.com.banditinnovations.fitlinks
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] Suite: group.com.banditinnovations.fitlinks
[SharedItemsModule] Key: fitlinksShareKey
[SharedItemsModule] Type hint: nil
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: 156 bytes
[SharedItemsModule] Payload preview: [{"url":"https://example.com/workout/123","meta":""}]
```

## 🚨 Failure Case Log Output

```
[ShareViewController] 📦 AppGroup containerURL: nil for group.com.banditinnovations.fitlinks
[ShareViewController] ✅ Writing URL to UserDefaults  ← WRITES TO WRONG LOCATION!
```

OR

```
[ShareViewController] 📦 AppGroup containerURL: file://...  ← Extension OK
[SharedItemsModule] 📦 AppGroup containerURL: nil for group.com.banditinnovations.fitlinks  ← Host FAILS!
```

## 📝 Files Modified

1. `ios/ShareExtension/ShareViewController.swift` - Added 6 containerURL logs
2. `ios/FitLinks/SharedItemsModule.swift` - Added 1 containerURL log
3. `verify-app-groups-runtime.sh` - New verification script
4. `APP_GROUPS_VERIFICATION.md` - New testing guide
5. `RUNTIME_DIAGNOSTICS_SUMMARY.md` - This file

## ✨ Key Innovation

Previous debugging relied on **Xcode UI and static files**. This adds **runtime verification** that definitively shows whether entitlements are active when the code executes on device. A single log line (`containerURL: nil` vs `file://...`) immediately distinguishes entitlement issues from payload issues.
