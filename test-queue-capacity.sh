#!/bin/bash

# Queue Capacity Test Script
# Tests the server's ability to handle multiple concurrent image generation requests

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ASYNC_SCRIPT="$SCRIPT_DIR/generate-image-async.sh"
BATCH_SIZE=${1:-10}          # Number of requests per batch
BATCH_COUNT=${2:-5}          # Number of batches
DELAY_BETWEEN_BATCHES=${3:-2} # Seconds between batches

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Verify async script exists
if [ ! -f "$ASYNC_SCRIPT" ]; then
    echo -e "${RED}❌ Error: generate-image-async.sh not found at $ASYNC_SCRIPT${NC}"
    exit 1
fi

# Display test configuration
echo -e "${BLUE}🧪 Queue Capacity Test${NC}"
echo -e "${BLUE}=====================${NC}"
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Batch size: $BATCH_SIZE requests"
echo -e "  Batch count: $BATCH_COUNT batches"
echo -e "  Total requests: $((BATCH_SIZE * BATCH_COUNT))"
echo -e "  Delay between batches: ${DELAY_BETWEEN_BATCHES}s"
echo ""

# Function to send a batch of requests
send_batch() {
    local batch_num=$1
    echo -e "${GREEN}📤 Sending batch $batch_num/$BATCH_COUNT (${BATCH_SIZE} requests)...${NC}"
    
    for i in $(seq 1 $BATCH_SIZE); do
        # Generate unique prompts to avoid caching
        PROMPT="Test image $batch_num-$i: A robot at timestamp $(date +%s%N)"
        
        # Send request in background
        "$ASYNC_SCRIPT" "$PROMPT" ~/Downloads "test-$batch_num-$i.png" > /dev/null 2>&1 &
        
        # Small delay to avoid overwhelming the system
        sleep 0.05
    done
    
    echo -e "${GREEN}✅ Batch $batch_num sent${NC}"
}

# Main test execution
echo -e "${YELLOW}🚀 Starting queue capacity test...${NC}"
echo ""

START_TIME=$(date +%s)

for batch in $(seq 1 $BATCH_COUNT); do
    send_batch $batch
    
    if [ $batch -lt $BATCH_COUNT ]; then
        echo -e "${BLUE}⏳ Waiting ${DELAY_BETWEEN_BATCHES}s before next batch...${NC}"
        sleep $DELAY_BETWEEN_BATCHES
    fi
    echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}==============${NC}"
echo -e "Total requests sent: $((BATCH_SIZE * BATCH_COUNT))"
echo -e "Total time: ${DURATION}s"
echo -e "Average rate: $(( (BATCH_SIZE * BATCH_COUNT) / DURATION )) requests/second"
echo ""
echo -e "${YELLOW}💡 Check your server logs to see:${NC}"
echo -e "  - How many requests were queued successfully"
echo -e "  - How many requests were rejected (if any)"
echo -e "  - Processing times and queue depths"
echo -e "  - Any errors or bottlenecks"
echo ""
echo -e "${GREEN}✨ Test complete!${NC}"