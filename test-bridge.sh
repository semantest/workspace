#!/usr/bin/env bash

echo "🔍 Testing WebSocket Bridge Communication"
echo "========================================"

# Check if servers are running
if ! curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "❌ Addon server not running. Start with: cd nodejs.server && ./run-addon-server.sh"
    exit 1
fi

if ! nc -z localhost 3004 2>/dev/null; then
    echo "❌ WebSocket server not running. Start with: cd nodejs.server && npm start"
    exit 1
fi

echo "✅ Both servers are running"
echo ""
echo "Instructions:"
echo "1. Make sure you have reloaded the extension"
echo "2. Open ChatGPT in a tab (https://chat.openai.com)"
echo "3. Open DevTools Console (F12)"
echo "4. You should see debug messages starting with 🔍"
echo ""
echo "When ready, this will send a test image generation request."
read -p "Press ENTER to send test message..."

# Send test message
./generate-image-async.sh "test watercolor painting" ~/Downloads "test-bridge.png"

echo ""
echo "Check the ChatGPT console for these messages:"
echo "  🔍 semantest-message received"
echo "  🎯 Image download request detected!"
echo "  🎯 Prompt: test watercolor painting"
echo ""
echo "If you don't see these, the bridge isn't working."
echo "If you do see them, check for the image generation to start."