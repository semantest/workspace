# Semantest for ChatGPT

AI-powered automation extension for ChatGPT with advanced features like automated image generation, smart downloads, and WebSocket integration.

## Features

- 🎨 **Automated Image Generation**: Generate images via WebSocket commands
- 🤖 **Smart Interactions**: Automated chat interactions and responses
- 📥 **Download Management**: Automatic download of generated images
- 🔄 **WebSocket Integration**: Real-time communication with Semantest server
- 🚀 **High Performance**: Optimized for ChatGPT's interface

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/semantest/semantest-chatgpt.git
cd semantest-chatgpt
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### From Chrome Web Store

Coming soon!

## Usage

### Basic Setup

1. Start the Semantest WebSocket server:
```bash
cd semantest-server
npm start
```

2. Navigate to [ChatGPT](https://chat.openai.com)

3. The extension will automatically connect and be ready for automation

### Image Generation

Send a WebSocket message to generate images:

```javascript
// Example WebSocket message
{
  "type": "semantest/custom/image/download/requested",
  "payload": {
    "text": "A beautiful sunset over mountains",
    "metadata": {
      "filename": "sunset-mountains.png"
    }
  }
}
```

Or use the CLI:
```bash
./generate-image-async.sh "A beautiful sunset over mountains"
```

### API

The extension exposes these objects in the ChatGPT page context:

- `window.chatGPTAddon` - Main addon interface
- `window.semantestBridge` - Communication bridge
- `window.imageGenerationQueue` - Queue management

## Development

### Project Structure

```
semantest-chatgpt/
├── src/
│   ├── background/     # Service worker
│   ├── content/        # Content scripts
│   ├── addon/          # Main addon code
│   └── popup/          # Extension popup
├── manifest.json       # Extension manifest
└── webpack.config.js   # Build configuration
```

### Development Mode

Run in watch mode for development:
```bash
npm run dev
```

### Testing

Run tests:
```bash
npm test
```

### Building for Production

```bash
npm run build
npm run package  # Creates .zip for Chrome Web Store
```

## Architecture

This extension is built using the Semantest-powered extensions architecture:

1. **Service Worker**: Handles WebSocket connections and message routing
2. **Content Script**: Bridges communication between service worker and page
3. **Addon Bundle**: Runs in page context with full ChatGPT access
4. **No Dynamic Loading**: All code is bundled to avoid CSP restrictions

## Troubleshooting

### Extension Not Working

1. Check that the WebSocket server is running
2. Verify you're on a ChatGPT tab
3. Check the console for errors
4. Try reloading the tab

### WebSocket Not Connecting

1. Ensure server is running on `ws://localhost:3004`
2. Check firewall settings
3. Look for connection errors in service worker console

### Images Not Generating

1. Ensure ChatGPT is ready (not typing or processing)
2. Check that image generation is available in your ChatGPT plan
3. Look for errors in the page console

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- [GitHub Issues](https://github.com/semantest/semantest-chatgpt/issues)
- [Documentation](https://github.com/semantest/workspace)
- [Discord Community](https://discord.gg/semantest)