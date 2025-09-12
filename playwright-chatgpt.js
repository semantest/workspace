#!/usr/bin/env node

/**
 * Playwright ChatGPT Automation
 * Direct browser control for image generation
 */

const { chromium } = require('playwright');

class ChatGPTAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch(options = {}) {
    console.log('🚀 Launching browser...');
    
    // Launch with persistent context to maintain login
    this.context = await chromium.launchPersistentContext(
      options.userDataDir || './browser-data',
      {
        headless: false,
        viewport: { width: 1280, height: 800 },
        ...options
      }
    );
    
    // Get or create page
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    
    console.log('✅ Browser launched');
    return this.page;
  }

  async navigateToChatGPT() {
    console.log('📍 Navigating to ChatGPT...');
    await this.page.goto('https://chatgpt.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for page to stabilize
    await this.page.waitForTimeout(2000);
    
    // Check if logged in
    const isLoggedIn = await this.checkLoginStatus();
    
    if (!isLoggedIn) {
      console.log('⚠️ Not logged in. Please log in manually.');
      console.log('   Waiting for login...');
      
      // Wait for user to log in (detect when textarea appears)
      await this.page.waitForSelector('textarea[placeholder*="Message"]', {
        timeout: 300000 // 5 minutes to log in
      });
      
      console.log('✅ Login detected');
    } else {
      console.log('✅ Already logged in');
    }
  }

  async checkLoginStatus() {
    try {
      // Check if the message textarea exists
      const textarea = await this.page.$('textarea[placeholder*="Message"]');
      return textarea !== null;
    } catch {
      return false;
    }
  }

  async sendPrompt(prompt) {
    console.log('📝 Sending prompt:', prompt);
    
    // Find the textarea
    const textarea = await this.page.waitForSelector(
      'textarea[placeholder*="Message"]',
      { timeout: 10000 }
    );
    
    // Clear and type
    await textarea.click();
    await textarea.fill('');
    await textarea.type(prompt, { delay: 50 });
    
    // Wait a bit for the UI to update
    await this.page.waitForTimeout(500);
    
    // Find and click send button
    const sendButton = await this.page.$('button[data-testid="send-button"]') ||
                      await this.page.$('button[aria-label*="Send"]');
    
    if (sendButton) {
      const isDisabled = await sendButton.isDisabled();
      if (!isDisabled) {
        console.log('🚀 Clicking send button...');
        await sendButton.click();
        return true;
      } else {
        console.error('❌ Send button is disabled');
        return false;
      }
    } else {
      console.error('❌ Send button not found');
      return false;
    }
  }

  async waitForImage(timeout = 120000) {
    console.log('👀 Waiting for image generation...');
    
    try {
      // Wait for image to appear
      const image = await this.page.waitForSelector(
        'img[src*="dalle"], img[src*="oaiusercontent"]',
        { timeout }
      );
      
      if (image) {
        const src = await image.getAttribute('src');
        console.log('✅ Image generated:', src);
        return src;
      }
    } catch (error) {
      console.error('⏱️ Timeout waiting for image');
      return null;
    }
  }

  async downloadImage(imageUrl, outputPath) {
    console.log('📥 Downloading image...');
    
    try {
      // Get the image as buffer
      const response = await this.page.request.get(imageUrl);
      const buffer = await response.body();
      
      // Save to file
      const fs = require('fs');
      const path = require('path');
      
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, buffer);
      console.log('✅ Image saved to:', outputPath);
      return true;
    } catch (error) {
      console.error('❌ Download failed:', error);
      return false;
    }
  }

  async generateImage(prompt, outputPath = 'output.png') {
    console.log('🎨 Starting image generation...');
    
    // Send the prompt
    const sent = await this.sendPrompt(prompt);
    if (!sent) {
      console.error('Failed to send prompt');
      return false;
    }
    
    // Wait for image
    const imageUrl = await this.waitForImage();
    if (!imageUrl) {
      console.error('No image generated');
      return false;
    }
    
    // Download the image
    const downloaded = await this.downloadImage(imageUrl, outputPath);
    return downloaded;
  }

  async close() {
    if (this.context) {
      await this.context.close();
      console.log('👋 Browser closed');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
ChatGPT Image Generation with Playwright

Usage:
  node playwright-chatgpt.js "<prompt>" [output-file] [--keep-open]

Examples:
  node playwright-chatgpt.js "A beautiful sunset"
  node playwright-chatgpt.js "A cat wearing a hat" cat.png
  node playwright-chatgpt.js "A mountain landscape" landscape.png --keep-open

Options:
  --keep-open    Keep browser open after generation
  --help         Show this help message
    `);
    process.exit(0);
  }
  
  const prompt = args[0];
  const outputFile = args[1] || `image_${Date.now()}.png`;
  const keepOpen = args.includes('--keep-open');
  
  const automation = new ChatGPTAutomation();
  
  try {
    // Launch browser
    await automation.launch();
    
    // Navigate to ChatGPT
    await automation.navigateToChatGPT();
    
    // Generate image
    const success = await automation.generateImage(prompt, outputFile);
    
    if (success) {
      console.log('✅ Image generation complete!');
    } else {
      console.error('❌ Image generation failed');
    }
    
    if (!keepOpen) {
      await automation.close();
    } else {
      console.log('Browser will remain open. Press Ctrl+C to exit.');
    }
    
  } catch (error) {
    console.error('Error:', error);
    await automation.close();
    process.exit(1);
  }
}

// Export for use as module
module.exports = ChatGPTAutomation;

// Run if called directly
if (require.main === module) {
  main();
}