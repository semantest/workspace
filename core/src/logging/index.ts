/**
 * Semantest Logging System
 * 
 * Provides structured logging with:
 * - Multiple log levels
 * - JSON and pretty formatting
 * - Sensitive data redaction
 * - Custom transports
 * - Correlation ID support
 */

// Core logging
export * from './interfaces';
export * from './logger';

// Transports
export * from './transports/console';

// Formatters
export * from './formatters/json';
export * from './formatters/pretty';

// Utilities
export * from './utils/redact';

// Re-export global logger for convenience
export { logger, createLogger } from './logger';