# 🔍 Troubleshooting Flowchart

## Start Here: Import Screen is Empty

```
┌─────────────────────────────────────┐
│   Import screen URL field empty?   │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Check Xcode Console  │
    └──────────┬───────────┘
               │
               ▼
    ┌─────────────────────────────────────┐
    │ Do you see [ShareViewController]    │
    │ write logs?                         │
    └─────┬─────────────────┬─────────────┘
          │                 │
         NO                YES
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│ Share Extension │  │ Do you see       │
│ Not Writing     │  │ [SharedItems     │
│                 │  │ Module] read     │
│ Possible:       │  │ logs?            │
│ • Extension     │  └────┬──────┬──────┘
│   crashed       │       │      │
│ • Wrong share   │      NO     YES
│   target        │       │      │
│ • Code error    │       ▼      ▼
│                 │  ┌────────┐ ┌─────────┐
│ Fix:            │  │App     │ │Do you   │
│ • Check crash   │  │Groups  │ │see      │
│   logs          │  │NOT     │ │[FitLinks│
│ • Rebuild       │  │Config  │ │] React  │
└─────────────────┘  │        │ │logs?    │
                     │Fix:    │ └──┬───┬──┘
                     │• Open  │    │   │
                     │  Xcode │   NO  YES
                     │• Check │    │   │
                     │  BOTH  │    ▼   ▼
                     │  targets│ ┌───────┐
                     │• Verify│  │Bridge │
                     │  same  │  │Issue  │
                     │  group │  │       │
                     │  ID    │  │Fix:   │
                     │• Clean │  │• Check│
                     │• Rebuild│ │  Metro│
                     └────────┘  │• Check│
                                 │  logs │
                                 │• Reload│
                                 │  app  │
                                 └───────┘
```

## Detailed Decision Tree

### Question 1: Do you see write logs?

**Look for in Xcode Console:**
```
[ShareViewController] ✅ Writing URL to UserDefaults
```

