#!/bin/bash

# Setup script for semantest.github.io repository
# This script helps initialize the GitHub Pages organization site

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Organization details
ORG_NAME="semantest"
REPO_NAME="${ORG_NAME}.github.io"
REPO_URL="https://github.com/${ORG_NAME}/${REPO_NAME}"

echo -e "${BLUE}=== Semantest GitHub Pages Setup ===${NC}"
echo -e "${BLUE}Organization: ${ORG_NAME}${NC}"
echo -e "${BLUE}Repository: ${REPO_NAME}${NC}"
echo -e "${BLUE}Site URL: https://${REPO_NAME}${NC}"
echo ""

# Step 1: Check if repository exists
echo -e "${GREEN}Step 1: Checking if repository exists...${NC}"
if git ls-remote "$REPO_URL" &> /dev/null; then
    echo -e "${YELLOW}Repository already exists. Cloning...${NC}"
    git clone "$REPO_URL" "$REPO_NAME"
    cd "$REPO_NAME"
else
    echo -e "${YELLOW}Repository does not exist.${NC}"
    echo -e "${RED}Please create the repository '${REPO_NAME}' in the ${ORG_NAME} organization.${NC}"
    echo ""
    echo "Instructions:"
    echo "1. Go to https://github.com/organizations/${ORG_NAME}/repositories/new"
    echo "2. Repository name MUST be: ${REPO_NAME}"
    echo "3. Make it public"
    echo "4. Initialize with README"
    echo "5. Run this script again after creating the repository"
    exit 1
fi

# Step 2: Set up basic structure
echo -e "${GREEN}Step 2: Setting up basic structure...${NC}"

# Create directories
mkdir -p .github/workflows
mkdir -p _docs/{getting-started,api,guides,tutorials}
mkdir -p assets/{css,js,images}
mkdir -p _includes
mkdir -p _layouts
mkdir -p _sass

# Copy configuration files
cp ../_config.yml .
cp ../Gemfile .
cp ../deploy.yml .github/workflows/
cp ../README.md _docs/

# Step 3: Create initial content
echo -e "${GREEN}Step 3: Creating initial content...${NC}"

# Create index page
cat > index.md << 'EOF'
---
layout: home
title: Home
nav_order: 1
description: "Semantest - A modular, domain-driven testing framework"
permalink: /
---

# Semantest Documentation
{: .fs-9 }

A modular, domain-driven testing framework for browser automation and distributed test execution.
{: .fs-6 .fw-300 }

[Get started now](#getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } [View on GitHub](https://github.com/semantest/workspace){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Getting Started

Welcome to Semantest! This documentation will help you get up and running with our testing framework.

### Quick Installation

```bash
npm install -g @semantest/cli
semantest init my-project
```

### Features

- 🧩 **Modular Architecture** - Domain-driven design with isolated modules
- 🌐 **Distributed Testing** - Execute tests across multiple browser instances
- 📡 **WebSocket Protocol** - Real-time communication and event streaming
- 🔧 **CLI Tool** - Powerful command-line interface for test orchestration
- 📦 **SDK Packages** - TypeScript client libraries for custom integrations
- 🔒 **Enterprise Security** - Built-in security patterns and authentication

---

## Documentation

<div class="grid">
  <div class="col-4">
    <h3>📚 Guides</h3>
    <p>Step-by-step guides for common tasks</p>
    <a href="/guides/">Browse Guides →</a>
  </div>
  <div class="col-4">
    <h3>📖 API Reference</h3>
    <p>Complete API documentation</p>
    <a href="/api/">View API Docs →</a>
  </div>
  <div class="col-4">
    <h3>🎓 Tutorials</h3>
    <p>Learn by building real projects</p>
    <a href="/tutorials/">Start Learning →</a>
  </div>
</div>
EOF

# Create 404 page
cat > 404.html << 'EOF'
---
permalink: /404.html
layout: default
---

<style type="text/css" media="screen">
  .container {
    margin: 10px auto;
    max-width: 600px;
    text-align: center;
  }
  h1 {
    margin: 30px 0;
    font-size: 4em;
    line-height: 1;
    letter-spacing: -1px;
  }
</style>

<div class="container">
  <h1>404</h1>
  <p><strong>Page not found :(</strong></p>
  <p>The requested page could not be found.</p>
  <p><a href="/">Return to documentation home</a></p>
</div>
EOF

# Step 4: Initialize Git
echo -e "${GREEN}Step 4: Initializing Git...${NC}"
git add .
git commit -m "Initial GitHub Pages setup for Semantest documentation

- Jekyll configuration with Just the Docs theme
- GitHub Actions workflow for automated deployment
- Basic documentation structure
- Search functionality enabled
- Multi-collection support for docs, API, guides, and tutorials"

# Step 5: Set up branch protection (instructions)
echo -e "${GREEN}Step 5: Branch Protection Setup${NC}"
echo "Please configure branch protection rules for the 'main' branch:"
echo "1. Go to: https://github.com/${ORG_NAME}/${REPO_NAME}/settings/branches"
echo "2. Add rule for 'main' branch with:"
echo "   - Require pull request reviews (1 approval)"
echo "   - Dismiss stale pull request approvals"
echo "   - Require status checks (GitHub Pages build)"
echo "   - Require branches to be up to date"
echo "   - Include administrators"

# Step 6: Enable GitHub Pages
echo -e "${GREEN}Step 6: GitHub Pages Configuration${NC}"
echo "Please enable GitHub Pages:"
echo "1. Go to: https://github.com/${ORG_NAME}/${REPO_NAME}/settings/pages"
echo "2. Source: Deploy from a branch"
echo "3. Branch: main"
echo "4. Folder: / (root)"
echo "5. Click Save"

# Step 7: Custom domain (optional)
echo -e "${GREEN}Step 7: Custom Domain (Optional)${NC}"
echo "To set up a custom domain:"
echo "1. Add a CNAME file with your domain"
echo "2. Configure DNS records:"
echo "   - A records: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153"
echo "   - CNAME record: ${ORG_NAME}.github.io"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}Repository will be available at: https://${REPO_NAME}${NC}"
echo ""
echo "Next steps:"
echo "1. Push to remote: git push origin main"
echo "2. Wait for GitHub Actions to deploy"
echo "3. Visit https://${REPO_NAME} to see your site"