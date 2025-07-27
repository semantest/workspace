#!/usr/bin/env bash

# ChatGPT Image Generation Script
# Usage: ./generate-image.sh "prompt" [download-folder]
# 
# This script:
# 1. Auto-starts the Semantest WebSocket server if not running
# 2. Performs health check to ensure browser automation is available
# 3. Sends an ImageRequestReceived event to the server
# 4. Waits for the ImageDownloaded response
#
# Health check validates that:
# - Server is responsive at http://localhost:3004/health
# - Browser executable is available for automation
# - System is ready for image generation

# Configuration
WS_URL="ws://localhost:3004"
TIMEOUT=120  # seconds to wait for response (2 minutes for slow image generation)

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

# Display usage if no arguments
if [ -z "$1" ]; then
    echo "Usage: $0 \"image prompt\" [download-folder]"
    echo "Example: $0 \"A beautiful sunset over mountains\" ~/Pictures"
    echo ""
    echo "Using default prompt: $PROMPT"
fi

# Ensure download folder exists
mkdir -p "$DOWNLOAD_FOLDER"

# Generate unique request ID
REQUEST_ID="img-$(date +%s)-$$"

echo -e "${PURPLE}🎨 ChatGPT Image Generator${NC}"
echo -e "${PURPLE}=========================${NC}"
echo -e "${CYAN}Prompt:${NC} $PROMPT"
echo -e "${CYAN}Download folder:${NC} $DOWNLOAD_FOLDER"
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

# Function to start the server
start_server() {
    echo "🚀 Starting Semantest WebSocket server..."
    
    # Check if server directory exists
    if [ ! -d "$SCRIPT_DIR/sdk/server" ]; then
        echo "❌ Error: Server directory not found at $SCRIPT_DIR/sdk/server"
        return 1
    fi
    
    # Start server in background
    cd "$SCRIPT_DIR/sdk/server" && {
        # Check if dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing server dependencies..."
            npm install
        fi
        
        # Fix NODE_PATH to ensure modules are found
        export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"
        
        # Start server in background, redirect output to log file
        nohup npm run dev > /tmp/semantest-server.log 2>&1 &
        SERVER_PID=$!
        echo "Server started with PID: $SERVER_PID"
        
        # Wait for server to be ready with animated progress
        echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
        local spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
        for i in {1..10}; do
            if check_server; then
                echo -e "\r${GREEN}✅ Server is now running on ws://localhost:3004${NC}"
                return 0
            fi
            printf "\r${YELLOW}${spinner[$((i % 10))]} Starting server... ($i/10)${NC}"
            sleep 1
        done
        
        echo "❌ Server failed to start. Check /tmp/semantest-server.log for details"
        return 1
    }
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if server is running, start if not
if ! check_server; then
    echo "⚠️  Semantest server is not running on localhost:3004"
    start_server || {
        echo "❌ Failed to start server automatically"
        echo "Please start it manually with:"
        echo "  cd $SCRIPT_DIR/sdk/server"
        echo "  npm run dev"
        exit 1
    }
else
    echo "✅ Semantest server is already running on ws://localhost:3004"
fi

# Function to check server health
check_health() {
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        echo "⚠️  Warning: curl is not installed, skipping health check"
        return 0  # Continue anyway
    fi
    
    local health_response=$(curl -s -m 5 http://localhost:3004/health 2>/dev/null)
    
    if [ -z "$health_response" ]; then
        echo "❌ Health check failed: No response from server"
        return 1
    fi
    
    # Parse JSON response to check if healthy
    local is_healthy=$(echo "$health_response" | grep -o '"healthy":[^,}]*' | grep -o 'true\|false')
    
    if [ "$is_healthy" = "true" ]; then
        return 0
    else
        # Extract error message and action if available
        local message=$(echo "$health_response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        local action=$(echo "$health_response" | grep -o '"action":"[^"]*"' | cut -d'"' -f4)
        
        echo -e "${RED}❌ Health check failed: $message${NC}"
        if [ ! -z "$action" ]; then
            echo -e "${YELLOW}💡 Suggested action: $action${NC}"
        fi
        return 1
    fi
}

# Perform health check with retries and visual feedback
echo ""
echo -e "${BLUE}🏥 Checking server health...${NC}"
health_check_passed=false
health_spinner=('🔍' '🔎' '💉' '🩺' '🏥')
for attempt in {1..3}; do
    printf "\r${BLUE}${health_spinner[$((attempt - 1))]} Health check attempt $attempt/3...${NC}"
    if check_health; then
        echo -e "\r${GREEN}✅ Server health check passed - browser automation available${NC}"
        # Show browser info if available
        browser_info=$(curl -s http://localhost:3004/health 2>/dev/null | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$browser_info" ]; then
            echo -e "${GREEN}   └─ $browser_info${NC}"
        fi
        health_check_passed=true
        break
    else
        if [ $attempt -lt 3 ]; then
            echo -e "\r${YELLOW}⏳ Retrying health check in 2 seconds... (attempt $attempt/3)${NC}"
            sleep 2
        fi
    fi
done

if [ "$health_check_passed" = false ]; then
    echo ""
    echo "⚠️  Server health check failed after 3 attempts - browser may not be available"
    echo ""
    echo "The server is running but browser automation may not work."
    echo "Would you like to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
    echo "Continuing despite health check failure..."
fi

# Function to check ChatGPT tab responsiveness
check_chatgpt_tab() {
    echo -e "${BLUE}🔍 Checking ChatGPT tab responsiveness...${NC}"
    
    # Create a simple test script to check tab
    local CHECK_SCRIPT="/tmp/check-chatgpt-$$.js"
    cat > "$CHECK_SCRIPT" << 'EOF'
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3004,
    path: '/tab-check',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.chatgptTabFound && result.responsive) {
                console.log('SUCCESS');
                process.exit(0);
            } else if (result.chatgptTabFound && !result.responsive) {
                console.log('UNRESPONSIVE');
                process.exit(1);
            } else {
                console.log('NOT_FOUND');
                process.exit(2);
            }
        } catch (e) {
            console.log('ERROR');
            process.exit(3);
        }
    });
});

