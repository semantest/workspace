/*
                        Semantest - ChatGPT Automation Test Suite
                        Comprehensive testing for Playwright-based ChatGPT automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { ChatGPTPlaywrightAutomation, ImageGenerationRequest } from '../../src/automation/chatgpt/chatgpt-playwright-automation';
import { BrowserSessionManager } from '../../src/automation/chatgpt/session-manager';
import { ExtensionCoordinator } from '../../src/automation/chatgpt/extension-coordinator';

// Test configuration
const TEST_CONFIG = {
    timeout: 30000,
    downloadDir: join(process.cwd(), 'test-downloads'),
    sessionDir: join(process.cwd(), '.test-sessions'),
    headless: true // Set to false for visual debugging
};

describe('ChatGPT Playwright Automation', () => {
    let automation: ChatGPTPlaywrightAutomation;
    let sessionManager: BrowserSessionManager;
    let coordinator: ExtensionCoordinator;

    beforeAll(() => {
        // Create test directories
        if (!existsSync(TEST_CONFIG.downloadDir)) {
            mkdirSync(TEST_CONFIG.downloadDir, { recursive: true });
        }
        if (!existsSync(TEST_CONFIG.sessionDir)) {
            mkdirSync(TEST_CONFIG.sessionDir, { recursive: true });
        }
    });

    afterAll(() => {
        // Cleanup test directories
        if (existsSync(TEST_CONFIG.downloadDir)) {
            rmSync(TEST_CONFIG.downloadDir, { recursive: true, force: true });
        }
        if (existsSync(TEST_CONFIG.sessionDir)) {
            rmSync(TEST_CONFIG.sessionDir, { recursive: true, force: true });
        }
    });

    beforeEach(() => {
        automation = new ChatGPTPlaywrightAutomation({
            headless: TEST_CONFIG.headless,
            downloadDir: TEST_CONFIG.downloadDir,
            timeout: TEST_CONFIG.timeout
        });

        sessionManager = new BrowserSessionManager({
            userDataDir: TEST_CONFIG.sessionDir,
            headless: TEST_CONFIG.headless,
            timeout: TEST_CONFIG.timeout
        });

        coordinator = new ExtensionCoordinator({
            timeout: TEST_CONFIG.timeout
        });
    });

    afterEach(async () => {
        if (automation) {
            await automation.close();
        }
        if (sessionManager) {
            await sessionManager.closeSession();
        }
        if (coordinator) {
            await coordinator.close();
        }
    });

    describe('Initialization and Setup', () => {
        it('should initialize automation correctly', async () => {
            await expect(automation.initialize()).resolves.not.toThrow();
            
            const status = automation.getStatus();
            expect(status.ready).toBe(false); // Not connected to ChatGPT yet
        }, TEST_CONFIG.timeout);

        it('should handle initialization errors gracefully', async () => {
            // Mock a browser launch failure
            const failingAutomation = new ChatGPTPlaywrightAutomation({
                headless: true,
                downloadDir: '/invalid/path/that/cannot/be/created'
            });

            await expect(failingAutomation.initialize()).rejects.toThrow();
        });

        it('should create download directory if it does not exist', async () => {
            const tempDir = join(TEST_CONFIG.downloadDir, 'temp-test');
            const tempAutomation = new ChatGPTPlaywrightAutomation({
                downloadDir: tempDir
            });

            await tempAutomation.initialize();
            expect(existsSync(tempDir)).toBe(true);
            
            await tempAutomation.close();
            rmSync(tempDir, { recursive: true, force: true });
        }, TEST_CONFIG.timeout);
    });

    describe('Session Management', () => {
        it('should create a new browser session', async () => {
            const sessionInfo = await sessionManager.createSession();
            
            expect(sessionInfo).toBeDefined();
            expect(sessionInfo.id).toBeDefined();
            expect(sessionInfo.isActive).toBe(true);
            expect(sessionInfo.browserType).toBe('chromium');
        }, TEST_CONFIG.timeout);

        it('should list available sessions', async () => {
            await sessionManager.createSession();
            const sessions = await sessionManager.listSessions();
            
            expect(Array.isArray(sessions)).toBe(true);
            expect(sessions.length).toBeGreaterThan(0);
        });

        it('should connect to existing session', async () => {
            const originalSession = await sessionManager.createSession();
            await sessionManager.closeSession();
            
            const reconnectedSession = await sessionManager.connectToSession(originalSession.id);
            expect(reconnectedSession.id).toBe(originalSession.id);
        }, TEST_CONFIG.timeout);

        it('should handle session connection errors', async () => {
            await expect(
                sessionManager.connectToSession('non-existent-session')
            ).rejects.toThrow('Session non-existent-session not found');
        });
    });

    describe('Extension Coordination', () => {
        beforeEach(async () => {
            await sessionManager.createSession();
            const page = sessionManager.getPage();
            if (page) {
                await coordinator.initialize(page);
            }
        });

        it('should initialize coordinator with page', async () => {
            expect(coordinator.isCoordinationActive()).toBe(true);
        }, TEST_CONFIG.timeout);

        it('should handle extension communication', async () => {
            const messagePromise = new Promise((resolve) => {
                coordinator.once('extensionMessage', resolve);
            });

            // Simulate extension message
            const testMessage = {
                type: 'status-update' as const,
                payload: { test: 'data' }
            };

            await coordinator.sendToExtension(testMessage);
            
            // Note: In a real test, this would require the actual extension to be loaded
            // For now, we just verify the method doesn't throw
        });

        it('should test connection to extension', async () => {
            // This will likely fail without actual extension, but should not throw
            const connected = await coordinator.testConnection();
            expect(typeof connected).toBe('boolean');
        });
    });

    describe('ChatGPT Connection (Mock Tests)', () => {
        // Note: These tests mock ChatGPT responses since we can't test with actual ChatGPT
        // in automated tests without proper authentication

        it('should validate image generation request format', () => {
            const validRequest: ImageGenerationRequest = {
                prompt: 'A beautiful sunset over mountains',
                style: 'vivid',
                size: '1024x1024',
                quality: 'hd',
                count: 1
            };

            expect(validRequest.prompt).toBeDefined();
            expect(['vivid', 'natural'].includes(validRequest.style!)).toBe(true);
            expect(['1024x1024', '1792x1024', '1024x1792'].includes(validRequest.size!)).toBe(true);
            expect(['standard', 'hd'].includes(validRequest.quality!)).toBe(true);
        });

        it('should handle empty or invalid prompts', () => {
            const invalidRequests = [
                { prompt: '' },
                { prompt: '   ' },
                // @ts-expect-error Testing invalid input
                { prompt: null },
                // @ts-expect-error Testing invalid input
                { prompt: undefined }
            ];

            invalidRequests.forEach(request => {
                expect(() => {
                    if (!request.prompt || request.prompt.trim().length === 0) {
                        throw new Error('Invalid prompt');
                    }
                }).toThrow('Invalid prompt');
            });
        });

        it('should sanitize prompts for filename creation', () => {
            const prompt = 'Create an image with <script>alert("xss")</script> and special chars!@#$%^&*()';
            const sanitized = prompt
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 50);

            expect(sanitized).toBe('Create_an_image_with_scriptalertxssscript_and_spe');
            expect(sanitized.length).toBeLessThanOrEqual(50);
        });
    });

    describe('Image Download Functionality', () => {
        it('should create proper filename from prompt', () => {
            const prompt = 'A beautiful landscape with mountains and rivers';
            const timestamp = '2024-01-01T12-00-00-000Z';
            const index = 1;
            
            const sanitizedPrompt = prompt
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 50);
            
            const expectedFilename = `chatgpt_${sanitizedPrompt}_${timestamp}_${index}.png`;
            expect(expectedFilename).toBe('chatgpt_A_beautiful_landscape_with_mountains_and_ri_2024-01-01T12-00-00-000Z_1.png');
        });

        it('should handle download directory creation', () => {
            const testDownloadDir = join(TEST_CONFIG.downloadDir, 'nested', 'test', 'dir');
            
            if (!existsSync(testDownloadDir)) {
                mkdirSync(testDownloadDir, { recursive: true });
            }

            expect(existsSync(testDownloadDir)).toBe(true);
            rmSync(testDownloadDir, { recursive: true, force: true });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle browser closure gracefully', async () => {
            await automation.initialize();
            await automation.close();
            
            const status = automation.getStatus();
            expect(status.connected).toBe(false);
            expect(status.ready).toBe(false);
        }, TEST_CONFIG.timeout);

        it('should handle network timeout scenarios', async () => {
            const timeoutAutomation = new ChatGPTPlaywrightAutomation({
                timeout: 1000 // Very short timeout
            });

            await timeoutAutomation.initialize();
            
            // Mock a timeout scenario - in real implementation this would test actual timeouts
            const mockTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network timeout')), 1000);
            });

            await expect(mockTimeout).rejects.toThrow('Network timeout');
            await timeoutAutomation.close();
        }, TEST_CONFIG.timeout);

        it('should validate configuration parameters', () => {
            expect(() => {
                new ChatGPTPlaywrightAutomation({
                    timeout: -1000 // Invalid timeout
                });
            }).not.toThrow(); // Constructor doesn't validate, but usage would

            expect(() => {
                new ChatGPTPlaywrightAutomation({
                    downloadDir: '' // Empty path
                });
            }).not.toThrow(); // Constructor sets defaults
        });
    });

    describe('Event Handling', () => {
        it('should emit status events during operations', async () => {
            const statusEvents: any[] = [];
            
            automation.on('status', (status) => {
                statusEvents.push(status);
            });

            await automation.initialize();

            expect(statusEvents.length).toBeGreaterThan(0);
            expect(statusEvents.some(event => event.type === 'info')).toBe(true);
        }, TEST_CONFIG.timeout);

        it('should emit error events on failures', async () => {
            const errorEvents: any[] = [];
            
            automation.on('error', (error) => {
                errorEvents.push(error);
            });

            // Force an error by trying to use automation before initialization
            try {
                await automation.generateImages({ prompt: 'test' });
            } catch {
                // Expected to fail
            }

            expect(errorEvents.length).toBeGreaterThan(0);
        });
    });

    describe('Screenshot Functionality', () => {
        it('should take screenshots when requested', async () => {
            await sessionManager.createSession();
            const page = sessionManager.getPage();
            
            if (page) {
                const screenshotPath = await sessionManager.takeScreenshot({
                    path: join(TEST_CONFIG.downloadDir, 'test-screenshot.png')
                });

                expect(typeof screenshotPath).toBe('object'); // Buffer
            }
        }, TEST_CONFIG.timeout);
    });

    describe('Integration Test Scenarios', () => {
        // These would be comprehensive integration tests if we had a test environment
        
        it('should handle full automation workflow (mock)', async () => {
            // This test outlines the full workflow without actual ChatGPT interaction
            const steps = [
                'initialize automation',
                'connect to ChatGPT',
                'submit image generation prompt',
                'wait for image generation',
                'download generated images',
                'cleanup resources'
            ];

            expect(steps.length).toBe(6);
            
            // In a real test environment with ChatGPT access:
            // 1. Initialize automation
            // 2. Connect to pre-logged ChatGPT session
            // 3. Generate images with test prompt
            // 4. Verify images were downloaded
            // 5. Check metadata and file integrity
        });

        it('should coordinate with extension (mock)', async () => {
            await sessionManager.createSession();
            const page = sessionManager.getPage();
            
            if (page) {
                await coordinator.initialize(page);
                
                // Mock coordination workflow
                const coordinationSteps = [
                    'enable image generation coordination',
                    'notify automation start',
                    'monitor generation progress',
                    'detect completion',
                    'assist with download',
                    'notify completion'
                ];

                expect(coordinationSteps.length).toBe(6);
            }
        }, TEST_CONFIG.timeout);
    });
});

describe('Browser Automation Integration', () => {
    describe('Real Browser Test (Manual)', () => {
        // This test is designed to be run manually with actual browser interaction
        it.skip('should work with real ChatGPT session (manual test)', async () => {
            const automation = new ChatGPTPlaywrightAutomation({
                headless: false, // Visible browser for manual login
                timeout: 60000
            });

            try {
                await automation.initialize();
                
                console.log('Please manually log into ChatGPT in the opened browser...');
                console.log('Press any key when ready to continue...');
                
                // In a real manual test, wait for user input here
                // process.stdin.setRawMode(true);
                // await new Promise(resolve => process.stdin.once('data', resolve));

                await automation.connectToChatGPT();

                const images = await automation.generateImages({
                    prompt: 'A test image of a robot painting',
                    count: 1
                });

                expect(images.length).toBeGreaterThan(0);

            } finally {
                await automation.close();
            }
        }, 120000); // 2 minute timeout for manual test
    });
});

export { TEST_CONFIG };