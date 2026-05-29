# 🚀 Quick Start - iOS Share Extension Debug

## 1️⃣ Verify App Groups in Xcode
```bash
./verify-app-groups.sh
```

In Xcode that opens:
- [ ] ChefLinks target → Signing & Capabilities → App Groups → `group.com.banditinnovations.cheflinks` ✅
- [ ] ShareExtension target → Signing & Capabilities → App Groups → `group.com.banditinnovations.cheflinks` ✅

## 2️⃣ Clean & Rebuild
```bash
rm -rf ios/build
npx expo run:ios --device
```

## 3️⃣ Test Share
1. Open Safari → `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. Tap Share → ChefLinks
3. Watch Xcode console for logs

## 4️⃣ Check Logs

### ✅ Expected: Share Extension writes
```
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Payload length: 156 bytes
```

### ✅ Expected: Host app reads
```
[SharedItemsModule] 📖 Reading from UserDefaults
[SharedItemsModule] ✅ Payload exists
```

### ✅ Expected: Import screen (Metro console)
```
[ChefLinks] CONSUME share { sharedKey: 'cheflinksShareKey' }
[ChefLinks] getSharedPayload result: { type: 'weburl', value: 'https://...' }
```

### ✅ Expected: Import screen UI
- Debug panel visible (in DEV mode)
- URL field populated
- Title auto-filled

## 🐛 If Empty Import Screen

### Missing write logs?
→ Share extension not working, check for crashes

### Missing read logs?
→ **App Groups not configured in Xcode!**
→ Go back to step 1, verify BOTH targets

### Both logs present but Import empty?
→ Check Metro console
→ Check debug panel on Import screen
→ Share logs with developer

## 📚 Full Documentation
- **SUMMARY.md** - Complete overview
- **DEBUG_SHARE_EXTENSION.md** - Detailed guide
- **verify-app-groups.sh** - Automated checks
