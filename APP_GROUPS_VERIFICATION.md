# App Groups Runtime Verification Guide

## 🎯 Goal
Verify that App Groups work at runtime (not just in Xcode UI) and identify whether the issue is:
- **A)** App Group container not resolving (entitlements issue)
- **B)** Payload handling/key mismatch (data transfer issue)

## 📋 Added Diagnostic Logs

### Share Extension (`ios/ShareExtension/ShareViewController.swift`)
Before every UserDefaults write, added:
```swift
let groupId = "group.com.banditinnovations.fitlinks"
let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
NSLog("[ShareViewController] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
```

### Host App (`ios/FitLinks/SharedItemsModule.swift`)
At the start of `getSharedPayload`, added:
```swift
let groupId = "group.com.banditinnovations.fitlinks"
let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
NSLog("[SharedItemsModule] 📦 AppGroup containerURL: \(containerURL?.absoluteString ?? "nil") for \(groupId)")
```

## 🔄 Testing Workflow

### Step 1: Clean Build
```bash
rm -rf ios/build
npx expo run:ios --device
```

### Step 2: Verify Signed Entitlements
```bash
./verify-app-groups-runtime.sh
```

This script will:
- Find your built `.app` and `.appex` in `ios/build/`
- Extract and verify signed entitlements include:
  - `com.apple.security.application-groups`
  - `group.com.banditinnovations.fitlinks`

### Step 3: Test Share on Device

1. **Open device logs** (in separate terminal):
   ```bash
   # All logs:
   xcrun devicectl device observe logs
   
   # Filtered for our app:
   xcrun devicectl device observe logs | grep -E 'ShareViewController|SharedItemsModule'
   ```

2. **Share content from Safari/Chrome**

3. **Watch for containerURL logs**:
   ```
   [ShareViewController] 📦 AppGroup containerURL: file://... OR nil
   [SharedItemsModule] 📦 AppGroup containerURL: file://... OR nil
   ```

## 🔍 Interpreting Results

### Case 1: Both show `file://...` (Valid Path)
✅ **App Groups work at runtime!**
- Container resolves correctly
- Entitlements are active
- Issue is likely payload handling:
  - Key mismatch
  - Data type mismatch
  - Deeplink routing issue
- **Next step**: Share the write/read log lines to debug payload

### Case 2: Either shows `nil`
❌ **App Groups NOT working at runtime**
- Entitlements not active for that target
- Even if Xcode shows capability enabled
- **Root causes**:
  - Wrong Team ID
  - Missing/incorrect provisioning profile
  - App Group not enabled in Apple Developer portal
  - Capability not properly synced
- **Fix**: 
  1. Check Team in Xcode signing settings
  2. Regenerate provisioning profiles
  3. Ensure App Group exists in Apple Developer portal
  4. Clean and rebuild

### Case 3: Share Extension shows valid path, Host shows `nil`
❌ **Host app can't access App Group**
- Share extension writes successfully
- Host app can't read
- Check host app's entitlements specifically

### Case 4: Share Extension shows `nil`, Host shows valid path
❌ **Share extension can't access App Group**
- Most likely scenario if payload is empty
- Share extension can't write
- Check extension's entitlements and provisioning

## 🛠️ Manual Entitlement Check (Alternative)

If `verify-app-groups-runtime.sh` doesn't work, manually check:

```bash
# Find built artifacts
find ios/build -maxdepth 6 -name "*.app" -path "*/Debug-iphoneos/*"
find ios/build -maxdepth 8 -name "*.appex" -path "*/Debug-iphoneos/*"

# Check entitlements (replace paths with your actual paths)
codesign -d --entitlements :- "ios/build/.../FitLinks.app" | head -50
codesign -d --entitlements :- "ios/build/.../ShareExtension.appex" | head -50
```

Look for:
```xml
<key>com.apple.security.application-groups</key>
<array>
    <string>group.com.banditinnovations.fitlinks</string>
</array>
```

## 📝 What to Share for Debug

After testing, share these log snippets:

1. **Container URL logs** (both targets):
   ```
   [ShareViewController] 📦 AppGroup containerURL: ...
   [SharedItemsModule] 📦 AppGroup containerURL: ...
   ```

2. **Write log** (from share extension):
   ```
   [ShareViewController] ✅ Writing URL to UserDefaults
   [ShareViewController] Suite: ...
   [ShareViewController] Key: ...
   [ShareViewController] Payload length: ...
   ```

3. **Read log** (from host app):
   ```
   [SharedItemsModule] 📖 Reading from UserDefaults
   [SharedItemsModule] ✅ Payload exists
   OR
   [SharedItemsModule] ⚠️ No payload found
   ```

## ✅ Success Criteria

You know App Groups work when:
1. ✅ Verification script shows entitlements in both targets
2. ✅ Both containerURL logs show valid `file://` paths
3. ✅ Share extension logs "Writing..." with payload length
4. ✅ Host app logs "Payload exists" with type/length

If all ✅, any remaining issues are in payload parsing/routing, not App Groups.
