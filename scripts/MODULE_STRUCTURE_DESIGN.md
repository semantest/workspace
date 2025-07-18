# Module Structure Design - Task 012

## 🏗️ Overview

**Date**: 2025-07-18 15:52 CEST  
**Phase**: Architecture Milestone (02-architecture)  
**Task**: 012 - Design new module structure  
**Status**: 🚧 IN PROGRESS

### Design Principles
1. **Domain Isolation** - Each website/service gets its own module
2. **Event Locality** - Events live with their domain
3. **Clean Dependencies** - No circular dependencies
4. **Interface Segregation** - Minimal, focused interfaces
5. **Build Independence** - Each module can build independently

## 📁 New Module Structure

### Target Architecture
```
semantest/
├── core/                           # Shared utilities and base classes
│   ├── events/                     # Base event classes ONLY
│   │   ├── base-event.ts          # Abstract base event
│   │   ├── domain-event.ts        # Domain event interface
│   │   └── event-bus.ts           # Event bus interface
│   ├── types/                      # Generic types ONLY
│   │   ├── common.ts              # Common type definitions
│   │   ├── client.ts              # Generic client types
│   │   └── infrastructure.ts      # Infrastructure types
│   └── utils/                      # Shared utilities
│       ├── validation.ts          # Input validation
│       ├── encryption.ts          # Encryption utilities
│       └── logging.ts             # Logging utilities
├── typescript.client/              # Generic client - NO domain events
│   ├── src/
│   │   ├── event-driven-client.ts # Generic event-driven client
│   │   ├── types.ts               # Generic types ONLY
│   │   └── index.ts               # Client exports
│   ├── package.json
│   └── tsconfig.json
├── browser/                        # Generic browser automation
│   ├── src/
│   │   ├── automation/            # Generic automation
│   │   ├── learning/              # Pattern learning
│   │   └── storage/               # Generic storage
│   ├── package.json
│   └── tsconfig.json
├── extension.chrome/               # Browser extension - NO domain code
│   ├── src/
│   │   ├── background.ts          # Generic background script
│   │   ├── content_script.ts      # Generic content script
│   │   └── popup.ts               # Generic popup
│   ├── manifest.json
│   └── package.json
├── images.google.com/              # Google Images domain module
│   ├── domain/
│   │   ├── entities/              # Domain entities
│   │   │   ├── image.entity.ts
│   │   │   └── download.entity.ts
│   │   ├── events/                # Domain events
│   │   │   ├── download-requested.event.ts
│   │   │   ├── download-completed.event.ts
│   │   │   └── download-failed.event.ts
│   │   ├── value-objects/         # Value objects
│   │   │   ├── image-url.vo.ts
│   │   │   └── image-metadata.vo.ts
│   │   └── repositories/          # Repository interfaces
│   │       └── image-repository.ts
│   ├── application/               # Application services
│   │   ├── google-images-downloader.ts
│   │   ├── image-search.service.ts
│   │   └── download-manager.service.ts
│   ├── infrastructure/            # Infrastructure adapters
│   │   ├── adapters/
│   │   │   ├── google-images-content-adapter.ts
│   │   │   └── browser-automation-adapter.ts
│   │   └── repositories/
│   │       └── image-repository.impl.ts
│   ├── tests/                     # Domain-specific tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── package.json
│   └── tsconfig.json
├── chatgpt.com/                   # ChatGPT domain module
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── conversation.entity.ts
│   │   │   └── message.entity.ts
│   │   ├── events/
│   │   │   ├── conversation-started.event.ts
│   │   │   └── message-sent.event.ts
│   │   └── value-objects/
│   │       └── conversation-id.vo.ts
│   ├── application/
│   │   ├── chatgpt-client.ts
│   │   └── conversation.service.ts
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   └── chatgpt-dom-adapter.ts
│   │   └── repositories/
│   │       └── conversation-repository.impl.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
└── nodejs.server/                 # Server infrastructure
    ├── src/
    │   ├── coordination/          # Cross-domain coordination
    │   ├── security/              # Security services
    │   └── server/                # Server infrastructure
    ├── package.json
    └── tsconfig.json
```

## 🔗 Interface Contracts

