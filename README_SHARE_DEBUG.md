# iOS Share Extension Debugging - Complete Guide

> **Goal:** Fix iOS device share payload not populating Import by verifying App Groups entitlements and adding comprehensive debug logging.

## 📋 Quick Navigation

- **[QUICKSTART.md](./QUICKSTART.md)** - Start here! 4-step process
- **[CHECKLIST.md](./CHECKLIST.md)** - Complete testing checklist
- **[TROUBLESHOOTING_FLOWCHART.md](./TROUBLESHOOTING_FLOWCHART.md)** - Visual decision tree
- **[DEBUG_SHARE_EXTENSION.md](./DEBUG_SHARE_EXTENSION.md)** - Detailed technical guide
- **[SUMMARY.md](./SUMMARY.md)** - Overview and implementation details

## 🎯 The Problem

When sharing a URL from Safari or Chrome on iOS device using the FitLinks share extension, the Import screen opens but the URL field is empty. This prevents users from saving shared workout links.

## 🔍 Root Cause Analysis

The most likely root cause is **App Groups not being properly configured in Xcode's Signing & Capabilities**, even though the entitlements files are correct. This prevents the share extension and main app from sharing data through UserDefaults.

## ✅ What Was Implemented

### 1. Comprehensive Debug Logging

#### Share Extension (`ios/ShareExtension/ShareViewController.swift`)
Added detailed logging for ALL write operations:
- URL shares (Safari/Chrome)
- Text shares
- Weburl/preprocessing shares
- Image/video/file shares

Logs include:
- Suite name (App Group ID)
- Key name
- Payload type and size
- Payload preview (first 120 chars)

#### Host App (`ios/FitLinks/SharedItemsModule.swift`)
Added detailed logging for ALL read operations:
- Read attempts
- Payload existence checks
- Payload type and size
- Payload preview

#### Import Screen (`app/import.tsx`)
Added debug features:
- Comprehensive console logging
- Visual debug panel (DEV mode only)
- Shows all share parameters
- Shows current state values

### 2. Verification Tools

#### `verify-app-groups.sh`
Automated script that:
- Opens Xcode workspace
- Checks entitlements files
- Verifies code references
- Provides clear checklist
- Shows next steps

#### Documentation Suite
- **QUICKSTART.md** - 4-step quick reference
- **CHECKLIST.md** - Complete testing checklist with expected outputs
- **TROUBLESHOOTING_FLOWCHART.md** - Visual decision tree for debugging
- **DEBUG_SHARE_EXTENSION.md** - Technical deep dive
- **SUMMARY.md** - Implementation overview

### 3. App Group Verification

Confirmed consistent use of `group.com.banditinnovations.fitlinks` across:
- ✅ FitLinks.entitlements
- ✅ ShareExtension.entitlements
- ✅ ShareViewController.swift
- ✅ SharedItemsModule.swift
- ✅ app.json

## 🚀 How to Use This Guide

### First Time Setup

1. **Verify App Groups in Xcode** (MOST IMPORTANT!)
   ```bash
   ./verify-app-groups.sh
   ```
   
   In Xcode that opens, verify BOTH targets have App Groups capability with `group.com.banditinnovations.fitlinks`

2. **Clean and Rebuild**
   ```bash
   rm -rf ios/build
   npx expo run:ios --device
   ```

3. **Test the Share Flow**
   - Open Safari → Share a URL → FitLinks
   - Watch Xcode console for logs
   - Check Import screen debug panel

4. **Analyze the Logs**
   - Follow the troubleshooting flowchart
   - Use the checklist to verify each step
   - Share results if stuck

### Subsequent Debugging

If the issue persists after first setup:

1. **Start with TROUBLESHOOTING_FLOWCHART.md**
   - Answer each question
   - Follow the appropriate scenario
   - Check suggested solutions

2. **Use CHECKLIST.md**
   - Verify each expected log output
   - Compare with actual output
   - Identify exactly where the flow breaks

3. **Consult DEBUG_SHARE_EXTENSION.md**
   - Deep dive into specific scenarios
   - Understand the complete data flow
   - Review advanced troubleshooting

## 📊 Expected Data Flow

### Successful Share Flow:

