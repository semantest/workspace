# Semantest Workspace

This directory contains all Semantest repositories for local development.

## Repositories

### TypeScript-EDA Framework (under typescript-eda organization)
- `domain/` - Core domain primitives (Entity, Event, ValueObject)
- `infrastructure/` - Infrastructure adapters and ports
- `application/` - Application layer orchestration

### Browser Automation (under semantest organization)
- `browser/` - Core browser automation framework  
- `nodejs.server/` - Node.js server component
- `extension.chrome/` - Chrome browser extension

### Website Implementations
- `google.com/` - Google search automation
- `chatgpt.com/` - ChatGPT automation

### SDKs and Tools
- `typescript.client/` - TypeScript client SDK
- `docs/` - Documentation site
- `deploy/` - Deployment configurations

## Quick Start

### Repository URLs

**Main Workspace**
- 🏠 **Workspace**: https://github.com/semantest/workspace

**Core Components**
- 🌐 **Browser Framework**: https://github.com/semantest/browser
- 🖥️ **Node.js Server**: https://github.com/semantest/nodejs.server
- 🧩 **Chrome Extension**: https://github.com/semantest/extension.chrome

**Website Implementations**
- 🔍 **Google Automation**: https://github.com/semantest/google.com
- 💬 **ChatGPT Automation**: https://github.com/semantest/chatgpt.com

**Client SDKs**
- 📦 **TypeScript Client**: https://github.com/semantest/typescript.client

**Documentation & Deployment**
- 📚 **Documentation**: https://github.com/semantest/docs
- 🚀 **Deployment Configs**: https://github.com/semantest/deploy

**TypeScript-EDA Framework** (separate organization)
- 🏗️ **Domain**: https://github.com/typescript-eda/domain
- 🔧 **Infrastructure**: https://github.com/typescript-eda/infrastructure
- 📱 **Application**: https://github.com/typescript-eda/application

### Installation

```bash
# Install dependencies in all repositories
for repo in */; do
  echo "Installing dependencies in $repo"
  cd "$repo"
  npm install
  cd ..
done
```

## Development

Each repository can be developed independently. See individual repository READMEs for specific instructions.

## Publishing

Each repository has its own CI/CD pipeline that publishes to npm when changes are pushed to main.
