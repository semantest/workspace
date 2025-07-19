/*
                     @semantest/realtime-streaming

 Copyright (C) 2025-today  Semantest Team

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview WebSocket Streaming Server with Event Sourcing
 * @author Semantest Team
 * @module infrastructure/websocket/WebSocketServer
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { Logger } from '@shared/infrastructure/logger';
import { EventStore } from '../events/event-store';
import * as jwt from 'jsonwebtoken';
import { URL } from 'url';

export interface WebSocketConfig {
  port?: number;
  path?: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  authentication?: AuthConfig;
  redis?: Redis;
  eventStore?: EventStore;
}

export interface AuthConfig {
  enabled: boolean;
  jwtSecret: string;
  tokenExpiry?: number;
}

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
  lastSeen: Date;
  metadata: Record<string, any>;
}

export interface StreamMessage {
  type: StreamMessageType;
  channel: string;
  data: any;
  timestamp: Date;
  messageId: string;
  source?: string;
}

export type StreamMessageType = 
  | 'test_execution_started'
  | 'test_execution_progress'
  | 'test_execution_completed'
  | 'test_execution_failed'
  | 'ai_insight_generated'
  | 'ai_analysis_progress'
  | 'system_notification'
  | 'client_sync'
  | 'heartbeat'
  | 'error';

export interface ChannelSubscription {
  pattern: string;
  clientId: string;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StreamStats {
  connectedClients: number;
  totalSubscriptions: number;
  messagesPerSecond: number;
  activeChannels: number;
  uptime: number;
}

/**
 * WebSocket streaming server with event sourcing and multi-client sync
 */
export class WebSocketServer extends EventEmitter {
  private wss?: WSServer;
  private clients: Map<string, ClientConnection> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private subscriptions: Map<string, ChannelSubscription> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private messageBuffer: Map<string, StreamMessage[]> = new Map();
  private metrics = {
    messagesPerSecond: 0,
    totalMessages: 0,
    connectionCount: 0,
    lastResetTime: Date.now()
  };

  constructor(
    private readonly config: WebSocketConfig,
    private readonly logger: Logger,
    private readonly redis: Redis,
    private readonly eventStore: EventStore
  ) {
    super();
    this.setupRedisSubscriptions();
    this.startMetricsCollection();
  }

