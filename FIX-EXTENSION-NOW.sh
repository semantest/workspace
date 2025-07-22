#!/bin/bash

# URGENT FIX: Get extension working NOW!

echo "🚨 URGENT: Fixing Chrome Extension for immediate testing!"
echo ""

cd /home/chous/work/semantest/extension.chrome

# Option 1: Use the pre-built version (fastest)
echo "📦 Option 1: Using pre-built extension from build directory"
echo "Directory to load: /home/chous/work/semantest/extension.chrome/build"
echo ""

# Option 2: Build from source (if needed)
echo "🔧 Option 2: If build is broken, rebuild from source:"
echo "Run these commands:"
echo "  cd /home/chous/work/semantest/extension.chrome"
echo "  npm install"
echo "  npm run build"
echo ""

echo "📋 INSTALLATION STEPS:"
echo "1. Open Chrome/Chromium"
echo "2. Go to: chrome://extensions/"
echo "3. Enable 'Developer mode' (top right)"
echo "4. Click 'Load unpacked'"
echo "5. Select: /home/chous/work/semantest/extension.chrome/build"
echo "6. Extension should appear as 'ChatGPT Extension'"
echo ""

echo "✅ VERIFICATION:"
echo "1. Extension icon appears in toolbar"
echo "2. Click icon - popup should work"
echo "3. Go to https://chat.openai.com"
echo "4. Open DevTools Console"
echo "5. Should see: 'ChatGPT Controller loaded'"
echo ""

echo "🧪 TEST THE FLOW:"
echo "cd /home/chous/work/semantest"
echo "./generate-image.sh \"Test image prompt\""
echo ""

echo "🔍 TROUBLESHOOTING:"
echo "- If extension doesn't load: Check build/ directory exists"
echo "- If content script missing: Refresh ChatGPT tab"
echo "- If still timing out: Check extension popup for health status"
echo ""

echo "⚡ QUICK CHECK:"
ls -la build/manifest.json 2>/dev/null && echo "✅ Build directory exists!" || echo "❌ Build missing - run npm build!"