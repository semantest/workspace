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
