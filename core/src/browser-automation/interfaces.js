"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAutomationError = void 0;
class BrowserAutomationError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BrowserAutomationError';
    }
}
exports.BrowserAutomationError = BrowserAutomationError;
//# sourceMappingURL=interfaces.js.map