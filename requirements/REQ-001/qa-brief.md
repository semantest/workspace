# QA Engineer Brief - REQ-001

Welcome QA Engineer! You have been assigned to ensure the quality and reliability of our layered health check system.

## Your Task:

### Task 9: End-to-end testing (Priority: HIGH)
- **Component**: All components
- **Estimated Hours**: 3
- **Dependencies**: All other tasks (1-8)
- **Your Work**:
  - [ ] Test all health states (healthy, degraded, failed)
  - [ ] Verify error handling at each layer
  - [ ] Performance testing (response times, caching)
  - [ ] Documentation of test results

## System Overview:
We've implemented a layered health check system:
1. **Server Layer**: Checks if browser executable exists (Backend - COMPLETE)
2. **Extension Layer**: Checks if ChatGPT tabs are open (Extension Dev - IN PROGRESS)
3. **Addon Layer**: Checks if user is logged into ChatGPT (Extension Dev - IN PROGRESS)

## Test Scenarios to Cover:

### 1. Browser Health Tests
- [x] Browser executable exists → healthy (Backend verified)
- [x] Browser not found → unhealthy with retry (Backend verified)
- [x] Health endpoint returns correct JSON (Backend verified)
- [x] 60-second caching works (Backend verified)

### 2. Extension Health Tests (Once Extension Dev completes)
- [ ] No ChatGPT tabs → unhealthy
- [ ] One ChatGPT tab → healthy
- [ ] Multiple ChatGPT tabs → healthy
- [ ] Tab closed while monitoring → status updates

### 3. Addon Health Tests (Once Extension Dev completes)
- [ ] User logged in → healthy
- [ ] User logged out → unhealthy
- [ ] Session expired → unhealthy
- [ ] Login during monitoring → status updates

### 4. Integration Tests
- [ ] generate-image.sh auto-starts server
- [ ] generate-image.sh checks health before proceeding
- [ ] Health status UI shows all three layers
- [ ] Error propagation works correctly
- [ ] Performance: Health checks complete in <500ms

### 5. Edge Cases
- [ ] Server crash recovery
- [ ] Extension disabled/enabled
- [ ] Browser closed while server running
- [ ] Network issues
- [ ] Race conditions

## Testing Tools:
- Use Playwright for browser automation testing
- Manual testing for extension UI
- Performance profiling for response times
- Load testing for concurrent requests

## Deliverables:
1. Test plan document
2. Automated test suite
3. Test execution report
4. Performance benchmarks
5. Bug reports (if any)

## Files to Test:
- `/home/chous/work/semantest/generate-image.sh` - Shell script
- `/home/chous/work/semantest/sdk/server/src/server.ts` - Health endpoint
- `/home/chous/work/semantest/extension.chrome/*` - Extension files
- `/home/chous/work/semantest/chatgpt.com/addon.js` - Addon

Please coordinate with Frontend and Extension developers to know when their components are ready for testing. Start preparing your test plan while they complete their implementation.

**IMPORTANT**: Backend work is already complete and can be tested immediately!