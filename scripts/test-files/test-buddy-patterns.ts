/**
 * Test file for buddy pattern replacement
 * Contains various buddy variations for testing migration script
 */

// PascalCase variations
export class WebBuddy {
  private webBuddy: any;
  
  constructor(webBuddy: any) {
    this.webBuddy = webBuddy;
  }
}

export class ChatGPTBuddy extends WebBuddy {
  // Class inheritance test
}

export class GoogleBuddy {
  // Google-specific buddy
}

// camelCase variations  
const webBuddy = new WebBuddy({});
const chatgptBuddy = new ChatGPTBuddy(webBuddy);
const googleBuddy = new GoogleBuddy();

// kebab-case variations
const config = {
  "web-buddy": {
    enabled: true,
    "chatgpt-buddy": {
      apiKey: "test"
    },
    "google-buddy": {
      enabled: false
    }
  }
};

// snake_case variations
const WEB_BUDDY_CONFIG = {
  WEB_BUDDY_ENABLED: true,
  CHATGPT_BUDDY_API_KEY: "test",
  GOOGLE_BUDDY_ENABLED: false
};

// Environment variables (SECURITY SENSITIVE - should NOT be replaced)
const WEB_BUDDY_API_KEY = process.env.WEB_BUDDY_API_KEY;
const WEB_BUDDY_SECRET = process.env.WEB_BUDDY_SECRET;
const WEB_BUDDY_TOKEN = process.env.WEB_BUDDY_TOKEN;
const WEB_BUDDY_PASSWORD = process.env.WEB_BUDDY_PASSWORD;
const WEB_BUDDY_CLIENT_SECRET = process.env.WEB_BUDDY_CLIENT_SECRET;
const BUDDY_SECRET = process.env.BUDDY_SECRET;

// NPM scope imports
import { WebBuddyClient } from '@web-buddy/client';
import { ChatGPTBuddyAdapter } from '@chatgpt-buddy/adapter';
import { GoogleBuddyService } from '@google-buddy/service';

// Property access
const client = {
  webbuddy: new WebBuddyClient(),
  chatgptbuddy: new ChatGPTBuddyAdapter(),
  googlebuddy: new GoogleBuddyService()
};

// String literals
const messages = {
  success: "web-buddy initialized successfully",
  error: "webbuddy connection failed",
  info: `ChatGPT buddy is ready`,
  warning: 'Google buddy not configured'
};

// Template literals
const status = `WebBuddy status: ${webBuddy.isConnected() ? 'connected' : 'disconnected'}`;

// URL paths
const endpoints = {
  api: '/api/web-buddy/status',
  buddy: '/buddy/health',
  chatgpt: '/chatgpt-buddy/messages',
  google: '/google-buddy/search'
};

// Comments
// WebBuddy initialization
/* web-buddy configuration */
/** @param {WebBuddy} buddy - The buddy instance */
// TODO: Update webbuddy configuration
// FIXME: web-buddy connection timeout

// Standalone buddy (should use wholeWord matching)
const buddy = getBuddy();
const myBuddy = buddy.clone();

// Edge cases (should NOT be replaced)
const studyBuddy = "learning companion";
const buddyList = ["friend1", "friend2"];
const somebody = "anyone";

// External URLs (should NOT be replaced)
const githubUrl = "https://github.com/rydnr/web-buddy";
const chatgptUrl = "https://github.com/rydnr/chatgpt-buddy";
const docsUrl = "https://docs.web-buddy.dev";

// File paths and domains (should NOT be replaced)
const externalDomain = "webbuddy.com";
const localhost = "//localhost:3000/buddy";

// Author attribution (should be flagged for manual review)
/**
 * @author web-buddy team
 * @fileoverview WebBuddy main module
 */

export { WebBuddy, webBuddy, config, WEB_BUDDY_CONFIG };