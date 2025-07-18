/**
 * Semantest Error Handling System
 * 
 * This module provides a comprehensive error handling framework with:
 * - Structured error hierarchy
 * - Rich context information
 * - Recovery suggestions
 * - User and developer friendly messages
 * - Integration with logging and monitoring
 */

// Base error
export * from './base.error';

// Domain errors
export * from './domain.error';

// Validation errors
export * from './validation.error';

// Infrastructure errors
export * from './infrastructure.error';

// Browser automation errors
export * from './browser.error';

// Security errors
export * from './security.error';

// Error handler utilities
export * from './error-handler';
export * from './error-boundary';