# Architecture Guidance - Test Dependencies & TypeScript

## For Alex - Test Dependencies Pattern

### Correct Pattern: devDependencies
```json
{
  "devDependencies": {
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

### Rationale
- Test dependencies belong in `devDependencies`
- They're not needed in production builds
- Reduces bundle size and attack surface
- Standard Node.js/npm best practice

### Implementation
```bash
npm install --save-dev supertest @types/supertest
```

## For Quinn - TypeScript Core Module Strategy

### Recommended Approach: Fix First, Then Test

1. **Fix Compilation Errors First** (Priority 1)
   - Duplicate exports indicate structural issues
   - Type mismatches will cascade to tests
   - Clean build is prerequisite for reliable tests

2. **Module Export Structure** (Priority 2)
   ```typescript
   // core/index.ts - Clean barrel exports
   export * from './models';
   export * from './services';
   export * from './utils';
   
   // Avoid duplicate exports
   export { specificFunction } from './specific-module';
   ```

3. **Test Configuration** (After fixes)
   ```json
   // tsconfig.test.json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "types": ["jest", "node"],
       "allowJs": true
     },
     "include": ["src/**/*", "test/**/*"]
   }
   ```

### Action Plan
1. **Immediate**: Fix duplicate exports
2. **Next**: Resolve missing dependencies
3. **Then**: Fix type mismatches
4. **Finally**: Write tests with confidence

### Quick Win Strategy
If blocking critical test writing:
```typescript
// core/test-exports.ts - Temporary test-only exports
export * from './models';
// Only what tests need, avoiding duplicates
```

But fix the root cause ASAP!