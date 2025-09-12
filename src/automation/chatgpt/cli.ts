#!/usr/bin/env node

/*
                        Semantest - ChatGPT Automation CLI
                        Command-line interface for ChatGPT image generation automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { program } from 'commander';
import { join } from 'path';
import { existsSync } from 'fs';
import { ChatGPTPlaywrightAutomation, ImageGenerationRequest } from './chatgpt-playwright-automation';
import { BrowserSessionManager, SessionInfo } from './session-manager';
import { ExtensionCoordinator } from './extension-coordinator';

// CLI version
const CLI_VERSION = '1.0.0';

// Default configuration
const DEFAULT_CONFIG = {
    downloadDir: join(process.cwd(), 'downloads'),
    sessionDir: join(process.cwd(), '.chatgpt-sessions'),
    timeout: 60000,
    headless: false
};

/**
 * Main CLI program setup
 */
program
    .name('chatgpt-automation')
    .description('Playwright-based ChatGPT image generation automation')
    .version(CLI_VERSION)
    .option('-h, --headless', 'Run browser in headless mode', false)
    .option('-d, --download-dir <path>', 'Download directory for images', DEFAULT_CONFIG.downloadDir)
    .option('-s, --session-dir <path>', 'Session storage directory', DEFAULT_CONFIG.sessionDir)
    .option('-t, --timeout <ms>', 'Timeout for operations in milliseconds', DEFAULT_CONFIG.timeout.toString())
    .option('-v, --verbose', 'Verbose output', false);

/**
 * Generate images command
 */
