#!/usr/bin/env bash

echo "🧪 Dynamic Addon Testing Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if addon dev server is running
echo -e "\n${YELLOW}1. Checking addon dev server (port 3003)...${NC}"
if curl -s http://localhost:3003/health > /dev/null; then
    echo -e "${GREEN}✅ Addon dev server is running${NC}"
else
    echo -e "${RED}❌ Addon dev server is NOT running${NC}"
    echo "   Starting it now..."
    cd nodejs.server
    ./run-addon-server.sh &
    sleep 3
    cd ..
fi

# Test addon endpoints
echo -e "\n${YELLOW}2. Testing addon endpoints...${NC}"
echo -n "   - Manifest endpoint: "
if curl -s http://localhost:3003/api/addons/chatgpt/manifest | grep -q "chatgpt_addon"; then
    echo -e "${GREEN}✅ Working${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -n "   - Bundle endpoint: "
BUNDLE_SIZE=$(curl -s http://localhost:3003/api/addons/chatgpt/bundle | wc -c)
if [ $BUNDLE_SIZE -gt 1000 ]; then
    echo -e "${GREEN}✅ Working (${BUNDLE_SIZE} bytes)${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Check WebSocket server
echo -e "\n${YELLOW}3. Checking WebSocket server (port 3004)...${NC}"
if nc -z localhost 3004 2>/dev/null; then
    echo -e "${GREEN}✅ WebSocket server is running${NC}"
else
    echo -e "${RED}❌ WebSocket server is NOT running${NC}"
    echo "   Please start it with: npm start"
fi

# Instructions
echo -e "\n${YELLOW}4. Extension Setup Instructions:${NC}"
echo "   1. Open chrome://extensions/"
echo "   2. Remove old Semantest extension"
echo "   3. Click 'Load unpacked' and select extension.chrome directory"
echo "   4. Open https://chat.openai.com in a new tab"
echo "   5. Open DevTools console (F12)"
echo "   6. Look for these messages:"
echo "      - '💉 Loading addon dynamically for tab...'"
echo "      - '📦 Loaded bundle (xxx bytes)'"
echo "      - '✅ ChatGPT addon injected dynamically'"

echo -e "\n${YELLOW}5. Test Image Generation:${NC}"
echo "   Once the addon is loaded, run:"
echo "   ./generate-image-async.sh 'your prompt' ~/Downloads 'filename.png'"

# Show current status
echo -e "\n${YELLOW}Current Status:${NC}"
if curl -s http://localhost:3003/health > /dev/null && nc -z localhost 3004 2>/dev/null; then
    echo -e "${GREEN}✅ All servers running - Ready to test!${NC}"
    echo -e "\n${YELLOW}Quick Test Command:${NC}"
    echo "./generate-image-async.sh 'manga drawing of a soccer ball' ~/Downloads '001-soccer.png'"
else
    echo -e "${RED}❌ Some servers are not running${NC}"
    echo "   Please ensure both servers are running before testing"
fi