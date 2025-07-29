#!/usr/bin/env bash

# Fire-and-Forget ChatGPT Image Generation Script
# Usage: ./generate-image-async.sh "prompt" [download-folder]
# 
# This script:
# 1. Auto-starts the Semantest WebSocket server if not running
# 2. Sends an ImageRequestReceived event to the server
# 3. EXITS IMMEDIATELY without waiting for response
#
# Perfect for testing queue capacity and concurrent processing

# Configuration
WS_URL="ws://localhost:3004"

# Color codes for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Arguments
PROMPT="${1:-A futuristic robot coding at a holographic terminal}"
DOWNLOAD_FOLDER="${2:-$HOME/Downloads}"
CUSTOM_FILENAME="${3:-}"  # Optional custom filename

# Display usage if no arguments
if [ -z "$1" ]; then
    echo "Usage: $0 \"image prompt\" [download-folder] [filename]"
    echo "Example: $0 \"A beautiful sunset over mountains\" ~/Pictures sunset.png"
    echo ""
    echo "Using default prompt: $PROMPT"
fi

# Ensure download folder exists
mkdir -p "$DOWNLOAD_FOLDER"

# Generate unique request ID
REQUEST_ID="img-$(date +%s)-$$"

echo -e "${PURPLE}🚀 Fire-and-Forget Image Generator${NC}"
echo -e "${PURPLE}=================================${NC}"
echo -e "${CYAN}Prompt:${NC} $PROMPT"
echo -e "${CYAN}Download folder:${NC} $DOWNLOAD_FOLDER"
if [ ! -z "$CUSTOM_FILENAME" ]; then
    echo -e "${CYAN}Filename:${NC} $CUSTOM_FILENAME"
fi
echo -e "${CYAN}Request ID:${NC} $REQUEST_ID"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed."
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

# Function to check if server is running
check_server() {
    nc -z localhost 3004 2>/dev/null
    return $?
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if server is running
if ! check_server; then
    echo "❌ Semantest server is not running on localhost:3004"
    echo "Please start it manually with:"
    echo "  cd $SCRIPT_DIR/sdk/server"
    echo "  npm run dev"
    exit 1
else
    echo "✅ Semantest server is running on ws://localhost:3004"
fi

# Create fire-and-forget Node.js WebSocket client script
TMP_SCRIPT="/tmp/semantest-image-async-$$.js"
cat > "$TMP_SCRIPT" << 'EOF'
const WebSocket = require('ws');

const WS_URL = process.argv[2];
const EVENT_TYPE = process.argv[3];
const PAYLOAD = JSON.parse(process.argv[4]);

const ws = new WebSocket(WS_URL);

// Exit after a very short delay to ensure message is sent
let exitTimeout;

ws.on('open', () => {
    console.log('✅ Connected to Semantest server');
    
    // Create properly formatted message
    const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'event',  // MUST be lowercase 'event'
        timestamp: Date.now(),
        payload: {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: EVENT_TYPE,  // This is 'semantest/custom/image/request/received'
            timestamp: Date.now(),
            payload: PAYLOAD
        }
    };
    
    console.log('📤 Sending ImageDownloadRequested event...');
    ws.send(JSON.stringify(message));
    
    // Exit after 100ms to ensure message is sent
    exitTimeout = setTimeout(() => {
        console.log('🚀 Request sent! (not waiting for response)');
        ws.close();
        process.exit(0);
    }, 100);
});

ws.on('error', (error) => {
    clearTimeout(exitTimeout);
    console.error('❌ WebSocket error:', error.message);
    console.error('Make sure the Semantest server is running on ' + WS_URL);
    process.exit(1);
});

// Ignore all incoming messages - we're fire-and-forget
ws.on('message', () => {
    // Do nothing - we don't care about responses
});

// Force exit after 1 second max (failsafe)
setTimeout(() => {
    console.log('⏱️ Force exit (failsafe)');
    process.exit(0);
}, 1000);
EOF

# Set NODE_PATH to include sdk's node_modules
export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"

# Check if ws module is available
if ! node -e "require('ws')" 2>/dev/null; then
    echo "📦 Installing WebSocket client..."
    cd "$SCRIPT_DIR/sdk" && npm install ws
    export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"
fi

# Create payload
if [ -z "$CUSTOM_FILENAME" ]; then
    PAYLOAD=$(cat <<EOF
{
    "prompt": "$PROMPT",
    "metadata": {
        "requestId": "$REQUEST_ID",
        "downloadFolder": "$DOWNLOAD_FOLDER",
        "timestamp": $(date +%s)000
    }
}
EOF
)
else
    PAYLOAD=$(cat <<EOF
{
    "prompt": "$PROMPT",
    "metadata": {
        "requestId": "$REQUEST_ID",
        "downloadFolder": "$DOWNLOAD_FOLDER",
        "filename": "$CUSTOM_FILENAME",
        "timestamp": $(date +%s)000
    }
}
EOF
)
fi

# Execute the WebSocket client
echo -e "${CYAN}🔌 Connecting to Semantest server at $WS_URL...${NC}"
export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"
node "$TMP_SCRIPT" "$WS_URL" "semantest/custom/image/download/requested" "$PAYLOAD"

# Cleanup
rm -f "$TMP_SCRIPT"

echo -e "${GREEN}✨ Done! Check server logs for processing status.${NC}"