  /**
   * Start WebSocket server
   */
  async start(server?: Server): Promise<void> {
    try {
      const options: any = {
        port: this.config.port || 8080,
        path: this.config.path || '/ws'
      };

      if (server) {
        options.server = server;
        delete options.port;
      }

      this.wss = new WSServer(options);

      this.wss.on('connection', (ws, request) => {
        this.handleConnection(ws, request);
      });

      this.wss.on('error', (error) => {
        this.logger.error('WebSocket server error', { error: error.message });
        this.emit('error', error);
      });

      // Start heartbeat mechanism
      this.startHeartbeat();

      // Setup event store listeners
      this.setupEventStoreIntegration();

      this.logger.info('WebSocket server started', {
        port: options.port || 'inherited',
        path: options.path,
        maxConnections: this.config.maxConnections
      });

      this.emit('started');
    } catch (error) {
      this.logger.error('Failed to start WebSocket server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    try {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.socket.close(1001, 'Server shutting down');
      }

      this.clients.clear();
      this.channels.clear();
      this.subscriptions.clear();

      if (this.wss) {
        await new Promise<void>((resolve) => {
          this.wss!.close(() => resolve());
        });
      }

      this.logger.info('WebSocket server stopped');
      this.emit('stopped');
    } catch (error) {
      this.logger.error('Failed to stop WebSocket server', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    try {
      // Check connection limits
      if (this.config.maxConnections && this.clients.size >= this.config.maxConnections) {
        ws.close(1013, 'Server at capacity');
        return;
      }

      // Authenticate if enabled
      let userId: string | undefined;
      if (this.config.authentication?.enabled) {
        userId = await this.authenticateConnection(request);
        if (!userId) {
          ws.close(1008, 'Authentication failed');
          return;
        }
      }

      // Create client connection
      const clientId = this.generateClientId();
      const client: ClientConnection = {
        id: clientId,
        socket: ws,
        userId,
        subscriptions: new Set(),
        lastSeen: new Date(),
        metadata: {}
      };

      this.clients.set(clientId, client);
      this.metrics.connectionCount++;

      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      ws.on('close', (code, reason) => {
        this.handleDisconnection(clientId, code, reason.toString());
      });

      ws.on('error', (error) => {
        this.logger.warn('Client connection error', { clientId, error: error.message });
      });

      // Send welcome message
      await this.sendToClient(clientId, {
        type: 'system_notification',
        channel: 'system',
        data: {
          message: 'Connected successfully',
          clientId,
          serverTime: new Date().toISOString()
        },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      // Replay missed messages if user reconnection
      if (userId) {
        await this.replayMissedMessages(clientId, userId);
      }

      this.logger.info('Client connected', { clientId, userId, totalClients: this.clients.size });
      this.emit('client_connected', { clientId, userId });

    } catch (error) {
      this.logger.error('Error handling connection', { error: error.message });
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clean up subscriptions
    for (const channel of client.subscriptions) {
      this.unsubscribeFromChannel(clientId, channel);
    }

    this.clients.delete(clientId);
    this.metrics.connectionCount--;

    this.logger.info('Client disconnected', { 
      clientId, 
      userId: client.userId, 
      code, 
      reason,
      totalClients: this.clients.size 
    });

    this.emit('client_disconnected', { clientId, userId: client.userId, code, reason });
  }

  /**
   * Handle incoming messages from clients
   */
  private async handleMessage(clientId: string, data: any): Promise<void> {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      client.lastSeen = new Date();

      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        await this.sendError(clientId, 'Invalid JSON format');
        return;
      }

      const { type, channel, data: messageData, messageId } = message;

      switch (type) {
        case 'subscribe':
          await this.handleSubscription(clientId, channel, messageData);
          break;

        case 'unsubscribe':
          await this.handleUnsubscription(clientId, channel);
          break;

        case 'test_command':
          await this.handleTestCommand(clientId, messageData);
          break;

        case 'ai_query':
          await this.handleAIQuery(clientId, messageData);
          break;

        case 'ping':
          await this.sendToClient(clientId, {
            type: 'heartbeat',
            channel: 'system',
            data: { pong: true, serverTime: new Date().toISOString() },
            timestamp: new Date(),
            messageId: this.generateMessageId()
          });
          break;

        default:
          await this.sendError(clientId, `Unknown message type: ${type}`);
      }

      // Acknowledge message if messageId provided
      if (messageId) {
        await this.sendToClient(clientId, {
          type: 'system_notification',
          channel: 'system',
          data: { ack: messageId },
          timestamp: new Date(),
          messageId: this.generateMessageId()
        });
      }

    } catch (error) {
      this.logger.error('Error handling message', { clientId, error: error.message });
      await this.sendError(clientId, 'Internal server error');
    }
  }

  /**
   * Handle channel subscription
   */
  private async handleSubscription(
    clientId: string, 
    channel: string, 
    options?: any
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Add to client subscriptions
    client.subscriptions.add(channel);

    // Add to channel subscribers
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(clientId);

    // Store subscription details
    const subscriptionId = `${clientId}:${channel}`;
    this.subscriptions.set(subscriptionId, {
      pattern: channel,
      clientId,
      filters: options?.filters,
      metadata: options?.metadata
    });

    // Subscribe to Redis channel for distributed events
    await this.redis.subscribe(`channel:${channel}`);

    await this.sendToClient(clientId, {
      type: 'system_notification',
      channel: 'system',
      data: { 
        message: `Subscribed to ${channel}`,
        subscriptions: Array.from(client.subscriptions)
      },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });

    this.logger.debug('Client subscribed to channel', { clientId, channel });
  }

  /**
   * Handle channel unsubscription
   */
  private async handleUnsubscription(clientId: string, channel: string): Promise<void> {
    this.unsubscribeFromChannel(clientId, channel);

    await this.sendToClient(clientId, {
      type: 'system_notification',
      channel: 'system',
      data: { message: `Unsubscribed from ${channel}` },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });

    this.logger.debug('Client unsubscribed from channel', { clientId, channel });
  }

  /**
   * Handle test commands
   */
  private async handleTestCommand(clientId: string, data: any): Promise<void> {
    const { command, testId, parameters } = data;

    // Emit test command event for processing
    this.emit('test_command', {
      clientId,
      command,
      testId,
      parameters,
      timestamp: new Date()
    });

    // Store event in event store
    await this.eventStore.append({
      streamId: `test-${testId}`,
      eventType: 'TestCommandReceived',
      data: { command, parameters, clientId },
      metadata: { timestamp: new Date(), source: 'websocket' }
    });
  }

  /**
   * Handle AI queries
   */
  private async handleAIQuery(clientId: string, data: any): Promise<void> {
    const { query, context, options } = data;

    // Emit AI query event for processing
    this.emit('ai_query', {
      clientId,
      query,
      context,
      options,
      timestamp: new Date()
    });

    await this.sendToClient(clientId, {
      type: 'system_notification',
      channel: 'ai',
      data: { message: 'AI query received and processing' },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Broadcast message to channel
   */
  async broadcast(message: StreamMessage): Promise<void> {
    try {
      const subscribers = this.channels.get(message.channel);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      // Store message in event store
      await this.eventStore.append({
        streamId: `channel-${message.channel}`,
        eventType: 'MessageBroadcast',
        data: message,
        metadata: { timestamp: message.timestamp, channel: message.channel }
      });

      // Buffer message for offline clients
      await this.bufferMessage(message);

      // Send to all subscribed clients
      const sendPromises = Array.from(subscribers).map(clientId => 
        this.sendToClient(clientId, message)
      );

      await Promise.allSettled(sendPromises);

      // Update metrics
      this.metrics.totalMessages++;
      this.updateMessagesPerSecond();

      // Publish to Redis for multi-server sync
      await this.redis.publish(`channel:${message.channel}`, JSON.stringify(message));

      this.logger.debug('Message broadcasted', { 
        channel: message.channel, 
        subscribers: subscribers.size,
        messageId: message.messageId
      });

    } catch (error) {
      this.logger.error('Error broadcasting message', { 
        error: error.message, 
        channel: message.channel 
      });
    }
  }

  /**
   * Send message to specific client
   */
  async sendToClient(clientId: string, message: StreamMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Apply filters if subscription has them
      const subscriptionId = `${clientId}:${message.channel}`;
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription?.filters && !this.messageMatchesFilters(message, subscription.filters)) {
        return;
      }

      const messageString = JSON.stringify(message);
      client.socket.send(messageString);

      this.logger.debug('Message sent to client', { clientId, messageId: message.messageId });

    } catch (error) {
      this.logger.warn('Failed to send message to client', { 
        clientId, 
        error: error.message 
      });
      
      // Remove dead connection
      this.handleDisconnection(clientId, 1006, 'Connection lost');
    }
  }

  /**
   * Get streaming statistics
   */
  getStats(): StreamStats {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: this.subscriptions.size,
      messagesPerSecond: this.metrics.messagesPerSecond,
      activeChannels: this.channels.size,
      uptime: Date.now() - this.metrics.lastResetTime
    };
  }

  /**
   * Private helper methods
   */
  private async authenticateConnection(request: any): Promise<string | undefined> {
    try {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return undefined;
      }

      const decoded = jwt.verify(token, this.config.authentication!.jwtSecret) as any;
      return decoded.userId || decoded.sub;

    } catch (error) {
      this.logger.warn('Authentication failed', { error: error.message });
      return undefined;
    }
  }

  private unsubscribeFromChannel(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(channel);
    }

    const subscribers = this.channels.get(channel);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.channels.delete(channel);
        // Unsubscribe from Redis channel
        this.redis.unsubscribe(`channel:${channel}`).catch(err => 
          this.logger.warn('Failed to unsubscribe from Redis', { channel, error: err.message })
        );
      }
    }