**If NO** → Go to [Scenario A: No Write Logs](#scenario-a-no-write-logs)
**If YES** → Continue to Question 2

---

### Question 2: Do you see read logs?

**Look for in Xcode Console:**
```
[SharedItemsModule] 📖 Reading from UserDefaults
```

**If NO** → Go to [Scenario B: No Read Logs](#scenario-b-no-read-logs)
**If YES** → Continue to Question 3

---

### Question 3: Does read log show payload exists?

**Look for in Xcode Console:**
```
[SharedItemsModule] ✅ Payload exists
```

**If NO** (shows "⚠️ No payload found") → Go to [Scenario C: Payload Not Found](#scenario-c-payload-not-found)
**If YES** → Continue to Question 4

---

### Question 4: Do you see React logs?

**Look for in Metro Console:**
```
[FitLinks] CONSUME share
[FitLinks] getSharedPayload result:
```

**If NO** → Go to [Scenario D: No React Logs](#scenario-d-no-react-logs)
**If YES** → Continue to Question 5

---

### Question 5: Does React log show payload value?

**Look for in Metro Console:**
```
[FitLinks] getSharedPayload result: { type: 'weburl', value: 'https://...' }
```

**If NO** (shows null or undefined) → Go to [Scenario E: Empty Payload](#scenario-e-empty-payload)
**If YES** → Continue to Question 6

---

### Question 6: Does Import debug panel appear?

**Look on Import screen for debug panel starting with:**
```
🔍 Share Debug Info
```

**If NO** → Check if running in DEV mode (`__DEV__` flag)
**If YES** → Continue to Question 7

---

### Question 7: Is URL state populated in debug panel?

**Look for in debug panel:**
```
Current url state: https://...
```

**If NO** → Go to [Scenario F: State Not Updating](#scenario-f-state-not-updating)
**If YES** → Go to [Scenario G: State Good But UI Empty](#scenario-g-state-good-but-ui-empty)

---

## Scenarios and Solutions

### Scenario A: No Write Logs

**Problem:** Share extension not writing to UserDefaults

**Diagnostic Steps:**
1. Check if FitLinks appears in Share sheet
2. Check Xcode for extension crash logs
3. Verify extension activation in Share sheet

**Solutions:**
```bash
# Clean and rebuild
rm -rf ios/build
rm -rf ios/Pods
pod install --project-directory=ios
npx expo run:ios --device
```

**Also check:**
- Extension Info.plist configuration
- Extension activation rules
- Extension not crashing on launch

---

### Scenario B: No Read Logs

**Problem:** App Groups not properly configured

**This is the MOST COMMON issue!**

**Diagnostic Steps:**
1. Open Xcode: `./verify-app-groups.sh`
2. Check FitLinks target → Signing & Capabilities
3. Check ShareExtension target → Signing & Capabilities

**Solution:**
1. In Xcode, select project (blue icon)
2. Select **FitLinks** target
3. Go to **Signing & Capabilities** tab
4. Verify **App Groups** capability exists
5. Verify it includes: `group.com.banditinnovations.fitlinks`
6. Repeat for **ShareExtension** target
7. Both MUST have the SAME group ID
8. Clean and rebuild

**Visual Check:**
```
FitLinks Target:
✅ App Groups
  ✅ group.com.banditinnovations.fitlinks

ShareExtension Target:
✅ App Groups
  ✅ group.com.banditinnovations.fitlinks
```

---

### Scenario C: Payload Not Found

**Problem:** Data written but not found when reading

**Possible Causes:**
- Suite name mismatch
- Key name mismatch
- Timing issue

**Diagnostic Steps:**
Check logs for exact values:
```
Write: Suite: group.com.banditinnovations.fitlinks, Key: fitlinksShareKey
Read:  Suite: group.com.banditinnovations.fitlinks, Key: fitlinksShareKey
```

**Solution:**
- Verify suite names match exactly
- Verify key names match exactly
- Check shareNonce is being passed correctly

---

### Scenario D: No React Logs

**Problem:** Native-to-JS bridge not working

**Diagnostic Steps:**
1. Check Metro bundler is running
2. Check app is in development mode
3. Check SharedItemsModule is registered

**Solutions:**
```bash
# Reload Metro
# In terminal running Metro, press 'r'

# Or restart completely
npm start -- --reset-cache
```

---

### Scenario E: Empty Payload

**Problem:** Payload exists but value is empty/null

**Diagnostic Steps:**
Check Xcode logs for payload type and preview:
```
[SharedItemsModule] Payload type: Data, length: 156 bytes
[SharedItemsModule] Payload preview: [{"url":"https://...
```

**Solution:**
- If preview shows data, check parsing in SharedItemsModule
- If preview is empty, check share extension write operation
- Verify JSON encoding/decoding

---

### Scenario F: State Not Updating

**Problem:** Payload received but React state not updating

**Diagnostic Steps:**
1. Check Metro console for state update logs
2. Check if saveCompleted is true
3. Check if shareNonce was already consumed

**Solutions:**
- Verify useEffect dependencies
- Check consumedShareNonceRef
- Check if normalizeIncomingUrl is working
- Try fresh share with new nonce

---

### Scenario G: State Good But UI Empty

**Problem:** State has URL but TextInput is empty

**Diagnostic Steps:**
1. Debug panel shows: `Current url state: https://...`
2. But URL input field is empty

**Solutions:**
- Check TextInput value binding
- Check if controlled component is working
- Verify no conflicting state updates
- Check for render issues

---

## Quick Reference: What to Share for Help

If stuck, provide these 5 items:

1. **Xcode Console Output**
   ```
   [ShareViewController] logs
   [SharedItemsModule] logs
   ```

2. **Metro Console Output**
   ```
   [FitLinks] logs
   ```

3. **Import Debug Panel Screenshot**
   - Shows sharedKey, shareNonce, url state

4. **Signing & Capabilities Screenshots**
   - FitLinks target
   - ShareExtension target

5. **Build Environment**
   - iOS version
   - Device model
   - Xcode version
   - Node version

---

## Prevention Checklist

Before testing each time:

- [ ] Clean build folder
- [ ] Verify App Groups in Xcode (both targets)
- [ ] Connect device and trust computer
- [ ] Open Xcode console
- [ ] Open Metro console
- [ ] Use fresh share (new nonce)

This ensures you're always starting from a known state!
