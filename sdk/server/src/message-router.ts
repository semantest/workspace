import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { 
  BaseEvent,
  EventMessage,
  MessageType,
  TransportMessage 
} from '@semantest/core';
import { ClientManager } from './client-manager';
import { SubscriptionManager } from './subscription-manager';

/**
 * Routes messages to appropriate clients based on subscriptions
 */
export class MessageRouter {
  private clientManager: ClientManager;
  private subscriptionManager: SubscriptionManager;

  constructor(
    clientManager: ClientManager,
    subscriptionManager: SubscriptionManager
  ) {
    this.clientManager = clientManager;
    this.subscriptionManager = subscriptionManager;
  }

  /**
   * Route an event to all subscribed clients
   */
  async routeEvent(event: BaseEvent, excludeClientId?: string): Promise<void> {
    // Get subscribers for this event type
    const subscribers = this.subscriptionManager.getSubscribers(event.type);
    
    // Also check for wildcard subscriptions
    const wildcardSubscribers = this.getWildcardSubscribers(event.type);
    
    // Combine and deduplicate subscribers
    const allSubscribers = new Set([...subscribers, ...wildcardSubscribers]);
    
    // Remove excluded client if specified
    if (excludeClientId) {
      allSubscribers.delete(excludeClientId);
    }

    // Create event message
    const eventMessage: EventMessage = {
      id: uuidv4(),
      type: MessageType.EVENT,
      timestamp: Date.now(),
      payload: event
    };

    // Send to all subscribers
    await this.sendToClients(Array.from(allSubscribers), eventMessage);
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcastEvent(event: BaseEvent): Promise<void> {
    const eventMessage: EventMessage = {
      id: uuidv4(),
      type: MessageType.EVENT,
      timestamp: Date.now(),
      payload: event
    };

    const allClients = this.clientManager.getAllClients();
    const clientIds = allClients.map(client => client.id);
    
    await this.sendToClients(clientIds, eventMessage);
  }

  /**
   * Send a message to specific clients
   */
  async sendToClients(clientIds: string[], message: TransportMessage): Promise<void> {
    const sendPromises = clientIds.map(clientId => {
      const client = this.clientManager.getClient(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        return this.sendToClient(client.ws, message);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Send a message to a single client
   */
  private async sendToClient(ws: WebSocket, message: TransportMessage): Promise<void> {
    return new Promise((resolve) => {
      try {
        ws.send(JSON.stringify(message), (error) => {
          if (error) {
            // Log error but don't fail the entire operation
            console.error('Failed to send message to client:', error);
          }
          resolve();
        });
      } catch (error) {
        // Handle synchronous errors
        console.error('Error sending message:', error);
        resolve();
      }
    });
  }

  /**
   * Get subscribers for wildcard patterns
   */
  private getWildcardSubscribers(eventType: string): string[] {
    const subscribers = new Set<string>();
    
    // Check common wildcard patterns
    const patterns = [
      '*', // Subscribe to all events
      `${eventType.split('.')[0]}.*`, // Subscribe to all events in same category
      eventType.replace(/\.[^.]+$/, '.*') // Subscribe to parent category
    ];

    patterns.forEach(pattern => {
      this.subscriptionManager.getSubscribers(pattern).forEach(clientId => {
        subscribers.add(clientId);
      });
    });

    return Array.from(subscribers);
  }

  /**
   * Route a message based on custom routing logic
   */
  async routeCustom(
    message: TransportMessage,
    routingLogic: (client: any) => boolean
  ): Promise<void> {
    const targetClients = this.clientManager.getClientsByFilter(routingLogic);
    const clientIds = targetClients.map(client => client.id);
    
    await this.sendToClients(clientIds, message);
  }
}