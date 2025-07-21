"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonSecurityRules = exports.SecurityAuditLogger = exports.EncryptionUtils = exports.RateLimiter = exports.CSRFProtection = exports.InputSanitizer = exports.PermissionChecker = exports.SecurityValidator = exports.SecurityLevel = void 0;
var SecurityLevel;
(function (SecurityLevel) {
    SecurityLevel["LOW"] = "low";
    SecurityLevel["MEDIUM"] = "medium";
    SecurityLevel["HIGH"] = "high";
    SecurityLevel["CRITICAL"] = "critical";
})(SecurityLevel || (exports.SecurityLevel = SecurityLevel = {}));
class SecurityValidator {
    constructor() {
        this.policies = new Map();
    }
    addPolicy(policy) {
        this.policies.set(policy.name, policy);
    }
    removePolicy(policyName) {
        this.policies.delete(policyName);
    }
    validate(context) {
        const violations = [];
        for (const policy of this.policies.values()) {
            if (!policy.isEnabled) {
                continue;
            }
            for (const rule of policy.rules) {
                if (!rule.validate(context)) {
                    violations.push({
                        ruleId: rule.id,
                        ruleName: rule.name,
                        message: rule.getViolationMessage(),
                        context,
                        timestamp: new Date(),
                        severity: policy.level
                    });
                }
            }
        }
        return violations;
    }
    hasViolations(context) {
        return this.validate(context).length > 0;
    }
}
exports.SecurityValidator = SecurityValidator;
class PermissionChecker {
    static hasPermission(context, permission) {
        return context.permissions.includes(permission);
    }
    static hasAnyPermission(context, permissions) {
        return permissions.some(permission => context.permissions.includes(permission));
    }
    static hasAllPermissions(context, permissions) {
        return permissions.every(permission => context.permissions.includes(permission));
    }
    static hasRole(context, role) {
        return context.roles.includes(role);
    }
    static hasAnyRole(context, roles) {
        return roles.some(role => context.roles.includes(role));
    }
    static hasAllRoles(context, roles) {
        return roles.every(role => context.roles.includes(role));
    }
}
exports.PermissionChecker = PermissionChecker;
class InputSanitizer {
    static sanitizeHtml(input) {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    static sanitizeSql(input) {
        return input
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/;/g, '\\;')
            .replace(/--/g, '\\--')
            .replace(/\/\*/g, '\\/*')
            .replace(/\*\//g, '\\*/');
    }
    static sanitizeFilename(input) {
        return input
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.\./g, '_')
            .replace(/^\./, '_')
            .substring(0, 255);
    }
    static sanitizeUrl(input) {
        try {
            const url = new URL(input);
            return url.href;
        }
        catch {
            return '';
        }
    }
    static removeDangerousChars(input) {
        return input.replace(/[<>'"&\x00-\x1F\x7F-\x9F]/g, '');
    }
    static sanitizeEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const sanitized = input.trim().toLowerCase();
        return emailRegex.test(sanitized) ? sanitized : '';
    }
}
exports.InputSanitizer = InputSanitizer;
class CSRFProtection {
    static generateToken(sessionId) {
        const token = this.generateRandomToken();
        this.tokens.set(sessionId, token);
        return token;
    }
    static validateToken(sessionId, token) {
        const storedToken = this.tokens.get(sessionId);
        return storedToken === token;
    }
    static removeToken(sessionId) {
        this.tokens.delete(sessionId);
    }
    static generateRandomToken() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}
exports.CSRFProtection = CSRFProtection;
CSRFProtection.tokens = new Map();
class RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }
    isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }
        const userRequests = this.requests.get(identifier);
        const validRequests = userRequests.filter(time => time > windowStart);
        this.requests.set(identifier, validRequests);
        if (validRequests.length >= this.maxRequests) {
            return false;
        }
        validRequests.push(now);
        return true;
    }
    getRemainingRequests(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        if (!this.requests.has(identifier)) {
            return this.maxRequests;
        }
        const userRequests = this.requests.get(identifier);
        const validRequests = userRequests.filter(time => time > windowStart);
        return Math.max(0, this.maxRequests - validRequests.length);
    }
    reset(identifier) {
        this.requests.delete(identifier);
    }
}
exports.RateLimiter = RateLimiter;
class EncryptionUtils {
    static generateSalt(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    static async hashPassword(password, salt) {
        const actualSalt = salt || this.generateSalt();
        const encoder = new TextEncoder();
        const data = encoder.encode(password + actualSalt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `${actualSalt}:${hashHex}`;
    }
    static async verifyPassword(password, hashedPassword) {
        const [salt, hash] = hashedPassword.split(':');
        const newHash = await this.hashPassword(password, salt);
        return newHash === hashedPassword;
    }
    static generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}
exports.EncryptionUtils = EncryptionUtils;
class SecurityAuditLogger {
    constructor() {
        this.logs = [];
    }
    log(violation) {
        this.logs.push(violation);
        console.warn('Security violation:', violation);
    }
    getLogs() {
        return [...this.logs];
    }
    getLogsByLevel(level) {
        return this.logs.filter(log => log.severity === level);
    }
    getLogsByRule(ruleId) {
        return this.logs.filter(log => log.ruleId === ruleId);
    }
    clearLogs() {
        this.logs = [];
    }
}
exports.SecurityAuditLogger = SecurityAuditLogger;
class CommonSecurityRules {
    static createRequireAuthenticationRule() {
        return {
            id: 'require-auth',
            name: 'Require Authentication',
            description: 'User must be authenticated',
            validate: (context) => !!context.userId,
            getViolationMessage: () => 'Authentication required'
        };
    }
    static createRequirePermissionRule(permission) {
        return {
            id: `require-permission-${permission}`,
            name: `Require Permission: ${permission}`,
            description: `User must have permission: ${permission}`,
            validate: (context) => context.permissions.includes(permission),
            getViolationMessage: () => `Permission required: ${permission}`
        };
    }
    static createRequireRoleRule(role) {
        return {
            id: `require-role-${role}`,
            name: `Require Role: ${role}`,
            description: `User must have role: ${role}`,
            validate: (context) => context.roles.includes(role),
            getViolationMessage: () => `Role required: ${role}`
        };
    }
    static createIPWhitelistRule(allowedIPs) {
        return {
            id: 'ip-whitelist',
            name: 'IP Whitelist',
            description: 'Request must come from allowed IP',
            validate: (context) => !context.ipAddress || allowedIPs.includes(context.ipAddress),
            getViolationMessage: () => 'IP address not allowed'
        };
    }
}
exports.CommonSecurityRules = CommonSecurityRules;
//# sourceMappingURL=security.js.map