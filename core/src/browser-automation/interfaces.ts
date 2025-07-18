/*
                        Semantest - Core Browser Automation Interfaces
                        Common interfaces for browser automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Common browser configuration options
 */
export interface BrowserConfig {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** User agent string */
    userAgent?: string;
    /** Viewport dimensions */
    viewport?: ViewportSize;
    /** Path to browser executable */
    executablePath?: string;
    /** Additional browser arguments */
    args?: string[];
    /** Path for downloads */
    downloadsPath?: string;
    /** User data directory */
    userDataDir?: string;
    /** Run in headless mode */
    headless?: boolean;
    /** Slow down operations by specified milliseconds */
    slowMo?: number;
}

/**
 * Viewport size configuration
 */
export interface ViewportSize {
    width: number;
    height: number;
}

/**
 * Navigation options
 */
export interface NavigationOptions {
    /** Wait until condition */
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    /** Navigation timeout */
    timeout?: number;
}

/**
 * Element selector options
 */
export interface SelectorOptions {
    /** CSS selector */
    selector?: string;
    /** XPath selector */
    xpath?: string;
    /** Text content selector */
    text?: string;
    /** Timeout for element to appear */
    timeout?: number;
}

/**
 * Form input options
 */
export interface FormInputOptions extends SelectorOptions {
    /** Value to input */
    value: string;
    /** Clear existing value first */
    clear?: boolean;
    /** Delay between keystrokes */
    delay?: number;
}

/**
 * Click options
 */
export interface ClickOptions extends SelectorOptions {
    /** Click count */
    clickCount?: number;
    /** Mouse button */
    button?: 'left' | 'right' | 'middle';
    /** Delay between clicks */
    delay?: number;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
    /** Screenshot path */
    path?: string;
    /** Full page screenshot */
    fullPage?: boolean;
    /** Element selector to screenshot */
    selector?: string;
    /** Image type */
    type?: 'png' | 'jpeg';
    /** JPEG quality (0-100) */
    quality?: number;
}

/**
 * Base browser automation adapter interface
 */
export interface IBrowserAutomationAdapter {
    /** Initialize the browser */
    initialize(config?: BrowserConfig): Promise<void>;
    
    /** Navigate to URL */
    navigate(url: string, options?: NavigationOptions): Promise<void>;
    
    /** Fill form input */
    fillInput(options: FormInputOptions): Promise<void>;
    
    /** Click element */
    click(options: ClickOptions): Promise<void>;
    
    /** Take screenshot */
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    
    /** Get page content */
    getContent(): Promise<string>;
    
    /** Get page title */
    getTitle(): Promise<string>;
    
    /** Wait for element */
    waitForElement(options: SelectorOptions): Promise<void>;
    
    /** Close browser */
    close(): Promise<void>;
}

/**
 * Browser automation error
 */
export class BrowserAutomationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'BrowserAutomationError';
    }
}