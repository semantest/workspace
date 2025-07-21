#!/bin/bash
# Emergency Telemetry Consent Test Script

echo "🚨 EMERGENCY CHROME EXTENSION TEST 🚨"
echo "=================================="
echo "Testing telemetry consent popup..."
echo ""

# Check if build exists
if [ ! -d "extension.chrome/build" ]; then
    echo "❌ ERROR: Build directory not found!"
    echo "Run: cd extension.chrome && npm run build"
    exit 1
fi

echo "✅ Build directory found"
echo ""
echo "MANUAL STEPS REQUIRED:"
echo "1. Run: /run/current-system/sw/bin/chromium --user-data-dir=/tmp/chrome-test"
echo "2. Navigate to: chrome://extensions/"
echo "3. Enable 'Developer mode' (top right)"
echo "4. Click 'Load unpacked'"
echo "5. Select: $(pwd)/extension.chrome/build/"
echo "6. Look for consent popup!"
echo ""
echo "TEST CHECKLIST:"
echo "[ ] Consent popup appears on first launch"
echo "[ ] Privacy information is clear"
echo "[ ] Accept button works"
echo "[ ] Decline button works"
echo "[ ] Settings reflect choice correctly"
echo ""
echo "TAKE SCREENSHOTS OF:"
echo "- The consent popup"
echo "- Accept/Decline results"
echo "- Settings page showing telemetry status"