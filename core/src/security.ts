/*
                        Semantest - Core Security
                        Security utilities and patterns

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

/**
 * Security level enum
 */
export enum SecurityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Security policy interface
 */
export interface SecurityPolicy {
    name: string;
    level: SecurityLevel;
    rules: SecurityRule[];
    isEnabled: boolean;
}

/**
 * Security rule interface
 */
export interface SecurityRule {
    id: string;
    name: string;
    description: string;
    validate(context: SecurityContext): boolean;
    getViolationMessage(): string;
}

/**
 * Security context interface
 */
export interface SecurityContext {
    userId?: string;
    sessionId?: string;
    permissions: string[];
    roles: string[];
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}

/**
 * Security violation interface
 */
export interface SecurityViolation {
    ruleId: string;
    ruleName: string;
    message: string;
    context: SecurityContext;
    timestamp: Date;
    severity: SecurityLevel;
}

/**
 * Security validator
 */
export class SecurityValidator {
    private policies: Map<string, SecurityPolicy> = new Map();

    addPolicy(policy: SecurityPolicy): void {
        this.policies.set(policy.name, policy);
    }

    removePolicy(policyName: string): void {
        this.policies.delete(policyName);
    }

    validate(context: SecurityContext): SecurityViolation[] {
        const violations: SecurityViolation[] = [];

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

    hasViolations(context: SecurityContext): boolean {
        return this.validate(context).length > 0;
    }
}

/**
 * Permission checker
 */
export class PermissionChecker {
    static hasPermission(context: SecurityContext, permission: string): boolean {
        return context.permissions.includes(permission);
    }

    static hasAnyPermission(context: SecurityContext, permissions: string[]): boolean {
        return permissions.some(permission => context.permissions.includes(permission));
    }

    static hasAllPermissions(context: SecurityContext, permissions: string[]): boolean {
        return permissions.every(permission => context.permissions.includes(permission));
    }

    static hasRole(context: SecurityContext, role: string): boolean {
        return context.roles.includes(role);
    }

    static hasAnyRole(context: SecurityContext, roles: string[]): boolean {
        return roles.some(role => context.roles.includes(role));
    }

    static hasAllRoles(context: SecurityContext, roles: string[]): boolean {
        return roles.every(role => context.roles.includes(role));
    }
}

/**
 * Input sanitizer
 */
export class InputSanitizer {
    /**
     * Sanitize HTML content
     */
    static sanitizeHtml(input: string): string {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Sanitize SQL input
     */
    static sanitizeSql(input: string): string {
        return input
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/;/g, '\\;')
            .replace(/--/g, '\\--')
            .replace(/\/\*/g, '\\/*')
            .replace(/\*\//g, '\\*/');
    }

    /**
     * Sanitize filename
     */
    static sanitizeFilename(input: string): string {
        return input
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.\./g, '_')
            .replace(/^\./, '_')
            .substring(0, 255);
    }

    /**
     * Sanitize URL
     */
    static sanitizeUrl(input: string): string {
        try {
            const url = new URL(input);
            return url.href;
        } catch {
            return '';
        }
    }

