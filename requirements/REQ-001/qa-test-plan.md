# QA Test Plan - REQ-001: Layered Health Check System

## Executive Summary
This test plan outlines the comprehensive testing strategy for the layered health check system implementation. The system consists of three layers: Server (browser executable check), Extension (ChatGPT tab monitoring), and Addon (login status verification).

## Test Objectives
1. **Verify Functionality**: Ensure all three health check layers work correctly and independently
2. **Validate Integration**: Confirm proper communication and error propagation between layers
3. **Performance Testing**: Verify response times meet <500ms requirement
4. **Reliability**: Test error handling, recovery mechanisms, and edge cases
5. **User Experience**: Ensure smooth integration with generate-image.sh workflow

## Test Scope

### In Scope
- Server health check endpoint (`/health`)
- Browser executable detection and caching
- Extension health monitoring (once implemented)
- Addon login status checks (once implemented)
- Integration with generate-image.sh
- Performance benchmarks
- Error handling and recovery

### Out of Scope
- Browser installation procedures
- ChatGPT website functionality
- Network infrastructure testing

## Test Environment
- **OS**: Linux (NixOS)
- **Browser**: Chromium
- **Server**: Node.js with WebSocket support
- **Testing Framework**: Playwright for E2E tests, Jest for unit tests
- **Performance Tools**: Artillery for load testing

## Test Strategy

### Layer 1: Server Health Check (READY FOR TESTING)
Tests for browser executable detection and health endpoint functionality.

### Layer 2: Extension Health Check (PENDING IMPLEMENTATION)
Tests for ChatGPT tab monitoring functionality.

### Layer 3: Addon Health Check (PENDING IMPLEMENTATION)
Tests for ChatGPT login status verification.

### Integration Testing
End-to-end tests covering all layers and their interactions.

## Test Cases

### 1. Server Layer Tests (Backend - COMPLETE)

#### TC-001: Browser Executable Detection
- **Objective**: Verify server can detect browser executable
- **Preconditions**: Server is running
- **Steps**:
  1. Start server with `npm run dev`
  2. Make GET request to `http://localhost:8080/health`
  3. Verify response structure
- **Expected**: 
  ```json
  {
    "component": "server",
    "healthy": true,
    "message": "Browser available at: /path/to/browser"
  }
  ```

#### TC-002: Browser Not Found Scenario
- **Objective**: Test unhealthy state when browser not found
- **Preconditions**: Temporarily rename browser executable
- **Steps**:
  1. Rename browser executable
  2. Clear cache (restart server or wait 60s)
  3. Make health check request
- **Expected**: Unhealthy status with retry mechanism

#### TC-003: Cache Functionality
- **Objective**: Verify 60-second cache works correctly
- **Preconditions**: Server running with healthy browser
- **Steps**:
  1. Make initial health request
  2. Rename browser executable
  3. Make immediate second request
  4. Wait 61 seconds
  5. Make third request
- **Expected**: Second request returns cached healthy status, third returns unhealthy

#### TC-004: Retry Mechanism
- **Objective**: Test automatic retry logic
- **Preconditions**: Browser temporarily unavailable
- **Steps**:
  1. Block browser access temporarily
  2. Make health request
  3. Monitor retry attempts (1s, 2s, 4s delays)
- **Expected**: Retries occur at specified intervals

### 2. Extension Layer Tests (PENDING - Awaiting Implementation)

#### TC-005: No ChatGPT Tabs
- **Status**: BLOCKED - Awaiting extension implementation
- **Objective**: Verify unhealthy when no ChatGPT tabs open

#### TC-006: Single ChatGPT Tab
- **Status**: BLOCKED - Awaiting extension implementation
- **Objective**: Verify healthy with one ChatGPT tab

#### TC-007: Multiple ChatGPT Tabs
- **Status**: BLOCKED - Awaiting extension implementation
- **Objective**: Verify healthy with multiple tabs

#### TC-008: Tab State Changes
- **Status**: BLOCKED - Awaiting extension implementation
- **Objective**: Test status updates when tabs open/close

### 3. Addon Layer Tests (PENDING - Awaiting Implementation)

