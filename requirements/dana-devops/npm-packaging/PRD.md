# Product Requirements Document: NPM Package Publishing

## Overview
Set up automated npm package publishing for the Semantest SDK and related packages to enable easy distribution and versioning.

## Goals
- Publish @semantest/sdk to npm registry
- Automate version management
- Enable secure, authenticated publishing
- Support both stable and beta releases

## Requirements

### Package Structure
1. **Main SDK Package (@semantest/sdk)**
   - Core functionality for test automation
   - TypeScript definitions included
   - Browser and Node.js compatible

2. **Extension Helper (@semantest/extension-helper)**
   - Utilities for Chrome extension integration
   - Lightweight bundle

3. **CLI Tool (@semantest/cli)**
   - Command-line interface
   - Global installation support

### Publishing Requirements
- Semantic versioning (semver)
- Automated changelog generation
- Pre-publish validation
- License and README inclusion
- TypeScript declaration files

### Security Requirements
- NPM_TOKEN secure storage
- 2FA for manual publishes
- Scoped package namespace
- Vulnerability scanning

### Automation Requirements
- Tag-based releases (v*)
- Beta releases from develop branch
- Dry-run capability
- Rollback procedures

## Success Criteria
- Packages published to npm successfully
- Installation works globally
- TypeScript support verified
- Security audit passing
- Documentation complete

## Timeline
- Setup and configuration: 4 hours
- Initial publish: 2 hours
- Automation setup: 4 hours
- Testing and validation: 2 hours