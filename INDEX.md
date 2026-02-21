# 📚 App Groups Runtime Verification - Documentation Index

## 🚀 START HERE

**New to this debugging approach?** Start with:

1. **[APP_GROUPS_RUNTIME_README.md](APP_GROUPS_RUNTIME_README.md)** - Overview and quick start
2. **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** - Step-by-step testing instructions

## 📖 Documentation Guide

### For Testing (Start Here)

| File | Purpose | When to Use |
|------|---------|-------------|
| **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** | Complete step-by-step checklist | First time testing |
| **[verify-app-groups-runtime.sh](verify-app-groups-runtime.sh)** | Automated entitlement checker | After every build |

### For Understanding

| File | Purpose | When to Use |
|------|---------|-------------|
| **[APP_GROUPS_RUNTIME_README.md](APP_GROUPS_RUNTIME_README.md)** | Complete overview | Understanding the solution |
| **[APP_GROUPS_VERIFICATION.md](APP_GROUPS_VERIFICATION.md)** | Detailed verification workflow | Deep dive into testing |
| **[RUNTIME_DIAGNOSTICS_SUMMARY.md](RUNTIME_DIAGNOSTICS_SUMMARY.md)** | Technical implementation details | Understanding what was changed |

### For Troubleshooting

| File | Purpose | When to Use |
|------|---------|-------------|
| **[TROUBLESHOOTING_FLOWCHART_RUNTIME.txt](TROUBLESHOOTING_FLOWCHART_RUNTIME.txt)** | Visual decision tree | When logs show issues |
| **[TROUBLESHOOTING_FLOWCHART.md](TROUBLESHOOTING_FLOWCHART.md)** | Original troubleshooting guide | General share extension issues |

## 🎯 Quick Reference by Task

### "I just want to test if App Groups work"
1. Read: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
2. Run: `./verify-app-groups-runtime.sh`
3. Test and check logs per checklist

### "containerURL shows nil in logs"
1. Open: [TROUBLESHOOTING_FLOWCHART_RUNTIME.txt](TROUBLESHOOTING_FLOWCHART_RUNTIME.txt)
2. Follow: "Shows nil" branch
3. Fix entitlements/provisioning
4. Clean build and retest

### "containerURL works but no payload"
1. Open: [TROUBLESHOOTING_FLOWCHART_RUNTIME.txt](TROUBLESHOOTING_FLOWCHART_RUNTIME.txt)
2. Follow: "Shows file:// but No payload" branch
3. Check key mismatch or timing issues

### "I want to understand what was changed"
1. Read: [RUNTIME_DIAGNOSTICS_SUMMARY.md](RUNTIME_DIAGNOSTICS_SUMMARY.md)
2. See: Code changes in Swift files
3. Review: Expected vs actual log output

### "Build artifacts don't have entitlements"
1. Run: `./verify-app-groups-runtime.sh`
2. If ❌, check Xcode Signing & Capabilities
3. Regenerate provisioning profiles
4. Clean build

## 📦 What Was Changed

### Code Files (Modified)
- `ios/ShareExtension/ShareViewController.swift` - Added 6 containerURL logs
- `ios/FitLinks/SharedItemsModule.swift` - Added 1 containerURL log

### Scripts (New)
- `verify-app-groups-runtime.sh` - Automated entitlement verification

### Documentation (New)
- `APP_GROUPS_RUNTIME_README.md` - Main overview
- `APP_GROUPS_VERIFICATION.md` - Detailed testing guide
- `TESTING_CHECKLIST.md` - Step-by-step checklist
- `RUNTIME_DIAGNOSTICS_SUMMARY.md` - Technical details
- `TROUBLESHOOTING_FLOWCHART_RUNTIME.txt` - Decision tree
- `INDEX.md` - This file

## 🔍 The Critical Log Line

Everything hinges on this ONE log line appearing in BOTH targets:

```
📦 AppGroup containerURL: <VALUE>
```

**If VALUE is `file://...`** → ✅ App Groups work at runtime  
**If VALUE is `nil`** → ❌ Entitlements not active

## 🎓 Understanding the Approach

### Before (Old Approach)
- Checked Xcode UI (✅ shows enabled)
- Checked .entitlements files (✅ has correct XML)
- **Still failed on device** (❓ why?)

### After (New Approach)
- Check Xcode UI (static verification)
- Check .entitlements files (static verification)
- Check **built .app/.appex entitlements** (signed verification) ← NEW
- Check **runtime container resolution** (runtime verification) ← NEW

### Result
We now know **definitively** whether entitlements are:
1. ✅ Configured in Xcode
2. ✅ Signed into built artifacts
3. ✅ Active at runtime on device

No more mystery! 🎯

## 📊 Testing Workflow Diagram

```
┌─────────────────────────────────────────────────────┐
│  1. Clean Build                                     │
│     rm -rf ios/build && npx expo run:ios --device  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  2. Verify Built Artifacts                          │
│     ./verify-app-groups-runtime.sh                  │
│     → Check ✅/❌ for both targets                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  3. Monitor Device Logs                             │
│     xcrun devicectl device observe logs | grep ...  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  4. Test Share                                      │
│     Safari → Share → FitLinks                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  5. Check containerURL Logs                         │
│     [ShareViewController] 📦 containerURL: ?        │
│     [SharedItemsModule] 📦 containerURL: ?          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  6. Diagnosis                                       │
│     • Both file:// → ✅ App Groups work!           │
│     • Either nil → ❌ Fix entitlements              │
└─────────────────────────────────────────────────────┘
```

## 🆘 Getting Help

When asking for help, provide:

1. **Output from:** `./verify-app-groups-runtime.sh`
2. **Container URL logs from both:**
   - `[ShareViewController] 📦 AppGroup containerURL: ...`
   - `[SharedItemsModule] 📦 AppGroup containerURL: ...`
3. **Write operation logs:**
   - `[ShareViewController] ✅ Writing ... to UserDefaults`
   - `Payload length: ... bytes`
4. **Read operation logs:**
   - `[SharedItemsModule] ✅ Payload exists` OR `⚠️ No payload found`

With these 4 pieces of info, diagnosis is immediate and certain.

## ✅ Success Looks Like

```
# Verification script:
✅ Main App: com.apple.security.application-groups PRESENT
✅ Main App: group.com.banditinnovations.fitlinks PRESENT
✅ Share Extension: com.apple.security.application-groups PRESENT
✅ Share Extension: group.com.banditinnovations.fitlinks PRESENT

# Device logs:
[ShareViewController] 📦 AppGroup containerURL: file:///...
[ShareViewController] ✅ Writing URL to UserDefaults
[ShareViewController] Payload length: 156 bytes

[SharedItemsModule] 📦 AppGroup containerURL: file:///...
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] Payload type: Data, length: 156 bytes
```

That's it! App Groups work perfectly. Any remaining issues are in routing/parsing, not App Groups.

---

## 🔧 Maintenance

### When to Re-run Verification

- After changing Team ID
- After updating provisioning profiles
- After adding/removing capabilities
- After Xcode updates
- When moving to different device
- When switching between Debug/Release builds

### Keeping Logs Clean

The containerURL log only appears when needed (write/read operations). It doesn't spam logs during normal operation.

---

**Last Updated:** 2026-02-20  
**Implementation:** Complete ✅  
**Ready for Testing:** Yes 🚀
