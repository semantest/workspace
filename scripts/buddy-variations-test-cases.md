# Buddy Variations Test Cases

**Priority**: URGENT - Task 001  
**Timeline**: 15 minutes  
**GitHub Issue**: #1  
**Objective**: Verify Engineer's script catches ALL buddy variations across the codebase  

## Test Case Overview

This document defines comprehensive test cases to verify that the buddy variations detection script correctly identifies all possible variations of "buddy" naming conventions throughout the codebase.

## Buddy Variations to Test

### 1. PascalCase: `WebBuddy`
**Test Cases**:
- TC-VAR-001: Class declarations: `class WebBuddy {}`
- TC-VAR-002: Interface names: `interface WebBuddyConfig {}`
- TC-VAR-003: Type definitions: `type WebBuddyOptions = {}`
- TC-VAR-004: Enum names: `enum WebBuddyStatus {}`
- TC-VAR-005: Import statements: `import { WebBuddy } from './lib'`
- TC-VAR-006: Export statements: `export class WebBuddy`
- TC-VAR-007: Constructor calls: `new WebBuddy()`
- TC-VAR-008: Static references: `WebBuddy.getInstance()`

### 2. camelCase: `webBuddy`
**Test Cases**:
- TC-VAR-009: Variable declarations: `const webBuddy = new Client()`
- TC-VAR-010: Function parameters: `function init(webBuddy: Client)`
- TC-VAR-011: Object properties: `config.webBuddy.enabled`
- TC-VAR-012: Method names: `client.webBuddy()`
- TC-VAR-013: Instance variables: `this.webBuddy = instance`
- TC-VAR-014: Destructuring: `const { webBuddy } = props`
- TC-VAR-015: Array elements: `clients.push(webBuddy)`
- TC-VAR-016: Template literals: `${webBuddy.name}`

### 3. kebab-case: `web-buddy`
**Test Cases**:
- TC-VAR-017: HTML attributes: `<div data-web-buddy="true">`
- TC-VAR-018: CSS classes: `.web-buddy-container`
- TC-VAR-019: File names: `web-buddy-config.ts`
- TC-VAR-020: URL paths: `/api/web-buddy/status`
- TC-VAR-021: Package names: `"web-buddy": "^1.0.0"`
- TC-VAR-022: CLI commands: `web-buddy --init`
- TC-VAR-023: Event names: `'web-buddy-ready'`
- TC-VAR-024: Directory names: `src/web-buddy/`

### 4. SNAKE_CASE: `WEB_BUDDY`
**Test Cases**:
- TC-VAR-025: Constants: `const WEB_BUDDY_VERSION = '1.0'`
- TC-VAR-026: Environment vars: `process.env.WEB_BUDDY_API_KEY`
- TC-VAR-027: Config keys: `{ WEB_BUDDY_ENABLED: true }`
- TC-VAR-028: Enum values: `Status.WEB_BUDDY_ACTIVE`
- TC-VAR-029: Error codes: `'ERR_WEB_BUDDY_NOT_FOUND'`
- TC-VAR-030: Action types: `'WEB_BUDDY_INITIALIZED'`
- TC-VAR-031: Database fields: `WEB_BUDDY_ID`
- TC-VAR-032: Header names: `'X-WEB-BUDDY-TOKEN'`

### 5. npm scope: `@web-buddy/`
**Test Cases**:
- TC-VAR-033: Package imports: `import { Client } from '@web-buddy/client'`
- TC-VAR-034: Package.json deps: `"@web-buddy/core": "^2.0.0"`
- TC-VAR-035: Require statements: `require('@web-buddy/utils')`
- TC-VAR-036: Dynamic imports: `await import('@web-buddy/plugin')`
- TC-VAR-037: Type imports: `import type { Config } from '@web-buddy/types'`
- TC-VAR-038: Workspace refs: `"@web-buddy/*": ["packages/*"]`
- TC-VAR-039: Module resolution: `'@web-buddy/shared/constants'`
- TC-VAR-040: Peer dependencies: `"peerDependencies": { "@web-buddy/core": "*" }`

### 6. No separator: `webbuddy`
**Test Cases**:
- TC-VAR-041: Username/IDs: `user_webbuddy123`
- TC-VAR-042: Database tables: `webbuddy_sessions`
- TC-VAR-043: API endpoints: `/webbuddy/auth`
- TC-VAR-044: Docker images: `webbuddy:latest`
- TC-VAR-045: Log prefixes: `[webbuddy] Starting...`
- TC-VAR-046: Config sections: `[webbuddy]`
- TC-VAR-047: Hash tags: `#webbuddy`
- TC-VAR-048: Domain names: `webbuddy.example.com`