    const subscriptionId = `${clientId}:${channel}`;
    this.subscriptions.delete(subscriptionId);
  }

  private async bufferMessage(message: StreamMessage): Promise<void> {
    const key = `messages:${message.channel}`;
    if (!this.messageBuffer.has(key)) {
      this.messageBuffer.set(key, []);
    }

    const buffer = this.messageBuffer.get(key)!;
    buffer.push(message);

    // Keep only last 100 messages per channel
    if (buffer.length > 100) {
      buffer.shift();
    }

    // Also store in Redis for persistence
    await this.redis.lpush(key, JSON.stringify(message));
    await this.redis.ltrim(key, 0, 99); // Keep last 100
  }

  private async replayMissedMessages(clientId: string, userId: string): Promise<void> {
    try {
      // Get user's subscribed channels from last session
      const lastSession = await this.redis.get(`session:${userId}`);
      if (!lastSession) return;

      const sessionData = JSON.parse(lastSession);
      const lastSeen = new Date(sessionData.lastSeen);

      // Replay messages from subscribed channels since last seen
      for (const channel of sessionData.channels || []) {
        const messages = this.messageBuffer.get(`messages:${channel}`) || [];
        const missedMessages = messages.filter(msg => msg.timestamp > lastSeen);

        for (const message of missedMessages) {
          await this.sendToClient(clientId, message);
        }
      }

    } catch (error) {
      this.logger.warn('Failed to replay missed messages', { clientId, userId, error: error.message });
    }
  }

  private messageMatchesFilters(message: StreamMessage, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const messageValue = this.getNestedValue(message.data, key);
      if (messageValue !== value) {
        return false;
      }
    }
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000; // 30 seconds
    
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      const deadClients: string[] = [];

      for (const [clientId, client] of this.clients) {
        const timeSinceLastSeen = now.getTime() - client.lastSeen.getTime();
        
        if (timeSinceLastSeen > interval * 3) { // 3 missed heartbeats
          deadClients.push(clientId);
        } else if (client.socket.readyState === WebSocket.OPEN) {
          // Send ping
          client.socket.ping();
        }
      }

      // Clean up dead connections
      for (const clientId of deadClients) {
        this.handleDisconnection(clientId, 1006, 'Heartbeat timeout');
      }

    }, interval);
  }

  private setupRedisSubscriptions(): void {
    this.redis.on('message', (channel, message) => {
      if (channel.startsWith('channel:')) {
        const channelName = channel.replace('channel:', '');
        try {
          const streamMessage: StreamMessage = JSON.parse(message);
          // Re-broadcast to local clients (avoid infinite loop by checking source)
          if (streamMessage.source !== 'local') {
            this.broadcastLocal(streamMessage);
          }
        } catch (error) {
          this.logger.warn('Failed to parse Redis message', { channel, error: error.message });
        }
      }
    });
  }

  private async broadcastLocal(message: StreamMessage): Promise<void> {
    const subscribers = this.channels.get(message.channel);
    if (!subscribers) return;

    const sendPromises = Array.from(subscribers).map(clientId => 
      this.sendToClient(clientId, message)
    );

    await Promise.allSettled(sendPromises);
  }

  private setupEventStoreIntegration(): void {
    // Listen to event store for test execution events
    this.eventStore.on('event', (event) => {
      this.handleEventStoreEvent(event);
    });
  }

  private async handleEventStoreEvent(event: any): Promise<void> {
    // Convert event store events to WebSocket messages
    const message: StreamMessage = {
      type: this.mapEventTypeToMessageType(event.eventType),
      channel: this.extractChannelFromEvent(event),
      data: event.data,
      timestamp: event.metadata.timestamp,
      messageId: this.generateMessageId(),
      source: 'event_store'
    };

    await this.broadcast(message);
  }

  private mapEventTypeToMessageType(eventType: string): StreamMessageType {
    const mapping: Record<string, StreamMessageType> = {
      'TestExecutionStarted': 'test_execution_started',
      'TestExecutionProgress': 'test_execution_progress',
      'TestExecutionCompleted': 'test_execution_completed',
      'TestExecutionFailed': 'test_execution_failed',
      'AIInsightGenerated': 'ai_insight_generated',
      'AIAnalysisProgress': 'ai_analysis_progress'
    };

    return mapping[eventType] || 'system_notification';
  }

  private extractChannelFromEvent(event: any): string {
    if (event.streamId.startsWith('test-')) {
      return `test:${event.streamId.replace('test-', '')}`;
    }
    if (event.streamId.startsWith('ai-')) {
      return `ai:${event.streamId.replace('ai-', '')}`;
    }
    return 'system';
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMessagesPerSecond();
    }, 1000);
  }

  private updateMessagesPerSecond(): void {
    const now = Date.now();
    const timeDiff = (now - this.metrics.lastResetTime) / 1000;
    this.metrics.messagesPerSecond = this.metrics.totalMessages / timeDiff;
  }

  private async sendError(clientId: string, errorMessage: string): Promise<void> {
    await this.sendToClient(clientId, {
      type: 'error',
      channel: 'system',
      data: { error: errorMessage },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}