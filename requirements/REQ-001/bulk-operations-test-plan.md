# 🎨 Bulk Operations Test Plan - Graphic Novel Production

## Mission Critical: 500+ Strip Graphic Novel Generation

### Executive Summary
User needs to generate 200+ images per batch for a massive graphic novel project. This requires industrial-scale testing of our image generation pipeline to ensure reliability, performance, and consistency at scale.

## Test Objectives
1. **Reliability**: Zero failures across 200+ image batches
2. **Performance**: Optimal throughput without overwhelming ChatGPT
3. **Consistency**: Style coherence across all images
4. **Resilience**: Graceful handling of failures and retries
5. **Monitoring**: Real-time progress tracking for long operations

## Critical Requirements

### Scale Requirements
- **Total Images**: 500+ strips (potentially 2000+ individual panels)
- **Batch Size**: 200+ images per session
- **Style Variations**: Multiple art styles per character/scene
- **Translations**: Multi-language support for international release
- **Time Constraint**: Production deadline pressure

### Technical Challenges
1. **Rate Limiting**: ChatGPT API limits
2. **Session Management**: Maintaining context across batches
3. **Error Recovery**: Handling partial failures in large batches
4. **Storage**: Organizing thousands of images
5. **Metadata**: Tracking which image belongs to which strip/panel

## Test Cases for Bulk Operations

### TC-BULK-001: Small Batch Test (10 images)
**Priority**: CRITICAL  
**Objective**: Validate basic batch functionality  

**Test Script**:
```bash
# bulk-test-10.sh
for i in {1..10}; do
  ./generate-image.sh "Graphic novel strip $i: [specific scene description]" \
    "/home/user/novel/batch-test-10/"
  sleep 5  # Prevent rate limiting
done
```

**Success Criteria**:
- All 10 images generated
- No timeouts
- Consistent style
- <2 minutes total time

### TC-BULK-002: Medium Batch Test (50 images)
**Priority**: CRITICAL  
**Objective**: Test sustained generation  

**Features to Test**:
- Progress tracking
- Error recovery
- Memory management
- Session persistence

**Test Script**:
```bash
# bulk-test-50.sh
#!/bin/bash
BATCH_ID="batch-$(date +%s)"
LOG_FILE="bulk-test-50-$BATCH_ID.log"

echo "Starting batch $BATCH_ID" | tee $LOG_FILE

for i in {1..50}; do
  echo "Generating image $i/50..." | tee -a $LOG_FILE
  
  if ./generate-image.sh "Strip $i: Hero confronts villain in cyberpunk city" \
    "/home/user/novel/batch-$BATCH_ID/"; then
    echo "✅ Image $i succeeded" | tee -a $LOG_FILE
  else
    echo "❌ Image $i failed - retrying..." | tee -a $LOG_FILE
    sleep 10
    ./generate-image.sh "Strip $i: Hero confronts villain in cyberpunk city" \
      "/home/user/novel/batch-$BATCH_ID/" || \
      echo "❌ Image $i failed after retry" | tee -a $LOG_FILE
  fi
  
  sleep 7  # Rate limit protection
done

echo "Batch complete. Check $LOG_FILE for results."
```

### TC-BULK-003: Production Batch Test (200 images)
**Priority**: CRITICAL  
**Objective**: Full production load test  

