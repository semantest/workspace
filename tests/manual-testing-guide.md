# Manual Testing Guide for ChatGPT Image Generation System

## 🎯 Purpose
This guide provides step-by-step instructions for manually testing the complete ChatGPT image generation workflow to ensure production readiness.

## 📋 Pre-Testing Checklist

### System Requirements
- [ ] Node.js 18+ installed
- [ ] Chrome/Edge browser installed
- [ ] ChatGPT account with DALL-E access
- [ ] System permissions for file downloads
- [ ] Network connectivity

### Environment Setup
- [ ] All servers running (ports 8080, 8081, 8082)
- [ ] Browser extension installed and enabled
- [ ] Test directories created
- [ ] Logging enabled for debugging

## 🧪 Test Scenarios

### 1. Happy Path - Complete Workflow

**Objective**: Verify the entire image generation process works end-to-end.

**Steps**:
1. Open terminal and navigate to project directory
2. Start the event server:
   ```bash
   node start-event-server.js
   ```
3. In another terminal, start the CLI client:
   ```bash
   node example-client.js --interactive
   ```
4. When prompted, select option 4 (Request Image Generation)
5. Enter test prompt: "A serene mountain landscape at sunset"
6. Enter filename: "manual-test-sunset.png"
7. Wait for completion message

**Expected Results**:
- [ ] CLI accepts the request
- [ ] Event server logs show request processing
- [ ] Browser extension activates (if configured)
- [ ] Image file downloads to specified directory
- [ ] Success confirmation displayed
- [ ] File exists and is valid PNG format

**Time Limit**: 3 minutes

---

### 2. Error Handling Tests

#### 2.1 Invalid Input Test
**Steps**:
1. Start CLI client
2. Request image generation with empty prompt: ""
3. Observe error handling

**Expected Results**:
- [ ] System rejects empty prompt gracefully
- [ ] Clear error message displayed
- [ ] System remains stable
- [ ] No crash or hang

#### 2.2 Network Failure Simulation
**Steps**:
1. Start normal workflow
2. Disconnect network during generation
3. Reconnect after 30 seconds
4. Observe system behavior

**Expected Results**:
- [ ] System detects network failure
- [ ] Appropriate error message shown
- [ ] System attempts retry (if configured)
- [ ] Graceful degradation

#### 2.3 File Permission Test
**Steps**:
1. Set download directory to read-only location
2. Attempt image generation
3. Check error handling

**Expected Results**:
- [ ] Permission error caught
- [ ] Clear error message
- [ ] No system crash
- [ ] Alternative path suggested (if implemented)

---

### 3. Browser Extension Integration

**Prerequisites**: Extension must be installed in Chrome/Edge

#### 3.1 Extension Detection
**Steps**:
1. Navigate to https://chat.openai.com
2. Open browser developer tools
3. Check console for extension messages
4. Verify extension icon is active

**Expected Results**:
- [ ] Extension loads on ChatGPT page
- [ ] No console errors
- [ ] Extension icon shows active state
- [ ] Communication channel established

#### 3.2 Automated Image Generation
**Steps**:
1. Open ChatGPT in browser
2. Send image generation request via CLI
3. Observe browser automation

**Expected Results**:
- [ ] Browser extension receives request
- [ ] Prompt is entered automatically
- [ ] Image generation is triggered
- [ ] Generated image is detected
- [ ] File download initiated

---

### 4. Concurrent Operations Test

**Steps**:
1. Start multiple CLI clients simultaneously
2. Send different image requests from each
3. Monitor system performance

**Expected Results**:
- [ ] All requests are processed
- [ ] No request conflicts
- [ ] Files download correctly
- [ ] System performance remains stable

---

### 5. Large File Handling

**Steps**:
1. Request generation of complex, high-resolution image
2. Use detailed prompt (500+ characters)
3. Monitor download progress

**Expected Results**:
- [ ] Large prompt handled correctly
- [ ] Download completes successfully
- [ ] File integrity verified
- [ ] Memory usage remains reasonable

---

### 6. Recovery Testing

#### 6.1 Server Restart During Operation
**Steps**:
1. Start image generation request
2. Restart event server mid-process
3. Restart other components
4. Check request status

**Expected Results**:
- [ ] System detects server restart
- [ ] Request state is preserved (if implemented)
- [ ] Recovery mechanisms activate
- [ ] Operation completes or fails gracefully

#### 6.2 Browser Crash Recovery
**Steps**:
1. Start image generation
2. Force-close browser during generation
3. Restart browser and extension
4. Check system state

**Expected Results**:
- [ ] Server-side request tracking continues
- [ ] Extension reconnects properly
- [ ] Clear status provided to user
- [ ] Option to retry available

