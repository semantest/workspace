/**
 * Semantest Monitoring System
 * 
 * Provides comprehensive monitoring with:
 * - Health checks
 * - Performance metrics
 * - Request tracking
 * - Alert definitions
 * - Express middleware
 */

// Core monitoring
export * from './interfaces';
export * from './monitoring-service';
export * from './health-checks';

// Express middleware
export * from './express-middleware';

// Re-export global monitoring instance
export { monitoring } from './monitoring-service';