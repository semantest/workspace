# Semantest Test Package

This is a test package for the Semantest → Semantest migration script.

## About Web-Buddy

Web-Buddy is a comprehensive automation framework for web applications. It provides:

- **semantest** core functionality
- **@semantest/client** for API integration
- **chatgpt-semantest** for AI interactions
- **google-semantest** for search automation

## Features

### Core Semantest Features
- Browser automation with semantest engine
- Event-driven architecture via semantest framework
- Plugin system for semantest extensions

### Module-Specific Features
- **ChatGPT-Buddy**: AI conversation automation
- **Google-Buddy**: Search and image automation
- **Web-Buddy Framework**: Core automation engine

## Installation

```bash
npm install @semantest/client
npm install semantest
```

## Usage

```typescript
import { Semantest } from '@semantest/client';

const webBuddy = new Semantest({
  // semantest configuration
});

// Initialize chatgpt-semantest
const chatgptBuddy = webBuddy.plugin('chatgpt-semantest');

// Initialize google-semantest  
const googleBuddy = webBuddy.plugin('google-semantest');
```

## Configuration

Create a `semantest.config.js` file:

```javascript
module.exports = {
  semantest: {
    port: 3000,
    host: 'localhost'
  },
  'chatgpt-semantest': {
    apiKey: process.env.CHATGPT_BUDDY_API_KEY
  },
  'google-semantest': {
    enabled: true
  }
};
```

## API Reference

### Semantest Class

The main `Semantest` class provides:

- `webBuddy.connect()` - Connect to semantest server
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

- **GitHub**: https://github.com/rydnr/semantest
- **Documentation**: https://docs.semantest.dev
- **Discord**: https://discord.gg/semantest
- **NPM**: https://www.npmjs.com/package/@semantest/client

## Security

⚠️ **Important**: Never commit your buddy API keys or secrets to version control!

## License

MIT - See LICENSE file for details.

---

**Note**: This is a test file for migration script validation. It contains various buddy patterns that should be replaced during the Semantest → Semantest migration.