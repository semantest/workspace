/*
                        Semantest - Browser Selector Strategies
                        Unified selector strategies for browser automation

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import { SelectorOptions } from './interfaces';

/**
 * Selector strategy types
 */
export enum SelectorStrategy {
    CSS = 'css',
    XPATH = 'xpath',
    TEXT = 'text',
    ID = 'id',
    CLASS = 'class',
    NAME = 'name',
    TAG = 'tag',
    ATTRIBUTE = 'attribute'
}

/**
 * Enhanced selector options with strategy hints
 */
export interface EnhancedSelectorOptions extends SelectorOptions {
    /** Preferred selector strategy */
    strategy?: SelectorStrategy;
    /** Attribute name for attribute selector */
    attributeName?: string;
    /** Attribute value for attribute selector */
    attributeValue?: string;
    /** Partial text match */
    partialText?: boolean;
    /** Case insensitive text match */
    ignoreCase?: boolean;
}

/**
 * Selector builder for creating optimized selectors
 */
export class SelectorBuilder {
    /**
     * Build CSS selector from enhanced options
     */
    static buildCssSelector(options: EnhancedSelectorOptions): string {
        if (options.selector) {
            return options.selector;
        }

        let selector = '';

        // ID selector
        if (options.strategy === SelectorStrategy.ID && options.attributeValue) {
            selector = `#${CSS.escape(options.attributeValue)}`;
        }
        // Class selector
        else if (options.strategy === SelectorStrategy.CLASS && options.attributeValue) {
            selector = `.${CSS.escape(options.attributeValue)}`;
        }
        // Tag selector
        else if (options.strategy === SelectorStrategy.TAG && options.attributeValue) {
            selector = options.attributeValue;
        }
        // Name attribute selector
        else if (options.strategy === SelectorStrategy.NAME && options.attributeValue) {
            selector = `[name="${CSS.escape(options.attributeValue)}"]`;
        }
        // Custom attribute selector
        else if (options.strategy === SelectorStrategy.ATTRIBUTE && options.attributeName) {
            if (options.attributeValue) {
                selector = `[${options.attributeName}="${CSS.escape(options.attributeValue)}"]`;
            } else {
                selector = `[${options.attributeName}]`;
            }
        }

        return selector;
    }

    /**
     * Build XPath selector from enhanced options
     */
    static buildXpathSelector(options: EnhancedSelectorOptions): string {
        if (options.xpath) {
            return options.xpath;
        }

        let xpath = '';

        // Convert CSS to XPath if needed
        if (options.selector) {
            xpath = this.cssToXpath(options.selector);
        }
        // Text-based XPath
        else if (options.text) {
            if (options.partialText) {
                xpath = `//*[contains(text(), "${this.escapeXpathString(options.text)}")]`;
            } else {
                xpath = `//*[text()="${this.escapeXpathString(options.text)}"]`;
            }

            if (options.ignoreCase) {
                xpath = xpath.replace('text()', 'translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")');
                const lowerText = options.text.toLowerCase();
                xpath = xpath.replace(options.text, lowerText);
            }
        }

        return xpath;
    }

    /**
     * Convert CSS selector to XPath (basic conversion)
     */
    private static cssToXpath(css: string): string {
        // Handle ID selector
        if (css.startsWith('#')) {
            const id = css.substring(1);
            return `//*[@id="${id}"]`;
        }
        
        // Handle class selector
        if (css.startsWith('.')) {
            const className = css.substring(1);
            return `//*[contains(@class, "${className}")]`;
        }
        
        // Handle attribute selector
        const attrMatch = css.match(/\[([^=\]]+)(?:="([^"]+)")?\]/);
        if (attrMatch) {
            const [, attr, value] = attrMatch;
            if (value) {
                return `//*[@${attr}="${value}"]`;
            } else {
                return `//*[@${attr}]`;
            }
        }
        
        // Handle tag selector
        if (/^[a-zA-Z]+$/.test(css)) {
            return `//${css}`;
        }
        
        // Complex selectors not supported, return as-is
        return css;
    }

    /**
     * Escape string for XPath
     */
    private static escapeXpathString(str: string): string {
        if (!str.includes('"')) {
            return str;
        }
        if (!str.includes("'")) {
            return str;
        }
        
        // If string contains both quotes, use concat
        const parts = str.split('"');
        return `concat("${parts.join('", \'"\', "')}")`;
    }

    /**
     * Optimize selector for performance
     */
    static optimizeSelector(options: EnhancedSelectorOptions): EnhancedSelectorOptions {
        const optimized = { ...options };

        // Prefer ID selectors for performance
        if (options.selector) {
            const idMatch = options.selector.match(/#([a-zA-Z0-9_-]+)/);
            if (idMatch) {
                optimized.strategy = SelectorStrategy.ID;
                optimized.attributeValue = idMatch[1];
                return optimized;
            }
        }

        // Prefer specific attribute selectors
        if (options.selector) {
            const nameMatch = options.selector.match(/\[name="([^"]+)"\]/);
            if (nameMatch) {
                optimized.strategy = SelectorStrategy.NAME;
                optimized.attributeValue = nameMatch[1];
                return optimized;
            }
        }

        return optimized;
    }

    /**
     * Validate selector syntax
     */
    static validateSelector(options: EnhancedSelectorOptions): boolean {
        try {
            if (options.selector) {
                // Test CSS selector validity
                document.querySelector(options.selector);
            }
            
            if (options.xpath) {
                // Basic XPath validation
                if (!options.xpath.startsWith('/') && !options.xpath.startsWith('./')) {
                    return false;
                }
            }
            
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Selector conversion utilities
 */
export class SelectorConverter {
    /**
     * Convert between different selector formats
     */
    static convert(
        from: SelectorStrategy,
        to: SelectorStrategy,
        value: string
    ): string | null {
        // CSS to XPath
        if (from === SelectorStrategy.CSS && to === SelectorStrategy.XPATH) {
            return SelectorBuilder.buildXpathSelector({ selector: value });
        }
        
        // ID to CSS
        if (from === SelectorStrategy.ID && to === SelectorStrategy.CSS) {
            return `#${CSS.escape(value)}`;
        }
        
        // Class to CSS
        if (from === SelectorStrategy.CLASS && to === SelectorStrategy.CSS) {
            return `.${CSS.escape(value)}`;
        }
        
        // Text to XPath
        if (from === SelectorStrategy.TEXT && to === SelectorStrategy.XPATH) {
            return SelectorBuilder.buildXpathSelector({ text: value });
        }
        
        return null;
    }

    /**
     * Detect selector strategy from string
     */
    static detectStrategy(selector: string): SelectorStrategy {
        // XPath detection
        if (selector.startsWith('/') || selector.startsWith('./')) {
            return SelectorStrategy.XPATH;
        }
        
        // ID detection
        if (selector.match(/^#[a-zA-Z0-9_-]+$/)) {
            return SelectorStrategy.ID;
        }
        
        // Class detection
        if (selector.match(/^\.[a-zA-Z0-9_-]+$/)) {
            return SelectorStrategy.CLASS;
        }
        
        // Tag detection
        if (selector.match(/^[a-zA-Z]+$/)) {
            return SelectorStrategy.TAG;
        }
        
        // Default to CSS
        return SelectorStrategy.CSS;
    }
}