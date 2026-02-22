# Share Deduplication - Quick Reference

## The Problem
```
Safari Share (warm start) → Extension writes payload to App Group
                         ↓
                    Opens fitlinks://dataUrl=...
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
         Event #1                Event #2
              ↓                     ↓
      Reads payload          Reads payload (still there!)
              ↓                     ↓
      Navigate /import      Navigate /import
              ↓                     ↓
         Clear payload        Clear payload
              
Result: Import screen appears TWICE ❌
```

## The Solution
```
Safari Share (warm start) → Extension writes payload to App Group
                         ↓
                    Opens fitlinks://dataUrl=...
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
         Event #1                Event #2
              ↓                     ↓
      Read+Clear payload     Read payload (empty!)
              ↓                     ↓
      Dedupe: OK ✅          Dedupe: SKIP (empty) ⛔️
              ↓                     OR
      Navigate /import       Dedupe: SKIP (time window) ⛔️
              
Result: Import screen appears ONCE ✅
```

## Key Changes

### 1. Atomic Read-and-Clear
**Before**: Read → Navigate → Import screen clears  
**After**: Read+Clear → Navigate → Import screen renders

### 2. Dedupe Gate
```typescript
// Two-tier strategy:
if (nonce) {
  // Block same nonce within 10s
  if (lastHandled.nonce === nonce && now - lastHandled.ts < 10000) return false;
} else {
  // Block any event within 1.5s
  if (now - lastHandled.ts < 1500) return false;
}
```

### 3. Single Handler Location
- **Before**: `_layout.tsx` (addEventListener only) + `import.tsx` (reads App Group)
- **After**: `_layout.tsx` (both getInitialURL + addEventListener, reads App Group atomically)

## Log Pattern to Watch For

### Successful Single Import (Expected)
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: ... }
[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] 🗑️ Payload cleared after read
[FL_SHARE_DIAG] routing to import { shareNonce: '...', hasUrl: true, hasText: false }
[FL_SHARE_DIAG] Import screen mount { shareNonce: '...' }
```

### Duplicate Event Blocked (Also Expected)
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: ... }
[SharedItemsModule] 📖 Reading from UserDefaults (atomic read+clear)
[SharedItemsModule] ✅ Payload exists
[SharedItemsModule] 🗑️ Payload cleared after read
[FL_SHARE_DIAG] routing to import { shareNonce: '...', hasUrl: true, hasText: false }
[FL_SHARE_DIAG] Import screen mount { shareNonce: '...' }
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: ... }
[SharedItemsModule] ⚠️ No payload found for key: ...
[FL_SHARE_DIAG] No payload found in App Group, ignoring
```

### Duplicate Event Caught by Time Window (Also Expected)
```
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: 1000 }
[FL_SHARE_DIAG] routing to import ...
[FL_SHARE_DIAG] handleUrl fired { url: 'fitlinks://...', source: 'urlEvent', ts: 1200 }
[FL_SHARE_DIAG] duplicate share ignored { shareNonce: undefined }
```

## Manual Test Checklist

- [ ] **Warm start duplicate**: App in background → Share from Safari → Import appears once ✅
- [ ] **Cold start**: Force quit → Share from Safari → Import appears once ✅
- [ ] **Different pages**: Share page A → Share page B quickly → Both import ✅
- [ ] **Same page repeat**: Share same page twice within 2s → Second blocked ✅

## One-Line Summary
**Atomic read+clear in _layout before navigation + time-based dedupe = no duplicate imports**
