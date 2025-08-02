#!/usr/bin/env bash

echo "🧪 Testing Fixed Addon Message Handling"
echo "======================================="

echo ""
echo "Instructions:"
echo "1. Reload the extension (click refresh icon in chrome://extensions/)"
echo "2. Make sure ChatGPT tab is open"
echo "3. Watch the service worker console for new messages"
echo ""
echo "You should see:"
echo "  🔍 Processing WebSocket message: event"
echo "  🔍 Event type: semantest/custom/image/download/requested"
echo "  🎯 Image download request detected!"
echo "  📤 Handling image download request..."
echo "  📋 Found X ChatGPT tabs"
echo "  📨 Sending image request to tab..."
echo ""

read -p "Press ENTER when ready to test..."

# Send test message
./generate-image-async.sh "beautiful mountain landscape" ~/Downloads "test-fixed.png"

echo ""
echo "Check the service worker console NOW for the new log messages!"
echo "If you see them, the message is being processed correctly."
echo ""
echo "Then check the ChatGPT console for the addon receiving the message."