# QA Technical Patterns Report - Buddy References Analysis

## Executive Summary
- **Total Occurrences**: 2,380 across 184 files
- **Simple Regex**: 395 occurrences (38%) - Can be automated
- **AST Required**: 182 occurrences (17%) - Semi-automated with tools
- **Manual Review**: 472 occurrences (45%) - Requires human judgment

## Pattern Categories & Replacement Strategies

### 1. Import Patterns (113 occurrences)

#### ✅ SIMPLE REGEX (109 occurrences)
```javascript
// Pattern: import statements
import { SemantestClient } from '@semantest/core';  // 36 occurrences
import { Client } from '@semantest/client';         // 71 occurrences
const webBuddy = require('semantest');             // 2 occurrences

// Replacement Strategy:
// Find: import\s+.*from\s+['"`]@?semantest([^'"`]*)['"`]
// Replace: import $1 from '@semantest$2'
```

#### 🌳 AST REQUIRED (4 occurrences)
```javascript
// Dynamic imports need AST to preserve async context
const client = await import('@chatgpt-semantest/client');
const { webBuddy } = await import('./semantest');

// Tool: TypeScript AST or jscodeshift
// Strategy: Transform ImportExpression nodes
```

### 2. Variable Patterns (197 occurrences)

#### ✅ SIMPLE REGEX (125 occurrences)
```javascript
// Pattern: Direct class/variable references
const client = new SemantestClient();     // 124 occurrences
const adapter = new SemantestAdapter();   // 1 occurrence

// Replacement:
// Find: \b(web|Web)BuddyClient\b
// Replace: SemantestClient
```

#### 🌳 AST REQUIRED (72 occurrences)
```javascript
// Property access and declarations
config.webBuddy.enabled           // 56 occurrences - property access
const webBuddy = new Client()     // 16 occurrences - variable declarations

// Tool: AST transformer to handle:
// - MemberExpression nodes for properties
// - VariableDeclarator nodes for declarations
```

### 3. Class/Interface Patterns (95 occurrences)

#### 🌳 ALL REQUIRE AST
```typescript
// Class definitions (63 occurrences)
class Semantest {}
export class ChatGPTBuddy extends Semantest {}

// Interface definitions (21 occurrences)
interface SemantestConfig {}
interface ISemantestPlugin {}

// Type definitions (7 occurrences)
type SemantestOptions = {}
export type SemantestClientConfig = {}

// Generic parameters (4 occurrences)
Promise<SemantestPlugin>
Array<SemantestMessage>

// AST Strategy:
// - ClassDeclaration nodes
// - InterfaceDeclaration nodes  
// - TypeAliasDeclaration nodes
// - TSTypeReference nodes for generics
```

### 4. Function Patterns (30 occurrences)

#### ✅ SIMPLE REGEX (19 occurrences)
```javascript
// Factory functions
const client = await createSemantestClient({...});
const instance = createBuddyConnection();

// Pattern: \bcreate\w*Buddy\w*\s*\(
// Replace: createSemantest$1(
```

#### 🌳 AST REQUIRED (11 occurrences)
```javascript
// Function declarations and methods
function initSemantest() {}        // 8 occurrences
client.webBuddy()                // 3 occurrences

// Need AST for:
// - FunctionDeclaration nodes
// - CallExpression nodes with buddy methods
```

### 5. Other Patterns (472 occurrences)

#### ✅ SIMPLE REGEX (140 occurrences)
```javascript
// Comments (131 occurrences)
// Initialize semantest client
/* Web-Buddy configuration */

// Package.json (9 occurrences)
"@semantest/core": "^2.0.0"
"semantest": "workspace:*"

// Safe to replace with regex
```

#### 🤚 MANUAL REVIEW (472 occurrences)
```javascript
// String literals (410 occurrences)
console.log("Connected to semantest");
const message = `Semantest version ${version}`;

// URLs (60 occurrences)  
"https://github.com/rydnr/semantest"
"https://docs.semantest.com/api"

// File paths (2 occurrences)
import config from "./semantest-settings.json"

// Require manual review for:
// - User-facing strings
// - Documentation
// - External URLs
// - Config file names
```

## Recommended Replacement Tools

### Phase 1: Simple Regex (395 occurrences)
```bash
# Example sed script for imports
find . -name "*.ts" -o -name "*.js" | xargs sed -i 's/@semantest/@semantest/g'

# Example for class names
find . -name "*.ts" | xargs sed -i 's/SemantestClient/SemantestClient/g'
```

### Phase 2: AST Transformation (182 occurrences)
```javascript
// jscodeshift transformer example
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  
  return j(fileInfo.source)
    .find(j.Identifier, {name: /.*[Bb]uddy.*/})
    .forEach(path => {
      path.node.name = path.node.name.replace(/[Bb]uddy/g, 'Semantest');
    })
    .toSource();
};
```

### Phase 3: Manual Review Checklist
1. **String literals**: Check if user-facing or internal
2. **URLs**: Update only internal repository URLs
3. **Documentation**: Update .md and .org files carefully
4. **Comments**: Safe to update in most cases
5. **Config files**: May need path updates in code

## High-Priority Targets

### Quick Wins (Top 5 by occurrence count)
1. `SemantestClient` class references - 124 occurrences
2. Import statements from `@semantest/*` - 107 occurrences  
3. Class definitions with Buddy - 63 occurrences
4. Property access `.webBuddy` - 56 occurrences
5. Interface definitions - 21 occurrences

### Risk Areas Requiring Extra Care
1. **Dynamic imports** - May affect lazy loading
2. **Generic type parameters** - Could break type inference
3. **External URLs** - Should not be changed
4. **User-facing strings** - Need product decision
5. **Config file paths** - May break runtime loading

## Testing Strategy After Each Phase

### Phase 1 Testing (After Simple Regex)
- Run TypeScript compilation: `tsc --noEmit`
- Execute unit tests
- Verify import resolution

### Phase 2 Testing (After AST Changes)  
- Full type checking
- Integration tests
- Check runtime behavior

### Phase 3 Testing (After Manual Changes)
- End-to-end tests
- Documentation link validation
- User acceptance testing

## Estimated Timeline
- Phase 1 (Simple Regex): 2-4 hours
- Phase 2 (AST Tools): 1-2 days  
- Phase 3 (Manual Review): 2-3 days
- Testing & Validation: 1-2 days

**Total: 5-7 days for complete migration**