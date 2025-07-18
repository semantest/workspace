/*
                        Semantest - Base Browser Automation Adapter
                        Abstract base class for browser automation adapters

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import {
    BrowserConfig,
    IBrowserAutomationAdapter,
    NavigationOptions,
    FormInputOptions,
    ClickOptions,
    ScreenshotOptions,
    SelectorOptions,
    BrowserAutomationError
} from './interfaces';
import { BrowserConfigValidator } from './config-validator';

/**
 * Abstract base class for browser automation adapters
 * Provides common functionality and validation
 */
export abstract class BaseBrowserAutomationAdapter implements IBrowserAutomationAdapter {
    protected config: BrowserConfig = {
        timeout: 30000,
        headless: true,
        viewport: { width: 1280, height: 720 }
    };
    
    protected initialized = false;
    protected validator = new BrowserConfigValidator();

    /**
     * Initialize the browser with configuration
     */
    async initialize(config?: BrowserConfig): Promise<void> {
        if (config) {
            this.validator.validateConfig(config);
            this.config = { ...this.config, ...config };
        }
        
        await this.doInitialize();
        this.initialized = true;
    }

    /**
     * Navigate to URL with validation
     */
    async navigate(url: string, options?: NavigationOptions): Promise<void> {
        this.ensureInitialized();
        this.validateUrl(url);
        
        await this.doNavigate(url, options);
    }

    /**
     * Fill form input with validation
     */
    async fillInput(options: FormInputOptions): Promise<void> {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        
        if (!options.value || typeof options.value !== 'string') {
            throw new BrowserAutomationError(
                'Invalid input value',
                'INVALID_INPUT_VALUE'
            );
        }
        
        await this.doFillInput(options);
    }

    /**
     * Click element with validation
     */
    async click(options: ClickOptions): Promise<void> {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        
        await this.doClick(options);
    }

    /**
     * Take screenshot with validation
     */
    async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
        this.ensureInitialized();
        
        return await this.doScreenshot(options);
    }

    /**
     * Get page content
     */
    async getContent(): Promise<string> {
        this.ensureInitialized();
        
        return await this.doGetContent();
    }

    /**
     * Get page title
     */
    async getTitle(): Promise<string> {
        this.ensureInitialized();
        
        return await this.doGetTitle();
    }

    /**
     * Wait for element with validation
     */
    async waitForElement(options: SelectorOptions): Promise<void> {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        
        await this.doWaitForElement(options);
    }

    /**
     * Close browser
     */
    async close(): Promise<void> {
        if (!this.initialized) {
            return;
        }
        
        await this.doClose();
        this.initialized = false;
    }

    /**
     * Ensure browser is initialized
     */
    protected ensureInitialized(): void {
        if (!this.initialized) {
            throw new BrowserAutomationError(
                'Browser not initialized',
                'NOT_INITIALIZED'
            );
        }
    }

    /**
     * Validate URL
     */
    protected validateUrl(url: string): void {
        if (!url || typeof url !== 'string') {
            throw new BrowserAutomationError(
                'Invalid URL',
                'INVALID_URL'
            );
        }

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
                throw new BrowserAutomationError(
                    'Invalid URL protocol',
                    'INVALID_PROTOCOL'
                );
            }
        } catch (error) {
            throw new BrowserAutomationError(
                'Invalid URL format',
                'INVALID_URL_FORMAT'
            );
        }
    }

    /**
     * Validate selector options
     */
    protected validateSelectorOptions(options: SelectorOptions): void {
        if (!options.selector && !options.xpath && !options.text) {
            throw new BrowserAutomationError(
                'No selector provided',
                'NO_SELECTOR'
            );
        }
    }

    // Abstract methods to be implemented by subclasses
    protected abstract doInitialize(): Promise<void>;
    protected abstract doNavigate(url: string, options?: NavigationOptions): Promise<void>;
    protected abstract doFillInput(options: FormInputOptions): Promise<void>;
    protected abstract doClick(options: ClickOptions): Promise<void>;
    protected abstract doScreenshot(options?: ScreenshotOptions): Promise<Buffer>;
    protected abstract doGetContent(): Promise<string>;
    protected abstract doGetTitle(): Promise<string>;
    protected abstract doWaitForElement(options: SelectorOptions): Promise<void>;
    protected abstract doClose(): Promise<void>;
}