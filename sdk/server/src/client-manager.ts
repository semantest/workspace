import { ClientConnection } from './types';

/**
 * Manages WebSocket client connections
 */
export class ClientManager {
  private clients: Map<string, ClientConnection>;
  private maxConnections: number;

  constructor(maxConnections: number) {
    this.clients = new Map();
    this.maxConnections = maxConnections;
  }

  /**
   * Add a new client connection
   * @throws Error if max connections reached
   */
  addClient(client: ClientConnection): void {
    if (this.clients.size >= this.maxConnections) {
      throw new Error('Maximum connections reached');
    }
    
    this.clients.set(client.id, client);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Get a client by ID
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all connected clients
   */
  getAllClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if a client exists
   */
  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Get clients by a filter function
   */
  getClientsByFilter(filter: (client: ClientConnection) => boolean): ClientConnection[] {
    return this.getAllClients().filter(filter);
  }

  /**
   * Clear all clients
   */
  clear(): void {
    this.clients.clear();
  }
}