---

### 7. Performance Validation

#### 7.1 Response Time Test
**Steps**:
1. Record start time of request
2. Submit standard image request
3. Record completion time
4. Repeat 5 times for average

**Expected Results**:
- [ ] Average response time < 3 minutes
- [ ] Consistent performance across runs
- [ ] No degradation over time
- [ ] Acceptable variance (±30 seconds)

#### 7.2 Memory Usage Monitoring
**Steps**:
1. Monitor system memory before test
2. Process 10 consecutive image requests
3. Monitor memory after completion
4. Check for memory leaks

**Expected Results**:
- [ ] Memory usage increase < 50MB
- [ ] Memory returns to baseline after GC
- [ ] No evidence of memory leaks
- [ ] System remains responsive

---

### 8. Security Validation

#### 8.1 Path Traversal Prevention
**Steps**:
1. Attempt to use filename: "../../../etc/passwd"
2. Try various path traversal patterns
3. Check if files are created in expected locations

**Expected Results**:
- [ ] Path traversal attempts blocked
- [ ] Files only created in designated directories
- [ ] Security warnings logged
- [ ] No system compromise

#### 8.2 Input Sanitization
**Steps**:
1. Submit prompt with HTML/JavaScript: `<script>alert('xss')</script>`
2. Use special characters and Unicode
3. Test very long prompts (10,000+ chars)

**Expected Results**:
- [ ] HTML/JS content sanitized
- [ ] Special characters handled safely
- [ ] Long prompts either processed or rejected gracefully
- [ ] No code execution vulnerabilities

---

## 🔍 Debugging Guide

### Log File Locations
- Event Server: `./logs/event-server.log`
- CLI Client: `./logs/client.log`
- Browser Extension: Browser Developer Console
- System Errors: `./logs/error.log`

### Common Issues

#### Issue: "Connection refused"
**Diagnosis**: Server not running
**Solution**: Start event server with `node start-event-server.js`

#### Issue: "Extension not responding"
**Diagnosis**: Browser extension not installed/enabled
**Solution**: Install extension and refresh page

#### Issue: "File download failed"
**Diagnosis**: Permission or disk space issues
**Solution**: Check directory permissions and available space

#### Issue: "Request timeout"
**Diagnosis**: Network or ChatGPT service issues
**Solution**: Check network connectivity and ChatGPT status

### Performance Issues

#### Slow Response Times
- Check network latency to OpenAI services
- Monitor system resource usage
- Verify browser extension is not blocking

#### High Memory Usage
- Check for memory leaks in Node.js processes
- Monitor browser tab memory usage
- Restart services if needed

---

## 📊 Test Results Documentation

### Test Results Template

```markdown
## Test Run: [Date/Time]

### Environment
- OS: [Operating System]
- Node.js: [Version]
- Browser: [Chrome/Edge Version]
- Extension Version: [Version]

### Results Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Success Rate: [Percentage]

### Detailed Results
| Test Name | Status | Time | Notes |
|-----------|--------|------|-------|
| Happy Path | ✅/❌ | XXs | |
| Error Handling | ✅/❌ | XXs | |
| ... | ... | ... | ... |

### Performance Metrics
- Average Response Time: [X seconds]
- Memory Usage: [X MB]
- CPU Usage: [X%]

### Issues Found
1. [Description] - [Severity] - [Status]
2. [Description] - [Severity] - [Status]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## ✅ Production Readiness Criteria

The system is considered production-ready when:

### Functionality
- [ ] 95%+ of manual tests pass
- [ ] All critical path scenarios work
- [ ] Error handling is robust
- [ ] Recovery mechanisms function

### Performance
- [ ] Response time < 3 minutes average
- [ ] Memory usage stable
- [ ] Concurrent requests handled
- [ ] No significant resource leaks

### Security
- [ ] Input validation working
- [ ] Path traversal prevented
- [ ] No code injection vulnerabilities
- [ ] Proper error messages (no stack traces)

### Reliability
- [ ] System survives restarts
- [ ] Network failures handled gracefully
- [ ] Data integrity maintained
- [ ] Proper logging and monitoring

---

## 🚀 Next Steps

### If Tests Pass
1. Deploy to staging environment
2. Run automated test suite
3. Conduct user acceptance testing
4. Plan production deployment

### If Tests Fail
1. Document all failures
2. Prioritize critical issues
3. Implement fixes
4. Re-run failed tests
5. Repeat until all tests pass

---

## 📞 Support

For issues or questions:
- Check system logs first
- Review common issues section
- Document reproduction steps
- Report with full environment details

Remember: **No system goes to production until all manual tests pass!**