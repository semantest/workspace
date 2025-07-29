# Architecture Walking Skeleton Plan - 11:37 AM

## Hour 65 - Dynamic Addon Loading Implementation Plan

### Walking Skeleton Approach
- **Time**: 11:37 AM CEST
- **Strategy**: Incremental implementation
- **Team**: Coordinating with Eva and Alex
- **Role**: Architecture supervision

### Phase 1: Basic Loading (No Validation)
**Goal**: Remove addon from extension, serve via REST

1. **REST Endpoint** (Alex to implement):
   ```typescript
   POST /api/addons/request
   Body: { domain: string }
   Response: { code: string }  // Just returns addon code, ignores domain
   ```

2. **Extension Changes** (Eva to implement):
   - Remove bundled addon code
   - Add REST call on tab navigation
   - Execute returned code directly

### Phase 2: Domain Matching
**Goal**: Add metadata and validation

1. **Addon Metadata Structure**:
   ```typescript
   interface AddonMetadata {
     id: string;
     domain: string;
     version: string;
     code: string;
   }
   ```

2. **Validation Logic**:
   - Server checks domain match
   - Extension verifies before execution

### Phase 3: Repository Pattern (DDD)
**Goal**: Abstract storage with repository pattern

1. **Repository Interface**:
   ```typescript
   interface AddonRepository {
     findByDomain(domain: string): Promise<Addon | null>;
     save(addon: Addon): Promise<void>;
     findAll(): Promise<Addon[]>;
   }
   ```

2. **Implementations**:
   - InMemoryAddonRepository (local dev)
   - CloudAddonRepository (production)

### Team Coordination

**Eva's Tasks**:
1. Remove current addon from extension
2. Implement addon loader service
3. Add tab navigation listener
4. Execute loaded addon code

**Alex's Tasks**:
1. Create REST endpoint for addon requests
2. Implement repository pattern
3. Add domain validation logic
4. Create in-memory repository

**My Role (Aria)**:
- Review implementation approaches
- Ensure DDD principles followed
- Validate security considerations
- Coordinate between Eva and Alex

---

**Time**: 11:37 AM
**Phase**: Planning complete
**Next**: Team coordination
**Aria**: Supervising!