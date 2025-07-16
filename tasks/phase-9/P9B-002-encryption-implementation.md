# Task: Implement Encryption for Data at Rest

**ID**: P9B-002  
**Phase**: 9B - Data Protection  
**Priority**: HIGH  
**Effort**: 80-100 hours  
**Status**: pending

## Description
Implement comprehensive encryption for all browser storage, audit logs, and sensitive data with proper key management.

## Dependencies
- P9B-001 (Redis implementation) - recommended to complete first

## Acceptance Criteria
- [ ] All browser storage encrypted (IndexedDB, localStorage)
- [ ] Key management system implemented
- [ ] Secure key rotation mechanism
- [ ] Audit logs encrypted
- [ ] No plaintext sensitive data anywhere
- [ ] Compliance with FIPS 140-2

## Technical Details

### Encryption Strategy

1. **Browser Storage Encryption**
   ```typescript
   // browser/src/security/storage-encryption.ts
   class EncryptedStorage {
     private cipher = 'aes-256-gcm';
     
     async encrypt(data: any): Promise<EncryptedData> {
       const key = await this.deriveKey();
       const iv = crypto.getRandomValues(new Uint8Array(16));
       // Encrypt with authenticated encryption
     }
   }
   ```

2. **Key Management System**
   ```typescript
   interface KeyManager {
     generateMasterKey(): Promise<CryptoKey>;
     deriveKey(purpose: string): Promise<CryptoKey>;
     rotateKeys(): Promise<void>;
     getKeyVersion(): string;
   }
   ```

3. **Encryption Layers**
   - **Browser Extension**: Web Crypto API
   - **Node.js Server**: Native crypto module
   - **Data in Transit**: TLS 1.3
   - **Data at Rest**: AES-256-GCM

### Key Hierarchy
```
Master Key (Hardware Security Module)
├── Data Encryption Keys (DEK)
│   ├── Browser Storage Key
│   ├── Session Data Key
│   └── Audit Log Key
└── Key Encryption Keys (KEK)
    └── Wrapping Keys
```

### Implementation Components

1. **Browser Extension Storage**
   - Encrypt all IndexedDB entries
   - Encrypt localStorage values
   - Key derived from user authentication

2. **Server-Side Encryption**
   - Encrypt sensitive fields in database
   - Encrypt audit logs before storage
   - Use envelope encryption pattern

3. **Key Rotation**
   - Automated monthly rotation
   - Zero-downtime key updates
   - Backward compatibility for decryption

### Security Requirements
- FIPS 140-2 compliant algorithms
- Hardware security module for production
- Key escrow for compliance
- Audit trail for key usage

### Files to Create
- `browser/src/security/storage-encryption.ts`
- `browser/src/security/key-manager.ts`
- `nodejs.server/src/security/field-encryption.ts`
- `nodejs.server/src/security/audit-encryption.ts`
- `infrastructure/src/security/hsm-adapter.ts`