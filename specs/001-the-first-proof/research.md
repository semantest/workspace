# Research Notes: Image Generation via Browser Automation

## Technology Research

### TypeScript with TDD
- **Decision**: TypeScript with Jest for testing framework
- **Rationale**: Already established in workspace, excellent type safety for event-driven architecture
- **Alternatives considered**: Mocha/Chai (less integrated), Vitest (newer, less stable)

### TypeScript-EDA (Event-Driven Architecture)
- **Decision**: Use typescript-eda for hexagonal architecture layers
- **Rationale**: Provides clean separation of concerns, ports & adapters pattern ideal for multi-component system
- **Alternatives considered**: Manual event system (more complex), Redux (overkill for backend)

### Browser Automation via Playwright MCP
- **Decision**: Playwright MCP server for browser control from extension
- **Rationale**: MCP provides clean interface, Playwright handles cross-browser compatibility
- **Alternatives considered**: Puppeteer (Chrome-only), Selenium (heavier, slower)

### WebSocket Protocol
- **Decision**: Use existing WebSocket implementation on port 8081
- **Rationale**: Already proven working (per WEBSOCKET_PROVEN_WORKING.md), bidirectional communication needed
- **Alternatives considered**: HTTP polling (inefficient), Server-Sent Events (unidirectional)

## Architecture Patterns

### Event Flow Pattern
- **Decision**: Event sourcing with command/event segregation
- **Rationale**: Clear separation of request (GenerateImageRequested) from state changes (ImageGenerationInitiated, ImageDownloaded)
- **Alternatives considered**: Direct RPC calls (tighter coupling), REST API (doesn't fit real-time nature)

### File Download Strategy
- **Decision**: Chrome extension downloads API with specified path
- **Rationale**: Native browser capability, proper permissions model
- **Alternatives considered**: Server-side download (adds complexity), base64 transfer (inefficient)

### State Management
- **Decision**: Extension monitors tab state via DOM observation
- **Rationale**: Direct observation most reliable for ChatGPT UI changes
- **Alternatives considered**: API polling (no official API), screenshot comparison (resource intensive)

## Resolved Clarifications

### Timeout Handling
- **Decision**: 5 minute timeout for image generation
- **Rationale**: ChatGPT typically generates images in 30-60 seconds, 5 minutes provides buffer
- **Implementation**: Configurable via environment variable

### File Conflicts
- **Decision**: Append timestamp to filename if exists
- **Rationale**: Preserves both files, no data loss
- **Format**: `filename_YYYYMMDD_HHMMSS.ext`

### Multiple Requests
- **Decision**: Queue requests, process sequentially
- **Rationale**: ChatGPT doesn't support parallel generation, maintains order
- **Implementation**: In-memory queue in server

### Error Reporting
- **Decision**: Structured error events back through WebSocket
- **Rationale**: Maintains event-driven pattern, allows CLI to display errors
- **Format**: ErrorEvent with code, message, context

### Connection Loss Recovery
- **Decision**: Exponential backoff reconnection with max 5 attempts
- **Rationale**: Handles temporary network issues without overwhelming server
- **Implementation**: 1s, 2s, 4s, 8s, 16s delays

### Download Folder Permissions
- **Decision**: Check permissions before starting, create if missing
- **Rationale**: Fail fast with clear error message
- **Implementation**: fs.access() check with W_OK flag

### Maximum File Size
- **Decision**: 50MB limit for downloaded images
- **Rationale**: ChatGPT images typically <5MB, 50MB provides headroom
- **Implementation**: Configurable, check before download

## Testing Strategy

### Test Pyramid
1. **Contract Tests**: Event schemas, WebSocket protocol
2. **Integration Tests**: CLI→Server, Server→Extension, Extension→ChatGPT
3. **E2E Tests**: Full flow with real ChatGPT (manual approval for costs)
4. **Unit Tests**: Individual functions and utilities

### Mock Strategy
- **Decision**: Use real services where possible, mock only external APIs
- **Rationale**: Constitution requires real dependencies
- **Mocks needed**: ChatGPT DOM (for fast tests), Playwright browser (for CI)

## Performance Considerations

### Resource Usage
- **Browser**: Single browser instance shared across requests
- **Memory**: Queue limited to 100 pending requests
- **CPU**: DOM polling at 500ms intervals when active

### Scalability Plan
- **Phase 1**: Single browser, sequential processing (current)
- **Phase 2**: Multiple browsers, parallel processing (future)
- **Phase 3**: Distributed workers (if needed)

## Security Considerations

### Input Validation
- **Prompt**: Sanitize for XSS, length limit 1000 chars
- **Filename**: Validate against path traversal, OS-safe characters
- **Folder**: Absolute paths only, within user's home directory

### Authentication
- **Current**: None (proof of concept)
- **Future**: API keys for CLI, session tokens for WebSocket

## Dependencies Summary

### Core Dependencies
- `typescript`: ^5.5.3 (already in workspace)
- `typescript-eda`: Latest version for hexagonal architecture
- `jest`: ^29.7.0 (already in workspace)
- `ws`: WebSocket library (in nodejs.server)

### Extension Dependencies
- Chrome Extensions API (built-in)
- MCP client for Playwright communication

### Testing Dependencies
- `@testing-library/jest-dom`: DOM assertions
- `jest-websocket-mock`: WebSocket testing
- `supertest`: HTTP endpoint testing

## Next Steps
All clarifications resolved, ready for Phase 1 design.