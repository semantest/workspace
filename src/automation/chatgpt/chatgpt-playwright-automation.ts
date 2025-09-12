/*
                        Semantest - ChatGPT Playwright Automation
                        MCP-based implementation for ChatGPT image generation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

export interface ChatGPTAutomationConfig {
    headless?: boolean;
    userDataDir?: string;
    viewport?: { width: number; height: number };
    timeout?: number;
    downloadDir?: string;
    maxRetries?: number;
    sessionId?: string;
}

export interface ImageGenerationRequest {
    prompt: string;
    style?: 'vivid' | 'natural';
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    count?: number;
}

export interface GeneratedImage {
    url: string;
    filename: string;
    prompt: string;
    metadata?: {
        size?: string;
        quality?: string;
        style?: string;
        timestamp?: string;
    };
}

export interface AutomationStatus {
    connected: boolean;
    loggedIn: boolean;
    ready: boolean;
    currentSession?: string;
    lastActivity?: Date;
}

/**
 * ChatGPT Playwright Automation for Image Generation
 * 
 * This class provides automated interaction with ChatGPT for image generation,
 * designed to work with existing user sessions (manual login required for 2FA).
 */
export class ChatGPTPlaywrightAutomation extends EventEmitter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private config: Required<ChatGPTAutomationConfig>;
    private isInitialized = false;
    private sessionActive = false;

    // ChatGPT-specific selectors (these may need updates based on UI changes)
    private readonly selectors = {
        chatInput: 'textarea[placeholder*="Message"], textarea[data-id="root"], [contenteditable="true"]',
        sendButton: 'button[data-testid="send-button"], button:has(svg[data-icon="paper-plane"])',
        messageContainer: '[data-message-author-role="assistant"]',
        imageContainer: 'img[alt*="generated"], img[src*="openai"], .image-container img',
        downloadButton: 'button:has(svg[data-icon="download"]), .download-button',
        loginButton: 'button:contains("Log in")',
        newChatButton: 'button:contains("New chat"), .new-chat-button',
        regenerateButton: 'button:contains("Regenerate"), .regenerate-button'
    };

    constructor(config: ChatGPTAutomationConfig = {}) {
        super();
        
        // Set default configuration
        this.config = {
            headless: config.headless ?? false, // Default to visible for manual login
            userDataDir: config.userDataDir ?? join(process.cwd(), '.chatgpt-session'),
            viewport: config.viewport ?? { width: 1280, height: 720 },
            timeout: config.timeout ?? 60000,
            downloadDir: config.downloadDir ?? join(process.cwd(), 'downloads'),
            maxRetries: config.maxRetries ?? 3,
            sessionId: config.sessionId ?? `chatgpt-${Date.now()}`
        };

        // Ensure download directory exists
        if (!existsSync(this.config.downloadDir)) {
            mkdirSync(this.config.downloadDir, { recursive: true });
        }
    }

    /**
     * Initialize the browser and connect to existing session
     */
    async initialize(): Promise<void> {
        try {
            this.emit('status', { message: 'Initializing browser automation...', type: 'info' });

            // Launch browser with persistent context for session management
            this.browser = await chromium.launch({
                headless: this.config.headless,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--allow-running-insecure-content'
                ]
            });

            // Create persistent context to maintain sessions
            this.context = await this.browser.newContext({
                viewport: this.config.viewport,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                acceptDownloads: true
            });

            // Create new page
            this.page = await this.context.newPage();
            
            // Set default timeout
            this.page.setDefaultTimeout(this.config.timeout);

            // Setup download handling
            await this.setupDownloadHandling();

            this.isInitialized = true;
            this.emit('initialized');

            this.emit('status', { message: 'Browser automation initialized successfully', type: 'success' });

        } catch (error) {
            this.emit('error', { message: 'Failed to initialize automation', error });
            throw new Error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Connect to ChatGPT and verify session
     * Note: User must be manually logged in due to 2FA
     */
    async connectToChatGPT(): Promise<void> {
        if (!this.isInitialized || !this.page) {
            throw new Error('Automation not initialized. Call initialize() first.');
        }

        try {
            this.emit('status', { message: 'Connecting to ChatGPT...', type: 'info' });

            // Navigate to ChatGPT
            await this.page.goto('https://chatgpt.com', { 
                waitUntil: 'networkidle',
                timeout: this.config.timeout 
            });

            // Wait a moment for page to settle
            await this.page.waitForTimeout(3000);

            // Check if user is logged in
            await this.verifyLoginStatus();

            this.sessionActive = true;
            this.emit('connected');
            this.emit('status', { message: 'Successfully connected to ChatGPT', type: 'success' });

        } catch (error) {
            this.emit('error', { message: 'Failed to connect to ChatGPT', error });
            throw new Error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Verify if user is logged into ChatGPT
     */
    private async verifyLoginStatus(): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        try {
            // Wait for either login button or chat interface
            await this.page.waitForFunction(() => {
                const loginButton = document.querySelector('button:contains("Log in")');
                const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea[data-id="root"], [contenteditable="true"]');
                return loginButton !== null || chatInput !== null;
            }, { timeout: 10000 });

            // Check if login button is present
            const loginButtonExists = await this.page.isVisible('button:contains("Log in")').catch(() => false);
            
            if (loginButtonExists) {
                this.emit('status', { 
                    message: 'User not logged in. Please log in manually to ChatGPT and then retry.', 
                    type: 'warning' 
                });
                throw new Error('User not logged in. Manual login required due to 2FA.');
            }

            // Wait for chat interface to be ready
            await this.page.waitForSelector(this.selectors.chatInput, { 
                timeout: 10000,
                state: 'visible' 
            });

            this.emit('status', { message: 'User is logged in and chat interface is ready', type: 'success' });

        } catch (error) {
            if (error instanceof Error && error.message.includes('not logged in')) {
                throw error;
            }
            throw new Error('Could not verify login status. Please ensure ChatGPT is accessible.');
        }
    }

    /**
     * Generate images using ChatGPT
     */
    async generateImages(request: ImageGenerationRequest): Promise<GeneratedImage[]> {
        if (!this.sessionActive || !this.page) {
            throw new Error('Not connected to ChatGPT. Call connectToChatGPT() first.');
        }

        try {
            this.emit('status', { message: `Generating images for prompt: "${request.prompt}"`, type: 'info' });

            // Prepare the prompt with specifications
            const fullPrompt = this.buildImagePrompt(request);

            // Submit the prompt
            await this.submitPrompt(fullPrompt);

            // Wait for images to generate
            const images = await this.waitForImageGeneration();

            // Download the generated images
            const downloadedImages = await this.downloadGeneratedImages(images, request);

            this.emit('imagesGenerated', { request, images: downloadedImages });
            this.emit('status', { 
                message: `Successfully generated and downloaded ${downloadedImages.length} images`, 
                type: 'success' 
            });

            return downloadedImages;

        } catch (error) {
            this.emit('error', { message: 'Failed to generate images', error, request });
            throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Build the complete image generation prompt
     */
    private buildImagePrompt(request: ImageGenerationRequest): string {
        let prompt = request.prompt;

        // Add DALL-E specific instructions
        const instructions = [];
        
        if (request.style) {
            instructions.push(`Style: ${request.style}`);
        }
        
        if (request.size) {
            instructions.push(`Size: ${request.size}`);
        }
        
        if (request.quality) {
            instructions.push(`Quality: ${request.quality}`);
        }

        if (request.count && request.count > 1) {
            instructions.push(`Generate ${request.count} variations`);
        }

        if (instructions.length > 0) {
            prompt = `Create an image with the following specifications:
${instructions.join('\n')}

Prompt: ${request.prompt}`;
        } else {
            prompt = `Create an image: ${request.prompt}`;
        }

        return prompt;
    }

    /**
     * Submit prompt to ChatGPT
     */
    private async submitPrompt(prompt: string): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        try {
            // Wait for and click the chat input
            await this.page.waitForSelector(this.selectors.chatInput, { 
                state: 'visible',
                timeout: this.config.timeout 
            });

            // Clear any existing content and type the new prompt
            await this.page.click(this.selectors.chatInput);
            await this.page.keyboard.press('Control+A');
            await this.page.type(this.selectors.chatInput, prompt);

            // Submit the prompt
            await this.page.waitForSelector(this.selectors.sendButton, { state: 'visible' });
            await this.page.click(this.selectors.sendButton);

            // Wait for the message to be sent
            await this.page.waitForTimeout(2000);

        } catch (error) {
            throw new Error(`Failed to submit prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Wait for image generation to complete
     */
    private async waitForImageGeneration(): Promise<string[]> {
        if (!this.page) throw new Error('Page not available');

        try {
            this.emit('status', { message: 'Waiting for image generation...', type: 'info' });

            // Wait for images to appear - increase timeout for image generation
            await this.page.waitForSelector(this.selectors.imageContainer, { 
                state: 'visible',
                timeout: 120000 // 2 minutes for image generation
            });

            // Wait a bit more for all images to load
            await this.page.waitForTimeout(5000);

            // Get all generated image URLs
            const imageUrls = await this.page.$$eval(this.selectors.imageContainer, (imgs) => {
                return imgs
                    .map(img => (img as HTMLImageElement).src)
                    .filter(src => src && src.startsWith('https://'))
                    .filter((src, index, arr) => arr.indexOf(src) === index); // Remove duplicates
            });

            if (imageUrls.length === 0) {
                throw new Error('No images were generated');
            }

            this.emit('status', { 
                message: `Found ${imageUrls.length} generated images`, 
                type: 'success' 
            });

            return imageUrls;

        } catch (error) {
            throw new Error(`Failed to wait for image generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Download generated images
     */
    private async downloadGeneratedImages(
        imageUrls: string[], 
        request: ImageGenerationRequest
    ): Promise<GeneratedImage[]> {
        const downloadedImages: GeneratedImage[] = [];

        for (let i = 0; i < imageUrls.length; i++) {
            try {
                const url = imageUrls[i];
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const sanitizedPrompt = request.prompt
                    .replace(/[^a-zA-Z0-9\s]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 50);
                
                const filename = `chatgpt_${sanitizedPrompt}_${timestamp}_${i + 1}.png`;
                const filepath = join(this.config.downloadDir, filename);

                // Download the image
                await this.downloadImage(url, filepath);

                const generatedImage: GeneratedImage = {
                    url,
                    filename,
                    prompt: request.prompt,
                    metadata: {
                        size: request.size,
                        quality: request.quality,
                        style: request.style,
                        timestamp: new Date().toISOString()
                    }
                };

                downloadedImages.push(generatedImage);
                this.emit('imageDownloaded', generatedImage);

            } catch (error) {
                this.emit('error', { 
                    message: `Failed to download image ${i + 1}`, 
                    error, 
                    url: imageUrls[i] 
                });
            }
        }

        return downloadedImages;
    }

    /**
     * Download a single image
     */
    private async downloadImage(url: string, filepath: string): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        try {
            // Use page.goto to download the image
            const response = await this.page.goto(url);
            if (!response) {
                throw new Error('No response from image URL');
            }

            const buffer = await response.body();
            writeFileSync(filepath, buffer);

        } catch (error) {
            throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Setup download handling for the browser context
     */
    private async setupDownloadHandling(): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        // Handle downloads
        this.page.on('download', async (download) => {
            try {
                const filename = download.suggestedFilename();
                const filepath = join(this.config.downloadDir, filename);
                await download.saveAs(filepath);
                this.emit('fileDownloaded', { filename, filepath });
            } catch (error) {
                this.emit('error', { message: 'Failed to handle download', error });
            }
        });
    }

    /**
     * Get current automation status
     */
    getStatus(): AutomationStatus {
        return {
            connected: this.sessionActive,
            loggedIn: this.sessionActive,
            ready: this.isInitialized && this.sessionActive,
            currentSession: this.config.sessionId,
            lastActivity: new Date()
        };
    }

    /**
     * Start a new chat conversation
     */
    async startNewChat(): Promise<void> {
        if (!this.page) throw new Error('Page not available');

        try {
            // Look for new chat button and click it
            const newChatButton = await this.page.$(this.selectors.newChatButton);
            if (newChatButton) {
                await newChatButton.click();
                await this.page.waitForTimeout(2000);
            }
        } catch (error) {
            // New chat button might not be available, continue
            this.emit('status', { message: 'Could not find new chat button, continuing...', type: 'warning' });
        }
    }

    /**
     * Take a screenshot for debugging
     */
    async takeScreenshot(filename?: string): Promise<string> {
        if (!this.page) throw new Error('Page not available');

        const screenshotPath = join(
            this.config.downloadDir, 
            filename || `chatgpt_screenshot_${Date.now()}.png`
        );
        
        await this.page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
        });

        return screenshotPath;
    }

    /**
     * Close the automation and cleanup resources
     */
    async close(): Promise<void> {
        try {
            this.emit('status', { message: 'Closing browser automation...', type: 'info' });

            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            if (this.context) {
                await this.context.close();
                this.context = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            this.isInitialized = false;
            this.sessionActive = false;

            this.emit('closed');
            this.emit('status', { message: 'Browser automation closed', type: 'success' });

        } catch (error) {
            this.emit('error', { message: 'Error during cleanup', error });
        }
    }
}

export default ChatGPTPlaywrightAutomation;