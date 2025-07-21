# Changelog

All notable changes to the ChatGPT Browser Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-21

### 🎉 Highlights
- **Chrome Web Store Ready**: Security score improved from 23/100 to 75/100
- **Beta Launch**: Comprehensive documentation and user guides
- **Security Hardening**: Enhanced permissions and CSP implementation

### ✨ Added
- Content Security Policy (CSP) implementation for enhanced security
- Comprehensive beta documentation suite:
  - Complete user guide with all 6 core features
  - FAQ for common issues and questions
  - Privacy policy for Chrome Web Store compliance
  - Terms of service document
  - Beta feedback instructions and guidelines
- Permission justifications for Chrome Web Store:
  - Scripting permission for content script injection
  - Downloads permission for DALL-E image handling
  - Notifications permission for privacy notices
- Blog post and social media announcement content
- Beta launch email templates for early adopters

### 🔒 Security
- Fixed host_permissions configuration
- Improved security score from 23 to 75 out of 100
- Added proper permission justifications for all requested permissions
- Implemented secure content policies

### 🐛 Fixed
- Resolved production blocker issues
- Fixed permission configuration for Chrome Web Store requirements
- Corrected manifest permissions structure

### 📝 Changed
- Updated documentation for beta launch readiness
- Enhanced security configuration for Chrome Web Store approval
- Improved permission model with proper justifications

### 🚧 Known Issues
- `window.extensionTestData` needs to be removed (security concern)
- Storage encryption pending implementation
- Sync delays of 30-60 seconds (improvement to 5-10 seconds planned)
- Project limit of 50 per account (beta limitation)

### 👥 Contributors
- Security Team: Security review and approval
- Engineering Team: Permission fixes and security implementation
- Documentation Team: Comprehensive beta documentation
- QA Team: Testing coordination
- DevOps Team: Deployment preparation

---

## [1.0.0] - 2025-01-20

### ✨ Initial Release
- **Project Organization**: Organize ChatGPT conversations into structured projects
- **Custom Instructions**: Set personalized instructions at global, project, and chat levels
- **Smart Chat Creation**: Create new conversations with pre-configured settings
- **Enhanced Prompt Management**: Templates, variables, history, and batch processing
- **Advanced Image Handling**: Generate, analyze, and manage images with professional controls
- **Intelligent Downloads**: Smart organization, bulk operations, and automated file naming

### 🚀 Features
1. **Project Management**
   - Create and organize conversations by project
   - Color coding and tagging system
   - Cross-device synchronization
   - Search and filter capabilities

2. **Custom Instructions**
   - Three-tier instruction system (Global → Project → Chat)
   - Template library for common use cases
   - Priority-based instruction inheritance
   - Character limit: 1,500 (expanding to 4,000)

3. **Smart Chat Creation**
   - Auto-generated descriptive chat names
   - Project context inheritance
   - Chat templates for common workflows
   - Bulk chat operations

4. **Prompt Enhancement**
   - Reusable prompt templates with variables
   - Searchable prompt history
   - Batch processing for sequential/parallel prompts
   - Keyboard shortcuts for efficiency

5. **Image Features**
   - DALL-E 3 integration with advanced parameters
   - Image analysis and text extraction
   - Bulk generation and processing
   - Smart organization by project

6. **Download Management**
   - Intelligent file naming with patterns
   - Automatic folder organization
   - Bulk download operations
   - Cloud storage integration support

### 📋 Requirements
- Chrome 88+ (Firefox and Safari support coming soon)
- Active ChatGPT account
- Stable internet connection for sync features

### 🐛 Known Limitations
- Chrome browser only (multi-browser support in development)
- Sync delays of 30-60 seconds
- Maximum 50 projects per account (beta limit)
- 10MB file upload limit for images
- Performance issues with 200+ message conversations

### 🔗 Links
- Beta Portal: https://beta.chatgpt-extension.com
- Documentation: https://beta-docs.chatgpt-extension.com
- Support: beta-support@chatgpt-extension.com
- Discord: https://discord.gg/chatgpt-beta

---

[1.1.0]: https://github.com/semantest/workspace/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/semantest/workspace/releases/tag/v1.0.0