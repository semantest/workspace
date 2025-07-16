# Task: Implement TLS/mTLS Everywhere

**ID**: P9C-001  
**Phase**: 9C - Infrastructure Security  
**Priority**: HIGH  
**Effort**: 40-50 hours  
**Status**: pending

## Description
Implement HTTPS for all services, WebSocket Secure (WSS), and mutual TLS for service-to-service communication.

## Dependencies
- None (can proceed in parallel with other tasks)

## Acceptance Criteria
- [ ] All HTTP endpoints use HTTPS
- [ ] WebSocket connections use WSS
- [ ] mTLS between internal services
- [ ] Automated certificate management
- [ ] No plaintext communication
- [ ] A+ rating on SSL Labs

## Technical Details

### TLS Implementation Plan

1. **HTTPS for All Services**
   ```typescript
   // nodejs.server/src/server.ts
   const httpsOptions = {
     key: fs.readFileSync('server-key.pem'),
     cert: fs.readFileSync('server-cert.pem'),
     minVersion: 'TLSv1.3',
     ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
   };
   ```

2. **WebSocket Secure**
   ```typescript
   // nodejs.server/src/websocket/secure-websocket.ts
   const wss = new WebSocketServer({
     server: httpsServer,
     verifyClient: (info) => {
       // Verify origin and authentication
     }
   });
   ```

3. **Mutual TLS for Services**
   ```typescript
   interface mTLSConfig {
     ca: Buffer;        // CA certificate
     cert: Buffer;      // Service certificate
     key: Buffer;       // Service private key
     requestCert: true;
     rejectUnauthorized: true;
   }
   ```

### Certificate Management

1. **Development Environment**
   - Self-signed certificates with mkcert
   - Local CA for development

2. **Production Environment**
   - Let's Encrypt for public endpoints
   - Internal CA for mTLS
   - Cert-manager for Kubernetes

3. **Automated Rotation**
   ```yaml
   # deploy/k8s/cert-manager.yaml
   apiVersion: cert-manager.io/v1
   kind: Certificate
   metadata:
     name: semantest-tls
   spec:
     secretName: semantest-tls-secret
     duration: 2160h # 90 days
     renewBefore: 720h # 30 days
   ```

### Security Configuration

1. **TLS Settings**
   - Minimum TLS 1.3
   - Strong cipher suites only
   - Perfect forward secrecy
   - HSTS headers

2. **Certificate Validation**
   - Certificate pinning for mobile clients
   - OCSP stapling
   - Certificate transparency

### Files to Create
- `deploy/certificates/generate-certs.sh`
- `nodejs.server/src/security/tls-config.ts`
- `nodejs.server/src/security/mtls-middleware.ts`
- `deploy/k8s/cert-manager/`
- `infrastructure/src/security/certificate-validator.ts`

### Testing Requirements
- SSL Labs scan for A+ rating
- Certificate expiry monitoring
- mTLS handshake testing
- Performance impact measurement