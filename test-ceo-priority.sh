#!/bin/bash
# CEO PRIORITY TEST - Image Generation via CLI
# This tests the URGENT flow requested by CEO

echo "🚨 === CEO PRIORITY TEST: IMAGE GENERATION ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test correlation ID
CORRELATION_ID="ceo-test-$(date +%s)"
OUTPUT_PATH="/tmp/ceo-test-image.png"

echo "📋 Testing SEMANTEST Image Generation Flow"
echo "   Correlation ID: $CORRELATION_ID"
echo "   Output Path: $OUTPUT_PATH"
echo ""

# Step 1: Check server
echo "1️⃣ Checking SEMANTEST Server..."
if curl -s http://localhost:8080 | grep -q "SEMANTEST"; then
    echo -e "   ${GREEN}✅ Server is running${NC}"
else
    echo -e "   ${RED}❌ Server not responding${NC}"
    echo "   Start with: node nodejs.server/semantest-server.js"
    exit 1
fi

# Step 2: Send image generation request
echo ""
echo "2️⃣ Sending ImageGenerationRequestedEvent to server..."
echo "   Prompt: 'a small red circle on white background'"

RESPONSE=$(curl -s -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"ImageGenerationRequestedEvent\",
    \"payload\": {
      \"domain\": \"chatgpt.com\",
      \"prompt\": \"Create an image: a small red circle on white background\",
      \"outputPath\": \"$OUTPUT_PATH\",
      \"correlationId\": \"$CORRELATION_ID\"
    }
  }")

if echo "$RESPONSE" | grep -q "accepted"; then
    echo -e "   ${GREEN}✅ Event accepted by server${NC}"
    echo "   Response: $RESPONSE"
else
    echo -e "   ${RED}❌ Server rejected event${NC}"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Step 3: Wait for processing
echo ""
echo "3️⃣ Waiting for ChatGPT to generate image..."
echo -e "   ${YELLOW}⏳ Please ensure:${NC}"
echo "   - Chrome extension is loaded"
echo "   - ChatGPT tab is open and logged in"
echo "   - Extension shows SEMANTEST logs in console"
echo ""

# Monitor for image file
echo "4️⃣ Monitoring for generated image..."
for i in {1..30}; do
    if [ -f "$OUTPUT_PATH" ]; then
        echo -e "   ${GREEN}✅ IMAGE GENERATED SUCCESSFULLY!${NC}"
        echo "   File: $OUTPUT_PATH"
        echo "   Size: $(ls -lh $OUTPUT_PATH | awk '{print $5}')"
        echo ""
        echo "🎉 CEO PRIORITY COMPLETE - Image generation working!"
        exit 0
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${RED}❌ Timeout waiting for image${NC}"
echo ""
echo "Troubleshooting:"
echo "1. Check Chrome DevTools console for SEMANTEST logs"
echo "2. Verify extension is connected to WebSocket"
echo "3. Check server logs for WebSocket connections"
echo "4. Ensure ChatGPT is in IDLE state"

exit 1