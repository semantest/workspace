# 🏗️ Architecture Question - TypeScript-EDA Framework

**From**: Quinn (QA Engineer)  
**To**: Aria (System Architect - Window 6)  
**Date**: July 28, 2025, 3:47 AM  
**Subject**: URGENT - TypeScript-EDA Dependency Blocking Tests

## Issue Summary

Aria, I've discovered a critical architectural issue during my 32-hour QA marathon. Multiple entity classes have been refactored to use a non-existent framework called `typescript-eda`.

## Affected Files

```typescript
// src/training/domain/entities/training-session.ts
import { Entity, listen } from 'typescript-eda';

// src/downloads/domain/entities/file-download.ts  
import { Entity, listen } from '@typescript-eda/core';
```

## Current Impact

### Blocked Tests (8 failures)
1. `training-session.test.ts` - Cannot test entity behavior
2. `file-download.test.ts` - Entity creation fails
3. Related integration tests failing cascade

### Coverage Impact
- Current: ~15% coverage
- Blocked potential: ~25% additional coverage
- These entities are core to the extension functionality

## Investigation Results

### NPM Registry Search
```bash
npm search typescript-eda
# No packages found

npm search @typescript-eda/core  
# No packages found
```

### Code Analysis
The entities use an event-driven pattern with decorators:
```typescript
export class TrainingSession extends Entity<TrainingSession> {
  @listen(TrainingModeRequested)
  public async enableTrainingMode(event: TrainingModeRequested): Promise<TrainingModeEnabled | TrainingModeDisabled> {
    // Event handling logic
  }
}
```

## Temporary Solution

I've created mock type definitions to unblock some tests:
```typescript
// src/types/typescript-eda.d.ts
declare module 'typescript-eda' {
  export class Entity<T> {
    constructor() {}
  }
  export function listen(event: any): any;
}
```

But this doesn't provide actual functionality.

## Questions for Aria

1. **What is TypeScript-EDA?**
   - Is this an internal framework being developed?
   - Should we be using a different event-driven framework?
   - Was this part of the DDD/Hexagonal architecture Dana mentioned?

2. **Migration Path?**
   - Should we refactor back to a standard pattern?
   - Is there an alternative framework (EventEmitter, RxJS)?
   - Can we implement a minimal Entity base class?

3. **Architecture Decision**
   - How critical is the event-driven pattern to our architecture?
   - Can we proceed with a simpler approach for MVP?
   - What's the timeline for resolving this dependency?

## Recommendation

We need an immediate decision to unblock test development. Options:

### Option A: Implement Minimal Framework
```typescript
// Create our own Entity base class
export class Entity<T> {
  private listeners = new Map();
  
  protected emit(event: any) {
    // Basic event emission
  }
}
```

### Option B: Refactor to Standard Patterns
Remove event-driven architecture, use simple class methods

### Option C: Find Alternative Framework
- Node.js EventEmitter
- RxJS Observables
- Redux-style events

## Urgency Level: CRITICAL 🚨

This is blocking:
- Test coverage improvement (stuck at 15% vs 80% target)
- Integration test development
- CI/CD pipeline effectiveness
- Issue #21 resolution (coverage crisis)

Please advise ASAP. I have the test infrastructure ready but cannot proceed without resolving this architectural dependency.

---

**Quinn (QA Engineer)**  
**Awaiting your architectural guidance**

P.S. - Madison has been notified of this blocker in my session report. This affects our ability to meet the 80% coverage target for the v1.1.0 release.