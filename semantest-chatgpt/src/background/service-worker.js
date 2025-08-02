/**
 * Semantest for ChatGPT - Service Worker
 * Handles WebSocket communication and message routing
 */

console.log('🚀 Semantest for ChatGPT starting...');

// Extension state
const state = {
  wsConnected: false,
  activeTab: null
};

// WebSocket connection
class WebSocketHandler {
  constructor() {
    this.ws = null;
    this.serverUrl = 'ws://localhost:3004';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    console.log(`Connecting to ${this.serverUrl}...`);
    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      state.wsConnected = true;
      this.reconnectAttempts = 0;
      this.updateBadge(true);
    };

    this.ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message:', message);
        await this.handleMessage(message);
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      state.wsConnected = false;
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      state.wsConnected = false;
      this.updateBadge(false);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting in ${this.reconnectDelay}ms... (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      }
    };
  }

  async handleMessage(message) {
    // Handle nested event structure
    if (message.type === 'event' && message.payload) {
      const eventType = message.payload.type;
      const eventPayload = message.payload.payload;

      if (eventType === 'semantest/custom/image/download/requested') {
        await this.handleImageRequest(eventPayload);
      }
    }
    
    // Direct format for backwards compatibility
    if (message.type === 'semantest/custom/image/download/requested') {
      await this.handleImageRequest(message.payload);
    }
  }

  async handleImageRequest(payload) {
    console.log('🎨 Handling image request:', payload);

    // Get active ChatGPT tab
    const tabs = await chrome.tabs.query({
      url: ['*://chat.openai.com/*', '*://chatgpt.com/*']
    });

    if (tabs.length === 0) {
      console.error('No ChatGPT tabs found');
      return;
    }

    const targetTab = tabs.find(tab => tab.active) || tabs[0];
    
    // Send to content script
    try {
      await chrome.tabs.sendMessage(targetTab.id, {
        type: 'websocket:message',
        payload: {
          type: 'semantest/custom/image/download/requested',
          payload: payload
        }
      });
      console.log('✅ Message sent to tab');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  updateBadge(connected) {
    if (connected) {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setBadgeBackgroundColor({ color: '#00AA00' });
    } else {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        id: `msg-${Date.now()}`,
        type: 'event',
        timestamp: Date.now(),
        payload: {
          type: data.type,
          payload: data.payload || data.data
        }
      };
      
      this.ws.send(JSON.stringify(message));
    }
  }

  getStatus() {
    return {
      connected: state.wsConnected,
      serverUrl: this.serverUrl,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create WebSocket instance
const wsHandler = new WebSocketHandler();

// Message handling from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.type);

  (async () => {
    switch (request.type) {
      case 'WEBSOCKET_STATUS':
        sendResponse(wsHandler.getStatus());
        break;

      case 'WEBSOCKET_CONNECT':
        wsHandler.connect();
        sendResponse({ success: true });
        break;

      case 'addon:response':
        wsHandler.send({
          type: 'addon:response',
          data: request
        });
        sendResponse({ success: true });
        break;

      case 'ping':
        sendResponse({ pong: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();

  return true; // Keep channel open for async response
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  wsHandler.connect();
});

// Startup handler
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  wsHandler.connect();
});

// Keep service worker alive
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Start WebSocket connection
wsHandler.connect();

console.log('✅ Semantest for ChatGPT ready');