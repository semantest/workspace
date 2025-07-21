import WebSocket from 'ws';
import { EventEmitter } from 'events';
import chalk from 'chalk';

export interface Message {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: Message[] = [];
  private isConnected = false;
  private verbose = false;

  constructor(url: string, verbose = false) {
    super();
    this.url = url;
    this.verbose = verbose;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.verbose) {
          console.log(chalk.gray(`Connecting to ${this.url}...`));
        }

        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.verbose) {
            console.log(chalk.green('✓ Connected to server'));
          }
          this.flushMessageQueue();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
          } catch (error) {
            console.error(chalk.red('Failed to parse message:'), error);
          }
        });

        this.ws.on('error', (error) => {
          console.error(chalk.red('WebSocket error:'), error.message);
          this.emit('error', error);
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          if (this.verbose) {
            console.log(chalk.yellow('Connection closed'));
          }
          this.handleReconnect();
        });

        // Timeout connection attempt
        setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      if (this.verbose) {
        console.log(chalk.gray(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`));
      }

      setTimeout(() => {
        this.connect().catch(() => {
          // Error already logged
        });
      }, delay);
    } else {
      console.error(chalk.red('Max reconnection attempts reached'));
      this.emit('disconnect');
    }
  }

  send(message: Message): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      if (this.verbose) {
        console.log(chalk.gray('→ Sent:'), message.type);
      }
    } else {
      this.messageQueue.push(message);
      if (this.verbose) {
        console.log(chalk.yellow('Message queued (not connected):'), message.type);
      }
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  async sendAndWait(message: Message, timeoutMs = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('message', messageHandler);
        reject(new Error(`Response timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const messageHandler = (response: Message) => {
        if (response.id === message.id || 
            (response.type === 'response' && response.payload?.requestId === message.id)) {
          clearTimeout(timeout);
          this.removeListener('message', messageHandler);
          resolve(response);
        }
      };

      this.on('message', messageHandler);
      this.send(message);
    });
  }

  disconnect(): void {
    this.isConnected = false;
    this.ws?.close();
    this.ws = null;
  }

  isReady(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}