# Test Fixes Needed - 7:20 AM

## Current Test Failures

### 1. AuthenticationRequestedEvent Constructor (nodejs.server)
**Issue**: Constructor now requires 3 parameters
**Fix**: Update test to pass all 3 parameters:
```typescript
new AuthenticationRequestedEvent(
  credentials,
  authMethod,
  context
)
```

### 2. Mock Object Mismatches
**Issue**: Mock objects missing required methods
**Fix**: Update mocks to match actual interfaces

### 3. Server Application Methods
**Issue**: Missing event handler methods
**Fix**: Either implement methods or update tests

## Quick Wins
1. Fix auth service constructor calls
2. Update mock objects
3. Focus on high-value tests first

## Current Progress
- ✅ Utils tests: 15/15 passing
- ✅ Security tests: passing
- 🚧 Auth tests: constructor fixes needed
- 🚧 Server tests: method mismatches

---
Quinn (QA Engineer)