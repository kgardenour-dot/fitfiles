#!/bin/bash

echo "================================"
echo "FitLinks App Groups Verification"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Step 1: Opening Xcode workspace..."
open ios/FitLinks.xcworkspace

echo ""
echo "${YELLOW}⚠️  MANUAL VERIFICATION REQUIRED IN XCODE${NC}"
echo ""
echo "In Xcode, verify the following:"
echo ""
echo "1. Main App Target (FitLinks):"
echo "   - Select project (blue icon) → TARGETS → FitLinks"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Verify 'App Groups' capability exists"
echo "   - Verify it includes: ${GREEN}group.com.banditinnovations.fitlinks${NC}"
echo ""
echo "2. Share Extension Target (ShareExtension):"
echo "   - Select project (blue icon) → TARGETS → ShareExtension"
echo "   - Go to 'Signing & Capabilities' tab"
echo "   - Verify 'App Groups' capability exists"
echo "   - Verify it includes: ${GREEN}group.com.banditinnovations.fitlinks${NC}"
echo ""
echo "${RED}IMPORTANT: Both targets MUST have the SAME App Group identifier!${NC}"
echo ""
echo "================================"
echo "Checking entitlements files..."
echo "================================"
echo ""

echo "Main App Entitlements (FitLinks.entitlements):"
if [ -f "ios/FitLinks/FitLinks.entitlements" ]; then
    if grep -q "group.com.banditinnovations.fitlinks" ios/FitLinks/FitLinks.entitlements; then
        echo "${GREEN}✅ Contains correct App Group${NC}"
        grep -A 1 "com.apple.security.application-groups" ios/FitLinks/FitLinks.entitlements | grep -v "com.apple.security.application-groups"
    else
        echo "${RED}❌ Does not contain correct App Group${NC}"
    fi
else
    echo "${RED}❌ File not found${NC}"
fi

echo ""
echo "Share Extension Entitlements (ShareExtension.entitlements):"
if [ -f "ios/ShareExtension/ShareExtension.entitlements" ]; then
    if grep -q "group.com.banditinnovations.fitlinks" ios/ShareExtension/ShareExtension.entitlements; then
        echo "${GREEN}✅ Contains correct App Group${NC}"
        grep -A 1 "com.apple.security.application-groups" ios/ShareExtension/ShareExtension.entitlements | grep -v "com.apple.security.application-groups"
    else
        echo "${RED}❌ Does not contain correct App Group${NC}"
    fi
else
    echo "${RED}❌ File not found${NC}"
fi

echo ""
echo "================================"
echo "Checking code references..."
echo "================================"
echo ""

echo "Share Extension code references:"
if grep -n "group.com.banditinnovations.fitlinks" ios/ShareExtension/ShareViewController.swift; then
    echo "${GREEN}✅ Found in ShareViewController.swift${NC}"
else
    echo "${RED}❌ Not found in ShareViewController.swift${NC}"
fi

echo ""
echo "Main App code references:"
if grep -n "group.com.banditinnovations.fitlinks" ios/FitLinks/SharedItemsModule.swift; then
    echo "${GREEN}✅ Found in SharedItemsModule.swift${NC}"
else
    echo "${RED}❌ Not found in SharedItemsModule.swift${NC}"
fi

echo ""
echo "================================"
echo "Debug logging status"
echo "================================"
echo ""
echo "${GREEN}✅ Debug logging has been added to:${NC}"
echo "   - ShareViewController.swift (all write operations)"
echo "   - SharedItemsModule.swift (all read operations)"
echo "   - Import screen (debug panel in DEV mode)"
echo ""
echo "After rebuilding, check Xcode console for logs like:"
echo "   ${YELLOW}[ShareViewController] ✅ Writing URL to UserDefaults${NC}"
echo "   ${YELLOW}[SharedItemsModule] 📖 Reading from UserDefaults${NC}"
echo ""

echo "================================"
echo "Next Steps"
echo "================================"
echo ""
echo "1. Verify App Groups in Xcode (see instructions above)"
echo "2. Clean and rebuild:"
echo "   ${YELLOW}rm -rf ios/build${NC}"
echo "   ${YELLOW}npx expo run:ios --device${NC}"
echo ""
echo "3. Test share from Safari or Chrome"
echo "4. Check Xcode console for debug logs"
echo "5. Check Import screen for debug panel (DEV mode only)"
echo ""
echo "See DEBUG_SHARE_EXTENSION.md for complete instructions."
echo ""
