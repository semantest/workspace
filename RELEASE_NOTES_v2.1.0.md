# 🚀 Semantest v2.1.0 Release Notes

**Release Date:** September 12, 2025  
**Version:** 2.1.0  
**Codename:** Multi-Platform Harmony

## 📋 Executive Summary

Semantest v2.1.0 introduces comprehensive multi-platform AI integration, supporting ChatGPT, Claude.ai, and Google Gemini through a unified browser extension and event-driven architecture. This release focuses on expanding platform support while improving reliability and user experience.

## ✨ Major Features

### 🌐 Multi-Platform AI Support
- **ChatGPT/DALL-E**: Full image generation automation via OpenAI's platform
- **Claude.ai**: Text prompt automation for Anthropic's Claude
- **Google Gemini**: Built-in text2image generation support
- **Domain-based Routing**: Automatic detection and routing to appropriate AI service

### 🔧 Technical Improvements
- **Polling Architecture**: Replaced WebSocket with HTTP polling for improved reliability
- **Dynamic Script Injection**: Content scripts loaded on-demand based on target domain
- **Duplicate Prevention**: Global image tracking prevents re-downloading existing images
- **Async Message Handling**: Fixed channel closing errors with proper async responses

## 🧪 Test Coverage

### Test Scripts Included
- `send-image-request.js` - ChatGPT image generation testing
- `test-claude.js` - Claude.ai automation testing
- `test-gemini.js` - Google Gemini testing
- `test-google.js` - Generic Google AI services testing
- `send-to-domain.js` - Domain-based routing testing
- `start-semantest.sh` - One-command startup script

## 📦 Components

### Browser Extension (v2.1.0)
- **Manifest V3** compliant
- **Content Scripts**: 
  - `content-script.js` (ChatGPT)
  - `content-script-claude.js` (Claude.ai)
  - `content-script-google.js` (Google/Gemini)
- **Background Service**: `background-polling.js`
- **Permissions**: tabs, scripting, downloads, storage

### Node.js Server
- **Polling Server**: `semantest-polling-server.js`
- **Event Store**: Event-driven architecture support
- **HTTP API**: RESTful endpoints for event submission

## 🔄 Migration Guide

### From v2.0.x to v2.1.0

1. **Update Extension**:
   ```bash
   # Reload extension in Chrome
   chrome://extensions/ → Developer mode → Reload
   ```

2. **Start Services**:
   ```bash
   ./start-semantest.sh
   ```

3. **Test Platform**:
   ```bash
   # Test ChatGPT
   node send-image-request.js "A beautiful sunset"
   
   # Test Claude
   node test-claude.js "Tell me a joke"
   
   # Test Gemini
   node test-gemini.js "Create an image of a mountain"
   ```

## 🐛 Bug Fixes

- Fixed duplicate image downloads when multiple images exist
- Resolved "message channel closed" errors in Chrome extension
- Improved textarea and contenteditable detection across platforms
- Enhanced button detection for submit/send actions
- Fixed async message handling in content scripts

## 📊 Performance Improvements

- Reduced polling interval to 2 seconds for faster response
- Optimized image detection with Set-based tracking
- Improved content script injection efficiency
- Better memory management with global state handling

## 🔒 Security Considerations

- All communications use localhost (no external APIs)
- No credentials or API keys stored in extension
- Content scripts isolated per domain
- Manifest V3 security model enforced

## 🚦 Known Issues

- GPG signing requires manual passphrase entry (not available in CI)
- Some Google AI tools may have different DOM structures
- Canvas-based images require special handling for downloads

## 🎯 Future Roadmap

### v2.2.0 (Planned)
- Midjourney integration
- Stable Diffusion support
- Batch processing capabilities
- WebSocket reconnection logic

### v2.3.0 (Planned)
- Multi-tab coordination
- Cloud storage integration
- API key management UI
- Advanced prompt templates

## 👥 Contributors

- **Development**: Claude Code + Human collaboration
- **Testing**: Automated test suite
- **Documentation**: TDD-emoji commit style

## 📝 Commit Style Guide

This project uses TDD-emoji commits:
- ✨ `feat`: New features
- 🔥 `fix`: Bug fixes
- ✅ `test`: Test additions
- 🚀 `perf`: Performance improvements
- 📦 `chore`: Maintenance tasks
- 🧪 `test`: Test implementations
- 📚 `docs`: Documentation

## 🤖 Generated with Claude Code

This release was developed with AI-assisted programming using Claude Code, demonstrating the future of human-AI collaboration in software development.

---

**Co-Authored-By:** Claude <noreply@anthropic.com>