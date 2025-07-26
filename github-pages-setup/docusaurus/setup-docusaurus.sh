#!/bin/bash

# Setup script for Docusaurus v3 on semantest.github.io

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Semantest Docusaurus Setup ===${NC}"
echo ""

# Repository details
ORG="semantest"
REPO="${ORG}.github.io"

echo -e "${GREEN}Creating Docusaurus structure for ${REPO}...${NC}"

# Initialize git repository
git init
git remote add origin "https://github.com/${ORG}/${REPO}.git"

# Create necessary directories
mkdir -p docs/{overview,architecture,getting-started,components,developer-guide,api,deployment,resources}
mkdir -p src/{components/HomepageFeatures,css,pages}
mkdir -p static/img
mkdir -p blog

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
/node_modules

# Production
/build

# Generated files
.docusaurus
.cache-loader

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea
.vscode
*.swp
*.swo
*~
EOF

# Create initial documentation
cat > docs/overview.md << 'EOF'
---
id: overview
title: Overview
sidebar_position: 1
---

# Semantest Overview

Welcome to Semantest - a modular, domain-driven testing framework for browser automation and distributed test execution.

## What is Semantest?

Semantest is a comprehensive testing framework designed to handle complex browser automation scenarios with:

- **Domain-Driven Architecture**: Each website/service gets its own isolated module
- **Real-Time Communication**: WebSocket-based event streaming
- **Distributed Execution**: Run tests across multiple browsers simultaneously
- **Enterprise Security**: Built-in authentication and authorization
- **Flexible Integration**: TypeScript SDK and CLI tools

## Key Features

### 🧩 Modular Architecture
Each domain (website) is completely isolated with its own:
- Business logic
- Application services
- Infrastructure adapters
- Event definitions

### 🌐 Distributed Testing
- Execute tests across multiple browser instances
- Real-time coordination via WebSocket
- Automatic failover between local and cloud execution
- Queue persistence for crash recovery

### 📡 WebSocket Protocol
- Bidirectional communication
- Event-driven architecture
- Real-time test status updates
- Streaming results

### 🔧 Developer Experience
- TypeScript-first development
- Comprehensive CLI tooling
- Rich SDK for custom integrations
- Extensive documentation

## Next Steps

- [Installation Guide](/docs/getting-started/installation)
- [Quick Start Tutorial](/docs/getting-started/quick-start)
- [Architecture Overview](/docs/architecture/introduction)
EOF

# Create README
cat > README.md << 'EOF'
# Semantest Documentation

This repository contains the official documentation for Semantest, hosted at https://semantest.github.io

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Contributing

See our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute to the documentation.

## License

MIT License - see LICENSE file for details.
EOF

echo -e "${GREEN}✅ Docusaurus structure created!${NC}"
echo ""
echo "Next steps:"
echo "1. Create the repository at https://github.com/${ORG}/${REPO}"
echo "2. Run: npm install"
echo "3. Run: npm start (for local development)"
echo "4. Push to GitHub: git push -u origin main"
echo "5. GitHub Actions will automatically deploy to GitHub Pages"