# Task: Implement Redis for Distributed Storage

**ID**: P9B-001  
**Phase**: 9B - Data Protection  
**Priority**: CRITICAL  
**Effort**: 20-30 hours  
**Status**: pending

## Description
Replace all in-memory storage with Redis for sessions, tokens, and blacklists to enable horizontal scaling and persistence.

## Dependencies
- None (highest priority task per swarm analysis)

## Acceptance Criteria
- [ ] Redis integrated for session storage
- [ ] Token blacklist moved to Redis
- [ ] Refresh tokens stored in Redis
- [ ] High availability with Redis Sentinel
- [ ] Zero data loss on server restart
- [ ] Performance equal or better than in-memory

## Technical Details

### Current Critical Issues (from swarm analysis)
- In-memory Map/Set storage loses data on restart
- Cannot scale horizontally
- No distributed session management
- System fails at 5K concurrent users

### Redis Architecture

1. **Redis Cluster Setup**
   ```yaml
   # docker-compose.yml
   redis-master:
     image: redis:7-alpine
     command: redis-server --appendonly yes
   
   redis-sentinel:
     image: redis:7-alpine
     command: redis-sentinel /etc/redis-sentinel/sentinel.conf
   ```

2. **Storage Implementations**
   ```typescript
   // nodejs.server/src/auth/infrastructure/redis-session-repository.ts
   export class RedisSessionRepository implements SessionRepository {
     constructor(private redis: RedisClient) {}
     
     async save(session: Session): Promise<void> {
       await this.redis.setex(
         `session:${session.id}`,
         session.ttl,
         JSON.stringify(session)
       );
       // Add to user index
       await this.redis.sadd(`user:${session.userId}:sessions`, session.id);
     }
   }
   ```

3. **Token Blacklist with TTL**
   ```typescript
   async blacklistToken(token: string, ttl: number): Promise<void> {
     await this.redis.setex(`blacklist:${token}`, ttl, '1');
   }
   ```

### Migration Strategy
1. Implement Redis repositories alongside in-memory
2. Feature flag for gradual rollout
3. Data migration script for existing sessions
4. Monitoring for performance comparison
5. Remove in-memory implementations

### Performance Optimizations
- Connection pooling
- Pipelining for batch operations
- Lua scripts for atomic operations
- Read replicas for scaling

### Files to Create
- `nodejs.server/src/auth/infrastructure/redis-session-repository.ts`
- `nodejs.server/src/auth/infrastructure/redis-token-store.ts`
- `nodejs.server/src/auth/infrastructure/redis-user-repository.ts`
- `deploy/redis/sentinel.conf`
- `deploy/docker-compose.redis.yml`