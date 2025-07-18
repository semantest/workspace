# Semantest Migration Replacement Rules

## Overview
This document defines the rules and guidelines for replacing "buddy" references with "semantest" throughout the codebase. These rules ensure consistent, safe, and context-aware migrations.

## Quick Decision Tree

```
Is it user-facing content?
├─ YES → Manual Review Required
└─ NO → Is it a simple string match?
    ├─ YES → Use Simple Replacement
    └─ NO → Use Context-Aware Replacement
```

## 1. Simple Replacement Rules (37.5% of occurrences)

### When to Use
Simple replacement is safe when the text is:
- Isolated and unambiguous
- Not part of a larger identifier
- In configuration values
- In import statements with clear boundaries

### Safe Patterns
| Pattern | Replace With | Example |
|---------|--------------|---------|
| `@web-buddy/` | `@semantest/` | `import { Client } from '@web-buddy/core'` → `'@semantest/core'` |
| `"web-buddy"` | `"semantest"` | `"name": "web-buddy"` → `"name": "semantest"` |
| `/web-buddy/` | `/semantest/` | `path: "/web-buddy/api"` → `"/semantest/api"` |
| `WebBuddy` (isolated) | `Semantest` | `# WebBuddy Framework` → `# Semantest Framework` |

### Script Example
```bash
# Simple replacements can use sed
sed -i 's/@web-buddy\//@semantest\//g' package.json
sed -i 's/"web-buddy"/"semantest"/g' manifest.json
```

## 2. Context-Aware Replacement Rules (48.0% of occurrences)

### When to Use
Context-aware replacement is needed when:
- Part of a compound identifier
- Mixed with other words
- In code logic (variables, functions)
- Case variations exist

### Context Rules

#### Class Names
| Original | Replacement | Rule |
|----------|-------------|------|
| `ChatGPTBuddyClient` | `ChatGPTClient` | Remove "Buddy" from compound names |
| `WebBuddyServer` | `SemanTestServer` | Full replacement for core classes |
| `BuddyConnection` | `SemanTestConnection` | Prefix replacement |

#### Variable Names
| Original | Replacement | Rule |
|----------|-------------|------|
| `buddyClient` | `client` | Simplify when possible |
| `webBuddyConfig` | `semantestConfig` | Full replacement |
| `hasBuddy` | `hasSemantest` | Preserve prefix |

#### Function Names
| Original | Replacement | Rule |
|----------|-------------|------|
| `createBuddyConnection()` | `createConnection()` | Simplify when unambiguous |
| `initWebBuddy()` | `initSemantest()` | Full replacement |
| `getBuddyStatus()` | `getClientStatus()` | Context-specific replacement |

### Special Cases

#### Event Types
```typescript
// Before
export class WebBuddyConnectedEvent extends Event {}

// After
export class ConnectionEstablishedEvent extends Event {}
// Note: Rename to be more descriptive, not just replace
```

#### Comments
```typescript
// Before
// Initialize the web buddy connection

// After  
// Initialize the semantest connection
// OR better:
// Initialize the browser automation connection
```

## 3. Manual Review Required (14.5% of occurrences)

### When Manual Review is Needed
- **User-facing documentation**: READMEs, guides, tutorials
- **Error messages**: Shown to end users
- **Marketing content**: Descriptions, taglines
- **Historical references**: Changelog, migration guides
- **Brand decisions**: Logo references, product names

### Review Checklist
- [ ] Does the content make sense with the new name?
- [ ] Is the tone still appropriate?
- [ ] Are there cultural/linguistic considerations?
- [ ] Should we preserve historical context?
- [ ] Is the replacement grammatically correct?

### Examples Requiring Review

#### Documentation
```markdown
<!-- Before -->
Web-Buddy is your friendly automation companion

<!-- After (needs review) -->
Semantest is your intelligent automation platform
<!-- Note: Complete rewrite may be better than replacement -->
```

#### Error Messages
```typescript
// Before
throw new Error('Web-Buddy connection failed. Is your buddy running?');

// After (needs review)
throw new Error('Semantest connection failed. Please check the service status.');
// Note: Playful tone removed for professional message
```

## 4. Special Cases and Exceptions

### DO NOT Replace
1. **Historical commits**: Git history remains unchanged
2. **Third-party references**: External documentation links
3. **Backwards compatibility aliases**: Deprecated but supported
4. **Version-specific documentation**: For migration guides

### Preserve With Comment
```typescript
// @deprecated Use SemanTestClient instead
export class WebBuddyClient extends SemanTestClient {
  constructor() {
    console.warn('WebBuddyClient is deprecated. Use SemanTestClient.');
    super();
  }
}
```

### URL Handling
| Type | Action |
|------|--------|
| GitHub URLs | Update to new repository |
| NPM packages | Create scoped aliases |
| Documentation links | Redirect from old to new |
| API endpoints | Support both during transition |

## 5. File-Specific Rules

### Configuration Files
- **package.json**: Simple replacement for name, keep old in keywords
- **manifest.json**: Update display name, keep old in description
- **tsconfig.json**: Update paths, maintain compatibility

### Source Code
- **.ts/.js files**: Context-aware for identifiers
- **.test.ts files**: Update test descriptions
- **.d.ts files**: Careful with public API types

### Documentation
- **.md files**: Manual review for all
- **API docs**: Regenerate after code changes
- **Examples**: Test after replacement

## 6. Quality Assurance Process

### Pre-Replacement
1. Run full test suite
2. Document current behavior
3. Create rollback branch

### During Replacement
1. Replace one file type at a time
2. Run relevant tests after each change
3. Commit frequently with clear messages

### Post-Replacement
1. Full test suite must pass
2. Manual testing of key workflows
3. Documentation review
4. User acceptance testing

### Validation Script
```bash
#!/bin/bash
# Validate no "buddy" remains where it shouldn't
echo "Checking for remaining 'buddy' references..."

# Exclude historical files and backwards compatibility
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/deprecated/*" \
  -exec grep -l "buddy\|Buddy\|BUDDY" {} \; | \
  grep -v -E "(CHANGELOG|MIGRATION|deprecated)" | \
  wc -l

# Should output 0 for complete migration
```

## 7. Rollback Plan

If issues arise:
1. Immediate: Revert to pre-migration branch
2. Partial: Revert specific files only
3. Hotfix: Add compatibility layer
4. Communication: Notify users of temporary rollback

## 8. Timeline and Prioritization

### Day 1 - Critical Path
- Extension manifest
- Package.json files
- Public API types

### Day 2 - Core Systems  
- Server main files
- Client SDK core
- Event system

### Day 3-4 - Internal Code
- Utility functions
- Test files
- Internal tools

### Week 2 - Documentation
- User guides
- API documentation
- Examples and tutorials

---

**Document Status**: ✅ READY FOR QA REVIEW  
**Version**: 1.0  
**Last Updated**: 2025-01-17  
**GitHub Issue**: #2  

## Approval Sign-off
- [ ] QA Team Review
- [ ] Engineering Lead Approval
- [ ] Documentation Team Review
- [ ] Product Owner Sign-off