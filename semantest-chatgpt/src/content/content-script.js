/**
 * Semantest for ChatGPT - Content Script
 * Bridges communication between service worker and page scripts
 */

console.log('🌉 Semantest content script initializing...');

// Bridge for ISOLATED world
class ContentBridge {
  constructor() {
    this.setupListeners();
    this.injectAddon();
  }

  setupListeners() {
    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Content script received:', request.type);

      if (request.type === 'ping') {
        sendResponse({ bridge: 'active' });
        return;
      }

      if (request.type === 'websocket:message') {
        this.forwardToAddon(request.payload);
        sendResponse({ success: true });
      }

      return true;
    });

    // Listen for messages from addon (MAIN world)
    window.addEventListener('semantest-response', (event) => {
      console.log('📤 Forwarding addon response to service worker');
      chrome.runtime.sendMessage({
        type: 'addon:response',
        ...event.detail
      });
    });
  }

  forwardToAddon(message) {
    console.log('🔄 Forwarding to addon:', message);

    // Create a DOM element to pass message to MAIN world
    const messageElement = document.createElement('div');
    messageElement.id = 'semantest-message-' + Date.now();
    messageElement.style.display = 'none';
    messageElement.textContent = JSON.stringify(message);
    document.body.appendChild(messageElement);
    
    // Signal that message is ready
    messageElement.setAttribute('data-message-ready', 'true');
  }

  injectAddon() {
    // Inject the addon bundle into the page
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/addon.js');
    script.onload = () => {
      console.log('✅ Addon injected');
      script.remove();
    };
    script.onerror = (error) => {
      console.error('❌ Failed to inject addon:', error);
    };
    
    (document.head || document.documentElement).appendChild(script);
  }
}

// Initialize bridge
const bridge = new ContentBridge();

console.log('✅ Semantest content script ready');