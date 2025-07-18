# Module Structure Design - Task 012

**Date**: 2025-07-18  
**Status**: IN PROGRESS  
**Previous**: Task 011 - Architecture Audit  
**Next**: Task 013 - Create images.google.com module

## 🏗️ Domain-Driven Design Architecture

### Core Design Principles

1. **Domain Isolation**: Each website/service gets its own bounded context
2. **Event Locality**: Domain events live within their specific domain
3. **Clean Dependencies**: Strict unidirectional dependency flow
4. **Interface Segregation**: Minimal, focused interfaces between domains
5. **Build Independence**: Each module builds and tests independently

### 📁 Module Directory Structure

```
semantest/
├── core/                           # 🏛️ Shared Framework (No Domain Logic)
│   ├── src/
│   │   ├── base/                  # Base classes for all domains
│   │   │   ├── entity.ts          # Base entity class
│   │   │   ├── event.ts           # Base event class
│   │   │   ├── repository.ts      # Base repository interface
│   │   │   └── service.ts         # Base service class
│   │   ├── types/                 # Generic type definitions
│   │   │   ├── common.ts          # Common types
│   │   │   ├── events.ts          # Event system types
│   │   │   └── infrastructure.ts  # Infrastructure types
│   │   ├── utils/                 # Shared utilities
│   │   │   ├── logger.ts          # Logging utilities
│   │   │   ├── validation.ts      # Validation utilities
│   │   │   └── errors.ts          # Base error classes
│   │   └── interfaces/            # Cross-domain interfaces
│   │       ├── browser.ts         # Browser automation interface
│   │       ├── storage.ts         # Storage interface
│   │       └── communication.ts   # Communication interface
│   └── package.json
│
├── images.google.com/              # 🖼️ Google Images Domain
│   ├── domain/                    # 🧠 Pure Business Logic
│   │   ├── entities/              # Domain entities
│   │   │   ├── google-image.entity.ts
│   │   │   ├── search-session.entity.ts
│   │   │   └── download-request.entity.ts
│   │   ├── events/                # Domain events
│   │   │   ├── search-requested.event.ts
│   │   │   ├── search-completed.event.ts
│   │   │   ├── download-requested.event.ts
│   │   │   └── download-completed.event.ts
│   │   ├── value-objects/         # Domain value objects
│   │   │   ├── image-url.vo.ts
│   │   │   ├── search-query.vo.ts
│   │   │   └── image-metadata.vo.ts
│   │   ├── repositories/          # Domain repository interfaces
│   │   │   └── google-images.repository.ts
│   │   └── services/              # Domain services
│   │       └── url-resolution.service.ts
│   ├── application/               # 🎯 Use Cases & Application Services
│   │   ├── services/
│   │   │   ├── google-images-search.service.ts
│   │   │   └── google-images-download.service.ts
│   │   └── handlers/              # Event handlers
│   │       ├── search-request.handler.ts
│   │       └── download-request.handler.ts
│   ├── infrastructure/            # 🔌 External Adapters
│   │   ├── adapters/
│   │   │   ├── google-images-browser.adapter.ts
│   │   │   ├── google-images-api.adapter.ts
│   │   │   └── google-images-storage.adapter.ts
│   │   └── repositories/
│   │       └── google-images.repository.impl.ts
│   ├── tests/                     # Domain-specific tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
│
├── chatgpt.com/                   # 💬 ChatGPT Domain (Already Exists)
│   ├── domain/                    # 🧠 Pure Business Logic
│   │   ├── entities/
│   │   │   ├── chatgpt-conversation.entity.ts
│   │   │   ├── chatgpt-project.entity.ts
│   │   │   └── conversation-message.entity.ts
│   │   ├── events/
│   │   │   └── chatgpt-events.ts
│   │   ├── value-objects/
│   │   │   ├── conversation-id.value-object.ts
│   │   │   ├── message-id.value-object.ts
│   │   │   └── project-id.value-object.ts
│   │   └── repositories/
│   │       └── chatgpt.repository.ts
│   ├── application/               # 🎯 Use Cases & Application Services
│   │   └── chatgpt.application.ts
│   ├── infrastructure/            # 🔌 External Adapters
│   │   └── adapters/
│   │       ├── chatgpt-communication.adapter.ts
│   │       └── chatgpt-dom.adapter.ts
│   ├── tests/
│   └── package.json
│
├── browser/                       # 🌐 Generic Browser Framework
│   ├── src/
│   │   ├── automation/            # Generic browser automation
│   │   │   ├── browser-factory.ts
│   │   │   ├── page-controller.ts
│   │   │   └── element-finder.ts
│   │   ├── adapters/              # Browser adapters
│   │   │   ├── playwright.adapter.ts
│   │   │   ├── puppeteer.adapter.ts
│   │   │   └── selenium.adapter.ts
│   │   └── interfaces/            # Browser interfaces
│   │       ├── browser.interface.ts
│   │       └── page.interface.ts
│   └── package.json
│
├── extension.chrome/              # 🧩 Generic Chrome Extension
│   ├── src/
│   │   ├── background/            # Generic background scripts
│   │   │   └── background.ts
│   │   ├── content/               # Generic content scripts
│   │   │   └── content.ts
│   │   ├── popup/                 # Generic popup interface
│   │   │   └── popup.ts
│   │   └── shared/                # Shared extension utilities
│   │       └── messaging.ts
│   └── package.json
│
└── nodejs.server/                 # 🖥️ Server Infrastructure
    ├── src/
    │   ├── api/                   # Generic API framework
    │   │   └── router.ts
    │   ├── middleware/            # Generic middleware
    │   │   └── authentication.ts
    │   └── infrastructure/        # Server infrastructure
    │       └── database.ts
    └── package.json
```