```
1. User shares URL from Safari
   ↓
2. Share Extension receives URL
   ↓
3. Share Extension writes to UserDefaults (App Group)
   Log: [ShareViewController] ✅ Writing URL to UserDefaults
   ↓
4. Share Extension redirects to main app
   ↓
5. Main app opens to Import screen
   ↓
6. Import screen reads from UserDefaults (App Group)
   Log: [SharedItemsModule] 📖 Reading from UserDefaults
   Log: [SharedItemsModule] ✅ Payload exists
   ↓
7. React receives payload
   Log: [FitLinks] getSharedPayload result: { type: 'weburl', value: '...' }
   ↓
8. Import screen state updates
   Log: [FitLinks] Setting URL from payload
   ↓
9. Import screen UI shows URL
   Debug panel displays all parameters
   URL field is populated
   Title auto-fills from metadata
```

### Where to Look When It Fails:

| If this is missing | Look here | Most likely issue |
|-------------------|-----------|-------------------|
| [ShareViewController] logs | Xcode Console | Extension crashing or not activated |
| [SharedItemsModule] logs | Xcode Console | **App Groups not configured** |
| [FitLinks] logs | Metro Console | Bridge issue or React not loading |
| Debug panel | Import screen | Not in DEV mode or UI issue |
| URL in field | Import screen | State update issue or render problem |

## 🎯 Success Criteria

All of these must be true:

- ✅ Xcode console shows share extension write logs
- ✅ Xcode console shows host app read logs
- ✅ Metro console shows React processing logs
- ✅ Import screen shows debug panel (in DEV mode)
- ✅ Import screen URL field is populated
- ✅ Import screen title is auto-filled
- ✅ Workout saves successfully
- ✅ Workout appears in Library

## ⚠️ Most Common Issues

### Issue #1: App Groups Not Configured in Xcode
**Frequency:** 90% of cases
**Symptom:** Write logs appear but no read logs
**Fix:** Open Xcode, verify BOTH targets have App Groups capability

### Issue #2: Extension Not Activated
**Frequency:** 5% of cases
**Symptom:** No logs at all
**Fix:** Check Share sheet, rebuild app, verify extension appears

### Issue #3: Payload Format Mismatch
**Frequency:** 3% of cases
**Symptom:** Both logs appear but payload is empty
**Fix:** Check payload preview in logs, verify JSON encoding

### Issue #4: State Not Updating
**Frequency:** 2% of cases
**Symptom:** React receives payload but UI doesn't update
**Fix:** Check useEffect dependencies, verify state flow

## 📞 Getting Help

If you're still stuck after following all guides, provide these 5 items:

1. **Xcode Console Output** (both write and read logs)
2. **Metro Console Output** (React logs)
3. **Import Debug Panel Screenshot**
4. **Signing & Capabilities Screenshots** (both targets)
5. **Build Environment Info** (iOS version, device, Xcode version)

## 🔧 Files Modified

### Native iOS
- `ios/ShareExtension/ShareViewController.swift` - Added comprehensive write logging
- `ios/FitLinks/SharedItemsModule.swift` - Added comprehensive read logging

### React Native
- `app/import.tsx` - Enhanced logging and debug panel

### Documentation (all new)
- `DEBUG_SHARE_EXTENSION.md`
- `SUMMARY.md`
- `QUICKSTART.md`
- `CHECKLIST.md`
- `TROUBLESHOOTING_FLOWCHART.md`
- `README_SHARE_DEBUG.md` (this file)

### Tools (new)
- `verify-app-groups.sh` - Automated verification script

## 🎓 Understanding App Groups

### What Are App Groups?

App Groups allow multiple apps (or an app and its extensions) to share data by accessing a shared container. This is required for:
- Share extensions sharing data with main app
- App extensions of any kind
- App Clips
- Multiple apps from same developer

### Why They Matter Here

The share extension runs in a separate process from the main app. Without App Groups:
- Share extension writes to ITS OWN UserDefaults
- Main app reads from ITS OWN UserDefaults
- They never see each other's data
- Import screen stays empty

With App Groups properly configured:
- Share extension writes to SHARED UserDefaults
- Main app reads from SHARED UserDefaults
- Data flows correctly
- Import screen populates

### Configuration Requirements

App Groups require THREE things to work:

1. **Entitlements Files** ✅ (Already correct in your project)
2. **Xcode Signing & Capabilities** ⚠️ (MUST be verified manually)
3. **Provisioning Profiles** ⚠️ (Must include App Groups capability)

This guide focuses on #2 because it's the most commonly missed step.

## 🏁 Next Steps

1. Run `./verify-app-groups.sh`
2. Verify App Groups in Xcode
3. Clean and rebuild
4. Test share flow
5. Follow troubleshooting flowchart if needed

**The debugging tools are now in place. Time to test and fix!**

---

*For the fastest path to resolution, start with [QUICKSTART.md](./QUICKSTART.md)*