### 7. Title-Case: `Web-Buddy`
**Test Cases**:
- TC-VAR-049: Documentation titles: `# Web-Buddy Documentation`
- TC-VAR-050: Display names: `"displayName": "Web-Buddy Extension"`
- TC-VAR-051: UI labels: `<label>Web-Buddy Settings</label>`
- TC-VAR-052: Menu items: `{ label: 'Web-Buddy', action: 'open' }`
- TC-VAR-053: Error messages: `"Web-Buddy is not configured"`
- TC-VAR-054: Notification titles: `notify('Web-Buddy Update')`
- TC-VAR-055: Brand references: `"Powered by Web-Buddy"`
- TC-VAR-056: Window titles: `document.title = 'Web-Buddy Dashboard'`

### 8. snake_case: `web_buddy`
**Test Cases**:
- TC-VAR-057: Python variables: `web_buddy_client = Client()`
- TC-VAR-058: Database columns: `web_buddy_created_at`
- TC-VAR-059: Function names: `def init_web_buddy():`
- TC-VAR-060: File names: `web_buddy_utils.py`
- TC-VAR-061: JSON keys: `{ "web_buddy_config": {} }`
- TC-VAR-062: Query params: `?web_buddy_mode=debug`
- TC-VAR-063: Form fields: `<input name="web_buddy_key">`
- TC-VAR-064: Cookie names: `web_buddy_session`

### 9. Standalone 'buddy'
**Test Cases**:
- TC-VAR-065: Variable names: `const buddy = getInstance()`
- TC-VAR-066: Property names: `client.buddy.connect()`
- TC-VAR-067: Method names: `buddy.initialize()`
- TC-VAR-068: Comments: `// buddy feature enabled`
- TC-VAR-069: String content: `'buddy mode activated'`
- TC-VAR-070: Error messages: `throw new Error('buddy not found')`
- TC-VAR-071: Config keys: `{ buddy: { enabled: true } }`
- TC-VAR-072: Class suffix: `class ClientBuddy {}`

## Context Pattern Test Cases

### Import Statements
**Test Cases**:
- TC-CTX-001: ES6 imports: `import { WebBuddy } from '@web-buddy/client'`
- TC-CTX-002: CommonJS: `const webBuddy = require('web-buddy')`
- TC-CTX-003: Dynamic imports: `const { webBuddy } = await import('./web-buddy')`
- TC-CTX-004: Type imports: `import type { WebBuddyConfig } from '@web-buddy/types'`
- TC-CTX-005: Namespace imports: `import * as WebBuddy from 'web-buddy'`
- TC-CTX-006: Default imports: `import webBuddy from 'web-buddy'`
- TC-CTX-007: Re-exports: `export { WebBuddy } from '@web-buddy/core'`
- TC-CTX-008: Aliased imports: `import { WebBuddy as WB } from 'web-buddy'`

### Variable Declarations
**Test Cases**:
- TC-CTX-009: Const declarations: `const webBuddyClient = new Client()`
- TC-CTX-010: Let declarations: `let webBuddy = null`
- TC-CTX-011: Var declarations: `var WEB_BUDDY_CONFIG = {}`
- TC-CTX-012: Destructuring: `const { webBuddy, config } = options`
- TC-CTX-013: Array destructuring: `const [webBuddy] = clients`
- TC-CTX-014: Object shorthand: `const obj = { webBuddy }`
- TC-CTX-015: Function params: `function setup(webBuddy, options)`
- TC-CTX-016: Default params: `function init(webBuddy = defaultClient)`

### String Content
**Test Cases**:
- TC-CTX-017: Single quotes: `'WebBuddy Extension v1.0'`
- TC-CTX-018: Double quotes: `"web-buddy-initialized"`
- TC-CTX-019: Template literals: `` `${webBuddy} connected` ``
- TC-CTX-020: Multi-line strings: `` `Web-Buddy\nStatus: Active` ``
- TC-CTX-021: JSON strings: `'{"webBuddy": {"enabled": true}}'`
- TC-CTX-022: Error messages: `'WebBuddy initialization failed'`
- TC-CTX-023: Log messages: `console.log('web-buddy started')`
- TC-CTX-024: Comments in strings: `"// WebBuddy configuration"`

