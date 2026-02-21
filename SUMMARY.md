# iOS Share Extension Debugging - Summary

## ✅ What Was Done

### 1. Verified App Group Configuration
- **App Group ID**: `group.com.banditinnovations.fitlinks`
- **Status**: Consistently used across all files
  - ✅ FitLinks.entitlements
  - ✅ ShareExtension.entitlements  
  - ✅ ShareViewController.swift
  - ✅ SharedItemsModule.swift
  - ✅ app.json

### 2. Added Comprehensive Debug Logging

#### Share Extension (Write Operations)
Added logging to `ios/ShareExtension/ShareViewController.swift` for:
- ✅ URL shares (from Safari/Chrome)
- ✅ Text shares
- ✅ Preprocessing/weburl shares
- ✅ Image shares
- ✅ Video shares
- ✅ File shares

**Log format:**
```
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Suite: group.com.banditinnovations.fitlinks
[ShareViewController] Key: fitlinksShareKey
[ShareViewController] URL: https://...
[ShareViewController] Payload length: 156 bytes
[ShareViewController] Payload preview: [{"url":"https://...
```

#### Host App (Read Operations)
Added logging to `ios/FitLinks/SharedItemsModule.swift` for:
- ✅ Payload read attempts
- ✅ Payload existence verification
- ✅ Payload type and size
- ✅ Payload preview

**Log format:**
```
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] Suite: group.com.banditinnovations.fitlinks
[SharedItemsModule] Key: fitlinksShareKey
[SharedItemsModule] Type hint: weburl
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: 156 bytes
[SharedItemsModule] Payload preview: [{"url":"https://...
```

#### Import Screen Debug Panel
Added debug panel to `app/import.tsx` (visible in DEV mode only):
- ✅ Shows sharedKey, sharedType, shareNonce
- ✅ Shows sourceUrl, sourceText, fileUrl params
- ✅ Shows current url and fileUrl state
- ✅ Enhanced console logging for share payload processing

### 3. Created Helper Scripts and Documentation

#### Files Created:
1. **DEBUG_SHARE_EXTENSION.md** - Complete debugging guide
2. **verify-app-groups.sh** - Automated verification script
3. **SUMMARY.md** - This file

## 🔍 Next Steps for Testing

### Step 1: Open Xcode and Verify App Groups
```bash
./verify-app-groups.sh
```

This will:
- Open Xcode workspace
- Display verification checklist
- Check entitlements files
- Show code references

**In Xcode, manually verify:**
1. Project → TARGETS → **FitLinks** → Signing & Capabilities
   - App Groups capability present with `group.com.banditinnovations.fitlinks`
2. Project → TARGETS → **ShareExtension** → Signing & Capabilities
   - App Groups capability present with `group.com.banditinnovations.fitlinks`

### Step 2: Clean Build
```bash
rm -rf ios/build
rm -rf ios/Pods
pod install --project-directory=ios
```

### Step 3: Rebuild to Device
```bash
npx expo run:ios --device
```

### Step 4: Test Share Flow

#### Test 1: Safari Share
1. Open Safari on your iOS device
2. Navigate to: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Tap Share → FitLinks
4. Check Xcode console for logs
5. Verify Import screen shows:
   - Debug panel with share info
   - URL populated in field
   - Title auto-filled from metadata

#### Test 2: Chrome Share
1. Open Chrome on your iOS device
2. Navigate to same YouTube URL
3. Tap Share → FitLinks
4. Check Xcode console for logs
5. Verify Import screen as above

### Step 5: Analyze Logs

**Expected Flow:**

1. **Share Extension writes** (in Xcode console):
   ```
   [ShareViewController] ✅ Writing URL to UserDefaults
   [ShareViewController] Payload length: 156 bytes
   ```

2. **App redirects to Import** (URL scheme)

3. **Host app reads** (in Xcode console):
   ```
   [SharedItemsModule] 📖 Reading from UserDefaults
   [SharedItemsModule] ✅ Payload exists
   [SharedItemsModule] Payload type: Data, length: 156 bytes
   ```

4. **Import screen processes** (in Metro console):
   ```
   [FitLinks] CONSUME share { sharedKey: 'fitlinksShareKey', shareNonce: '...' }
   [FitLinks] getSharedPayload result: { type: 'weburl', value: 'https://...' }
   ```

5. **Import screen shows debug panel** with all fields populated

## 🐛 Troubleshooting Scenarios

### Scenario 1: No Write Logs
**Symptom**: No `[ShareViewController]` logs appear when sharing

**Likely causes:**
- Share extension not installed
- Share not using FitLinks extension
- Extension crashing before write

**Fix:**
- Clean rebuild
- Check for extension crash logs in Xcode
- Verify extension is visible in Share sheet

### Scenario 2: Write Logs but No Read Logs
**Symptom**: Write logs appear, app opens, but no read logs

**Likely causes:**
- App Groups not configured in Xcode Signing & Capabilities
- Provisioning profile doesn't include App Groups
- Entitlements mismatch

**Fix:**
1. Open Xcode
2. Verify both targets have App Groups capability
3. Verify same group ID in both targets
4. Clean build and reinstall

### Scenario 3: Read Logs Show "No payload found"
**Symptom**: Read logs show payload doesn't exist

**Likely causes:**
- Suite name mismatch
- Key name mismatch
- Timing issue (payload cleared before read)

**Fix:**
- Check logs for exact suite/key names
- Verify they match between write and read
- Check shareNonce consumption logic

### Scenario 4: Payload Exists but Import Screen Empty
**Symptom**: Read logs show payload, but Import screen URL is empty

**Likely causes:**
- React Native bridge issue
- useEffect not firing
- Payload format unexpected

**Fix:**
- Check Metro console logs
- Verify payload format in logs
- Check Import screen debug panel

## 📊 Success Criteria

✅ Write logs appear when sharing from Safari/Chrome
✅ Read logs appear when Import screen opens
✅ Import screen debug panel shows share info
✅ URL field is populated with shared URL
✅ Title is auto-filled from metadata
✅ Can save workout successfully

## 🔑 Key Files Modified

### Native iOS:
- `ios/ShareExtension/ShareViewController.swift` - Added write logging
- `ios/FitLinks/SharedItemsModule.swift` - Added read logging

### React Native:
- `app/import.tsx` - Enhanced debug panel and logging

### Documentation:
- `DEBUG_SHARE_EXTENSION.md` - Complete guide
- `verify-app-groups.sh` - Verification script
- `SUMMARY.md` - This summary

## 💡 Important Notes

1. **App Groups MUST be configured in Xcode** - The entitlements files are correct, but Xcode's Signing & Capabilities must also be set
2. **Provisioning profiles** must include App Groups capability
3. **Debug logs only work on device**, not in simulator (share extensions require real device)
4. **Debug panel only visible in DEV mode** (`__DEV__` flag)
5. **Clean build recommended** after any entitlements changes

## 📞 If Still Not Working

After following all steps, if Import screen is still empty:

1. Share the Xcode console logs (both write and read)
2. Share the Metro console logs
3. Share a screenshot of the Import screen debug panel
4. Share screenshots of both targets' Signing & Capabilities tabs

This will help identify the exact point of failure in the data flow.