    /**
     * Remove dangerous characters
     */
    static removeDangerousChars(input: string): string {
        return input.replace(/[<>'"&\x00-\x1F\x7F-\x9F]/g, '');
    }

    /**
     * Validate and sanitize email
     */
    static sanitizeEmail(input: string): string {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const sanitized = input.trim().toLowerCase();
        return emailRegex.test(sanitized) ? sanitized : '';
    }
}

/**
 * CSRF protection
 */
export class CSRFProtection {
    private static tokens = new Map<string, string>();

    static generateToken(sessionId: string): string {
        const token = this.generateRandomToken();
        this.tokens.set(sessionId, token);
        return token;
    }

    static validateToken(sessionId: string, token: string): boolean {
        const storedToken = this.tokens.get(sessionId);
        return storedToken === token;
    }

    static removeToken(sessionId: string): void {
        this.tokens.delete(sessionId);
    }

    private static generateRandomToken(): string {
        return Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
    }
}

/**
 * Rate limiter
 */
export class RateLimiter {
    private requests = new Map<string, number[]>();

    constructor(
        private maxRequests: number = 100,
        private windowMs: number = 60000 // 1 minute
    ) {}

    isAllowed(identifier: string): boolean {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }

        const userRequests = this.requests.get(identifier)!;
        
        // Remove old requests
        const validRequests = userRequests.filter(time => time > windowStart);
        this.requests.set(identifier, validRequests);

        // Check if limit exceeded
        if (validRequests.length >= this.maxRequests) {
            return false;
        }

        // Add current request
        validRequests.push(now);
        return true;
    }

    getRemainingRequests(identifier: string): number {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        if (!this.requests.has(identifier)) {
            return this.maxRequests;
        }

        const userRequests = this.requests.get(identifier)!;
        const validRequests = userRequests.filter(time => time > windowStart);
        
        return Math.max(0, this.maxRequests - validRequests.length);
    }

    reset(identifier: string): void {
        this.requests.delete(identifier);
    }
}

/**
 * Encryption utilities
 */
export class EncryptionUtils {
    /**
     * Generate random salt
     */
    static generateSalt(length: number = 16): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Hash password with salt
     */
    static async hashPassword(password: string, salt?: string): Promise<string> {
        const actualSalt = salt || this.generateSalt();
        const encoder = new TextEncoder();
        const data = encoder.encode(password + actualSalt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `${actualSalt}:${hashHex}`;
    }

    /**
     * Verify password
     */
    static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        const [salt, hash] = hashedPassword.split(':');
        const newHash = await this.hashPassword(password, salt);
        return newHash === hashedPassword;
    }

    /**
     * Generate random token
     */
    static generateToken(length: number = 32): string {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

/**
 * Security audit logger
 */
export class SecurityAuditLogger {
    private logs: SecurityViolation[] = [];

    log(violation: SecurityViolation): void {
        this.logs.push(violation);
        console.warn('Security violation:', violation);
    }

    getLogs(): SecurityViolation[] {
        return [...this.logs];
    }

    getLogsByLevel(level: SecurityLevel): SecurityViolation[] {
        return this.logs.filter(log => log.severity === level);
    }

    getLogsByRule(ruleId: string): SecurityViolation[] {
        return this.logs.filter(log => log.ruleId === ruleId);
    }

    clearLogs(): void {
        this.logs = [];
    }
}

/**
 * Common security rules
 */
export class CommonSecurityRules {
    static createRequireAuthenticationRule(): SecurityRule {
        return {
            id: 'require-auth',
            name: 'Require Authentication',
            description: 'User must be authenticated',
            validate: (context: SecurityContext) => !!context.userId,
            getViolationMessage: () => 'Authentication required'
        };
    }

    static createRequirePermissionRule(permission: string): SecurityRule {
        return {
            id: `require-permission-${permission}`,
            name: `Require Permission: ${permission}`,
            description: `User must have permission: ${permission}`,
            validate: (context: SecurityContext) => context.permissions.includes(permission),
            getViolationMessage: () => `Permission required: ${permission}`
        };
    }

    static createRequireRoleRule(role: string): SecurityRule {
        return {
            id: `require-role-${role}`,
            name: `Require Role: ${role}`,
            description: `User must have role: ${role}`,
            validate: (context: SecurityContext) => context.roles.includes(role),
            getViolationMessage: () => `Role required: ${role}`
        };
    }

    static createIPWhitelistRule(allowedIPs: string[]): SecurityRule {
        return {
            id: 'ip-whitelist',
            name: 'IP Whitelist',
            description: 'Request must come from allowed IP',
            validate: (context: SecurityContext) => 
                !context.ipAddress || allowedIPs.includes(context.ipAddress),
            getViolationMessage: () => 'IP address not allowed'
        };
    }
}