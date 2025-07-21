export declare enum SecurityLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface SecurityPolicy {
    name: string;
    level: SecurityLevel;
    rules: SecurityRule[];
    isEnabled: boolean;
}
export interface SecurityRule {
    id: string;
    name: string;
    description: string;
    validate(context: SecurityContext): boolean;
    getViolationMessage(): string;
}
export interface SecurityContext {
    userId?: string;
    sessionId?: string;
    permissions: string[];
    roles: string[];
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export interface SecurityViolation {
    ruleId: string;
    ruleName: string;
    message: string;
    context: SecurityContext;
    timestamp: Date;
    severity: SecurityLevel;
}
export declare class SecurityValidator {
    private policies;
    addPolicy(policy: SecurityPolicy): void;
    removePolicy(policyName: string): void;
    validate(context: SecurityContext): SecurityViolation[];
    hasViolations(context: SecurityContext): boolean;
}
export declare class PermissionChecker {
    static hasPermission(context: SecurityContext, permission: string): boolean;
    static hasAnyPermission(context: SecurityContext, permissions: string[]): boolean;
    static hasAllPermissions(context: SecurityContext, permissions: string[]): boolean;
    static hasRole(context: SecurityContext, role: string): boolean;
    static hasAnyRole(context: SecurityContext, roles: string[]): boolean;
    static hasAllRoles(context: SecurityContext, roles: string[]): boolean;
}
export declare class InputSanitizer {
    static sanitizeHtml(input: string): string;
    static sanitizeSql(input: string): string;
    static sanitizeFilename(input: string): string;
    static sanitizeUrl(input: string): string;
    static removeDangerousChars(input: string): string;
    static sanitizeEmail(input: string): string;
}
export declare class CSRFProtection {
    private static tokens;
    static generateToken(sessionId: string): string;
    static validateToken(sessionId: string, token: string): boolean;
    static removeToken(sessionId: string): void;
    private static generateRandomToken;
}
export declare class RateLimiter {
    private maxRequests;
    private windowMs;
    private requests;
    constructor(maxRequests?: number, windowMs?: number);
    isAllowed(identifier: string): boolean;
    getRemainingRequests(identifier: string): number;
    reset(identifier: string): void;
}
export declare class EncryptionUtils {
    static generateSalt(length?: number): string;
    static hashPassword(password: string, salt?: string): Promise<string>;
    static verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    static generateToken(length?: number): string;
}
export declare class SecurityAuditLogger {
    private logs;
    log(violation: SecurityViolation): void;
    getLogs(): SecurityViolation[];
    getLogsByLevel(level: SecurityLevel): SecurityViolation[];
    getLogsByRule(ruleId: string): SecurityViolation[];
    clearLogs(): void;
}
export declare class CommonSecurityRules {
    static createRequireAuthenticationRule(): SecurityRule;
    static createRequirePermissionRule(permission: string): SecurityRule;
    static createRequireRoleRule(role: string): SecurityRule;
    static createIPWhitelistRule(allowedIPs: string[]): SecurityRule;
}
//# sourceMappingURL=security.d.ts.map