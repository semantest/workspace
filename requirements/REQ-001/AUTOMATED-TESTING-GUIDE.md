# 🤖 Automated Extension Testing Guide

## Overview

We can automate extension testing using Playwright by:
1. Launching Chrome with `--load-extension` flag
2. Using Playwright to control the browser
3. Monitoring WebSocket events programmatically
4. Validating the complete E2E flow

## Test Suite Components

### 1. Basic Automated Test (`automated-extension-test.js`)
Quick validation of core functionality:
- Extension loading
- ChatGPT navigation
- WebSocket connection
- Button interaction
- Image generation

### 2. Comprehensive Test Suite (`extension-integration-test-suite.js`)
Full production scenario testing:
- All basic tests PLUS
- Bulk generation simulation
- Error handling
- Performance metrics
- Screenshot capture

### 3. Shell Script Runner (`run-automated-test.sh`)
Easy execution with pre-flight checks:
- Server health verification
- Extension path validation
- Dependency installation
- Results interpretation

## Setup Instructions

### Prerequisites
```bash
# 1. Ensure Node.js is installed
node --version  # Should be v14+

# 2. Install dependencies
cd /home/chous/work/semantest/requirements/REQ-001/
npm install

# 3. Install Chrome (if needed)
npm run install-chrome
```

### Configuration
The tests expect:
- Semantest server running at `http://localhost:8080`
- Extension built at `/extension.chrome/build/`
- Chrome/Chromium available

## Running Tests

### Quick Test
```bash
# Basic functionality check
npm run test:basic
```

### Comprehensive Test
```bash
# Full test suite with production scenarios
npm test
```

### Production-Ready Test
```bash
# Complete validation with setup checks
./run-automated-test.sh
```

## Test Scenarios

### Scenario 1: Basic E2E Flow
1. Launch Chrome with extension
2. Navigate to ChatGPT
3. Handle consent popup
4. Click generate button
5. Submit test prompt
6. Verify WebSocket event
7. Confirm image generation

### Scenario 2: WebSocket Validation
1. Connect to WebSocket server
2. Send correctly formatted message (lowercase 'event')
3. Monitor for response events
4. Validate event types
5. Ensure proper message flow

### Scenario 3: Bulk Generation
1. Submit multiple prompts sequentially
2. Maintain 8-second delays
3. Monitor success rate
4. Validate all images generated
5. Test checkpoint recovery

## Expected Results

### Success Criteria
```
✅ Extension Loaded
✅ Navigate to ChatGPT
✅ Handle Consent Popup
✅ WebSocket Message Format
✅ Extension Button Visible
✅ Submit Test Prompt
✅ WebSocket Event Flow
✅ Image Generated
✅ Bulk Generation (3 images)

Success Rate: 100%
```

### Common Failures & Solutions

#### 1. Extension Not Detected
**Error**: "Extension not detected on page"
**Solution**: 
- Verify extension is built
- Check manifest.json version
- Ensure content script injection

#### 2. WebSocket Format Error
**Error**: "Unknown message type"
**Solution**:
- Update to lowercase 'event'
- Check message structure
- Verify payload format

#### 3. Button Not Found
**Error**: "Extension button not found"
**Solution**:
- Check button selectors
- Verify DOM injection timing
- Update selectors if ChatGPT changed

## Integration with Production System

### How It Complements Bulk Testing

1. **Pre-Production Validation**
   ```bash
   # Run automated tests first
   npm test
   
   # If all pass, proceed to bulk
   ./bulk-test-10.sh
   ```

2. **Continuous Monitoring**
   - Run tests before each batch
   - Validate WebSocket health
   - Check extension status

3. **Recovery Testing**
   - Simulate failures
   - Test checkpoint resume
   - Validate retry logic

## Benefits of Automation

### 1. **Consistency**
- Same test steps every time
- No human error
- Reproducible results

### 2. **Speed**
- Full test suite in <2 minutes
- Instant feedback
- Rapid iteration

### 3. **Coverage**
- Test edge cases
- Validate error handling
- Check all UI paths

### 4. **Documentation**
- Screenshots on failure
- Detailed logs
- Performance metrics

## Advanced Features

### Custom Test Scenarios
```javascript
// Add your own test
async testCustomScenario() {
    // Your test logic here
    await this.page.click('.custom-button');
    // Validate results
}
```

### WebSocket Event Monitoring
```javascript
// Monitor specific events
wsClient.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.payload?.type === 'image/generated') {
        console.log('Image generated!', msg.payload);
    }
});
```

### Performance Tracking
```javascript
// Measure generation time
const startTime = Date.now();
await generateImage();
const duration = Date.now() - startTime;
console.log(`Generation took ${duration}ms`);
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Extension Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

## Troubleshooting

### Debug Mode
```bash
# Run with debug output
DEBUG=* node extension-integration-test-suite.js
```

### Headless Mode
```javascript
// Change to headless for CI
headless: true  // or false for debugging
```

### Screenshot Analysis
Check `./test-screenshots/` for:
- Error captures
- Success states
- UI differences

## Next Steps

1. **Integrate with bulk testing**
   - Run before each batch
   - Validate system health

2. **Add more scenarios**
   - Test error recovery
   - Validate style consistency
   - Check rate limiting

3. **Performance benchmarking**
   - Track generation times
   - Monitor resource usage
   - Optimize bottlenecks

---

*Automated testing brings us one step closer to reliable, production-scale graphic novel generation!*

**Created by**: Carol (QA Engineer)
**Purpose**: Ensure v1.0.2 and beyond work flawlessly!