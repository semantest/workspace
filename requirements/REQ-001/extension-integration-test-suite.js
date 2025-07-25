#!/usr/bin/env node
/**
 * Comprehensive Extension Integration Test Suite
 * Tests all aspects of the Semantest extension with production scenarios
 */

const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

class ExtensionTestSuite {
    constructor() {
        this.config = {
            extensionPath: path.join(__dirname, '../../../extension.chrome/build'),
            chatGPTUrl: 'https://chat.openai.com',
            websocketUrl: 'ws://localhost:8080',
            screenshotDir: './test-screenshots',
            timeout: 30000
        };
        
        this.testResults = [];
        this.browser = null;
        this.wsClient = null;
        this.page = null;
    }
    
    async setup() {
        // Create screenshot directory
        await fs.mkdir(this.config.screenshotDir, { recursive: true });
        
        // Connect to WebSocket
        this.wsClient = await this.connectWebSocket();
        
        // Launch Chrome with extension
        this.browser = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${this.config.extensionPath}`,
                `--load-extension=${this.config.extensionPath}`,
                '--no-sandbox'
            ],
            viewport: { width: 1280, height: 720 }
        });
        
        this.page = await this.browser.newPage();
        
        // Set up page error logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🔴 Page error:', msg.text());
            }
        });
    }
    
    async teardown() {
        if (this.wsClient) this.wsClient.close();
        if (this.browser) await this.browser.close();
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.config.websocketUrl);
            
            ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve(ws);
            });
            
            ws.on('error', (err) => {
                console.error('❌ WebSocket error:', err.message);
                reject(err);
            });
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                console.log('📨 WS Event:', message.type, message.payload?.type);
            });
        });
    }
    
    async runTest(testName, testFn) {
        console.log(`\n🧪 Running: ${testName}`);
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration
            });
            console.log(`✅ PASS (${duration}ms)`);
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                error: error.message,
                duration
            });
            console.log(`❌ FAIL: ${error.message}`);
            
            // Take error screenshot
            try {
                const screenshotPath = path.join(
                    this.config.screenshotDir,
                    `error-${testName.replace(/\s+/g, '-')}-${Date.now()}.png`
                );
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`📸 Error screenshot: ${screenshotPath}`);
            } catch (e) {
                // Ignore screenshot errors
            }
            
            return false;
        }
    }
    
    // Test Cases
    
    async testExtensionLoaded() {
        // Check if extension is loaded by looking for injected elements
        const extensionLoaded = await this.page.evaluate(() => {
            return document.querySelector('[data-semantest]') !== null ||
                   window.semantestExtension !== undefined;
        });
        
        if (!extensionLoaded) {
            throw new Error('Extension not detected on page');
        }
    }
    
    async testNavigateToChatGPT() {
        await this.page.goto(this.config.chatGPTUrl, { 
            waitUntil: 'networkidle',
            timeout: this.config.timeout 
        });
        
        // Verify we're on ChatGPT
        const title = await this.page.title();
        if (!title.toLowerCase().includes('chatgpt')) {
            throw new Error(`Not on ChatGPT page. Title: ${title}`);
        }
    }
    
    async testHandleConsentPopup() {
        // Wait a bit for popup to appear
        await this.page.waitForTimeout(2000);
        
        const consentHandled = await this.page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const consentButton = buttons.find(btn => 
                /accept|continue|ok|agree/i.test(btn.textContent)
            );
            
            if (consentButton && consentButton.offsetParent !== null) {
                consentButton.click();
                return true;
            }
            return false;
        });
        
        if (consentHandled) {
            console.log('  → Consent popup handled');
        } else {
            console.log('  → No consent popup found');
        }
    }
    
    async testWebSocketMessageFormat() {
        // Send a test message with correct format
        const testMessage = {
            id: `test-${Date.now()}`,
            type: 'event',  // lowercase!
            timestamp: Date.now(),
            payload: {
                id: `evt-${Date.now()}`,
                type: 'semantest/test/format/check',
                timestamp: Date.now(),
                payload: { test: true }
            }
        };
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket response timeout'));
            }, 5000);
            
            // Listen for response
            const messageHandler = (data) => {
                clearTimeout(timeout);
                this.wsClient.off('message', messageHandler);
                resolve();
            };
            
            this.wsClient.on('message', messageHandler);
            this.wsClient.send(JSON.stringify(testMessage));
        });
    }
    
    async testExtensionButton() {
        // Wait for extension to inject its UI
        await this.page.waitForTimeout(3000);
        
        // Try multiple selectors
        const selectors = [
            'button[data-semantest-generate]',
            'button:has-text("Generate")',
            '.semantest-button',
            '[id*="semantest"]'
        ];
        
        for (const selector of selectors) {
            const button = await this.page.locator(selector).first();
            if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
                await button.click();
                return; // Success
            }
        }
        
        throw new Error('Extension button not found');
    }
    
    async testPromptSubmission() {
        const testPrompt = 'Test: Generate a simple geometric shape';
        
        // Find input field
        const input = await this.page.locator('textarea').first();
        if (!await input.isVisible()) {
            throw new Error('ChatGPT input field not found');
        }
        
        // Clear and type
        await input.clear();
        await input.fill(testPrompt);
        
        // Submit
        await this.page.keyboard.press('Enter');
        
        // Wait for processing
        await this.page.waitForTimeout(2000);
    }
    
    async testWebSocketEventFlow() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('No image generation event received'));
            }, 30000);
            
            const messageHandler = (data) => {
                const message = JSON.parse(data.toString());
                if (message.payload?.type?.includes('image')) {
                    clearTimeout(timeout);
                    this.wsClient.off('message', messageHandler);
                    resolve();
                }
            };
            
            this.wsClient.on('message', messageHandler);
        });
    }
    
    async testImageGenerated() {
        // Wait for image to appear
        const imageSelectors = [
            'img[alt*="Generated"]',
            'img[src*="dalle"]',
            'img[src*="blob:"]',
            '.generated-image'
        ];
        
        for (const selector of imageSelectors) {
            const image = await this.page.locator(selector).first();
            if (await image.isVisible({ timeout: 30000 }).catch(() => false)) {
                // Take success screenshot
                const screenshotPath = path.join(
                    this.config.screenshotDir,
                    `success-${Date.now()}.png`
                );
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`  → Success screenshot: ${screenshotPath}`);
                return;
            }
        }
        
        throw new Error('Generated image not found');
    }
    
    async testBulkGeneration() {
        // Simulate bulk generation scenario
        const prompts = [
            'Panel 1: Hero standing tall',
            'Panel 2: Villain appears',
            'Panel 3: Epic confrontation'
        ];
        
        for (let i = 0; i < prompts.length; i++) {
            console.log(`  → Generating image ${i + 1}/${prompts.length}`);
            
            const input = await this.page.locator('textarea').first();
            await input.clear();
            await input.fill(prompts[i]);
            await this.page.keyboard.press('Enter');
            
            // Wait between requests
            await this.page.waitForTimeout(8000);
        }
    }
    
    // Main test runner
    async run() {
        console.log('🚀 Semantest Extension Integration Test Suite');
        console.log('='.repeat(50));
        
        try {
            await this.setup();
            
            // Core functionality tests
            await this.runTest('Extension Loaded', () => this.testExtensionLoaded());
            await this.runTest('Navigate to ChatGPT', () => this.testNavigateToChatGPT());
            await this.runTest('Handle Consent Popup', () => this.testHandleConsentPopup());
            await this.runTest('WebSocket Message Format', () => this.testWebSocketMessageFormat());
            
            // Extension interaction tests
            await this.runTest('Extension Button Visible', () => this.testExtensionButton());
            await this.runTest('Submit Test Prompt', () => this.testPromptSubmission());
            await this.runTest('WebSocket Event Flow', () => this.testWebSocketEventFlow());
            await this.runTest('Image Generated', () => this.testImageGenerated());
            
            // Production scenario tests
            await this.runTest('Bulk Generation (3 images)', () => this.testBulkGeneration());
            
        } finally {
            await this.teardown();
            this.printResults();
        }
    }
    
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`   └─ ${result.error}`);
            }
        });
        
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log('='.repeat(50));
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed! Ready for production!');
        } else {
            console.log('\n⚠️ Some tests failed. Please check the errors above.');
        }
        
        process.exit(failed > 0 ? 1 : 0);
    }
}

// Run the test suite
const suite = new ExtensionTestSuite();
suite.run().catch(console.error);