### Comments
**Test Cases**:
- TC-CTX-025: Single-line comments: `// WebBuddy feature flag`
- TC-CTX-026: Multi-line comments: `/* Web-Buddy module */`
- TC-CTX-027: JSDoc comments: `/** @param {WebBuddy} buddy */`
- TC-CTX-028: TODO comments: `// TODO: Update webBuddy config`
- TC-CTX-029: FIXME comments: `// FIXME: web-buddy connection issue`
- TC-CTX-030: Block comments: `/* WebBuddy\n * Configuration\n */`
- TC-CTX-031: Inline comments: `const x = 1; // webBuddy count`
- TC-CTX-032: HTML comments: `<!-- Web-Buddy Widget -->`

### Class Names
**Test Cases**:
- TC-CTX-033: Class declarations: `class WebBuddyAdapter {}`
- TC-CTX-034: Class expressions: `const WebBuddy = class {}`
- TC-CTX-035: Extended classes: `class MyBuddy extends WebBuddy {}`
- TC-CTX-036: Implements: `class Client implements WebBuddyInterface {}`
- TC-CTX-037: Generic classes: `class WebBuddyManager<T> {}`
- TC-CTX-038: Abstract classes: `abstract class WebBuddyBase {}`
- TC-CTX-039: Nested classes: `class Outer { class WebBuddy {} }`
- TC-CTX-040: Class properties: `class X { webBuddy = new Buddy() }`

## Edge Cases

### Mixed Case Variations
**Test Cases**:
- TC-EDGE-001: Mixed in same line: `const webBuddy = new WebBuddy(); // WEB_BUDDY instance`
- TC-EDGE-002: Partial matches: `webBuddyConfig`, `buddyWeb`, `prebuddy`
- TC-EDGE-003: Concatenated: `web` + `buddy`, `'web' + 'buddy'`
- TC-EDGE-004: Split across lines: `web\nbuddy`
- TC-EDGE-005: Unicode variants: `ᴡᴇʙʙᴜᴅᴅʏ`, `𝕎𝕖𝕓𝔹𝕦𝕕𝕕𝕪`
- TC-EDGE-006: With numbers: `webBuddy2`, `web-buddy-v3`
- TC-EDGE-007: With special chars: `web.buddy`, `web$buddy`, `web#buddy`
- TC-EDGE-008: Case variations: `WeBbUdDy`, `wEb-BuDdY`

### False Positives to Avoid
**Test Cases**:
- TC-FALSE-001: Unrelated buddy: `studybuddy`, `buddypress`
- TC-FALSE-002: Partial words: `webbuddying`, `buddyweb`
- TC-FALSE-003: Different context: `buddy system`, `buddy list`
- TC-FALSE-004: Non-code text: `"My buddy likes web development"`
- TC-FALSE-005: URLs: `example.com/buddy`, `buddy.example.com`
- TC-FALSE-006: Unrelated packages: `@buddy/webpack`
- TC-FALSE-007: Different products: `BuddyBuild`, `GitBuddy`
- TC-FALSE-008: Common words: `anybody`, `somebody`, `buddies`

## Validation Criteria

### Script Must Detect:
1. ✅ All 9 variation patterns (PascalCase through standalone)
2. ✅ All context patterns (imports, variables, strings, comments, classes)
3. ✅ Mixed case occurrences in same file
4. ✅ Variations across different file types (.ts, .js, .json, .md, etc.)
5. ✅ Nested occurrences (buddy within buddy contexts)

### Script Must Report:
1. 📄 File path and line number for each occurrence
2. 🔍 Variation type detected (e.g., "camelCase", "kebab-case")
3. 📊 Context type (import, variable, comment, etc.)
4. 📈 Total count per variation type
5. 📁 Summary by directory/module

### Performance Requirements:
- ⚡ Process entire codebase in < 30 seconds
- 💾 Memory usage < 500MB
- 🔄 Support incremental scanning
- 📋 Generate both human and machine-readable reports

## Test Execution Plan

1. **Create test fixtures** with all variation patterns
2. **Run detection script** on test fixtures
3. **Verify 100% detection rate** for all test cases
4. **Test on real codebase** to find actual occurrences
5. **Validate no false positives** from the false positive test cases
6. **Performance benchmark** on full repository

## Success Criteria

- ✅ All 72 variation test cases detected correctly
- ✅ All 40 context pattern test cases identified
- ✅ All 8 edge cases handled properly
- ✅ Zero false positives from the 8 false positive cases
- ✅ Performance within specified limits
- ✅ Clear, actionable report generated

---

**Note**: This test plan ensures comprehensive coverage of all possible "buddy" variations in the codebase. The Engineer's script should be validated against these test cases to ensure nothing is missed.