program
    .command('generate')
    .description('Generate images using ChatGPT')
    .argument('<prompt>', 'Image generation prompt')
    .option('--style <style>', 'Image style (vivid|natural)', 'vivid')
    .option('--size <size>', 'Image size (1024x1024|1792x1024|1024x1792)', '1024x1024')
    .option('--quality <quality>', 'Image quality (standard|hd)', 'standard')
    .option('--count <number>', 'Number of images to generate', '1')
    .option('--session-id <id>', 'Use specific session ID')
    .action(async (prompt, options) => {
        try {
            const globalOptions = program.opts();
            
            console.log('🚀 Starting ChatGPT image generation...');
            console.log(`📝 Prompt: "${prompt}"`);
            
            const automation = new ChatGPTPlaywrightAutomation({
                headless: globalOptions.headless,
                downloadDir: globalOptions.downloadDir,
                timeout: parseInt(globalOptions.timeout),
                sessionId: options.sessionId
            });

            // Setup event listeners
            automation.on('status', (status) => {
                if (globalOptions.verbose || status.type === 'error') {
                    const icon = status.type === 'error' ? '❌' : 
                                 status.type === 'success' ? '✅' : 
                                 status.type === 'warning' ? '⚠️' : 'ℹ️';
                    console.log(`${icon} ${status.message}`);
                }
            });

            automation.on('imageDownloaded', (image) => {
                console.log(`💾 Downloaded: ${image.filename}`);
            });

            // Initialize and connect
            await automation.initialize();
            
            console.log('🔗 Connecting to ChatGPT...');
            console.log('👤 Please ensure you are logged into ChatGPT in the browser');
            
            await automation.connectToChatGPT();

            // Generate images
            const request: ImageGenerationRequest = {
                prompt,
                style: options.style as 'vivid' | 'natural',
                size: options.size as '1024x1024' | '1792x1024' | '1024x1792',
                quality: options.quality as 'standard' | 'hd',
                count: parseInt(options.count)
            };

            const images = await automation.generateImages(request);

            console.log(`\n✨ Successfully generated ${images.length} images:`);
            images.forEach((image, index) => {
                console.log(`  ${index + 1}. ${image.filename}`);
            });

            await automation.close();

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

/**
 * Session management commands
 */
const sessionCmd = program
    .command('session')
    .description('Manage browser sessions');

sessionCmd
    .command('create')
    .description('Create a new browser session')
    .option('--browser <type>', 'Browser type (chromium|firefox|webkit)', 'chromium')
    .action(async (options) => {
        try {
            const globalOptions = program.opts();
            
            const sessionManager = new BrowserSessionManager({
                browserType: options.browser,
                userDataDir: globalOptions.sessionDir,
                headless: globalOptions.headless
            });

            console.log('📦 Creating new browser session...');
            const session = await sessionManager.createSession();
            
            console.log('✅ Session created successfully:');
            console.log(`  ID: ${session.id}`);
            console.log(`  Browser: ${session.browserType}`);
            console.log(`  Created: ${session.created.toISOString()}`);

            await sessionManager.closeSession();

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

sessionCmd
    .command('list')
    .description('List available sessions')
    .action(async () => {
        try {
            const globalOptions = program.opts();
            
            const sessionManager = new BrowserSessionManager({
                userDataDir: globalOptions.sessionDir
            });

            const sessions = await sessionManager.listSessions();

            if (sessions.length === 0) {
                console.log('📭 No sessions found');
                return;
            }

            console.log(`📋 Found ${sessions.length} sessions:`);
            sessions.forEach((session, index) => {
                const status = session.isActive ? '🟢 Active' : '🔴 Inactive';
                console.log(`  ${index + 1}. ${session.id}`);
                console.log(`     Status: ${status}`);
                console.log(`     Browser: ${session.browserType}`);
                console.log(`     Created: ${session.created.toLocaleString()}`);
                console.log(`     Last Activity: ${session.lastActivity.toLocaleString()}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

sessionCmd
    .command('connect <sessionId>')
    .description('Connect to an existing session')
    .action(async (sessionId) => {
        try {
            const globalOptions = program.opts();
            
            console.log(`🔗 Connecting to session: ${sessionId}`);
            
            const sessionManager = new BrowserSessionManager({
                userDataDir: globalOptions.sessionDir,
                sessionId: sessionId,
                headless: globalOptions.headless
            });

            const session = await sessionManager.connectToSession(sessionId);
            console.log('✅ Connected successfully');
            
            console.log('🌐 Navigating to ChatGPT...');
            await sessionManager.navigate('https://chatgpt.com');
            
            console.log('📸 Taking screenshot...');
            await sessionManager.takeScreenshot({
                path: join(globalOptions.downloadDir, `session-${sessionId}-screenshot.png`)
            });

            console.log('Press any key to close session...');
            process.stdin.setRawMode(true);
            await new Promise(resolve => process.stdin.once('data', resolve));

            await sessionManager.closeSession();

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

sessionCmd
    .command('delete <sessionId>')
    .description('Delete a session')
    .action(async (sessionId) => {
        try {
            const globalOptions = program.opts();
            
            const sessionManager = new BrowserSessionManager({
                userDataDir: globalOptions.sessionDir
            });

            console.log(`🗑️ Deleting session: ${sessionId}`);
            await sessionManager.deleteSession(sessionId);
            console.log('✅ Session deleted successfully');

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

/**
 * Extension coordination command
 */
program
    .command('coordinate')
    .description('Test extension coordination')
    .option('--session-id <id>', 'Use specific session ID')
    .action(async (options) => {
        try {
            const globalOptions = program.opts();
            
            console.log('🤝 Testing extension coordination...');
            
            const sessionManager = new BrowserSessionManager({
                userDataDir: globalOptions.sessionDir,
                sessionId: options.sessionId,
                headless: globalOptions.headless
            });

            const session = options.sessionId 
                ? await sessionManager.connectToSession(options.sessionId)
                : await sessionManager.createSession();

            const page = sessionManager.getPage();
            if (!page) {
                throw new Error('No active page available');
            }

            const coordinator = new ExtensionCoordinator();
            
            coordinator.on('status', (status) => {
                console.log(`📡 ${status.message}`);
            });

            await coordinator.initialize(page);
            await sessionManager.navigate('https://chatgpt.com');

            console.log('🔍 Testing extension connection...');
            const connected = await coordinator.testConnection();
            console.log(`Extension connected: ${connected ? '✅ Yes' : '❌ No'}`);

            if (connected) {
                console.log('📊 Getting extension status...');
                const status = await coordinator.getExtensionStatus();
                console.log('Status:', JSON.stringify(status, null, 2));
            }

            await coordinator.close();
            await sessionManager.closeSession();

        } catch (error) {
            console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

/**
 * Test command for debugging
 */
program
    .command('test')
    .description('Run basic functionality test')
    .action(async () => {
        try {
            const globalOptions = program.opts();
            
            console.log('🧪 Running basic functionality test...');
            
            // Test automation initialization
            const automation = new ChatGPTPlaywrightAutomation({
                headless: true,
                downloadDir: globalOptions.downloadDir,
                timeout: 10000
            });

            console.log('1️⃣ Testing automation initialization...');
            await automation.initialize();
            console.log('✅ Automation initialized');

            console.log('2️⃣ Testing status retrieval...');
            const status = automation.getStatus();
            console.log(`Status: ${JSON.stringify(status, null, 2)}`);

            console.log('3️⃣ Testing screenshot capability...');
            await automation.takeScreenshot('test-screenshot.png');
            console.log('✅ Screenshot taken');

            await automation.close();
            console.log('✅ All tests passed!');

        } catch (error) {
            console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

// If no command specified, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}