### 1. Domain Event Interface
```typescript
// core/events/domain-event.ts
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly metadata?: Record<string, any>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly timestamp: Date;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly metadata?: Record<string, any>;

  constructor(
    aggregateId: string,
    correlationId?: string,
    causationId?: string,
    metadata?: Record<string, any>
  ) {
    this.eventId = crypto.randomUUID();
    this.eventType = this.constructor.name;
    this.aggregateId = aggregateId;
    this.timestamp = new Date();
    this.correlationId = correlationId;
    this.causationId = causationId;
    this.metadata = metadata;
  }
}
```

### 2. Repository Interface
```typescript
// core/types/repository.ts
export interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
  findAll(): Promise<T[]>;
}

export interface EventStore {
  append(streamId: string, events: DomainEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<DomainEvent[]>;
}
```

### 3. Application Service Interface
```typescript
// core/types/application.ts
export interface ApplicationService {
  readonly serviceName: string;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface CommandHandler<TCommand, TResult> {
  handle(command: TCommand): Promise<TResult>;
}

export interface QueryHandler<TQuery, TResult> {
  handle(query: TQuery): Promise<TResult>;
}
```

### 4. Infrastructure Adapter Interface
```typescript
// core/types/infrastructure.ts
export interface DomainAdapter {
  readonly adapterName: string;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface BrowserAutomationAdapter extends DomainAdapter {
  navigate(url: string): Promise<void>;
  extractElements(selector: string): Promise<Element[]>;
  executeScript(script: string): Promise<any>;
}
```

## 🎯 Event Hierarchy Design

### Base Event Classes
```typescript
// core/events/base-event.ts
export abstract class BaseEvent extends BaseDomainEvent {
  // Common event functionality
}

export abstract class DomainCommandEvent extends BaseEvent {
  // Command pattern events
}

export abstract class DomainQueryEvent extends BaseEvent {
  // Query pattern events
}

export abstract class DomainNotificationEvent extends BaseEvent {
  // Notification events
}
```

### Domain-Specific Events
```typescript
// images.google.com/domain/events/download-requested.event.ts
export class GoogleImageDownloadRequested extends DomainCommandEvent {
  constructor(
    public readonly imageUrl: string,
    public readonly searchQuery: string,
    public readonly options: DownloadOptions,
    correlationId?: string
  ) {
    super('google-images-download', correlationId);
  }
}

// images.google.com/domain/events/download-completed.event.ts
export class GoogleImageDownloadCompleted extends DomainNotificationEvent {
  constructor(
    public readonly imageUrl: string,
    public readonly filename: string,
    public readonly fileSize: number,
    correlationId?: string
  ) {
    super('google-images-download', correlationId);
  }
}

// images.google.com/domain/events/download-failed.event.ts
export class GoogleImageDownloadFailed extends DomainNotificationEvent {
  constructor(
    public readonly imageUrl: string,
    public readonly reason: string,
    public readonly error: Error,
    correlationId?: string
  ) {
    super('google-images-download', correlationId);
  }
}
```

## 📋 Dependency Rules

### 1. Dependency Direction Rules
```
✅ ALLOWED:
- Domain → Core (Base classes, utilities)
- Application → Domain (Use domain entities)
- Infrastructure → Domain (Implement domain interfaces)
- Infrastructure → Application (Implement application interfaces)
- Tests → All layers (Test everything)

❌ FORBIDDEN:
- Core → Domain (Core is generic)
- Domain → Application (Domain is pure business logic)
- Domain → Infrastructure (Domain is pure business logic)
- Application → Infrastructure (Application is pure business logic)
- Any circular dependencies
```

### 2. Import Rules
```typescript
// ✅ ALLOWED IMPORTS:
import { BaseEvent } from '@semantest/core/events';
import { Repository } from '@semantest/core/types';
import { ImageEntity } from './entities/image.entity';

// ❌ FORBIDDEN IMPORTS:
import { GoogleImageDownloadRequested } from '@semantest/images.google.com'; // In core
import { BrowserAutomationAdapter } from './infrastructure/adapters'; // In domain
```

### 3. Package Dependencies
```json
// images.google.com/package.json
{
  "dependencies": {
    "@semantest/core": "^2.0.0",
    // ❌ NO OTHER DOMAIN DEPENDENCIES
  }
}

// core/package.json
{
  "dependencies": {
    // ❌ NO DOMAIN DEPENDENCIES
  }
}
```

## 🏢 Module Boundaries

