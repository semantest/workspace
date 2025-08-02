#!/usr/bin/env bash

echo "🧪 Full Flow Test for Dynamic Addon Image Generation"
echo "===================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check servers
echo -e "\n${YELLOW}Step 1: Checking servers...${NC}"

ADDON_SERVER_OK=false
WS_SERVER_OK=false

# Check addon server
if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Addon server running on port 3003${NC}"
    ADDON_SERVER_OK=true
else
    echo -e "${RED}❌ Addon server NOT running on port 3003${NC}"
    echo "   Start with: cd nodejs.server && ./run-addon-server.sh"
fi

# Check WebSocket server
if nc -z localhost 3004 2>/dev/null; then
    echo -e "${GREEN}✅ WebSocket server running on port 3004${NC}"
    WS_SERVER_OK=true
else
    echo -e "${RED}❌ WebSocket server NOT running on port 3004${NC}"
    echo "   Start with: cd nodejs.server && npm start"
fi

if [ "$ADDON_SERVER_OK" = false ] || [ "$WS_SERVER_OK" = false ]; then
    echo -e "\n${RED}Please start both servers before continuing!${NC}"
    exit 1
fi

# Step 2: Check addon bundle
echo -e "\n${YELLOW}Step 2: Testing addon endpoints...${NC}"

BUNDLE_SIZE=$(curl -s http://localhost:3003/api/addons/chatgpt/bundle | wc -c)
if [ $BUNDLE_SIZE -gt 1000 ]; then
    echo -e "${GREEN}✅ Addon bundle available (${BUNDLE_SIZE} bytes)${NC}"
else
    echo -e "${RED}❌ Addon bundle not available${NC}"
    exit 1
fi

# Step 3: Instructions
echo -e "\n${YELLOW}Step 3: Manual steps required:${NC}"
echo "1. Reload the Chrome extension:"
echo "   - Go to chrome://extensions/"
echo "   - Click the refresh icon on Semantest"
echo ""
echo "2. Open ChatGPT in a new tab:"
echo "   - Go to https://chat.openai.com"
echo "   - Open DevTools Console (F12)"
echo "   - Look for: '✅ ChatGPT addon injected dynamically'"
echo ""
echo "3. Check the Semantest popup:"
echo "   - Click the Semantest extension icon"
echo "   - Verify 'Active Addon: ChatGPT Helper'"
echo ""

read -p "Press ENTER when ready to test image generation..."

# Step 4: Test image generation
echo -e "\n${YELLOW}Step 4: Testing image generation...${NC}"

PROMPT="a beautiful sunset over mountains in watercolor style"
FOLDER="$HOME/Downloads"
FILENAME="test-$(date +%s).png"

echo "Sending request:"
echo "  Prompt: $PROMPT"
echo "  Folder: $FOLDER"
echo "  Filename: $FILENAME"

./generate-image-async.sh "$PROMPT" "$FOLDER" "$FILENAME"

echo -e "\n${YELLOW}Check ChatGPT for:${NC}"
echo "1. The prompt should appear in the input field"
echo "2. Image generation should start"
echo "3. Image should download when complete"
echo ""
echo "If it doesn't work, check:"
echo "- Browser console for errors"
echo "- Server logs for 'Message sent to tab' confirmation"
echo "- ChatGPT tab is open (doesn't need to be active)"

echo -e "\n${GREEN}Test complete!${NC}"