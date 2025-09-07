#!/bin/bash
# 🚨 CEO URGENT TEST - RUN THIS NOW!

echo "🚨 === CEO PRIORITY IMAGE GENERATION TEST ==="
echo ""
echo "📋 INSTRUCTIONS FOR CEO DEMO:"
echo ""
echo "1️⃣ RELOAD THE EXTENSION:"
echo "   - Go to chrome://extensions/"
echo "   - Find SEMANTEST ChatGPT"
echo "   - Click the reload button ↻"
echo ""
echo "2️⃣ OPEN CHATGPT:"
echo "   - Go to https://chatgpt.com"
echo "   - Make sure you're logged in"
echo "   - Open DevTools (F12) → Console"
echo "   - Look for: '🚨 CEO PRIORITY - SEMANTEST ready'"
echo ""
echo "3️⃣ PRESS ENTER TO SEND TEST COMMAND..."
read -p ""

# Send the image generation request
echo "🚀 Sending image generation request..."
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ImageGenerationRequestedEvent",
    "payload": {
      "domain": "chatgpt.com",
      "prompt": "Generate an image of a red circle on white background",
      "outputPath": "/tmp/ceo-demo.png",
      "correlationId": "ceo-demo-001"
    }
  }'

echo ""
echo "✅ Command sent!"
echo ""
echo "👀 NOW WATCH:"
echo "   - ChatGPT will receive the prompt"
echo "   - Image will be generated"
echo "   - File will be saved to /tmp/ceo-demo.png"
echo ""
echo "Check: ls -la /tmp/ceo-demo.png"