#!/bin/bash
# Bulk Test - 10 Images for Initial Validation
# For Graphic Novel Production Testing

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
GENERATE_SCRIPT="/home/chous/work/semantest/generate-image.sh"
OUTPUT_BASE="/home/chous/Downloads/graphic-novel-test"
BATCH_ID="test-10-$(date +%s)"
OUTPUT_DIR="$OUTPUT_BASE/$BATCH_ID"

# Create output directory
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/logs"

# Log file
LOG_FILE="$OUTPUT_DIR/logs/generation.log"

# Style consistency
STYLE="graphic novel style, high contrast black and white, dramatic shadows, manga-inspired"

echo "=== BULK GENERATION TEST - 10 IMAGES ===" | tee $LOG_FILE
echo "Batch ID: $BATCH_ID" | tee -a $LOG_FILE
echo "Output: $OUTPUT_DIR" | tee -a $LOG_FILE
echo "Started: $(date)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Track metrics
SUCCESS_COUNT=0
FAIL_COUNT=0
START_TIME=$(date +%s)

# Generate 10 test images
for i in {1..10}; do
  echo "[$(date +%H:%M:%S)] Generating image $i/10..." | tee -a $LOG_FILE
  
  # Create panel-specific prompt
  PROMPT="Graphic novel panel $i: Mysterious hero in dark alley, $STYLE"
  
  # Attempt generation
  if $GENERATE_SCRIPT "$PROMPT" "$OUTPUT_DIR/panel-$i"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "[$(date +%H:%M:%S)] ✅ Image $i generated successfully" | tee -a $LOG_FILE
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "[$(date +%H:%M:%S)] ❌ Image $i failed" | tee -a $LOG_FILE
  fi
  
  # Rate limiting delay
  if [ $i -lt 10 ]; then
    echo "[$(date +%H:%M:%S)] Waiting 8 seconds before next request..." | tee -a $LOG_FILE
    sleep 8
  fi
done

# Calculate metrics
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
SUCCESS_RATE=$(( (SUCCESS_COUNT * 100) / 10 ))

# Final report
echo "" | tee -a $LOG_FILE
echo "=== GENERATION COMPLETE ===" | tee -a $LOG_FILE
echo "Duration: $DURATION seconds" | tee -a $LOG_FILE
echo "Success: $SUCCESS_COUNT/10 ($SUCCESS_RATE%)" | tee -a $LOG_FILE
echo "Failures: $FAIL_COUNT" | tee -a $LOG_FILE
echo "Avg time per image: $(( DURATION / 10 )) seconds" | tee -a $LOG_FILE
echo "Finished: $(date)" | tee -a $LOG_FILE

# Check if ready for larger batches
if [ $SUCCESS_COUNT -ge 9 ]; then
  echo "" | tee -a $LOG_FILE
  echo "✅ READY FOR LARGER BATCHES!" | tee -a $LOG_FILE
  echo "Success rate is sufficient for production testing." | tee -a $LOG_FILE
else
  echo "" | tee -a $LOG_FILE
  echo "⚠️ WARNING: Success rate too low for production!" | tee -a $LOG_FILE
  echo "Please check errors before proceeding." | tee -a $LOG_FILE
fi

echo ""
echo "Results saved to: $OUTPUT_DIR"
echo "Log file: $LOG_FILE"