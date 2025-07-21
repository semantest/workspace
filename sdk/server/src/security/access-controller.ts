import { SecurityPolicy } from '../types/orchestration';

/**
 * Access control result
 */
export interface AccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Access controller for client and event type restrictions
 */
export class AccessController {
  private policy: SecurityPolicy;
  private authenticatedClients: Set<string> = new Set();
  private metrics = {
    checks: 0,
    allowed: 0,
    denied: 0
  };

  constructor(policy: SecurityPolicy) {
    this.policy = policy;
  }

  /**
   * Check if client has access to perform an action
   */
  async checkAccess(clientId: string, eventType: string): Promise<AccessResult> {
    this.metrics.checks++;

    // Check authentication requirement
    if (this.policy.requireAuthentication && !this.authenticatedClients.has(clientId)) {
      this.metrics.denied++;
      return {
        allowed: false,
        reason: 'Authentication required'
      };
    }

    // Check allowed clients list
    if (this.policy.allowedClients && !this.policy.allowedClients.includes(clientId)) {
      this.metrics.denied++;
      return {
        allowed: false,
        reason: 'Client not in allowed list'
      };
    }

    // Check event type restrictions
    if (this.policy.blockedEventTypes?.includes(eventType)) {
      this.metrics.denied++;
      return {
        allowed: false,
        reason: `Event type ${eventType} is blocked`
      };
    }

    if (this.policy.allowedEventTypes && !this.policy.allowedEventTypes.includes(eventType)) {
      this.metrics.denied++;
      return {
        allowed: false,
        reason: `Event type ${eventType} is not allowed`
      };
    }

    this.metrics.allowed++;
    return { allowed: true };
  }

  /**
   * Authenticate a client
   */
  authenticate(clientId: string, token: string): boolean {
    // In a real implementation, this would verify the token
    // For now, we'll use a simple check
    if (token === 'valid-token') {
      this.authenticatedClients.add(clientId);
      return true;
    }
    return false;
  }

  /**
   * Revoke client authentication
   */
  revokeAuthentication(clientId: string): void {
    this.authenticatedClients.delete(clientId);
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(clientId: string): boolean {
    return this.authenticatedClients.has(clientId);
  }

  /**
   * Update policy
   */
  updatePolicy(policy: SecurityPolicy): void {
    this.policy = policy;
  }

  /**
   * Get metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      checks: 0,
      allowed: 0,
      denied: 0
    };
  }

  /**
   * Get authenticated clients
   */
  getAuthenticatedClients(): string[] {
    return Array.from(this.authenticatedClients);
  }

  /**
   * Clear all authenticated clients
   */
  clearAuthentications(): void {
    this.authenticatedClients.clear();
  }
}