### 1. Core Module Boundary
```typescript
// ✅ WHAT CORE CAN CONTAIN:
- Abstract base classes
- Generic interfaces
- Utility functions
- Type definitions
- Constants

// ❌ WHAT CORE CANNOT CONTAIN:
- Domain-specific logic
- Business rules
- Concrete implementations
- Domain events
- Entity definitions
```

### 2. Domain Module Boundary
```typescript
// ✅ WHAT DOMAIN CAN CONTAIN:
- Domain entities
- Domain events
- Value objects
- Domain services
- Repository interfaces
- Business rules

// ❌ WHAT DOMAIN CANNOT CONTAIN:
- Infrastructure details
- UI logic
- External service calls
- Framework-specific code
- Persistence logic
```

### 3. Application Module Boundary
```typescript
// ✅ WHAT APPLICATION CAN CONTAIN:
- Application services
- Use case implementations
- Command/Query handlers
- Domain orchestration
- Transaction boundaries

// ❌ WHAT APPLICATION CANNOT CONTAIN:
- Infrastructure details
- UI logic
- Direct external service calls
- Framework-specific code
- Persistence implementation
```

### 4. Infrastructure Module Boundary
```typescript
// ✅ WHAT INFRASTRUCTURE CAN CONTAIN:
- Adapters
- Repository implementations
- External service clients
- Framework-specific code
- Persistence logic

// ❌ WHAT INFRASTRUCTURE CANNOT CONTAIN:
- Business logic
- Domain rules
- Application orchestration
- UI logic
- Domain events (only references)
```

## 🔄 Migration Strategy

### Phase 1: Core Module Setup (30 minutes)
1. Create core module structure
2. Define base interfaces
3. Set up TypeScript configuration
4. Create package.json

### Phase 2: Domain Module Creation (30 minutes)
1. Create images.google.com module
2. Set up domain structure
3. Create package.json
4. Configure build process

### Phase 3: Event Migration (1 hour)
1. Move GoogleImageDownload* events
2. Update event inheritance
3. Update imports
4. Test event flow

### Phase 4: Entity Migration (1 hour)
1. Move domain entities
2. Move value objects
3. Update repositories
4. Test domain logic

### Phase 5: Application Migration (1 hour)
1. Move application services
2. Update service dependencies
3. Test application logic
4. Update exports

### Phase 6: Infrastructure Migration (1 hour)
1. Move adapters
2. Update adapter implementations
3. Test infrastructure
4. Update build configs

### Phase 7: Clean Generic Modules (30 minutes)
1. Remove domain code from typescript.client
2. Remove domain code from browser
3. Remove domain code from extension.chrome
4. Update exports

### Phase 8: Integration Testing (30 minutes)
1. Test cross-module communication
2. Test event flow
3. Test build process
4. Verify all tests pass

## 📊 Success Metrics

### Architectural Compliance
- [ ] Zero domain-specific code in core module
- [ ] Zero domain-specific code in typescript.client
- [ ] Zero circular dependencies
- [ ] All domain events in correct modules
- [ ] Clean dependency direction

### Build Independence
- [ ] Core module builds independently
- [ ] Each domain module builds independently
- [ ] Generic modules build independently
- [ ] No broken imports
- [ ] All tests pass

### Interface Segregation
- [ ] Minimal, focused interfaces
- [ ] Clear contract definitions
- [ ] No god interfaces
- [ ] Proper abstraction levels
- [ ] Clean API boundaries

## 🎯 Next Steps

### Immediate Actions:
1. **Complete Task 012** - Finalize module structure design
2. **Start Task 013** - Create images.google.com module
3. **Start Task 014** - Create module templates
4. **Begin migration** - Phase 1 implementation

### Collaboration:
- **Architect Agent**: Review and approve design
- **Security Agent**: Validate security boundaries
- **QA Agent**: Define testing strategy
- **Scribe Agent**: Document architecture decisions

## 📞 Architecture Support

### Design Validation:
- **Architect Lead**: architect@semantest.com
- **Domain Expert**: domain@semantest.com
- **Clean Architecture**: clean-arch@semantest.com

### Common Questions:
1. **Where should X go?** - Follow dependency rules
2. **Can I import Y?** - Check import rules
3. **Is this domain-specific?** - If yes, belongs in domain module
4. **Should this be in core?** - Only if truly generic

---

**Design Complete**: 2025-07-18 15:55 CEST  
**Status**: ✅ READY FOR IMPLEMENTATION  
**Next Task**: 013 - Create images.google.com module  
**Architect**: Lead architectural guidance required