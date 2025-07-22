# Extension Layer Test Preparation

## Overview
Pre-staged test cases for Extension layer testing. Ready to execute as soon as Extension Developer completes implementation.

## Expected Extension Behavior
The extension should:
1. Monitor ChatGPT tabs in the browser
2. Report health based on tab presence
3. Integrate with the server's health check system
4. Provide the health status to the addon layer

## Test Cases Ready for Execution

### TC-005: No ChatGPT Tabs Open
**Pre-conditions**:
- Extension installed and active
- No ChatGPT tabs open in browser

**Test Steps**:
1. Close all ChatGPT tabs
2. Query health endpoint
3. Verify extension health status

**Expected Result**:
```json
{
  "component": "extension",
  "healthy": false,
  "message": "No ChatGPT tabs open",
  "childHealth": {
    "component": "server",
    "healthy": true,
    "message": "Browser available at: /path/to/browser"
  }
}
```

### TC-006: Single ChatGPT Tab Open
**Pre-conditions**:
- Extension installed and active
- Browser running

**Test Steps**:
1. Open one ChatGPT tab
2. Wait for extension to detect
3. Query health endpoint

**Expected Result**:
```json
{
  "component": "extension",
  "healthy": true,
  "message": "ChatGPT tab(s) open: 1",
  "childHealth": {
    "component": "server",
    "healthy": true,
    "message": "Browser available at: /path/to/browser"
  }
}
```

### TC-007: Multiple ChatGPT Tabs
**Test Steps**:
1. Open 3 ChatGPT tabs
2. Query health endpoint
3. Verify count is accurate

### TC-008: Dynamic Tab Changes
**Test Steps**:
1. Start with 2 ChatGPT tabs (healthy)
2. Close both tabs
3. Verify status changes to unhealthy
4. Open new ChatGPT tab
5. Verify status returns to healthy

## Automated Test Script Template

```bash
#!/bin/bash
# Extension Layer Test Suite
# To be activated once extension is implemented

echo "Extension Layer Tests"
echo "===================="

# Function to count ChatGPT tabs (placeholder)
count_chatgpt_tabs() {
    # This will need to interface with the extension
    # Possibly through WebSocket or HTTP endpoint
    echo "0"  # Placeholder
}

# Test 1: No tabs open
close_all_chatgpt_tabs
sleep 2
response=$(curl -s http://localhost:8080/health)
# Verify unhealthy status

# Test 2: Single tab
open_chatgpt_tab
sleep 2
response=$(curl -s http://localhost:8080/health)
# Verify healthy status

# More tests...
```

## Integration Points to Test

1. **Extension ↔ Server Communication**
   - How does extension report to server?
   - WebSocket? HTTP? Chrome messaging?

2. **Status Propagation**
   - Server health → Extension health → Combined status
   - Error handling when server is unhealthy

3. **Performance Impact**
   - Extension overhead on browser
   - Polling frequency for tab monitoring

4. **Edge Cases**
   - Extension disabled/enabled while running
   - Browser restart scenarios
   - Multiple browser windows

## Questions for Extension Developer

1. How will the extension communicate health status?
2. What's the update frequency for tab monitoring?
3. Is there a manifest.json we need to review?
4. Will there be a UI component showing health status?
5. How should we handle extension installation for testing?

## Ready to Execute
As soon as the Extension Developer provides:
- Extension files in `/extension.chrome/`
- Communication protocol details
- Installation instructions

We can immediately execute all 4 extension test cases and update our coverage to 55%!

---
*QA Engineer - Ready and Waiting*