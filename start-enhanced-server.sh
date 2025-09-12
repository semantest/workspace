#!/usr/bin/env bash

# Enhanced Image Generation Server Launcher
# CODE-ANALYZER Agent - Hive Mind

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
HTTP_PORT=${HTTP_PORT:-8080}
WS_PORT=${WS_PORT:-8081}
EVENT_STORE_PATH=${EVENT_STORE_PATH:-"./data/events"}
SNAPSHOT_PATH=${SNAPSHOT_PATH:-"./data/snapshots"}

echo -e "${CYAN}🚀 Enhanced Image Generation Server Launcher${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo -e "${YELLOW}⚠️  Node.js version $NODE_VERSION detected. Version 14+ recommended.${NC}"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p "$EVENT_STORE_PATH"
mkdir -p "$SNAPSHOT_PATH"
mkdir -p "./images"
mkdir -p "./downloads"
mkdir -p "./temp"

# Check if enhanced server exists
if [ ! -f "./nodejs.server/enhanced-image-generation-server.js" ]; then
    echo -e "${RED}❌ Enhanced server file not found!${NC}"
    echo -e "${YELLOW}Expected: ./nodejs.server/enhanced-image-generation-server.js${NC}"
    exit 1
fi

# Install dependencies if package.json exists
if [ -f "./package.json" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
else
    echo -e "${YELLOW}⚠️  No package.json found. Make sure WebSocket dependencies are available.${NC}"
fi

# Display configuration
echo -e "${BLUE}⚙️  Configuration:${NC}"
echo -e "   HTTP Port: ${GREEN}$HTTP_PORT${NC}"
echo -e "   WebSocket Port: ${GREEN}$WS_PORT${NC}"
echo -e "   Event Store: ${GREEN}$EVENT_STORE_PATH${NC}"
echo -e "   Snapshots: ${GREEN}$SNAPSHOT_PATH${NC}"
echo ""

# Check if ports are available
if command -v netstat &> /dev/null; then
    if netstat -ln | grep -q ":$HTTP_PORT "; then
        echo -e "${RED}❌ Port $HTTP_PORT is already in use!${NC}"
        exit 1
    fi
    if netstat -ln | grep -q ":$WS_PORT "; then
        echo -e "${RED}❌ Port $WS_PORT is already in use!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ All checks passed. Starting Enhanced Image Generation Server...${NC}"
echo ""

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down Enhanced Image Generation Server...${NC}"
    # The server handles graceful shutdown internally
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Export environment variables
export HTTP_PORT
export WS_PORT
export EVENT_STORE_PATH
export SNAPSHOT_PATH

# Start the enhanced server
echo -e "${CYAN}🎯 MISSION: Orchestrate ChatGPT Image Generation Workflow${NC}"
echo -e "${CYAN}   CLI (${HTTP_PORT}) → Server → Extension (${WS_PORT}) → ChatGPT${NC}"
echo ""

# Start with detailed logging
node ./nodejs.server/enhanced-image-generation-server.js

# This line will only be reached if the server exits
echo -e "${GREEN}✅ Enhanced Image Generation Server has stopped.${NC}"
