# iOS Share Extension Debug Guide

## PART 1: VERIFY APP GROUPS IN XCODE

### Step 1: Open Xcode Workspace
```bash
open ios/FitLinks.xcworkspace
```

### Step 2: Verify Main App Target
1. In Xcode project navigator, select the project (blue icon at top)
2. Under **TARGETS**, select **FitLinks** (main app target)
3. Click **Signing & Capabilities** tab
4. Verify **App Groups** capability exists
5. Verify it includes exactly: `group.com.banditinnovations.fitlinks`
6. ✅ If missing or different, add/fix the capability

### Step 3: Verify Share Extension Target
1. Under **TARGETS**, select **ShareExtension** target
2. Click **Signing & Capabilities** tab
3. Verify **App Groups** capability exists
4. Verify it includes exactly: `group.com.banditinnovations.fitlinks`
5. ✅ If missing or different, add/fix the capability

**CRITICAL**: Both targets MUST have the exact same App Group identifier.

## PART 2: VERIFY ENTITLEMENTS FILES

The entitlements files are already correctly configured:

### Main App: `ios/FitLinks/FitLinks.entitlements`
```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.banditinnovations.fitlinks</string>
</array>
```

### Share Extension: `ios/ShareExtension/ShareExtension.entitlements`
```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.banditinnovations.fitlinks</string>
</array>
```

## PART 3: DEBUG LOGGING ADDED

Debug logging has been added to three key locations:

### 1. Share Extension Write (ShareViewController.swift)
- Logs when URL is written to UserDefaults
- Logs suite name, key, payload length, and preview

### 2. Host App Read (SharedItemsModule.swift)
- Logs when attempting to read from UserDefaults
- Logs suite name, key, whether data exists, and data length

### 3. Import Screen (import.tsx)
- Shows debug panel in DEV mode with:
  - sharedKey, sharedType, shareNonce
  - Raw payload present status
  - Resolved sourceUrl/sourceText/fileUrl

## PART 4: REBUILD AND TEST

### Step 1: Clean Build
```bash
# Clean all builds
rm -rf ios/build
rm -rf ios/Pods
pod install --project-directory=ios
```

### Step 2: Rebuild to Device
```bash
npx expo run:ios --device
```

### Step 3: Test Share Flow

1. **Test from Safari**:
   - Open a YouTube URL in Safari
   - Tap Share → FitLinks
   - Observe console logs for write operation
   - Should redirect to Import screen
   - Check Import screen debug panel

2. **Test from Chrome**:
   - Open a YouTube URL in Chrome
   - Tap Share → FitLinks
   - Observe console logs for write operation
   - Should redirect to Import screen
   - Check Import screen debug panel

### Expected Console Output

**In Share Extension (write):**
```
[ShareViewController] ✅ Writing to UserDefaults
[ShareViewController] Suite: group.com.banditinnovations.fitlinks
[ShareViewController] Key: fitlinksShareKey
[ShareViewController] Payload length: 156 bytes
[ShareViewController] Payload preview: [{"url":"https://www.youtube.com/watch?v=...
```

**In Main App (read):**
```
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] Suite: group.com.banditinnovations.fitlinks
[SharedItemsModule] Key: fitlinksShareKey
[SharedItemsModule] Payload exists: true
[SharedItemsModule] Payload length: 156 bytes
```

**In Import Screen:**
Debug panel should show:
- sharedKey: fitlinksShareKey
- shareNonce: <timestamp>
- URL populated in input field

## TROUBLESHOOTING

### If Import is empty:

1. **Check Xcode Console** for logs - are write and read both happening?
2. **Verify App Groups** in Xcode Signing & Capabilities
3. **Check entitlements** are correctly set for both targets
4. **Verify bundle IDs** match your provisioning profiles
5. **Check device permissions** - App Groups requires proper signing

### If write logs show but read logs don't:

- App Groups may not be properly configured
- Provisioning profiles may not include App Groups capability
- Clean build and reinstall app

### If both write and read logs show but Import is empty:

- Check the payload format in logs
- Check the shareNonce is being consumed correctly
- Check for timing issues in the Import screen useEffect
