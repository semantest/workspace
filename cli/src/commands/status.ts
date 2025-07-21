import chalk from 'chalk';
import { WebSocketClient } from '../websocket-client';
import { v4 as uuidv4 } from 'uuid';

export class StatusCommand {
  async execute(options: any): Promise<void> {
    const { server, verbose } = options;

    console.log(chalk.blue('Checking connection to Semantest server...'));
    console.log(chalk.gray('Server:'), server);

    const client = new WebSocketClient(server, verbose);
    const startTime = Date.now();

    try {
      // Try to connect
      await client.connect();
      const connectTime = Date.now() - startTime;

      // Send ping message
      const pingMessage = {
        id: uuidv4(),
        type: 'ping',
        payload: {},
        timestamp: Date.now()
      };

      const pingStart = Date.now();
      const response = await client.sendAndWait(pingMessage, 5000);
      const pingTime = Date.now() - pingStart;

      // Display results
      console.log('');
      console.log(chalk.green('✓ Connection successful'));
      console.log(chalk.gray(`  Connection time: ${connectTime}ms`));
      console.log(chalk.gray(`  Ping time: ${pingTime}ms`));
      
      if (response.payload?.version) {
        console.log(chalk.gray(`  Server version: ${response.payload.version}`));
      }
      
      if (response.payload?.uptime) {
        const uptime = Math.floor(response.payload.uptime / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        console.log(chalk.gray(`  Server uptime: ${hours}h ${minutes}m ${seconds}s`));
      }

      if (verbose && response.payload?.stats) {
        console.log('');
        console.log(chalk.blue('Server Statistics:'));
        Object.entries(response.payload.stats).forEach(([key, value]) => {
          console.log(`  ${chalk.gray(key)}: ${value}`);
        });
      }

    } catch (error) {
      console.log('');
      console.error(chalk.red('✗ Connection failed'));
      console.error(chalk.red(`  Error: ${error.message}`));
      
      if (error.message.includes('ECONNREFUSED')) {
        console.log('');
        console.log(chalk.yellow('Possible solutions:'));
        console.log('  1. Check if the server is running');
        console.log('  2. Verify the server URL is correct');
        console.log('  3. Check firewall settings');
      }
      
      process.exit(1);
    } finally {
      client.disconnect();
    }
  }
}