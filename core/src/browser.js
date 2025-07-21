"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserUtils = exports.SelectorGenerator = exports.SelectorStrategy = void 0;
var SelectorStrategy;
(function (SelectorStrategy) {
    SelectorStrategy["CSS"] = "css";
    SelectorStrategy["XPATH"] = "xpath";
    SelectorStrategy["TEXT"] = "text";
    SelectorStrategy["ATTRIBUTE"] = "attribute";
})(SelectorStrategy || (exports.SelectorStrategy = SelectorStrategy = {}));
class SelectorGenerator {
    static generateCssSelector(element) {
        const selectors = [];
        if (element.id) {
            selectors.push(`#${element.id}`);
        }
        if (element.className) {
            const classes = element.className.split(' ').filter(Boolean);
            if (classes.length > 0) {
                selectors.push(`.${classes.join('.')}`);
            }
        }
        if (element.src) {
            selectors.push(`[src="${element.src}"]`);
        }
        if (element.alt) {
            selectors.push(`[alt="${element.alt}"]`);
        }
        if (element.title) {
            selectors.push(`[title="${element.title}"]`);
        }
        const tagName = element.tagName?.toLowerCase() || 'div';
        selectors.push(tagName);
        return selectors[0] || tagName;
    }
    static generateXPathSelector(element) {
        const parts = [];
        let currentElement = element;
        while (currentElement && currentElement.tagName) {
            let tagName = currentElement.tagName.toLowerCase();
            let index = 1;
            if (currentElement.parentNode) {
                const siblings = Array.from(currentElement.parentNode.children);
                const sameTagSiblings = siblings.filter(sibling => sibling.tagName?.toLowerCase() === tagName);
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
    static generateTextSelector(element) {
        const text = element.textContent?.trim();
        if (!text)
            return null;
        const maxLength = 50;
        const truncatedText = text.length > maxLength ?
            text.substring(0, maxLength) + '...' : text;
        return `//*[contains(text(), "${truncatedText}")]`;
    }
}
exports.SelectorGenerator = SelectorGenerator;
class BrowserUtils {
    static async waitForVisible(browser, selector, timeout = 5000) {
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
    static async waitForEnabled(browser, selector, timeout = 5000) {
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
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static extractImageInfo(element) {
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
    static isGoogleImagesThumbnail(url) {
        return url.includes('encrypted-tbn0.gstatic.com') ||
            url.includes('googleusercontent.com') ||
            url.includes('google.com/images') ||
            url.includes('gstatic.com');
    }
    static isDirectImageUrl(url) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const lowerUrl = url.toLowerCase();
        return imageExtensions.some(ext => lowerUrl.includes(ext)) &&
            !this.isGoogleImagesThumbnail(url);
    }
}
exports.BrowserUtils = BrowserUtils;
//# sourceMappingURL=browser.js.map