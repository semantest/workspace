/*
                        Semantest - Browser Automation Consolidation Test
                        Tests for unified browser automation implementation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { BrowserAdapterFactory, BrowserAdapterType } from './browser-adapter-factory';
import { BrowserMCPAdapter } from './browser-mcp-adapter';
import { PlaywrightBrowserAdapter } from './playwright-adapter';
import { BrowserConfig } from './interfaces';

describe('Browser Automation Consolidation', () => {
    beforeEach(() => {
        // Clear any existing instances
        BrowserAdapterFactory.closeAll();
    });

    afterEach(async () => {
        // Clean up all instances
        await BrowserAdapterFactory.closeAll();
    });

    describe('BrowserAdapterFactory', () => {
        it('should create BrowserMCPAdapter when specified', async () => {
            const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP);
            expect(adapter).toBeInstanceOf(BrowserMCPAdapter);
        });

        it('should create singleton instances', async () => {
            const adapter1 = await BrowserAdapterFactory.getInstance('test-key', BrowserAdapterType.BROWSER_MCP);
            const adapter2 = await BrowserAdapterFactory.getInstance('test-key', BrowserAdapterType.BROWSER_MCP);
            
            expect(adapter1).toBe(adapter2);
        });

        it('should close and remove instances', async () => {
            const adapter = await BrowserAdapterFactory.getInstance('test-key', BrowserAdapterType.BROWSER_MCP);
            expect(adapter).toBeTruthy();
            
            await BrowserAdapterFactory.closeInstance('test-key');
            
            // Should create new instance after closing
            const newAdapter = await BrowserAdapterFactory.getInstance('test-key', BrowserAdapterType.BROWSER_MCP);
            expect(newAdapter).not.toBe(adapter);
        });

        it('should report available adapters', async () => {
            const available = await BrowserAdapterFactory.getAvailableAdapters();
            expect(available).toContain(BrowserAdapterType.BROWSER_MCP);
        });

        it('should check adapter availability', async () => {
            const isMCPAvailable = await BrowserAdapterFactory.isAdapterAvailable(BrowserAdapterType.BROWSER_MCP);
            expect(isMCPAvailable).toBe(true);
        });
    });

    describe('BrowserMCPAdapter', () => {
        let adapter: BrowserMCPAdapter;

        beforeEach(async () => {
            adapter = new BrowserMCPAdapter();
            await adapter.initialize();
        });

        afterEach(async () => {
            await adapter.close();
        });

        it('should initialize successfully', async () => {
            const newAdapter = new BrowserMCPAdapter();
            await expect(newAdapter.initialize()).resolves.not.toThrow();
            await newAdapter.close();
        });

        it('should navigate to URLs', async () => {
            await expect(adapter.navigate('https://example.com')).resolves.not.toThrow();
        });

        it('should fill form inputs', async () => {
            await expect(adapter.fillInput({
                selector: '#input',
                value: 'test value'
            })).resolves.not.toThrow();
        });

        it('should click elements', async () => {
            await expect(adapter.click({
                selector: '#button'
            })).resolves.not.toThrow();
        });

        it('should take screenshots', async () => {
            const screenshot = await adapter.screenshot();
            expect(screenshot).toBeInstanceOf(Buffer);
        });

        it('should get page content', async () => {
            const content = await adapter.getContent();
            expect(typeof content).toBe('string');
        });

        it('should get page title', async () => {
            const title = await adapter.getTitle();
            expect(typeof title).toBe('string');
        });

        it('should wait for elements', async () => {
            await expect(adapter.waitForElement({
                selector: '#element'
            })).resolves.not.toThrow();
        });
    });

    describe('Configuration Validation', () => {
        it('should validate browser configuration', async () => {
            const config: BrowserConfig = {
                timeout: 10000,
                headless: true,
                viewport: { width: 1920, height: 1080 }
            };

            const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP, config);
            expect(adapter).toBeTruthy();
        });

        it('should handle invalid configuration', async () => {
            const invalidConfig: BrowserConfig = {
                timeout: -1000, // Invalid negative timeout
                headless: true
            };

            await expect(
                BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP, invalidConfig)
            ).rejects.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle navigation errors gracefully', async () => {
            const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP);
            
            await expect(adapter.navigate('invalid-url')).rejects.toThrow();
        });

        it('should handle uninitialized adapter calls', async () => {
            const adapter = new BrowserMCPAdapter();
            
            await expect(adapter.navigate('https://example.com')).rejects.toThrow();
        });
    });

    describe('Resource Management', () => {
        it('should properly close adapters', async () => {
            const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP);
            await expect(adapter.close()).resolves.not.toThrow();
        });

        it('should handle multiple close calls', async () => {
            const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP);
            
            await adapter.close();
            await expect(adapter.close()).resolves.not.toThrow();
        });
    });
});

describe('Integration with Google Images Downloader', () => {
    it('should be compatible with existing Google Images implementation', async () => {
        // Test that the consolidated adapter works with the Google Images downloader
        const adapter = await BrowserAdapterFactory.create(BrowserAdapterType.BROWSER_MCP);
        
        // Should be able to navigate to Google Images
        await expect(adapter.navigate('https://images.google.com')).resolves.not.toThrow();
        
        // Should be able to fill search input
        await expect(adapter.fillInput({
            selector: 'input[name="q"]',
            value: 'test query'
        })).resolves.not.toThrow();
        
        // Should be able to wait for results
        await expect(adapter.waitForElement({
            selector: '[data-ri]'
        })).resolves.not.toThrow();
        
        await adapter.close();
    });
});