## 🔄 Interface Contracts

### 1. Domain-to-Core Interface

```typescript
// Core interface that all domains can use
export interface DomainEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  timestamp: Date;
  data: unknown;
}

export interface DomainRepository<T extends DomainEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### 2. Cross-Domain Communication Interface

```typescript
// Event bus for cross-domain communication
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void;
}

// Cross-domain integration interface
export interface DomainIntegration {
  supports(domain: string): boolean;
  handleEvent(event: DomainEvent): Promise<void>;
}
```

### 3. Infrastructure Interface

```typescript
// Generic browser automation interface
export interface BrowserAutomation {
  navigate(url: string): Promise<void>;
  findElement(selector: string): Promise<Element | null>;
  click(selector: string): Promise<void>;
  extract(selector: string): Promise<string>;
}

// Generic storage interface
export interface Storage {
  store(key: string, value: unknown): Promise<void>;
  retrieve(key: string): Promise<unknown>;
  remove(key: string): Promise<void>;
}
```

## 🎯 Event Hierarchy Design

### Base Event System

```typescript
// Base event class in core
export abstract class BaseDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly version: number;

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly data: unknown
  ) {
    this.eventId = generateEventId();
    this.timestamp = new Date();
    this.version = 1;
  }
}
```

### Domain-Specific Events

```typescript
// Google Images domain events
export class GoogleImageSearchRequested extends BaseDomainEvent {
  constructor(
    public readonly query: string,
    public readonly filters: SearchFilters
  ) {
    super('google-image-search-requested', `search-${Date.now()}`, { query, filters });
  }
}

export class GoogleImageDownloadCompleted extends BaseDomainEvent {
  constructor(
    public readonly imageUrl: string,
    public readonly localPath: string
  ) {
    super('google-image-download-completed', `download-${Date.now()}`, { imageUrl, localPath });
  }
}
```

## 📦 Dependency Management

### Allowed Dependencies

```yaml
✅ ALLOWED:
- Domain → Core (Base classes, utilities)
- Application → Domain (Use domain entities)
- Infrastructure → Application (Implement application interfaces)
- Infrastructure → Domain (Implement domain interfaces)
- Infrastructure → Core (Use core utilities)
```

### Forbidden Dependencies

```yaml
❌ FORBIDDEN:
- Core → Domain (Core must be generic)
- Domain → Application (Domain is pure business logic)
- Domain → Infrastructure (Domain must be infrastructure-agnostic)
- Any circular dependencies between domains
```

### Package.json Dependencies

```json
{
  "images.google.com": {
    "dependencies": {
      "@semantest/core": "^1.0.0"
    },
    "devDependencies": {
      "@semantest/browser": "^1.0.0"
    }
  },
  "chatgpt.com": {
    "dependencies": {
      "@semantest/core": "^1.0.0"
    },
    "devDependencies": {
      "@semantest/browser": "^1.0.0"
    }
  }
}
```

## 🔨 Build Configuration

### Independent Module Builds

```typescript
// images.google.com/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

### Module-Specific Tests

```typescript
// images.google.com/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

## 🎯 Success Metrics

- [ ] Each domain module builds independently
- [ ] No circular dependencies between modules
- [ ] Domain events are contained within their domain
- [ ] Infrastructure code is separated from domain logic
- [ ] Core module contains only generic utilities
- [ ] Clean dependency graph validation passes

## 🔄 Next Steps

1. **Task 013**: Create images.google.com module structure
2. **Task 014**: Create module templates for consistent architecture
3. **Task 015**: Migrate Google Images domain code
4. **Task 016**: Migrate ChatGPT domain code
5. **Task 017**: Refactor dependencies and interfaces

---

**Design Phase**: Task 012 ✅  
**Architecture Pattern**: Domain-Driven Design  
**Module Count**: 5 core modules + N domain modules  
**Dependency Complexity**: Unidirectional, acyclic