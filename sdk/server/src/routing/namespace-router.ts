/**
 * Namespace-based event router for addon system
 * Supports patterns like core:*, addon:*, chatgpt:*, etc.
 */

import { EventEmitter } from 'events';
import { BaseEvent } from '@semantest/core';

export interface NamespacedEvent extends BaseEvent {
  namespace?: string;
  addon_id?: string;
  target?: string[];
}

export class NamespaceRouter extends EventEmitter {
  private namespaceHandlers: Map<string, Set<string>> = new Map();
  private addonSubscriptions: Map<string, Set<string>> = new Map();

  /**
   * Register a client for namespace patterns
   */
  public subscribe(clientId: string, patterns: string[]): void {
    patterns.forEach(pattern => {
      if (!this.namespaceHandlers.has(pattern)) {
        this.namespaceHandlers.set(pattern, new Set());
      }
      this.namespaceHandlers.get(pattern)!.add(clientId);
    });
  }

  /**
   * Register addon-specific subscriptions
   */
  public subscribeToAddon(clientId: string, addonId: string): void {
    if (!this.addonSubscriptions.has(addonId)) {
      this.addonSubscriptions.set(addonId, new Set());
    }
    this.addonSubscriptions.get(addonId)!.add(clientId);
  }

  /**
   * Route event based on namespace and addon_id
   */
  public routeEvent(event: NamespacedEvent): Set<string> {
    const recipients = new Set<string>();

    // Extract namespace from event type (e.g., "core:status.update" -> "core")
    const namespace = event.namespace || event.type.split(':')[0];
    
    // Route based on namespace patterns
    this.namespaceHandlers.forEach((clients, pattern) => {
      if (this.matchesPattern(event.type, pattern)) {
        clients.forEach(clientId => recipients.add(clientId));
      }
    });

    // Route based on addon_id if specified
    if (event.addon_id) {
      const addonClients = this.addonSubscriptions.get(event.addon_id);
      if (addonClients) {
        addonClients.forEach(clientId => recipients.add(clientId));
      }
    }

    // Route to specific targets if specified
    if (event.target && Array.isArray(event.target)) {
      event.target.forEach(clientId => recipients.add(clientId));
    }

    return recipients;
  }

  /**
   * Check if event type matches pattern
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    // Handle wildcard patterns
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return eventType.startsWith(prefix);
    }
    
    // Handle exact matches
    return eventType === pattern;
  }

  /**
   * Unsubscribe client from all patterns
   */
  public unsubscribe(clientId: string): void {
    // Remove from namespace handlers
    this.namespaceHandlers.forEach(clients => {
      clients.delete(clientId);
    });

    // Remove from addon subscriptions
    this.addonSubscriptions.forEach(clients => {
      clients.delete(clientId);
    });
  }

  /**
   * Get subscription info for a client
   */
  public getSubscriptions(clientId: string): {
    namespaces: string[];
    addons: string[];
  } {
    const namespaces: string[] = [];
    const addons: string[] = [];

    this.namespaceHandlers.forEach((clients, pattern) => {
      if (clients.has(clientId)) {
        namespaces.push(pattern);
      }
    });

    this.addonSubscriptions.forEach((clients, addonId) => {
      if (clients.has(clientId)) {
        addons.push(addonId);
      }
    });

    return { namespaces, addons };
  }
}