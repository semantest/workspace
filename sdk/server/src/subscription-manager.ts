/**
 * Manages event subscriptions for WebSocket clients
 */
export class SubscriptionManager {
  // Map of event type to Set of client IDs
  private subscriptions: Map<string, Set<string>>;
  // Map of client ID to Set of event types
  private clientSubscriptions: Map<string, Set<string>>;

  constructor() {
    this.subscriptions = new Map();
    this.clientSubscriptions = new Map();
  }

  /**
   * Subscribe a client to an event type
   */
  subscribe(clientId: string, eventType: string): void {
    // Add to event -> clients map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType)!.add(clientId);

    // Add to client -> events map
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set());
    }
    this.clientSubscriptions.get(clientId)!.add(eventType);
  }

  /**
   * Unsubscribe a client from an event type
   */
  unsubscribe(clientId: string, eventType: string): void {
    // Remove from event -> clients map
    const subscribers = this.subscriptions.get(eventType);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(eventType);
      }
    }

    // Remove from client -> events map
    const clientEvents = this.clientSubscriptions.get(clientId);
    if (clientEvents) {
      clientEvents.delete(eventType);
      if (clientEvents.size === 0) {
        this.clientSubscriptions.delete(clientId);
      }
    }
  }

  /**
   * Unsubscribe a client from all event types
   */
  unsubscribeAll(clientId: string): void {
    const clientEvents = this.clientSubscriptions.get(clientId);
    if (clientEvents) {
      clientEvents.forEach(eventType => {
        const subscribers = this.subscriptions.get(eventType);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.subscriptions.delete(eventType);
          }
        }
      });
      this.clientSubscriptions.delete(clientId);
    }
  }

  /**
   * Get all subscribers for an event type
   */
  getSubscribers(eventType: string): string[] {
    const subscribers = this.subscriptions.get(eventType);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get all subscribers for an event type pattern (supports wildcards)
   */
  getSubscribersByPattern(eventPattern: string): string[] {
    const subscribers = new Set<string>();
    
    // Convert pattern to regex (e.g., "user.*" -> /^user\..*$/)
    const regex = new RegExp('^' + eventPattern.replace(/\*/g, '.*') + '$');
    
    for (const [eventType, clientIds] of this.subscriptions) {
      if (regex.test(eventType)) {
        clientIds.forEach(clientId => subscribers.add(clientId));
      }
    }
    
    return Array.from(subscribers);
  }

  /**
   * Get all event types a client is subscribed to
   */
  getClientSubscriptions(clientId: string): string[] {
    const clientEvents = this.clientSubscriptions.get(clientId);
    return clientEvents ? Array.from(clientEvents) : [];
  }

  /**
   * Check if a client is subscribed to an event type
   */
  isSubscribed(clientId: string, eventType: string): boolean {
    const subscribers = this.subscriptions.get(eventType);
    return subscribers ? subscribers.has(clientId) : false;
  }

  /**
   * Get total number of subscriptions
   */
  getTotalSubscriptions(): number {
    let total = 0;
    for (const subscribers of this.subscriptions.values()) {
      total += subscribers.size;
    }
    return total;
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.clientSubscriptions.clear();
  }
}