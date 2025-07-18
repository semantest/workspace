# Semantest Workspace

This directory contains all Semantest repositories for local development using **Domain-Driven Design** architecture.

## 🏗️ Architecture Overview

Semantest follows a **Domain-Driven Design (DDD)** architecture with strict domain boundaries and clean dependency management:

### 📁 Module Structure

```
semantest/
├── core/                    # 🏛️ Shared utilities and base classes
│   ├── events/             # Base event classes ONLY
│   ├── types/              # Generic type definitions
│   └── utils/              # Shared utilities
├── images.google.com/      # 🖼️ Google Images domain module
│   ├── domain/            # Pure business logic
│   ├── application/       # Use cases and services
│   └── infrastructure/    # External adapters
├── chatgpt.com/           # 💬 ChatGPT domain module
│   ├── domain/            # Pure business logic
│   ├── application/       # Use cases and services
│   └── infrastructure/    # External adapters
├── browser/               # 🌐 Generic browser automation
├── nodejs.server/         # 🖥️ Server infrastructure
├── extension.chrome/      # 🧩 Chrome extension
└── typescript.client/     # 📦 Generic TypeScript client
```

### 🎯 Core Principles

1. **Domain Isolation**: Each website/service gets its own domain module
2. **Event Locality**: Domain events live within their specific domain
3. **Clean Dependencies**: Strict unidirectional dependency flow
4. **Interface Segregation**: Minimal, focused interfaces
5. **Build Independence**: Each module builds independently

### 📊 Dependency Rules

```
✅ ALLOWED:
- Domain → Core (Base classes, utilities)
- Application → Domain (Use domain entities)
- Infrastructure → Domain (Implement domain interfaces)

❌ FORBIDDEN:
- Core → Domain (Core is generic)
- Domain → Application (Domain is pure business logic)
- Any circular dependencies
```

## 🏢 Repositories

### Core Framework
- **`core/`** - Shared utilities and base classes
- **`browser/`** - Generic browser automation framework  
- **`nodejs.server/`** - Node.js server component
- **`extension.chrome/`** - Chrome browser extension

### Domain Modules
- **`images.google.com/`** - Google Images automation domain
- **`chatgpt.com/`** - ChatGPT automation domain
- **`google.com/`** - Google search automation domain

### Client Libraries
- **`typescript.client/`** - Generic TypeScript client SDK
- **`docs/`** - Documentation site

## 🚀 Quick Start

### 1. Repository URLs

**Main Workspace**
- 🏠 **Workspace**: https://github.com/semantest/workspace

**Core Framework**
- 🏛️ **Core**: https://github.com/semantest/core
- 🌐 **Browser Framework**: https://github.com/semantest/browser
- 🖥️ **Node.js Server**: https://github.com/semantest/nodejs.server
- 🧩 **Chrome Extension**: https://github.com/semantest/extension.chrome

**Domain Modules**
- 🖼️ **Google Images**: https://github.com/semantest/images.google.com
- 💬 **ChatGPT**: https://github.com/semantest/chatgpt.com
- 🔍 **Google Search**: https://github.com/semantest/google.com

**Client Libraries**
- 📦 **TypeScript Client**: https://github.com/semantest/typescript.client

**Documentation & Deployment**
- 📚 **Documentation**: https://github.com/semantest/docs

### 2. Installation

```bash
# Install dependencies in all repositories
for repo in */; do
  echo "Installing dependencies in $repo"
  cd "$repo"
  npm install
  cd ..
done
```

### 3. Development Workflow

#### Core Module Development
```bash
cd core/
npm run build:watch  # Watch for changes
npm test            # Run tests
```

#### Domain Module Development
```bash
cd images.google.com/
npm run build:watch  # Watch for changes
npm test            # Run tests
npm run test:e2e    # Run E2E tests
```

#### Cross-Module Testing
```bash
# Run integration tests
npm run test:integration

# Test all modules
npm run test:all
```

### 4. Architecture Guidelines

#### Adding New Domain Events
```typescript
// ✅ CORRECT - In domain module
// images.google.com/domain/events/download-started.event.ts
export class GoogleImageDownloadStarted extends BaseDomainEvent {
  constructor(public readonly imageUrl: string) {
    super('google-images-download');
  }
}
```

#### Cross-Module Communication
```typescript
// ✅ CORRECT - Using event bus
eventBus.publish(new GoogleImageDownloadStarted(imageUrl));

// ❌ INCORRECT - Direct module imports
import { GoogleImageDownloader } from '@semantest/images.google.com';
```

## 📖 Documentation

### Architecture Documentation
- **[Architecture Overview](docs/architecture/README.org)** - High-level system architecture
- **[Domain Design](docs/architecture/domain-design.md)** - Domain-driven design principles
- **[Migration Guide](docs/migration-guide/README.org)** - Migration from legacy architecture

### API Documentation
- **[API Reference](docs/api-reference/README.org)** - Complete API documentation
- **[Event Catalog](docs/events/README.md)** - Domain event specifications
- **[Security Patterns](docs/security/README.md)** - Security implementation patterns

### Development Guides
- **[Getting Started](docs/getting-started/README.org)** - Development setup
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines
- **[Testing Guide](docs/testing/README.md)** - Testing strategies

## 🔨 Development

### Module Independence
Each module can be developed independently with its own:
- Build process (`npm run build`)
- Test suite (`npm test`)
- Development server (`npm run dev`)
- Documentation (`README.md`)

### Dependency Management
- **Core modules** have no domain dependencies
- **Domain modules** depend only on core
- **Infrastructure modules** depend on domain and core
- **No circular dependencies** are allowed

### Testing Strategy
- **Unit tests** for domain logic
- **Integration tests** for cross-module communication
- **E2E tests** for complete user workflows
- **Security tests** for boundary validation

## 📦 Publishing

### Module Versioning
- Each module has independent versioning
- Semantic versioning (semver) is enforced
- Core modules use stable APIs
- Domain modules can evolve independently

### CI/CD Pipeline
- **Build validation** on all pull requests
- **Cross-module compatibility** testing
- **Security scanning** for all modules
- **Automatic publishing** to npm on release

### Release Process
1. **Domain Module Release**: Independent release cycles
2. **Core Module Release**: Requires compatibility testing
3. **Breaking Changes**: Coordinated release with migration guide
4. **Security Updates**: Immediate release with patch version
