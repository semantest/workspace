# 🔧 TypeScript Fixes Needed - 5:40 AM

## Quick Fix Guide (30 minutes max)

### Fix 1: Remove unused parameter (core/src/errors.ts:347)
```typescript
// CURRENT (BROKEN):
static wrap(error: Error, type: ErrorType = ErrorType.INTERNAL): BaseError {
    if (error instanceof BaseError) {
        return error;
    }
    return new InternalError(error.message, { originalError: error });
}

// FIXED:
static wrap(error: Error): BaseError {
    if (error instanceof BaseError) {
        return error;
    }
    return new InternalError(error.message, { originalError: error });
}
```

### Fix 2: Remove unused import (core/src/utils.ts:13)
```typescript
// CURRENT (BROKEN):
import { Result, Option, Maybe, Either } from './types';

// FIXED:
import { Result, Option, Either } from './types';
```

### Fix 3: Fix read-only property (core/src/errors.ts:360)
```typescript
// CURRENT (BROKEN):
newError.details = {
    originalError: originalError.message,
    // ...
};

// FIXED (Option 1 - Use constructor):
const details = {
    originalError: originalError.message,
    // ...
};
return new BaseError(message, details);

// FIXED (Option 2 - Make details mutable):
// In BaseError class definition:
public details: ErrorDetails; // Remove 'readonly'
```

### Fix 4: Add null check (core/src/utils.ts:78)
```typescript
// CURRENT (BROKEN):
result[key] = this.deepMerge(targetValue, sourceValue);

// FIXED:
if (sourceValue !== undefined) {
    result[key] = this.deepMerge(targetValue, sourceValue);
}
```

## Impact of These Fixes

Once these 4 simple fixes are applied:
1. ✅ Core module tests will run
2. ✅ 2 emergency test files (45+ tests) will execute
3. ✅ Coverage will jump from 0% to ~40% in core
4. ✅ Overall coverage will increase to 15-25%
5. ✅ Unblocks the entire test sprint

**Time to implement**: 30 minutes
**Time we've waited**: 3+ hours
**Tests ready to run**: 70+ across 4 files

---
Quinn (QA Engineer) - Ready to run tests immediately once fixed!