**Advanced Features**:
```bash
# bulk-production-200.sh
#!/bin/bash

# Configuration
TOTAL_IMAGES=200
BATCH_SIZE=25  # Process in smaller chunks
RETRY_LIMIT=3
STYLE="consistent graphic novel style, high contrast, dramatic lighting"

# Initialize
BATCH_ID="production-$(date +%s)"
mkdir -p "/home/user/novel/$BATCH_ID"
LOG_DIR="/home/user/novel/$BATCH_ID/logs"
mkdir -p "$LOG_DIR"

# Progress tracking
PROGRESS_FILE="$LOG_DIR/progress.txt"
ERROR_LOG="$LOG_DIR/errors.log"
SUCCESS_LOG="$LOG_DIR/success.log"

echo "0" > $PROGRESS_FILE

# Function to generate with retries
generate_with_retry() {
  local prompt="$1"
  local output_dir="$2"
  local image_num="$3"
  local retries=0
  
  while [ $retries -lt $RETRY_LIMIT ]; do
    if ./generate-image.sh "$prompt, $STYLE" "$output_dir"; then
      echo "✅ Image $image_num succeeded" >> $SUCCESS_LOG
      return 0
    else
      retries=$((retries + 1))
      echo "⚠️ Image $image_num failed, retry $retries/$RETRY_LIMIT" >> $ERROR_LOG
      sleep $((10 * retries))  # Exponential backoff
    fi
  done
  
  echo "❌ Image $image_num failed after $RETRY_LIMIT retries" >> $ERROR_LOG
  return 1
}

# Main generation loop
for ((batch=0; batch<$((TOTAL_IMAGES/BATCH_SIZE)); batch++)); do
  echo "Starting batch $((batch+1))/$((TOTAL_IMAGES/BATCH_SIZE))..."
  
  for ((i=0; i<BATCH_SIZE; i++)); do
    image_num=$((batch * BATCH_SIZE + i + 1))
    
    # Update progress
    echo "$image_num" > $PROGRESS_FILE
    echo "Progress: $image_num/$TOTAL_IMAGES ($(( (image_num * 100) / TOTAL_IMAGES ))%)"
    
    # Generate prompt based on story sequence
    prompt="Graphic novel panel $image_num: [Scene description from script]"
    
    # Generate image
    generate_with_retry "$prompt" "/home/user/novel/$BATCH_ID/panel-$image_num" $image_num &
    
    # Limit concurrent requests
    if [ $((i % 5)) -eq 4 ]; then
      wait  # Wait for current batch of 5 to complete
      sleep 30  # Cool down period
    fi
  done
  
  wait  # Ensure all images in batch complete
  echo "Batch $((batch+1)) complete. Cooling down..."
  sleep 60  # Longer break between batches
done

# Final report
echo "=== BULK GENERATION COMPLETE ===" | tee "$LOG_DIR/final-report.txt"
echo "Total attempted: $TOTAL_IMAGES" | tee -a "$LOG_DIR/final-report.txt"
echo "Successful: $(wc -l < $SUCCESS_LOG)" | tee -a "$LOG_DIR/final-report.txt"
echo "Failed: $(wc -l < $ERROR_LOG)" | tee -a "$LOG_DIR/final-report.txt"
```

### TC-BULK-004: Style Consistency Test
**Priority**: HIGH  
**Objective**: Ensure visual consistency across batch  

**Test Approach**:
1. Generate 20 images of same character
2. Use consistent style prompt suffix
3. Visually compare results
4. Check for style drift

**Style Template**:
```bash
CHARACTER_STYLE="manga-inspired, clean lines, cel-shaded, consistent character model"
ENVIRONMENT_STYLE="detailed backgrounds, atmospheric lighting, cyberpunk aesthetic"

# Generate with consistent style
for i in {1..20}; do
  ./generate-image.sh "Main character in scene $i, $CHARACTER_STYLE, $ENVIRONMENT_STYLE"
done
```

### TC-BULK-005: Multi-Language Batch Test
**Priority**: HIGH  
**Objective**: Test translation workflow  

```bash
# multi-language-test.sh
LANGUAGES=("en" "es" "fr" "de" "ja" "zh")
BASE_PROMPT="Hero discovers ancient artifact in hidden temple"

for lang in "${LANGUAGES[@]}"; do
  echo "Generating for language: $lang"
  
  # Translate prompt (using translation service)
  translated_prompt=$(translate_prompt "$BASE_PROMPT" "$lang")
  
  ./generate-image.sh "$translated_prompt" "/home/user/novel/translations/$lang/"
  sleep 10
done
```

### TC-BULK-006: Failure Recovery Test
**Priority**: CRITICAL  
**Objective**: Test recovery from interruptions  

**Scenarios to Test**:
1. Network interruption
2. Server crash
3. Browser crash
4. Extension disconnect
5. Rate limit hit

