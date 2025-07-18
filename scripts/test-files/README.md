# WebBuddy Test Package

This is a test package for the WebBuddy → Semantest migration script.

## About Web-Buddy

Web-Buddy is a comprehensive automation framework for web applications. It provides:

- **webbuddy** core functionality
- **@web-buddy/client** for API integration
- **chatgpt-buddy** for AI interactions
- **google-buddy** for search automation

## Features

### Core WebBuddy Features
- Browser automation with webbuddy engine
- Event-driven architecture via web-buddy framework
- Plugin system for web-buddy extensions

### Module-Specific Features
- **ChatGPT-Buddy**: AI conversation automation
- **Google-Buddy**: Search and image automation
- **Web-Buddy Framework**: Core automation engine

## Installation

```bash
npm install @web-buddy/client
npm install webbuddy
```

## Usage

```typescript
import { WebBuddy } from '@web-buddy/client';

const webBuddy = new WebBuddy({
  // web-buddy configuration
});

// Initialize chatgpt-buddy
const chatgptBuddy = webBuddy.plugin('chatgpt-buddy');

// Initialize google-buddy  
const googleBuddy = webBuddy.plugin('google-buddy');
```

## Configuration

Create a `web-buddy.config.js` file:

```javascript
module.exports = {
  webbuddy: {
    port: 3000,
    host: 'localhost'
  },
  'chatgpt-buddy': {
    apiKey: process.env.CHATGPT_BUDDY_API_KEY
  },
  'google-buddy': {
    enabled: true
  }
};
```

## API Reference

### WebBuddy Class

The main `WebBuddy` class provides:

- `webBuddy.connect()` - Connect to web-buddy server
- `webBuddy.plugin(name)` - Load buddy plugin
- `webBuddy.automation()` - Start automation

### Buddy Plugins

All buddy plugins inherit from the base `Buddy` class:

```typescript
class Buddy {
  // Base buddy functionality
}

class ChatGPTBuddy extends Buddy {
  // ChatGPT-specific buddy features
}
```

## External Links

- **GitHub**: https://github.com/rydnr/web-buddy
- **Documentation**: https://docs.web-buddy.dev
- **Discord**: https://discord.gg/web-buddy
- **NPM**: https://www.npmjs.com/package/@web-buddy/client

## Security

⚠️ **Important**: Never commit your buddy API keys or secrets to version control!

## License

MIT - See LICENSE file for details.

---

**Note**: This is a test file for migration script validation. It contains various buddy patterns that should be replaced during the WebBuddy → Semantest migration.