#### TC-009: User Logged In
- **Status**: BLOCKED - Awaiting addon implementation
- **Objective**: Verify healthy when logged into ChatGPT

#### TC-010: User Logged Out
- **Status**: BLOCKED - Awaiting addon implementation
- **Objective**: Verify unhealthy when not logged in

#### TC-011: Session Expiry
- **Status**: BLOCKED - Awaiting addon implementation
- **Objective**: Test transition from healthy to unhealthy on session timeout

#### TC-012: Login During Monitoring
- **Status**: BLOCKED - Awaiting addon implementation
- **Objective**: Verify status updates when user logs in

### 4. Integration Tests

#### TC-013: generate-image.sh Auto-Start
- **Objective**: Verify script starts server if not running
- **Preconditions**: Server not running
- **Steps**:
  1. Ensure server is stopped
  2. Run `./generate-image.sh "test prompt"`
  3. Verify server starts automatically
- **Expected**: Server starts and health check passes

#### TC-014: Health Check Before Image Generation
- **Objective**: Verify script checks health before proceeding
- **Preconditions**: Server running
- **Steps**:
  1. Run generate-image.sh
  2. Monitor health check calls
- **Expected**: Script queries /health endpoint before image generation

#### TC-015: Full Layer Health Status
- **Status**: BLOCKED - Awaiting all layer implementations
- **Objective**: Test complete health status across all layers

### 5. Performance Tests

#### TC-016: Response Time Under Load
- **Objective**: Verify <500ms response time requirement
- **Steps**:
  1. Use Artillery to simulate 100 concurrent requests
  2. Measure response times
- **Expected**: 95th percentile < 500ms

#### TC-017: Cache Performance
- **Objective**: Verify cache improves performance
- **Steps**:
  1. Measure uncached request time
  2. Measure cached request time
  3. Compare results
- **Expected**: Cached requests significantly faster

### 6. Edge Cases & Error Scenarios

#### TC-018: Server Crash Recovery
- **Objective**: Test system behavior after server crash
- **Steps**:
  1. Kill server process
  2. Run generate-image.sh
- **Expected**: Script detects crash and restarts server

#### TC-019: Concurrent Request Handling
- **Objective**: Test multiple simultaneous health checks
- **Steps**:
  1. Send 50 concurrent health check requests
- **Expected**: All requests handled correctly

#### TC-020: Invalid Request Handling
- **Objective**: Test non-health endpoints
- **Steps**:
  1. Request invalid endpoints
- **Expected**: 404 Not Found response

## Test Execution Schedule

### Phase 1: Backend Testing (READY NOW)
- Server health checks (TC-001 to TC-004)
- Performance tests (TC-016, TC-017)
- Edge cases (TC-018 to TC-020)
- Integration with generate-image.sh (TC-013, TC-014)

### Phase 2: Extension Testing (BLOCKED)
- Awaiting extension implementation from Extension Developer
- Tests TC-005 to TC-008

### Phase 3: Addon Testing (BLOCKED)
- Awaiting addon implementation from Extension Developer
- Tests TC-009 to TC-012

### Phase 4: Full Integration Testing (BLOCKED)
- Requires all components complete
- Test TC-015

## Risk Assessment
1. **High Risk**: Extension/Addon delays blocking full integration testing
2. **Medium Risk**: Performance requirements not met under load
3. **Low Risk**: Browser compatibility issues

## Test Deliverables
1. ✅ Test Plan Document (this document)
2. 🔄 Automated Test Suite (in progress)
3. ⏳ Test Execution Report (pending execution)
4. ⏳ Performance Benchmarks (pending execution)
5. ⏳ Bug Reports (as discovered)

## Success Criteria
- All server layer tests pass (100%)
- Performance requirements met (<500ms response time)
- No critical bugs in implemented components
- Smooth integration with generate-image.sh workflow

## Current Status
- **Server Layer**: ✅ Implementation complete, ready for testing
- **Extension Layer**: ⏳ Awaiting implementation
- **Addon Layer**: ⏳ Awaiting implementation
- **Test Automation**: 🔄 Setting up Playwright framework

---
*Last Updated: [Current Date]*
*QA Engineer: Ready to begin Phase 1 testing*