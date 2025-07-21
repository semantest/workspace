# ChatGPT Browser Extension

Enhance your ChatGPT experience with powerful productivity features and **industry-leading privacy protection**!

## 🎯 Quick Links
- 🏪 **[Install from Chrome Web Store](#installation)** (Coming Soon!)
- 📚 **[Documentation](./chrome-store/README.md)**
- 🔒 **[Privacy Policy](./chrome-store/PRIVACY_POLICY_SIMPLE.md)**
- ❓ **[FAQ](./chrome-store/FAQ.md)**

## 🚀 Latest Release: v1.0.1 (January 21, 2025)

### 🔒 Privacy-First Features in v1.0.1
- **Robust Consent System** - Your privacy choice is guaranteed to be seen
  - Automatic popup on first install
  - Retries every 30 seconds for 5 minutes if missed
  - Multiple fallback methods ensure you control your data
  - Persists across all sessions
- **Zero Default Collection** - No data collected without explicit consent
- **Clear Privacy Choice** - Simple Accept/Decline options
- **User Control** - Change your privacy settings anytime

### 🛡️ Security & Privacy
- **Security Score**: 90/100 (Excellent) ✅
- **Privacy Compliance**: GDPR/CCPA Ready ✅
- **Data Protection**: Your ChatGPT conversations NEVER leave your device
- **Telemetry**: Only with explicit consent, fully anonymous

### 🎯 Key Features
1. **📁 Project Organization** - Keep conversations organized by topic
2. **📝 Custom Instructions** - Personalize ChatGPT responses  
3. **💬 Smart Chat Creation** - Start chats with context
4. **⚡ Enhanced Prompts** - Templates and shortcuts
5. **🖼️ Image Management** - Better control over DALL-E images
6. **💾 Smart Downloads** - Intelligent file organization

## 📥 Installation

### From Chrome Web Store (Recommended)
```
1. Visit Chrome Web Store (link coming soon!)
2. Click "Add to Chrome"
3. Grant necessary permissions
4. Enjoy enhanced ChatGPT!
```

### Manual Installation (Development)
```bash
1. Clone this repository
2. Open Chrome → Extensions → Developer Mode
3. Click "Load unpacked"
4. Select `extension.chrome/build/` folder
```

## 🔐 Your Privacy Matters

### What We DON'T Collect:
- ❌ Your ChatGPT conversations
- ❌ Personal information
- ❌ Browsing history
- ❌ Any data without consent

### What We Collect (Only with Consent):
- ✅ Anonymous error reports
- ✅ Feature usage statistics
- ✅ Performance metrics

### Our Privacy Promise:
- You'll always see the consent choice (robust retry system)
- Your choice persists forever
- Change your mind anytime in Settings
- Extension works perfectly without any data collection

## 📊 Development Journey
From critical security failure to Chrome Web Store ready in one day:
- Morning: Security score 23/100 😱
- Afternoon: Fixed to 90/100 🎉
- Evening: v1.0.1 with full privacy compliance ✅
- **Time**: 6.5 hours of legendary teamwork!

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
