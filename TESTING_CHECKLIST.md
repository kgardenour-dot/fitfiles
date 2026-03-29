# 🔍 App Groups Runtime Verification - Quick Checklist

## ✅ What Was Added
- [x] containerURL log in Share Extension (6 write locations)
- [x] containerURL log in Host App (read location)
- [x] Verification script: `verify-app-groups-runtime.sh`
- [x] Testing guide: `APP_GROUPS_VERIFICATION.md`
- [x] Summary: `RUNTIME_DIAGNOSTICS_SUMMARY.md`

## 📋 Testing Steps

### Step 1: Clean Build
```bash
cd /Users/kristygardenour/fitfiles
rm -rf ios/build
npx expo run:ios --device
```
⏳ Wait for build to complete and app to launch on device

---

### Step 2: Verify Build Artifacts
```bash
./verify-app-groups-runtime.sh
```

**Look for:**
- ✅ Main App: `com.apple.security.application-groups` PRESENT
- ✅ Main App: `group.com.banditinnovations.fitlinks` PRESENT
- ✅ Share Extension: `com.apple.security.application-groups` PRESENT
- ✅ Share Extension: `group.com.banditinnovations.fitlinks` PRESENT

**If any ❌:**
- Entitlements not signed into built artifacts
- Check Xcode signing settings
- Regenerate provisioning profiles

---

### Step 3: Monitor Device Logs

**Terminal 2 (keep this running):**
```bash
xcrun devicectl device observe logs | grep -E 'ShareViewController|SharedItemsModule'
```

OR if that doesn't work:
```bash
xcrun devicectl device observe logs
```

---

### Step 4: Test Share on Device

1. **Open Safari or Chrome** on the iOS device
2. **Navigate to any URL** (e.g., https://www.apple.com)
3. **Tap Share button**
4. **Select "FitLinks"** from share sheet
5. **Watch Terminal 2 for logs**

---

### Step 5: Check Critical Log Lines

#### 🔍 Look for Share Extension containerURL:
```
[ShareViewController] 📦 AppGroup containerURL: <VALUE>
```

**Expected Values:**
- ✅ `file:///private/var/mobile/Containers/Shared/AppGroup/...` → **SUCCESS**
- ❌ `nil` → **ENTITLEMENT NOT ACTIVE IN EXTENSION**

#### 🔍 Look for Write Confirmation:
```
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Payload length: XXX bytes
```

#### 🔍 Look for Host App containerURL:
```
[SharedItemsModule] 📦 AppGroup containerURL: <VALUE>
```

**Expected Values:**
- ✅ `file:///private/var/mobile/Containers/Shared/AppGroup/...` → **SUCCESS**
- ❌ `nil` → **ENTITLEMENT NOT ACTIVE IN HOST APP**

#### 🔍 Look for Read Result:
```
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: XXX bytes
```

OR

```
[SharedItemsModule] ⚠️ No payload found for key: fitlinksShareKey
```

---

## 🎯 Diagnosis Matrix

| Share Extension<br/>containerURL | Host App<br/>containerURL | Read Result | Diagnosis |
|:-:|:-:|:-:|---|
| ✅ `file://...` | ✅ `file://...` | ✅ Payload exists | **App Groups work!**<br/>Issue is elsewhere (routing/parsing) |
| ✅ `file://...` | ✅ `file://...` | ❌ No payload | **Payload not transferring**<br/>Key mismatch or timing issue |
| ❌ `nil` | ✅ `file://...` | ❌ No payload | **Extension can't write**<br/>Fix extension entitlements |
| ✅ `file://...` | ❌ `nil` | ❌ No payload | **Host can't read**<br/>Fix host app entitlements |
| ❌ `nil` | ❌ `nil` | ❌ No payload | **App Groups completely broken**<br/>Fix both entitlements |

---

## 📊 What to Share for Debug

Copy these log sections from Terminal 2:

### 1. Container URLs (Both)
```
[ShareViewController] 📦 AppGroup containerURL: ...
[SharedItemsModule] 📦 AppGroup containerURL: ...
```

### 2. Write Operation
```
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Suite: ...
[ShareViewController] Key: ...
[ShareViewController] Payload length: ...
[ShareViewController] Payload preview: ...
```

### 3. Read Operation
```
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] Suite: ...
[SharedItemsModule] Key: ...
[SharedItemsModule] ✅ Payload exists OR ⚠️ No payload found
[SharedItemsModule] Payload type: ...
```

---

## 🎬 Expected Full Flow (Success)

```
# SHARE EXTENSION LOGS:
[ShareViewController] 📦 AppGroup containerURL: file:///private/var/mobile/Containers/Shared/AppGroup/ABC123.../group.com.banditinnovations.fitlinks for group.com.banditinnovations.fitlinks
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Suite: group.com.banditinnovations.fitlinks
[ShareViewController] Key: fitlinksShareKey
[ShareViewController] URL: https://www.apple.com
[ShareViewController] Payload length: 45 bytes
[ShareViewController] Payload preview: [{"url":"https://www.apple.com","meta":""}]

# HOST APP LOGS (after app opens):
[SharedItemsModule] 📦 AppGroup containerURL: file:///private/var/mobile/Containers/Shared/AppGroup/ABC123.../group.com.banditinnovations.fitlinks for group.com.banditinnovations.fitlinks
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] Suite: group.com.banditinnovations.fitlinks
[SharedItemsModule] Key: fitlinksShareKey
[SharedItemsModule] Type hint: nil
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: 45 bytes
[SharedItemsModule] Payload preview: [{"url":"https://www.apple.com","meta":""}]
```

---

## ✅ Success Criteria

- [ ] Build completes without errors
- [ ] `verify-app-groups-runtime.sh` shows ✅ for all entitlements
- [ ] Share extension containerURL = `file://...` (not nil)
- [ ] Host app containerURL = `file://...` (not nil)
- [ ] Share extension writes payload with byte length
- [ ] Host app finds payload and shows type/length

If ALL ✅, then App Groups work correctly at runtime!

---

## ⚠️ If containerURL is nil

The entitlements are not active at runtime. This means:

1. **Provisioning Profile Issue**
   - Profile doesn't include App Groups capability
   - Profile not downloaded/installed on device

2. **Team ID Mismatch**
   - Xcode using wrong team
   - App Group registered under different team

3. **App Group Not in Portal**
   - Not created in Apple Developer portal
   - Not added to App ID

**Fix Steps:**
1. Open Xcode → FitLinks.xcodeproj
2. Select **FitLinks** target → Signing & Capabilities
3. Note the Team ID
4. Select **ShareExtension** target → Signing & Capabilities
5. Verify **same Team ID**
6. Check App Groups capability shows ✅ (not ⚠️)
7. Go to developer.apple.com → Certificates, IDs & Profiles
8. Verify App Group `group.com.banditinnovations.fitlinks` exists
9. Verify App IDs include the App Group
10. Regenerate provisioning profiles
11. Clean build and test again