**Recovery Script**:
```bash
# recovery-test.sh
# Simulate failure at image 50 of 100

# Check last successful image
LAST_SUCCESS=$(ls -1 /home/user/novel/current-batch/ | wc -l)
echo "Resuming from image $((LAST_SUCCESS + 1))"

# Resume generation
for ((i=$((LAST_SUCCESS + 1)); i<=100; i++)); do
  ./generate-image.sh "Panel $i: [scene]" "/home/user/novel/current-batch/"
  sleep 8
done
```

### TC-BULK-007: Performance Benchmarking
**Priority**: HIGH  
**Objective**: Measure throughput and optimize  

**Metrics to Track**:
- Images per hour
- Average generation time
- Failure rate
- Resource usage (CPU, memory)
- Optimal batch size
- Best delay between requests

### TC-BULK-008: Storage Organization Test
**Priority**: MEDIUM  
**Objective**: Validate file organization  

**Expected Structure**:
```
/graphic-novel/
├── chapter-01/
│   ├── strip-001/
│   │   ├── panel-01.png
│   │   ├── panel-02.png
│   │   └── metadata.json
│   ├── strip-002/
│   └── ...
├── chapter-02/
├── characters/
│   ├── hero/
│   ├── villain/
│   └── supporting/
└── logs/
    ├── generation-log.txt
    └── error-log.txt
```

## Performance Requirements

### Target Metrics
- **Throughput**: 30-50 images/hour sustained
- **Success Rate**: >95% first attempt, >99% with retries
- **Uptime**: 8+ hour continuous operation
- **Recovery Time**: <2 minutes from any failure

### Rate Limiting Strategy
- **ChatGPT Limits**: Respect API rate limits
- **Delay Pattern**: 5-10 seconds between requests
- **Batch Breaks**: 60 seconds every 25 images
- **Daily Limits**: Plan for 500-1000 images/day max

## Monitoring Dashboard Concept

```
╔══════════════════════════════════════════════════╗
║        GRAPHIC NOVEL BULK GENERATION             ║
╠══════════════════════════════════════════════════╣
║ Current Batch: production-1753211234             ║
║ Progress: ████████████░░░░░░░ 145/200 (72%)     ║
║                                                  ║
║ Stats:                                           ║
║ • Success Rate: 96.5% (140/145)                 ║
║ • Avg Time/Image: 12.3s                         ║
║ • Est. Completion: 11:45 AM                     ║
║                                                  ║
║ Recent Errors:                                   ║
║ • Image 89: Timeout (retrying...)               ║
║ • Image 134: Rate limit (waiting...)            ║
║                                                  ║
║ Performance:                                     ║
║ • Current Rate: 42 images/hour                  ║
║ • CPU: 45% | Memory: 2.1GB | Disk: 18GB        ║
╚══════════════════════════════════════════════════╝
```

## Risk Mitigation

### Critical Risks
1. **Account Suspension**: Too many requests
   - Mitigation: Conservative rate limiting
   
2. **Data Loss**: Images not saved properly
   - Mitigation: Immediate local saves, backups
   
3. **Style Inconsistency**: Drift over long batches
   - Mitigation: Reference images, style locks
   
4. **Session Timeout**: Long running operations
   - Mitigation: Session refresh, checkpointing

## Recommended Tooling

### Bulk Generation Manager
```bash
# bulk-manager.sh
# Professional bulk generation tool

show_menu() {
  echo "=== Graphic Novel Bulk Generator ==="
  echo "1. Start new batch"
  echo "2. Resume failed batch"
  echo "3. Check progress"
  echo "4. Generate report"
  echo "5. Emergency stop"
  echo "6. Exit"
}

# Main loop with professional features
```

## Testing Priority

### Phase 1 (Immediate)
1. Install Chrome extension
2. Run TC-BULK-001 (10 images)
3. Validate basic functionality

### Phase 2 (Today)
1. Run TC-BULK-002 (50 images)
2. Test failure recovery
3. Optimize delays

### Phase 3 (This Week)
1. Run TC-BULK-003 (200 images)
2. Full production test
3. Create monitoring tools

## Success Criteria

✅ **Ready for Production When**:
- 200 image batch completes with >95% success
- Recovery from failures works smoothly
- Style consistency maintained
- Performance meets targets
- Monitoring tools operational

---
*QA Engineer - Ready for Graphic Novel Scale Testing!*