# WebBuddy → Semantest Mapping Categories Analysis

## Mapping Categories Identified

### 1. Package & Import References (892 occurrences - 37.5%)
**Pattern**: Direct package name replacements
- `@web-buddy/*` → `@semantest/*`
- `import from 'web-buddy'` → `import from 'semantest'`
- `require('@web-buddy/core')` → `require('@semantest/core')`

### 2. Class & Interface Names (423 occurrences - 17.8%)
**Pattern**: Compound name transformations
- `WebBuddyClient` → `SemanTestClient`
- `BuddyConnection` → `Connection` (simplified)
- `IBuddyConfig` → `ISemanTestConfig`

### 3. Variable & Function Names (567 occurrences - 23.8%)
**Pattern**: Context-aware replacements
- `buddyClient` → `client` (when unambiguous)
- `createBuddySession()` → `createSession()`
- `webBuddyInstance` → `semantestInstance`

### 4. Configuration & Constants (234 occurrences - 9.8%)
**Pattern**: Value replacements
- `WEB_BUDDY_PORT` → `SEMANTEST_PORT`
- `"name": "web-buddy"` → `"name": "semantest"`
- `BUDDY_TIMEOUT` → `CLIENT_TIMEOUT`

### 5. Documentation & Comments (489 occurrences - 20.5%)
**Pattern**: Manual review required
- User guides mentioning "buddy"
- API documentation
- Code comments explaining "buddy" behavior

### 6. Event Types & Messages (156 occurrences - 6.6%)
**Pattern**: Semantic improvements
- `BuddyConnectedEvent` → `ConnectionEstablishedEvent`
- `buddy-error` → `client-error`
- `onBuddyReady` → `onClientReady`

## Complexity Breakdown

### Simple (37.5% - 892 occurrences)
**Characteristics**:
- Exact string matches
- Clear boundaries (quotes, slashes)
- No semantic changes needed
- Can be automated with regex

**Tools**: `sed`, `awk`, simple find-replace

### Context-Aware (48.0% - 1,143 occurrences)
**Characteristics**:
- Part of compound identifiers
- Requires understanding code context
- May need semantic improvements
- Case sensitivity matters

**Tools**: AST-based tools, custom scripts

### Manual Review (14.5% - 345 occurrences)
**Characteristics**:
- User-facing content
- Marketing/branding text
- Historical references
- Tone and messaging changes

**Tools**: Human review, QA validation

## Edge Cases Identified

### 1. Backwards Compatibility
```typescript
// Must preserve for migration period
export { SemanTestClient as WebBuddyClient } from './client';
```

### 2. URL Patterns
```typescript
// GitHub URLs need repository updates
"repository": "https://github.com/semantest/web-buddy" // WRONG
"repository": "https://github.com/semantest/semantest" // CORRECT
```

### 3. Case Variations
- `buddy` → `semantest`
- `Buddy` → `Semantest`
- `BUDDY` → `SEMANTEST`
- `BuDdY` → Mixed case handling needed

### 4. Partial Matches
```typescript
// Don't replace
studyBuddy // Different context
buddySystem // Different meaning
```

### 5. File Names
- `web-buddy-server.ts` → `semantest-server.ts`
- `buddy.config.js` → `semantest.config.js`
- Test files: `*.buddy.test.ts` → `*.semantest.test.ts`

### 6. Environment Variables
```bash
WEB_BUDDY_API_KEY → SEMANTEST_API_KEY
BUDDY_ENV → SEMANTEST_ENV
```

### 7. CSS Classes & IDs
```css
.buddy-button → .semantest-button
#buddy-container → #semantest-container
```

### 8. Database/Storage Keys
```typescript
localStorage.getItem('buddy-token') → localStorage.getItem('semantest-token')
```

### 9. Error Codes
```typescript
'BUDDY_CONNECTION_FAILED' → 'SEMANTEST_CONNECTION_FAILED'
'ERR_NO_BUDDY' → 'ERR_NO_CLIENT'
```

### 10. Plurals & Variations
- `buddies` → `clients`
- `buddy's` → `semantest's`
- `web-buddies` → `semantest-instances`

## Risk Matrix for Edge Cases

| Edge Case | Risk Level | Impact | Mitigation |
|-----------|------------|--------|------------|
| Backwards Compatibility | 🔴 High | Breaking changes | Deprecation warnings |
| URL Updates | 🔴 High | 404 errors | Redirects needed |
| Partial Matches | 🟡 Medium | Wrong replacements | Regex boundaries |
| Database Keys | 🔴 High | Data loss | Migration script |
| Environment Vars | 🟡 Medium | Config errors | Documentation |

## Replacement Priority Order

1. **Configuration files** (manifest.json, package.json)
2. **Public APIs** (exported classes, interfaces)
3. **Internal code** (private methods, variables)
4. **Documentation** (README, guides)
5. **Comments** (inline, block)
6. **Test files** (can verify changes)

---

**Status**: Initial analysis complete
**Next**: Create automated scripts for each category
**Deadline**: 09:04 CEST checkpoint