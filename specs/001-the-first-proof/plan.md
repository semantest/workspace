# Implementation Plan: Image Generation via Browser Automation

**Branch**: `001-the-first-proof` | **Date**: 2025-09-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-the-first-proof/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Filled with TypeScript, TDD, typescript-eda details
   → Set Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check section below
   → ✅ Passed with library-first approach
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → ✅ Created with all clarifications resolved
5. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → ✅ Created all artifacts
6. Re-evaluate Constitution Check section
   → ✅ No new violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach
   → ✅ Strategy documented below
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement browser automation for image generation via ChatGPT, using TypeScript with TDD approach and typescript-eda for hexagonal architecture. System consists of CLI client, Node.js server with WebSocket, and Chrome extension using Playwright MCP for browser control.

## Technical Context
**Language/Version**: TypeScript 5.5.3  
**Primary Dependencies**: typescript-eda, jest, ws, Playwright MCP  
**Storage**: File system for downloaded images, in-memory queue  
**Testing**: Jest with TDD approach  
**Target Platform**: Node.js 16+ server, Chrome browser extension  
**Project Type**: web (CLI + server + browser extension)  
**Performance Goals**: <60s image generation, 500ms tab state polling  
**Constraints**: 5 min timeout, 50MB max file size, 100 request queue limit  
**Scale/Scope**: Single browser instance, sequential processing initially

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (typescript.client, nodejs.server, extension.chrome)
- Using framework directly? ✅ (typescript-eda, Chrome Extensions API)
- Single data model? ✅ (shared event definitions)
- Avoiding patterns? ✅ (direct event handling, no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? ✅ (@semantest/image-generation-events library)
- Libraries listed: 
  - @semantest/image-generation-events: Event definitions and validation
  - @semantest/image-generation-client: CLI implementation
  - @semantest/image-generation-server: Server with WebSocket
  - @semantest/image-generation-extension: Chrome extension
- CLI per library: 
  - image-generation-client: --generate --status --help --version --format json
  - image-generation-server: --start --stop --health --help --version
- Library docs: llms.txt format planned? ✅

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? ✅
- Git commits show tests before implementation? ✅ (will be enforced)
- Order: Contract→Integration→E2E→Unit strictly followed? ✅
- Real dependencies used? ✅ (real WebSocket, real Chrome)
- Integration tests for: new libraries, contract changes, shared schemas? ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅ (understood)

**Observability**:
- Structured logging included? ✅ (JSON logs with correlation IDs)
- Frontend logs → backend? ✅ (extension sends logs via WebSocket)
- Error context sufficient? ✅ (full error events with context)

**Versioning**:
- Version number assigned? ✅ (1.0.0)
- BUILD increments on every change? ✅
- Breaking changes handled? ✅ (WebSocket protocol versioning)

## Project Structure

### Documentation (this feature)
```
specs/001-the-first-proof/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
│   ├── websocket-protocol.json
│   └── http-api.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (CLI + Server + Extension)
nodejs.server/
├── src/
│   ├── models/          # Event types, queue, tab state
│   ├── services/        # WebSocket handler, queue processor
│   └── api/             # HTTP endpoints
└── tests/
    ├── contract/        # WebSocket protocol tests
    ├── integration/     # Server-Extension tests
    └── unit/

typescript.client/
├── src/
│   ├── commands/        # CLI commands
│   ├── services/        # HTTP client
│   └── lib/            # Shared utilities
└── tests/

extension.chrome/
├── src/
│   ├── background/      # Service worker
│   ├── content/         # ChatGPT page interaction
│   └── services/        # WebSocket client, Playwright MCP
└── tests/
```

**Structure Decision**: Option 2 (Web application) - Multiple interconnected components

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   ✅ All clarifications resolved in research.md

2. **Generate and dispatch research agents**:
   ✅ Researched: TypeScript-EDA patterns, Playwright MCP, WebSocket protocol
   ✅ Best practices: TDD with Jest, Chrome Extension architecture

3. **Consolidate findings** in `research.md`:
   ✅ Complete with all decisions documented

**Output**: research.md with all NEEDS CLARIFICATION resolved ✅

## Phase 1: Design & Contracts
*Prerequisites: research.md complete ✅*

1. **Extract entities from feature spec** → `data-model.md`:
   ✅ Created with all event types and entities

2. **Generate API contracts** from functional requirements:
   ✅ WebSocket protocol schema created
   ✅ HTTP API OpenAPI spec created

3. **Generate contract tests** from contracts:
   Ready for /tasks command to create

4. **Extract test scenarios** from user stories:
   ✅ Documented in quickstart.md

5. **Update agent file incrementally**:
   Ready for /tasks command (CLAUDE.md update)

**Output**: data-model.md ✅, /contracts/* ✅, quickstart.md ✅

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each event type → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- WebSocket connection → integration test
- Browser automation → E2E test with Playwright MCP
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: 
  1. Event models and validation
  2. WebSocket protocol tests
  3. Server setup and queue
  4. Extension WebSocket client
  5. Playwright MCP integration
  6. ChatGPT DOM interaction
  7. File download handling
  8. End-to-end flow
- Mark [P] for parallel execution (independent test files)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md covering:
- Contract tests for all events
- WebSocket connection tests
- Queue management tests
- Tab state monitoring tests
- Image download tests
- Integration tests for each component
- E2E test for complete flow
- Implementation tasks for each tested component

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations requiring justification*


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*