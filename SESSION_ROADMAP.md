# Session Roadmap - Minimal MVP - SEMANTEST

## Goal: Semantest Event-Driven Architecture
CLI → Server → Extension → Browser Tab (ChatGPT) via Events

### Phase 1: Browser Extension Reload ✅
**Owner: Wences**
- Build extension
- Load in Chrome (PID 1224560)
- Verify extension appears in chrome://extensions
- **Status**: READY TO TEST

### Phase 2: ChatGPT Idle Detection 🔄
**Owner: Wences**
**CRITICAL BOTTLENECK - PRIMARY FOCUS**
- Detect textarea enabled/disabled state
- Detect loading spinner presence/absence
- Detect send button availability
- Test with MutationObserver
- **Success Criteria**: Can reliably detect when ChatGPT is ready to receive prompts

### Phase 3: WebSocket Connection 🔄
**Owner: Fran (Server) + Wences (Extension)**
- Server: WebSocket endpoint at ws://localhost:8081/ws
- Extension: Connect to server WebSocket
- Test: Ping/pong messages working
- **Success Criteria**: Bidirectional communication established

### Phase 4: CLI → Extension Event Flow 🔄
**Owner: Elena (CLI) + Fran (Server) + Wences (Extension)**
- CLI sends event to HTTP server
- Server forwards to Extension via WebSocket
- Extension receives and logs event
- **Success Criteria**: Event flows from CLI to Extension

### Phase 5: ImageGenerationRequested Event ⏳
**Owner: Full Team**
- CLI: Send ImageGenerationRequestedEvent with prompt
- Server: Route event to Extension
- Extension: 
  - Wait for ChatGPT idle
  - Insert prompt
  - Click send
  - Monitor for image generation
  - Download image when ready
- Server: Save image to specified path
- **Success Criteria**: Image saved to local filesystem

## Current Status
- Phase 1: ✅ Extension built, ready to load
- Phase 2: 🔄 IN PROGRESS - Primary bottleneck
- Phase 3: 🔄 Tests written, implementation in progress
- Phase 4: ⏳ Waiting on Phase 3
- Phase 5: ⏳ Waiting on Phase 4

## Priority
**FOCUS ALL EFFORTS ON PHASE 2** - This is the critical bottleneck that unlocks everything else.