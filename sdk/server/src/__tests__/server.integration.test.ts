import WebSocket from 'ws';
import { WebSocketServer } from '../server';
import { 
  TransportMessage, 
  MessageType, 
  EventMessage,
  RequestMessage,
  ResponseMessage,
  BaseEvent
} from '@semantest/core';
import { TestEventTypes, TestStartPayload } from '@semantest/contracts';

describe('WebSocket Server Integration Tests', () => {
  let server: WebSocketServer;
  let client: WebSocket;
  const PORT = 8888;
  const WS_URL = `ws://localhost:${PORT}`;

  beforeEach(async () => {
    server = new WebSocketServer({ port: PORT, heartbeatInterval: 1000 });
    await server.start();
  });

  afterEach(async () => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
    await server.stop();
  });

  /**
   * Helper function to create WebSocket client
   */
  function createClient(headers?: Record<string, string>): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL, { headers });
      
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
      
      // Set timeout for connection
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  /**
   * Helper function to wait for message
   */
  function waitForMessage(ws: WebSocket): Promise<TransportMessage> {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        const message = JSON.parse(data.toString()) as TransportMessage;
        resolve(message);
      });
    });
  }

  /**
   * Helper to send and wait for response
   */
  async function sendAndWaitForResponse(
    ws: WebSocket, 
    message: TransportMessage
  ): Promise<TransportMessage> {
    const responsePromise = waitForMessage(ws);
    ws.send(JSON.stringify(message));
    return responsePromise;
  }

  describe('Server Lifecycle', () => {
    it('should start and stop successfully', async () => {
      const startedPromise = new Promise<void>((resolve) => {
        server.once('started', () => resolve());
      });

      const stoppedPromise = new Promise<void>((resolve) => {
        server.once('stopped', () => resolve());
      });

      // Server already started in beforeEach
      await expect(startedPromise).resolves.toBeUndefined();

      // Stop server
      await server.stop();
      await expect(stoppedPromise).resolves.toBeUndefined();

      // Restart for afterEach
      await server.start();
    });

    it('should handle port conflict gracefully', async () => {
      const server2 = new WebSocketServer({ port: PORT });
      
      await expect(server2.start()).rejects.toThrow();
    });
  });

  describe('Client Connection', () => {
    it('should accept client connection', async () => {
      client = await createClient();
      
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it('should send welcome message on connection', async () => {
      client = await createClient();
      
      const welcomeMessage = await waitForMessage(client);
      
      expect(welcomeMessage.type).toBe(MessageType.EVENT);
      expect((welcomeMessage as EventMessage).payload.type).toBe('system.connected');
      const eventMessage = welcomeMessage as EventMessage;
      expect((eventMessage.payload.payload as any).clientId).toBeDefined();
    });

    it('should accept connection with metadata', async () => {
      const metadata = { browser: 'chrome', version: '120' };
      client = await createClient({
        'x-metadata': JSON.stringify(metadata)
      });

      const welcomeMessage = await waitForMessage(client);
      expect(welcomeMessage).toBeDefined();
    });

    it('should handle multiple connections', async () => {
      const clients: WebSocket[] = [];
      
      // Create 5 clients
      for (let i = 0; i < 5; i++) {
        const ws = await createClient();
        clients.push(ws);
      }

      // Check all are connected
      clients.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });

      // Check server reports correct client count
      expect(server.getClients()).toHaveLength(5);

      // Cleanup
      clients.forEach(ws => ws.close());
    });

    it('should enforce max connections limit', async () => {
      // Create server with low limit
      const limitedServer = new WebSocketServer({ 
        port: PORT + 1, 
        maxConnections: 2 
      });
      await limitedServer.start();

      const clients: WebSocket[] = [];
      
      // Create 2 clients (should succeed)
      for (let i = 0; i < 2; i++) {
        const ws = await createClient();
        clients.push(ws);
      }

      // Third client should be rejected
      const thirdClient = new WebSocket(`ws://localhost:${PORT + 1}`);
      
      await new Promise<void>((resolve) => {
        thirdClient.on('close', (code) => {
          expect(code).toBe(1008); // Policy violation
          resolve();
        });
      });

      // Cleanup
      clients.forEach(ws => ws.close());
      await limitedServer.stop();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      client = await createClient();
      await waitForMessage(client); // Consume welcome message
    });

    it('should handle event messages', async () => {
      const testEvent: BaseEvent<TestStartPayload> = {
        id: 'event-123',
        type: TestEventTypes.START_TEST,
        timestamp: Date.now(),
        payload: {
          testId: 'test-456',
          testName: 'Integration Test'
        }
      };

      const eventMessage: EventMessage = {
        id: 'msg-123',
        type: MessageType.EVENT,
        timestamp: Date.now(),
        payload: testEvent
      };

      // Listen for server event
      const serverEventPromise = new Promise<BaseEvent>((resolve) => {
        server.once('event', resolve);
      });

      // Send event
      client.send(JSON.stringify(eventMessage));

      // Verify server received event
      const receivedEvent = await serverEventPromise;
      expect(receivedEvent).toEqual(testEvent);
    });

    it('should route events to subscribers', async () => {
      // Create second client
      const client2 = await createClient();
      await waitForMessage(client2); // Consume welcome

      // Subscribe client2 to test events
      const subscribeMsg: TransportMessage = {
        id: 'sub-123',
        type: MessageType.SUBSCRIBE,
        timestamp: Date.now(),
        payload: { eventTypes: [TestEventTypes.START_TEST] }
      };

      const subResponse = await sendAndWaitForResponse(client2, subscribeMsg);
      expect(subResponse.type).toBe(MessageType.RESPONSE);
      expect((subResponse as ResponseMessage).success).toBe(true);

      // Send event from client1
      const testEvent: BaseEvent = {
        id: 'event-789',
        type: TestEventTypes.START_TEST,
        timestamp: Date.now(),
        payload: { testId: 'test-999', testName: 'Routed Test' }
      };

      const eventMessage: EventMessage = {
        id: 'msg-456',
        type: MessageType.EVENT,
        timestamp: Date.now(),
        payload: testEvent
      };

      // Set up listener on client2
      const client2EventPromise = waitForMessage(client2);

      // Send from client1
      client.send(JSON.stringify(eventMessage));

      // Verify client2 received event
      const receivedMessage = await client2EventPromise;
      expect(receivedMessage.type).toBe(MessageType.EVENT);
      expect((receivedMessage as EventMessage).payload).toEqual(testEvent);

      // Cleanup
      client2.close();
    });

    it('should handle unsubscribe', async () => {
      // Subscribe first
      const subscribeMsg: TransportMessage = {
        id: 'sub-456',
        type: MessageType.SUBSCRIBE,
        timestamp: Date.now(),
        payload: { eventTypes: [TestEventTypes.START_TEST, TestEventTypes.END_TEST] }
      };

      await sendAndWaitForResponse(client, subscribeMsg);

      // Unsubscribe from one event
      const unsubscribeMsg: TransportMessage = {
        id: 'unsub-123',
        type: MessageType.UNSUBSCRIBE,
        timestamp: Date.now(),
        payload: { eventTypes: [TestEventTypes.START_TEST] }
      };

      const unsubResponse = await sendAndWaitForResponse(client, unsubscribeMsg);
      expect(unsubResponse.type).toBe(MessageType.RESPONSE);
      expect((unsubResponse as ResponseMessage).success).toBe(true);
      const responseMessage = unsubResponse as ResponseMessage;
      expect((responseMessage.payload as any).unsubscribed).toEqual([TestEventTypes.START_TEST]);
    });
  });

  describe('Request/Response Handling', () => {
    beforeEach(async () => {
      client = await createClient();
      await waitForMessage(client); // Consume welcome message
    });

    it('should handle request/response pattern', async () => {
      // Create second client to respond
      const responder = await createClient();
      await waitForMessage(responder); // Consume welcome

      // Subscribe responder to requests
      const subscribeMsg: TransportMessage = {
        id: 'sub-req',
        type: MessageType.SUBSCRIBE,
        timestamp: Date.now(),
        payload: { eventTypes: ['test.request'] }
      };
      await sendAndWaitForResponse(responder, subscribeMsg);

      // Send request from client
      const request: RequestMessage = {
        id: 'req-123',
        type: MessageType.REQUEST,
        timestamp: Date.now(),
        method: 'test.request',
        payload: { data: 'test data' }
      };

      // Set up responder handler
      responder.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as TransportMessage;
        if (msg.type === MessageType.REQUEST) {
          const response: ResponseMessage = {
            id: 'resp-123',
            type: MessageType.RESPONSE,
            timestamp: Date.now(),
            requestId: msg.id,
            success: true,
            payload: { result: 'processed' }
          };
          responder.send(JSON.stringify(response));
        }
      });

      // Send request and wait for response
      const responsePromise = new Promise<ResponseMessage>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString()) as TransportMessage;
          if (msg.type === MessageType.RESPONSE) {
            resolve(msg as ResponseMessage);
          }
        });
      });

      client.send(JSON.stringify(request));

      const response = await responsePromise;
      expect(response.requestId).toBe(request.id);
      expect(response.success).toBe(true);
      expect((response.payload as any).result).toBe('processed');

      // Cleanup
      responder.close();
    });

    it('should timeout pending requests', async () => {
      // Create server with short timeout
      const timeoutServer = new WebSocketServer({ 
        port: PORT + 2, 
        requestTimeout: 100 
      });
      await timeoutServer.start();

      const timeoutClient = await createClient();
      await waitForMessage(timeoutClient); // Welcome

      // Send request that won't get response
      const request: RequestMessage = {
        id: 'req-timeout',
        type: MessageType.REQUEST,
        timestamp: Date.now(),
        method: 'test.timeout',
        payload: {}
      };

      const errorPromise = new Promise<TransportMessage>((resolve) => {
        timeoutClient.on('message', (data) => {
          const msg = JSON.parse(data.toString()) as TransportMessage;
          if (msg.type === MessageType.ERROR) {
            resolve(msg);
          }
        });
      });

      timeoutClient.send(JSON.stringify(request));

      const error = await errorPromise;
      expect(error.type).toBe(MessageType.ERROR);

      // Cleanup
      timeoutClient.close();
      await timeoutServer.stop();
    });
  });

  describe('Heartbeat and Ping/Pong', () => {
    it('should respond to ping with pong', async () => {
      client = await createClient();
      await waitForMessage(client); // Welcome

      const ping: TransportMessage = {
        id: 'ping-123',
        type: MessageType.PING,
        timestamp: Date.now(),
        payload: {}
      };

      const pong = await sendAndWaitForResponse(client, ping);
      expect(pong.type).toBe(MessageType.PONG);
    });

    it('should disconnect inactive clients', async () => {
      // Create server with short heartbeat
      const heartbeatServer = new WebSocketServer({ 
        port: PORT + 3, 
        heartbeatInterval: 100 
      });
      await heartbeatServer.start();

      const deadClient = new WebSocket(`ws://localhost:${PORT + 3}`);
      
      // Override pong to simulate dead client
      deadClient.pong = jest.fn();

      await new Promise<void>((resolve) => {
        deadClient.on('open', () => {
          // Wait for heartbeat cycles
          setTimeout(() => {
            deadClient.on('close', () => {
              resolve();
            });
          }, 500);
        });
      });

      expect(deadClient.readyState).toBe(WebSocket.CLOSED);

      await heartbeatServer.stop();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      client = await createClient();
      await waitForMessage(client); // Welcome
    });

    it('should handle malformed messages', async () => {
      const errorPromise = waitForMessage(client);
      
      // Send invalid JSON
      client.send('invalid json{');

      const error = await errorPromise;
      expect(error.type).toBe(MessageType.ERROR);
      expect((error.payload as any).code).toBe('PARSE_ERROR');
    });

    it('should handle unknown message types', async () => {
      const unknownMessage = {
        id: 'unknown-123',
        type: 'UNKNOWN_TYPE',
        timestamp: Date.now(),
        payload: {}
      };

      const error = await sendAndWaitForResponse(client, unknownMessage as any);
      expect(error.type).toBe(MessageType.ERROR);
      expect((error.payload as any).code).toBe('INVALID_MESSAGE_TYPE');
    });
  });

  describe('Broadcast Functionality', () => {
    it('should broadcast to all connected clients', async () => {
      const clients: WebSocket[] = [];
      const messagePromises: Promise<TransportMessage>[] = [];

      // Create 3 clients
      for (let i = 0; i < 3; i++) {
        const ws = await createClient();
        await waitForMessage(ws); // Welcome
        clients.push(ws);
        messagePromises.push(waitForMessage(ws));
      }

      // Broadcast event
      const broadcastEvent: BaseEvent = {
        id: 'broadcast-123',
        type: 'system.broadcast',
        timestamp: Date.now(),
        payload: { message: 'Hello everyone!' }
      };

      server.broadcast(broadcastEvent);

      // Wait for all clients to receive
      const messages = await Promise.all(messagePromises);

      // Verify all received the broadcast
      messages.forEach(msg => {
        expect(msg.type).toBe(MessageType.EVENT);
        expect((msg as EventMessage).payload).toEqual(broadcastEvent);
      });

      // Cleanup
      clients.forEach(ws => ws.close());
    });
  });

  describe('Client Information', () => {
    it('should track client information correctly', async () => {
      const metadata = { browser: 'firefox', version: '121' };
      client = await createClient({
        'x-metadata': JSON.stringify(metadata)
      });

      const clients = server.getClients();
      expect(clients).toHaveLength(1);
      expect(clients[0].metadata).toEqual(metadata);
      expect(clients[0].connectedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should track client subscriptions', async () => {
      client = await createClient();
      await waitForMessage(client); // Welcome

      // Subscribe to events
      const subscribeMsg: TransportMessage = {
        id: 'sub-track',
        type: MessageType.SUBSCRIBE,
        timestamp: Date.now(),
        payload: { 
          eventTypes: [
            TestEventTypes.START_TEST,
            TestEventTypes.END_TEST,
            TestEventTypes.TEST_FAILED
          ] 
        }
      };

      await sendAndWaitForResponse(client, subscribeMsg);

      const clients = server.getClients();
      expect(clients[0].subscriptions.size).toBe(3);
      expect(Array.from(clients[0].subscriptions)).toContain(TestEventTypes.START_TEST);
    });
  });
});