/*
                        Semantest - Browser Adapter Factory
                        Factory for creating browser automation adapters

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { IBrowserAutomationAdapter, BrowserConfig } from './interfaces';
import { PlaywrightBrowserAdapter } from './playwright-adapter';
import { BrowserMCPAdapter } from './browser-mcp-adapter';

/**
 * Browser adapter types
 */
export enum BrowserAdapterType {
    PLAYWRIGHT = 'playwright',
    BROWSER_MCP = 'browser-mcp',
    AUTO = 'auto'
}

/**
 * Factory for creating browser automation adapters
 * 
 * This factory provides a unified interface for creating browser
 * automation adapters, automatically selecting the best available
 * adapter or allowing manual selection.
 */
export class BrowserAdapterFactory {
    private static adapters = new Map<string, IBrowserAutomationAdapter>();

    /**
     * Create a browser automation adapter
     * 
     * @param type - The type of adapter to create (defaults to AUTO)
     * @param config - Browser configuration options
     * @returns Initialized browser automation adapter
     */
    static async create(
        type: BrowserAdapterType = BrowserAdapterType.AUTO,
        config?: BrowserConfig
    ): Promise<IBrowserAutomationAdapter> {
        let adapter: IBrowserAutomationAdapter;

        switch (type) {
            case BrowserAdapterType.PLAYWRIGHT:
                adapter = await this.createPlaywrightAdapter();
                break;
                
            case BrowserAdapterType.BROWSER_MCP:
                adapter = await this.createBrowserMCPAdapter();
                break;
                
            case BrowserAdapterType.AUTO:
            default:
                adapter = await this.createBestAvailableAdapter();
                break;
        }

        // Initialize the adapter with config
        await adapter.initialize(config);
        
        return adapter;
    }

    /**
     * Get or create a singleton adapter instance
     * 
     * @param key - Unique key for the adapter instance
     * @param type - The type of adapter to create
     * @param config - Browser configuration options
     * @returns Browser automation adapter instance
     */
    static async getInstance(
        key: string,
        type: BrowserAdapterType = BrowserAdapterType.AUTO,
        config?: BrowserConfig
    ): Promise<IBrowserAutomationAdapter> {
        if (!this.adapters.has(key)) {
            const adapter = await this.create(type, config);
            this.adapters.set(key, adapter);
        }
        
        return this.adapters.get(key)!;
    }

    /**
     * Close and remove a singleton adapter instance
     * 
     * @param key - Unique key for the adapter instance
     */
    static async closeInstance(key: string): Promise<void> {
        const adapter = this.adapters.get(key);
        if (adapter) {
            await adapter.close();
            this.adapters.delete(key);
        }
    }

    /**
     * Close all adapter instances
     */
    static async closeAll(): Promise<void> {
        const closePromises = Array.from(this.adapters.entries()).map(
            async ([key, adapter]) => {
                await adapter.close();
                this.adapters.delete(key);
            }
        );
        
        await Promise.all(closePromises);
    }

    /**
     * Create Playwright adapter
     */
    private static async createPlaywrightAdapter(): Promise<IBrowserAutomationAdapter> {
        const isAvailable = await PlaywrightBrowserAdapter.isAvailable();
        
        if (!isAvailable) {
            throw new Error(
                'Playwright is not available. Please install it with: npm install playwright'
            );
        }
        
        return new PlaywrightBrowserAdapter();
    }

    /**
     * Create Browser MCP adapter
     */
    private static async createBrowserMCPAdapter(): Promise<IBrowserAutomationAdapter> {
        const isAvailable = await BrowserMCPAdapter.isAvailable();
        
        if (!isAvailable) {
            throw new Error('Browser MCP is not available');
        }
        
        return new BrowserMCPAdapter();
    }

    /**
     * Create the best available adapter
     * 
     * Priority order:
     * 1. Playwright (if available)
     * 2. Browser MCP (fallback)
     */
    private static async createBestAvailableAdapter(): Promise<IBrowserAutomationAdapter> {
        // Try Playwright first
        try {
            if (await PlaywrightBrowserAdapter.isAvailable()) {
                return new PlaywrightBrowserAdapter();
            }
        } catch {
            // Playwright not available
        }

        // Fallback to Browser MCP
        if (await BrowserMCPAdapter.isAvailable()) {
            return new BrowserMCPAdapter();
        }

        throw new Error(
            'No browser automation adapter available. Please install Playwright or ensure Browser MCP is running.'
        );
    }

    /**
     * Get available adapter types
     */
    static async getAvailableAdapters(): Promise<BrowserAdapterType[]> {
        const available: BrowserAdapterType[] = [];

        if (await PlaywrightBrowserAdapter.isAvailable()) {
            available.push(BrowserAdapterType.PLAYWRIGHT);
        }

        if (await BrowserMCPAdapter.isAvailable()) {
            available.push(BrowserAdapterType.BROWSER_MCP);
        }

        return available;
    }

    /**
     * Check if a specific adapter type is available
     */
    static async isAdapterAvailable(type: BrowserAdapterType): Promise<boolean> {
        switch (type) {
            case BrowserAdapterType.PLAYWRIGHT:
                return await PlaywrightBrowserAdapter.isAvailable();
                
            case BrowserAdapterType.BROWSER_MCP:
                return await BrowserMCPAdapter.isAvailable();
                
            case BrowserAdapterType.AUTO:
                const available = await this.getAvailableAdapters();
                return available.length > 0;
                
            default:
                return false;
        }
    }
}