#!/usr/bin/env bash

# Start the custom event forwarder WebSocket server

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Custom Event Forwarder${NC}"
echo -e "${GREEN}=================================${NC}"

# Check if port 3004 is already in use
if lsof -Pi :3004 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3004 is already in use${NC}"
    echo "Killing existing process..."
    lsof -ti:3004 | xargs kill -9
    sleep 1
fi

# Check if ws module is available
if ! node -e "require('ws')" 2>/dev/null; then
    echo -e "${YELLOW}📦 Installing WebSocket module...${NC}"
    npm install ws
fi

# Start the forwarder
echo -e "${GREEN}Starting forwarder on ws://localhost:3004${NC}"
echo ""
node custom-event-forwarder.js
