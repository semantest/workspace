#!/usr/bin/env bash

echo "🧪 Final Comprehensive Test"
echo "==========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${YELLOW}Step 1: Pre-flight checks${NC}"

# Check servers
ADDON_OK=false
WS_OK=false

if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Addon server running${NC}"
    ADDON_OK=true
else
    echo -e "${RED}❌ Addon server NOT running${NC}"
fi

if nc -z localhost 3004 2>/dev/null; then
    echo -e "${GREEN}✅ WebSocket server running${NC}"
    WS_OK=true
else
    echo -e "${RED}❌ WebSocket server NOT running${NC}"
fi

if [ "$ADDON_OK" = false ] || [ "$WS_OK" = false ]; then
    echo -e "\n${RED}Please start both servers first!${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 2: Extension Setup${NC}"
echo "1. Go to chrome://extensions/"
echo "2. Click refresh icon on Semantest"
echo "3. Open the service worker console (click 'service worker')"
echo "4. Open a NEW ChatGPT tab"
echo ""
echo -e "${BLUE}In the service worker console, you should see:${NC}"
echo "  💉 Loading addon dynamically..."
echo "  📦 Loaded bundle..."
echo "  ✅ Addon loaded successfully..."
echo "  ✅ Bridge verified working: {success: true, message: 'pong'}"
echo ""
echo -e "${RED}If you see '❌ Bridge not responding', the bridge isn't working!${NC}"
echo ""

read -p "Press ENTER when you see the bridge verified message..."

echo -e "\n${YELLOW}Step 3: Manual Bridge Test${NC}"
echo "In the service worker console, paste this:"
echo ""
echo -e "${BLUE}chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
  if (tabs[0]) {
    try {
      const response = await chrome.tabs.sendMessage(tabs[0].id, {type: 'ping'});
      console.log('Bridge test:', response);
    } catch (e) {
      console.error('Bridge error:', e);
    }
  }
});${NC}"
echo ""
echo "You should see: Bridge test: {success: true, message: 'pong', bridge: 'active'}"
echo ""

read -p "Press ENTER after verifying the bridge works..."

echo -e "\n${YELLOW}Step 4: Image Generation Test${NC}"
echo "Sending image generation request..."
echo ""

./generate-image-async.sh "colorful sunset over ocean" ~/Downloads "final-test.png"

echo -e "\n${BLUE}Check the service worker console for:${NC}"
echo "  🔍 Processing WebSocket message: event"
echo "  🎯 Image download request detected!"
echo "  📨 Sending image request to tab..."
echo ""
echo -e "${BLUE}Check the ChatGPT tab console for:${NC}"
echo "  🌉 Bridge received from service worker"
echo "  (Addon processing messages)"
echo ""
echo -e "${GREEN}If the prompt appears in ChatGPT, SUCCESS!${NC}"
echo -e "${RED}If not, check both consoles for errors.${NC}"