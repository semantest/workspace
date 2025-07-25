#!/usr/bin/env node
/**
 * Automated Extension Testing with Playwright
 * Launches Chrome with Semantest extension pre-loaded and tests functionality
 */

const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');

// Configuration
const EXTENSION_PATH = path.join(__dirname, '../../../extension.chrome/build');
const CHATGPT_URL = 'https://chat.openai.com';
const WEBSOCKET_URL = 'ws://localhost:8080';
const TEST_PROMPT = 'Generate a test image: Hero in cyberpunk city';

// Test results
const results = {
    extensionLoaded: false,
    chatGPTLoaded: false,
    websocketConnected: false,
    buttonClicked: false,
    promptSubmitted: false,
    websocketEventReceived: false,
    imageGenerated: false
};

async function runAutomatedTest() {
    console.log('🧪 Starting Automated Extension Test...\n');
    
    let browser;
    let wsClient;
    
    try {
        // Step 1: Connect to WebSocket server to monitor events
        console.log('1️⃣ Connecting to WebSocket server...');
        wsClient = await connectWebSocket();
        results.websocketConnected = true;
        console.log('✅ WebSocket connected\n');
        
        // Step 2: Launch Chrome with extension
        console.log('2️⃣ Launching Chrome with Semantest extension...');
        browser = await chromium.launchPersistentContext('', {
            headless: false, // Must be false for extensions
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
            viewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        results.extensionLoaded = true;
        console.log('✅ Chrome launched with extension\n');
        
        // Step 3: Navigate to ChatGPT
        console.log('3️⃣ Navigating to ChatGPT...');
        await page.goto(CHATGPT_URL, { waitUntil: 'networkidle' });
        results.chatGPTLoaded = true;
        console.log('✅ ChatGPT loaded\n');
        
        // Step 4: Wait for any consent popups and handle them
        console.log('4️⃣ Checking for consent popup...');
        try {
            // Look for common consent button selectors
            const consentSelectors = [
                'button:has-text("Accept")',
                'button:has-text("Continue")',
                'button:has-text("OK")',
                'button:has-text("I agree")'
            ];
            
            for (const selector of consentSelectors) {
                const button = await page.locator(selector).first();
                if (await button.isVisible({ timeout: 5000 })) {
                    await button.click();
                    console.log('✅ Handled consent popup\n');
                    break;
                }
            }
        } catch (e) {
            console.log('ℹ️ No consent popup found (or already accepted)\n');
        }
        
        // Step 5: Test extension functionality
        console.log('5️⃣ Testing extension button...');
        
        // Try multiple methods to find and click the extension button
        const extensionButtonSelectors = [
            '[data-semantest-button]',
            'button:has-text("Generate Image")',
            '.semantest-generate-button',
            '#semantest-button'
        ];
        
        let buttonClicked = false;
        for (const selector of extensionButtonSelectors) {
            try {
                const button = await page.locator(selector).first();
                if (await button.isVisible({ timeout: 3000 })) {
                    await button.click();
                    buttonClicked = true;
                    results.buttonClicked = true;
                    console.log(`✅ Clicked extension button: ${selector}\n`);
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }
        
        if (!buttonClicked) {
            // Alternative: Try to trigger via extension API
            console.log('⚠️ Button not found, trying direct prompt submission...\n');
        }
        
        // Step 6: Submit test prompt
        console.log('6️⃣ Submitting test prompt...');
        
        // Find the ChatGPT input field
        const inputSelectors = [
            'textarea[placeholder*="Send a message"]',
            'textarea[data-id="composer"]',
            '#prompt-textarea',
            'textarea'
        ];
        
        for (const selector of inputSelectors) {
            try {
                const input = await page.locator(selector).first();
                if (await input.isVisible({ timeout: 3000 })) {
                    await input.fill(TEST_PROMPT);
                    await page.keyboard.press('Enter');
                    results.promptSubmitted = true;
                    console.log('✅ Test prompt submitted\n');
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }
        
        // Step 7: Monitor WebSocket for events
        console.log('7️⃣ Monitoring WebSocket for image generation events...');
        
        // Wait for WebSocket events (with timeout)
        const eventReceived = await waitForWebSocketEvent(wsClient, 30000);
        if (eventReceived) {
            results.websocketEventReceived = true;
            console.log('✅ WebSocket event received!\n');
        } else {
            console.log('⚠️ No WebSocket event received within timeout\n');
        }
        
        // Step 8: Check for image generation
        console.log('8️⃣ Checking for image generation...');
        
        // Wait for image to appear in ChatGPT
        const imageSelectors = [
            'img[alt*="Generated image"]',
            '.generated-image',
            'img[src*="dalle"]',
            'img[src*="openai"]'
        ];
        
        for (const selector of imageSelectors) {
            try {
                const image = await page.locator(selector).first();
                if (await image.isVisible({ timeout: 30000 })) {
                    results.imageGenerated = true;
                    console.log('✅ Image generated successfully!\n');
                    
                    // Take screenshot of success
                    await page.screenshot({ 
                        path: 'test-success-screenshot.png',
                        fullPage: true 
                    });
                    console.log('📸 Screenshot saved: test-success-screenshot.png\n');
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        // Cleanup
        if (wsClient) wsClient.close();
        if (browser) await browser.close();
        
        // Print results
        printTestResults();
    }
}

function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WEBSOCKET_URL);
        
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
        
        ws.on('message', (data) => {
            console.log('📨 WebSocket message:', data.toString());
        });
    });
}

function waitForWebSocketEvent(ws, timeout) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), timeout);
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'event' && 
                message.payload?.type?.includes('image')) {
                clearTimeout(timer);
                resolve(true);
            }
        });
    });
}

function printTestResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    for (const [test, result] of Object.entries(results)) {
        const status = result ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${test}`);
        if (result) passed++; else failed++;
    }
    
    console.log('='.repeat(50));
    console.log(`Total: ${passed + failed} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('='.repeat(50));
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}

// Run the test
runAutomatedTest().catch(console.error);