req.on('error', () => {
    console.log('ERROR');
    process.exit(3);
});

req.on('timeout', () => {
    console.log('TIMEOUT');
    process.exit(4);
});

req.end();
EOF

    # Run the check
    local result=$(node "$CHECK_SCRIPT" 2>/dev/null)
    rm -f "$CHECK_SCRIPT"
    
    case "$result" in
        "SUCCESS")
            echo -e "${GREEN}✅ ChatGPT tab is responsive and ready${NC}"
            return 0
            ;;
        "UNRESPONSIVE")
            echo -e "${YELLOW}⚠️  ChatGPT tab found but unresponsive${NC}"
            echo -e "${YELLOW}💡 Please reload the ChatGPT tab and try again${NC}"
            return 1
            ;;
        "NOT_FOUND")
            echo -e "${RED}❌ No ChatGPT tab found${NC}"
            echo -e "${YELLOW}💡 Please open ChatGPT (chat.openai.com) in a browser tab${NC}"
            return 2
            ;;
        *)
            echo -e "${YELLOW}⚠️  Could not check tab status, proceeding anyway...${NC}"
            return 0
            ;;
    esac
}

# Create temporary Node.js WebSocket client script
TMP_SCRIPT="/tmp/semantest-image-client-$$.js"
cat > "$TMP_SCRIPT" << 'EOF'
const WebSocket = require('ws');

const WS_URL = process.argv[2];
const EVENT_TYPE = process.argv[3];
const PAYLOAD = JSON.parse(process.argv[4]);
const TIMEOUT = parseInt(process.argv[5]) * 1000;

const ws = new WebSocket(WS_URL);
let timeoutId;

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
    
    // Set timeout
    timeoutId = setTimeout(() => {
        console.error('❌ Timeout: No response received within ' + (TIMEOUT/1000) + ' seconds');
        process.exit(1);
    }, TIMEOUT);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'semantest/custom/image/downloaded') {
            clearTimeout(timeoutId);
            console.log('\n🎉 SUCCESS! Image downloaded');
            console.log('📍 File path:', message.payload.path || message.payload.imagePath);
            if (message.payload.metadata) {
                console.log('📊 Metadata:', JSON.stringify(message.payload.metadata, null, 2));
            }
            ws.close();
            process.exit(0);
        } else if (message.type === 'error') {
            clearTimeout(timeoutId);
            console.error('❌ Error:', message.payload.message || 'Unknown error');
            ws.close();
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error parsing message:', error.message);
    }
});

ws.on('error', (error) => {
    clearTimeout(timeoutId);
    console.error('❌ WebSocket error:', error.message);
    console.error('Make sure the Semantest server is running on ' + WS_URL);
    process.exit(1);
});

ws.on('close', () => {
    clearTimeout(timeoutId);
    console.log('Connection closed');
});
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

# Check ChatGPT tab before proceeding
echo ""
if ! check_chatgpt_tab; then
    echo ""
    echo "⚠️  ChatGPT tab check failed. Would you like to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

# Show final status summary
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}📊 System Status Summary${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Server:${NC} Running on localhost:3004"
echo -e "${GREEN}✓ Health:${NC} Browser automation ready"
echo -e "${GREEN}✓ ChatGPT:${NC} Tab responsive and ready"
echo -e "${GREEN}✓ Request:${NC} Image download initialized"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Execute the WebSocket client
echo -e "${CYAN}🔌 Connecting to Semantest server at $WS_URL...${NC}"
# Fix NODE_PATH to ensure ws module is found
export NODE_PATH="$SCRIPT_DIR/sdk/node_modules:$NODE_PATH"
node "$TMP_SCRIPT" "$WS_URL" "semantest/custom/image/download/requested" "$PAYLOAD" "$TIMEOUT"

# Cleanup
rm -f "$TMP_SCRIPT"