"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBrowserAutomationAdapter = void 0;
const interfaces_1 = require("./interfaces");
const config_validator_1 = require("./config-validator");
class BaseBrowserAutomationAdapter {
    constructor() {
        this.config = {
            timeout: 30000,
            headless: true,
            viewport: { width: 1280, height: 720 }
        };
        this.initialized = false;
        this.validator = new config_validator_1.BrowserConfigValidator();
    }
    async initialize(config) {
        if (config) {
            this.validator.validateConfig(config);
            this.config = { ...this.config, ...config };
        }
        await this.doInitialize();
        this.initialized = true;
    }
    async navigate(url, options) {
        this.ensureInitialized();
        this.validateUrl(url);
        await this.doNavigate(url, options);
    }
    async fillInput(options) {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        if (!options.value || typeof options.value !== 'string') {
            throw new interfaces_1.BrowserAutomationError('Invalid input value', 'INVALID_INPUT_VALUE');
        }
        await this.doFillInput(options);
    }
    async click(options) {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        await this.doClick(options);
    }
    async screenshot(options) {
        this.ensureInitialized();
        return await this.doScreenshot(options);
    }
    async getContent() {
        this.ensureInitialized();
        return await this.doGetContent();
    }
    async getTitle() {
        this.ensureInitialized();
        return await this.doGetTitle();
    }
    async waitForElement(options) {
        this.ensureInitialized();
        this.validateSelectorOptions(options);
        await this.doWaitForElement(options);
    }
    async close() {
        if (!this.initialized) {
            return;
        }
        await this.doClose();
        this.initialized = false;
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new interfaces_1.BrowserAutomationError('Browser not initialized', 'NOT_INITIALIZED');
        }
    }
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new interfaces_1.BrowserAutomationError('Invalid URL', 'INVALID_URL');
        }
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
                throw new interfaces_1.BrowserAutomationError('Invalid URL protocol', 'INVALID_PROTOCOL');
            }
        }
        catch (error) {
            throw new interfaces_1.BrowserAutomationError('Invalid URL format', 'INVALID_URL_FORMAT');
        }
    }
    validateSelectorOptions(options) {
        if (!options.selector && !options.xpath && !options.text) {
            throw new interfaces_1.BrowserAutomationError('No selector provided', 'NO_SELECTOR');
        }
    }
}
exports.BaseBrowserAutomationAdapter = BaseBrowserAutomationAdapter;
//# sourceMappingURL=base-adapter.js.map