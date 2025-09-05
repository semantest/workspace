#!/bin/bash
# SEMANTEST End-to-End Flow Test
# Tests the complete event flow: CLI → Server → Extension → ChatGPT

echo "🧪 === SEMANTEST FLOW TEST ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# 1. Check if server is running on port 8080
if netstat -tulpn 2>/dev/null | grep -q 8080; then
    echo -e "  ${GREEN}✅ HTTP Server on port 8080${NC}"
else
    echo -e "  ${RED}❌ HTTP Server not running on port 8080${NC}"
    echo "     Start with: cd nodejs.server && npm start"
    exit 1
fi

# 2. Check if WebSocket is running on port 8081
if netstat -tulpn 2>/dev/null | grep -q 8081; then
    echo -e "  ${GREEN}✅ WebSocket on port 8081${NC}"
else
    echo -e "  ${RED}❌ WebSocket not running on port 8081${NC}"
    echo "     WebSocket should be part of the server"
    exit 1
fi

# 3. Check if Chrome extension is loaded
echo -e "  ${YELLOW}⚠️  Please verify Chrome extension is loaded${NC}"
echo "     chrome://extensions/ → Developer mode → Load unpacked"

echo ""
echo "🚀 Sending test event..."
echo ""

# Send a simple test event
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ImageGenerationRequestedEvent",
    "payload": {
      "domain": "chatgpt.com",
      "prompt": "a small red circle on white background",
      "outputPath": "/tmp/semantest-test.png",
      "correlationId": "'$(uuidgen || echo "test-$(date +%s)")'"
    }
  }'

echo ""
echo ""
echo "📊 Expected Flow:"
echo "  1. CLI/curl sends event to server (port 8080)"
echo "  2. Server forwards to extension via WebSocket (port 8081)"
echo "  3. Extension finds ChatGPT tab by domain"
echo "  4. Extension waits for idle state"
echo "  5. Extension sends prompt to ChatGPT"
echo "  6. ChatGPT generates image"
echo "  7. Extension captures image URL"
echo "  8. Server downloads and saves to /tmp/semantest-test.png"
echo ""
echo "Check browser console for SEMANTEST logs!"