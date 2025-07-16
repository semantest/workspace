# Task: Implement JWT/OAuth2 Authentication System

**ID**: P9A-004  
**Phase**: 9A - Critical Security Fixes  
**Priority**: CRITICAL  
**Effort**: 80-100 hours  
**Status**: pending

## Description
Implement complete JWT/OAuth2 authentication system across all services with identity provider integration.

## Dependencies
- P9B-001 (Redis implementation recommended but not blocking)

## Acceptance Criteria
- [ ] JWT authentication working across all services
- [ ] OAuth2 providers integrated (Google, GitHub)
- [ ] Session management infrastructure complete
- [ ] Token refresh mechanism implemented
- [ ] All endpoints protected with auth
- [ ] Security audit passes

## Technical Details

### Current State (from swarm analysis)
- Basic JWT implementation exists
- OAuth2 completely missing despite requirements
- In-memory storage (needs Redis)
- No provider integration

### Implementation Components

1. **OAuth2 Provider Integration**
   ```typescript
   // nodejs.server/src/auth/providers/google-oauth2.ts
   class GoogleOAuth2Provider implements AuthProvider {
     async authenticate(code: string): Promise<AuthResult> {
       // Exchange authorization code
       // Verify ID token
       // Create user session
     }
   }
   ```

2. **JWT Service Enhancement**
   ```typescript
   interface JWTConfig {
     algorithm: 'RS256';
     accessTokenTTL: 900; // 15 minutes
     refreshTokenTTL: 2592000; // 30 days
     issuer: 'semantest.com';
     audience: ['api.semantest.com'];
   }
   ```

3. **Session Management**
   ```typescript
   interface SessionManager {
     create(userId: string, metadata: SessionMetadata): Promise<Session>;
     validate(sessionId: string): Promise<Session>;
     refresh(refreshToken: string): Promise<TokenPair>;
     revoke(sessionId: string): Promise<void>;
     revokeAll(userId: string): Promise<void>;
   }
   ```

### Provider Configuration
- **Google OAuth2**
  - Client ID/Secret via environment
  - Scopes: openid, profile, email
  - Redirect URI: /auth/google/callback

- **GitHub OAuth2**  
  - App registration required
  - Scopes: read:user, user:email
  - Redirect URI: /auth/github/callback

### Security Requirements
- PKCE flow for public clients
- State parameter for CSRF protection
- Secure token storage
- Rate limiting on auth endpoints

### Files to Create
- `nodejs.server/src/auth/providers/` (provider implementations)
- `nodejs.server/src/auth/session-manager.ts`
- `nodejs.server/src/auth/oauth2-flow.ts`
- `nodejs.server/src/auth/middleware/auth-required.ts`

### Testing Plan
- Unit tests for each provider
- Integration tests for full auth flow
- Security tests for token validation
- Load tests for session management