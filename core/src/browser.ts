/*
                        Semantest - Core Browser
                        Browser automation utilities and interfaces

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Browser selector strategy
 */
export enum SelectorStrategy {
    CSS = 'css',
    XPATH = 'xpath',
    TEXT = 'text',
    ATTRIBUTE = 'attribute'
}

/**
 * Browser selector configuration
 */
export interface SelectorConfig {
    strategy: SelectorStrategy;
    selector: string;
    timeout?: number;
    visible?: boolean;
    enabled?: boolean;
}

/**
 * Browser element interface
 */
export interface BrowserElement {
    click(): Promise<void>;
    type(text: string): Promise<void>;
    getText(): Promise<string>;
    getAttribute(name: string): Promise<string | null>;
    isVisible(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    getSelector(): string;
    getTagName(): Promise<string>;
    getParent(): Promise<BrowserElement | null>;
    getChildren(): Promise<BrowserElement[]>;
}

/**
 * Browser automation interface
 */
export interface BrowserAutomation {
    navigate(url: string): Promise<void>;
    getUrl(): Promise<string>;
    getTitle(): Promise<string>;
    findElement(config: SelectorConfig): Promise<BrowserElement | null>;
    findElements(config: SelectorConfig): Promise<BrowserElement[]>;
    waitForElement(config: SelectorConfig): Promise<BrowserElement>;
    screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    evaluate(script: string): Promise<any>;
    close(): Promise<void>;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
    fullPage?: boolean;
    element?: BrowserElement;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    quality?: number;
    type?: 'png' | 'jpeg';
}

/**
 * Browser context interface
 */
export interface BrowserContext {
    newPage(): Promise<BrowserAutomation>;
    close(): Promise<void>;
    pages(): Promise<BrowserAutomation[]>;
    cookies(): Promise<Cookie[]>;
    setCookie(cookie: Cookie): Promise<void>;
    clearCookies(): Promise<void>;
}

/**
 * Cookie interface
 */
export interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Browser launch options
 */
export interface BrowserLaunchOptions {
    headless?: boolean;
    devtools?: boolean;
    slowMo?: number;
    timeout?: number;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
    executablePath?: string;
    args?: string[];
}

/**
 * Browser factory interface
 */
export interface BrowserFactory {
    createBrowser(options?: BrowserLaunchOptions): Promise<BrowserContext>;
    createPage(context: BrowserContext): Promise<BrowserAutomation>;
}

/**
 * Selector generator utility
 */
export class SelectorGenerator {
    /**
     * Generate CSS selector from element
     */
    static generateCssSelector(element: any): string {
        const selectors = [];
        
        // ID selector (highest priority)
        if (element.id) {
            selectors.push(`#${element.id}`);
        }
        
        // Class selector
        if (element.className) {
            const classes = element.className.split(' ').filter(Boolean);
            if (classes.length > 0) {
                selectors.push(`.${classes.join('.')}`);
            }
        }
        
        // Attribute selectors
        if (element.src) {
            selectors.push(`[src="${element.src}"]`);
        }
        
        if (element.alt) {
            selectors.push(`[alt="${element.alt}"]`);
        }
        
        if (element.title) {
            selectors.push(`[title="${element.title}"]`);
        }
        
        // Tag with position fallback
        const tagName = element.tagName?.toLowerCase() || 'div';
        selectors.push(tagName);
        
        return selectors[0] || tagName;
    }
    
    /**
     * Generate XPath selector from element
     */
    static generateXPathSelector(element: any): string {
        const parts = [];
        let currentElement = element;
        
        while (currentElement && currentElement.tagName) {
            let tagName = currentElement.tagName.toLowerCase();
            let index = 1;
            
            // Count siblings with same tag name
            if (currentElement.parentNode) {
                const siblings = Array.from(currentElement.parentNode.children);
                const sameTagSiblings = siblings.filter(sibling => 
                    sibling.tagName?.toLowerCase() === tagName
                );
                
                if (sameTagSiblings.length > 1) {
                    index = sameTagSiblings.indexOf(currentElement) + 1;
                    tagName += `[${index}]`;
                }
            }
            
            parts.unshift(tagName);
            currentElement = currentElement.parentNode;
        }
        
        return '//' + parts.join('/');
    }
    
    /**
     * Generate text-based selector
     */
    static generateTextSelector(element: any): string | null {
        const text = element.textContent?.trim();
        if (!text) return null;
        
        // Limit text length for selector
        const maxLength = 50;
        const truncatedText = text.length > maxLength ? 
            text.substring(0, maxLength) + '...' : text;
        
        return `//*[contains(text(), "${truncatedText}")]`;
    }
}

/**
 * Browser utilities
 */
export class BrowserUtils {
    /**
     * Wait for element to be visible
     */
    static async waitForVisible(
        browser: BrowserAutomation,
        selector: string,
        timeout: number = 5000
    ): Promise<BrowserElement | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = await browser.findElement({
                strategy: SelectorStrategy.CSS,
                selector,
                visible: true
            });
            
            if (element && await element.isVisible()) {
                return element;
            }
            
            await this.sleep(100);
        }
        
        return null;
    }
    
    /**
     * Wait for element to be enabled
     */
    static async waitForEnabled(
        browser: BrowserAutomation,
        selector: string,
        timeout: number = 5000
    ): Promise<BrowserElement | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = await browser.findElement({
                strategy: SelectorStrategy.CSS,
                selector,
                enabled: true
            });
            
            if (element && await element.isEnabled()) {
                return element;
            }
            
            await this.sleep(100);
        }
        
        return null;
    }
    
    /**
     * Sleep utility
     */
    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Extract image information from element
     */
    static extractImageInfo(element: any): ImageInfo | null {
        if (!element || element.tagName?.toLowerCase() !== 'img') {
            return null;
        }
        
        return {
            src: element.src || '',
            alt: element.alt || '',
            width: element.naturalWidth || element.width || 0,
            height: element.naturalHeight || element.height || 0,
            title: element.title || ''
        };
    }
    
    /**
     * Check if URL is a Google Images thumbnail
     */
    static isGoogleImagesThumbnail(url: string): boolean {
        return url.includes('encrypted-tbn0.gstatic.com') ||
               url.includes('googleusercontent.com') ||
               url.includes('google.com/images') ||
               url.includes('gstatic.com');
    }
    
    /**
     * Check if URL is a direct image URL
     */
    static isDirectImageUrl(url: string): boolean {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const lowerUrl = url.toLowerCase();
        return imageExtensions.some(ext => lowerUrl.includes(ext)) &&
               !this.isGoogleImagesThumbnail(url);
    }
}

/**
 * Image information interface
 */
export interface ImageInfo {
    src: string;
    alt: string;
    width: number;
    height: number;
    title: string;
}