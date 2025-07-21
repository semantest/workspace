/**
 * Rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private limit: number;
  private windowMs: number = 1000; // 1 second window
  private clientWindows: Map<string, Array<number>> = new Map();
  private metrics = {
    checks: 0,
    exceeded: 0
  };

  constructor(eventsPerSecond: number) {
    this.limit = eventsPerSecond;
  }

  /**
   * Check if client has exceeded rate limit
   */
  checkLimit(clientId: string): boolean {
    this.metrics.checks++;
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create client window
    let clientWindow = this.clientWindows.get(clientId);
    if (!clientWindow) {
      clientWindow = [];
      this.clientWindows.set(clientId, clientWindow);
    }

    // Remove old timestamps outside the window
    clientWindow = clientWindow.filter(timestamp => timestamp > windowStart);
    this.clientWindows.set(clientId, clientWindow);

    // Check if limit exceeded
    if (clientWindow.length >= this.limit) {
      this.metrics.exceeded++;
      return false;
    }

    // Add current timestamp
    clientWindow.push(now);
    return true;
  }

  /**
   * Get current stats for a client
   */
  getStats(clientId: string): {
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let clientWindow = this.clientWindows.get(clientId) || [];
    clientWindow = clientWindow.filter(timestamp => timestamp > windowStart);
    
    const count = clientWindow.length;
    const remaining = Math.max(0, this.limit - count);
    const resetTime = clientWindow.length > 0 
      ? clientWindow[0] + this.windowMs 
      : now + this.windowMs;

    return { count, remaining, resetTime };
  }

  /**
   * Reset rate limit for a client
   */
  reset(clientId: string): void {
    this.clientWindows.delete(clientId);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.clientWindows.clear();
  }

  /**
   * Update rate limit
   */
  updateLimit(eventsPerSecond: number): void {
    this.limit = eventsPerSecond;
  }

  /**
   * Get current limit
   */
  getLimit(): number {
    return this.limit;
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
      exceeded: 0
    };
  }

  /**
   * Clean up old client windows
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [clientId, window] of this.clientWindows.entries()) {
      const activeTimestamps = window.filter(timestamp => timestamp > windowStart);
      
      if (activeTimestamps.length === 0) {
        this.clientWindows.delete(clientId);
      } else if (activeTimestamps.length !== window.length) {
        this.clientWindows.set(clientId, activeTimestamps);
      }
    }
  }

  /**
   * Get active client count
   */
  getActiveClientCount(): number {
    return this.clientWindows.size;
  }

  /**
   * Get top clients by request count
   */
  getTopClients(limit: number = 10): Array<{ clientId: string; count: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const clientCounts: Array<{ clientId: string; count: number }> = [];

    for (const [clientId, window] of this.clientWindows.entries()) {
      const activeTimestamps = window.filter(timestamp => timestamp > windowStart);
      if (activeTimestamps.length > 0) {
        clientCounts.push({ clientId, count: activeTimestamps.length });
      }
    }

    return clientCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}