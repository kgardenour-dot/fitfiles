#!/bin/bash

# ====================================================================
# App Groups Runtime Verification Script
# ====================================================================
# This script helps verify that App Groups are properly configured
# both in Xcode and in the actual built/signed artifacts on device.
#
# USAGE:
#   1. Run after: npx expo run:ios --device
#   2. Check logs for containerURL diagnostics
#   3. Run this script to verify built entitlements
# ====================================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_GROUP_ID="group.com.banditinnovations.fitlinks"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║          App Groups Runtime Verification                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ====================================================================
# PART 1: Find Built Artifacts
# ====================================================================
echo "📦 PART 1: Locating built artifacts..."
echo ""

# Find the .app bundle
echo "Searching for .app bundle..."
APP_PATH=$(find "$REPO_ROOT/ios/build" -maxdepth 6 -name "*.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo "⚠️  No .app bundle found in ios/build/Debug-iphoneos/"
    echo "   Run: npx expo run:ios --device"
    echo "   Then rerun this script."
    echo ""
else
    echo "✅ Found: $APP_PATH"
    echo ""
fi

# Find the .appex bundle
echo "Searching for Share Extension .appex..."
APPEX_PATH=$(find "$REPO_ROOT/ios/build" -maxdepth 8 -name "*.appex" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)

if [ -z "$APPEX_PATH" ]; then
    echo "⚠️  No .appex bundle found in ios/build/Debug-iphoneos/"
    echo "   Run: npx expo run:ios --device"
    echo "   Then rerun this script."
    echo ""
else
    echo "✅ Found: $APPEX_PATH"
    echo ""
fi

# If either is missing, exit
if [ -z "$APP_PATH" ] || [ -z "$APPEX_PATH" ]; then
    echo "❌ Cannot proceed without built artifacts."
    exit 1
fi

# ====================================================================
# PART 2: Verify Signed Entitlements
# ====================================================================
echo ""
echo "🔐 PART 2: Verifying signed entitlements..."
echo ""

# Check Main App entitlements
echo "─────────────────────────────────────────────────────────────────"
echo "Main App Entitlements:"
echo "─────────────────────────────────────────────────────────────────"
APP_ENTITLEMENTS=$(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | sed -n '1,200p')

if echo "$APP_ENTITLEMENTS" | grep -q "com.apple.security.application-groups"; then
    echo "✅ com.apple.security.application-groups: PRESENT"
    
    if echo "$APP_ENTITLEMENTS" | grep -q "$APP_GROUP_ID"; then
        echo "✅ $APP_GROUP_ID: PRESENT"
    else
        echo "❌ $APP_GROUP_ID: MISSING"
        echo ""
        echo "Full entitlements:"
        echo "$APP_ENTITLEMENTS"
    fi
else
    echo "❌ com.apple.security.application-groups: MISSING"
    echo ""
    echo "Full entitlements:"
    echo "$APP_ENTITLEMENTS"
fi

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo "Share Extension Entitlements:"
echo "─────────────────────────────────────────────────────────────────"
APPEX_ENTITLEMENTS=$(codesign -d --entitlements :- "$APPEX_PATH" 2>/dev/null | sed -n '1,200p')

if echo "$APPEX_ENTITLEMENTS" | grep -q "com.apple.security.application-groups"; then
    echo "✅ com.apple.security.application-groups: PRESENT"
    
    if echo "$APPEX_ENTITLEMENTS" | grep -q "$APP_GROUP_ID"; then
        echo "✅ $APP_GROUP_ID: PRESENT"
    else
        echo "❌ $APP_GROUP_ID: MISSING"
        echo ""
        echo "Full entitlements:"
        echo "$APPEX_ENTITLEMENTS"
    fi
else
    echo "❌ com.apple.security.application-groups: MISSING"
    echo ""
    echo "Full entitlements:"
    echo "$APPEX_ENTITLEMENTS"
fi

# ====================================================================
# PART 3: Check Console Logs (Manual Step)
# ====================================================================
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  PART 3: Test on Device & Check Logs                              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Ensure your device is connected and running the app"
echo ""
echo "2. Test sharing from Safari or Chrome"
echo ""
echo "3. Watch the console logs for these critical lines:"
echo ""
echo "   📦 Share Extension writes:"
echo "   [ShareViewController] 📦 AppGroup containerURL: file://... OR nil"
echo ""
echo "   📦 Host app reads:"
echo "   [SharedItemsModule] 📦 AppGroup containerURL: file://... OR nil"
echo ""
echo "4. Interpretation:"
echo "   ✅ Both show file://... → App Groups work at runtime"
echo "   ❌ Either shows nil → Entitlements not active for that target"
echo ""
echo "5. To view logs, run in another terminal:"
echo "   xcrun devicectl device observe logs"
echo ""
echo "   Or filter for our app:"
echo "   xcrun devicectl device observe logs | grep -E 'ShareViewController|SharedItemsModule'"
echo ""

# ====================================================================
# Summary
# ====================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  Summary                                                           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "This script verified the SIGNED entitlements in your built artifacts."
echo "If both targets show ✅ above, the entitlements are correctly signed."
echo ""
echo "The final test is on-device runtime verification via console logs."
echo "If containerURL logs show 'nil', the issue is with provisioning/team setup."
echo "If containerURL logs show a valid file:// path, App Groups work and the"
echo "issue is elsewhere (payload handling, key mismatch, etc.)."
echo ""
