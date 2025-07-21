import chalk from 'chalk';
import { WebSocketClient } from '../websocket-client';
import { parseParams } from '../utils/params';
import { v4 as uuidv4 } from 'uuid';

export class EventCommand {
  async execute(eventType: string, options: any): Promise<void> {
    const { server, param, timeout, verbose } = options;
    
    // Parse parameters
    const params = parseParams(param);
    
    if (verbose) {
      console.log(chalk.gray('Event Type:'), eventType);
      console.log(chalk.gray('Parameters:'), params);
      console.log(chalk.gray('Server:'), server);
    }

    // Create WebSocket client
    const client = new WebSocketClient(server, verbose);

    try {
      // Connect to server
      await client.connect();

      // Create event message
      const message = {
        id: uuidv4(),
        type: 'event',
        payload: {
          eventType,
          params,
          source: 'cli',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      // Send and wait for response
      const response = await client.sendAndWait(message, parseInt(timeout));

      // Display response
      if (response.payload?.success) {
        console.log(chalk.green('✓ Event sent successfully'));
        if (response.payload?.data) {
          console.log(chalk.gray('Response:'));
          console.log(JSON.stringify(response.payload.data, null, 2));
        }
      } else {
        console.error(chalk.red('✗ Event failed:'), response.payload?.error || 'Unknown error');
      }

    } catch (error) {
      if (error.message.includes('timeout')) {
        console.error(chalk.red('✗ Request timed out'));
      } else {
        console.error(chalk.red('✗ Error:'), error.message);
      }
      throw error;
    } finally {
      client.disconnect();
    }
  }
}