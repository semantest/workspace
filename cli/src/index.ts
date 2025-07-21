#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { WebSocketClient } from './websocket-client';
import { EventCommand } from './commands/event';
import { ConfigCommand } from './commands/config';
import { StatusCommand } from './commands/status';
import { version } from '../package.json';

const program = new Command();

program
  .name('semantest-cli')
  .description('CLI for Semantest distributed testing framework')
  .version(version);

// Event command - send events to the server
program
  .command('event <type>')
  .description('Send an event to the Semantest server')
  .option('-p, --param <key=value...>', 'Event parameters (key=value format)', [])
  .option('-s, --server <url>', 'WebSocket server URL', process.env.SEMANTEST_SERVER || 'ws://localhost:8080')
  .option('-t, --timeout <ms>', 'Response timeout in milliseconds', '30000')
  .option('-v, --verbose', 'Verbose output')
  .action(async (type, options) => {
    try {
      const eventCmd = new EventCommand();
      await eventCmd.execute(type, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Config command - manage CLI configuration
program
  .command('config')
  .description('Manage CLI configuration')
  .option('-g, --get <key>', 'Get configuration value')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-l, --list', 'List all configuration values')
  .option('-r, --reset', 'Reset to default configuration')
  .action(async (options) => {
    try {
      const configCmd = new ConfigCommand();
      await configCmd.execute(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Status command - check server connection status
program
  .command('status')
  .description('Check connection status to Semantest server')
  .option('-s, --server <url>', 'WebSocket server URL', process.env.SEMANTEST_SERVER || 'ws://localhost:8080')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const statusCmd = new StatusCommand();
      await statusCmd.execute(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Example usage in help
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ semantest-cli event ImageRequested --param prompt="blue cat"');
  console.log('  $ semantest-cli event TestStarted --param suite=integration --param browser=chrome');
  console.log('  $ semantest-cli config --set server=ws://myserver:8080');
  console.log('  $ semantest-cli status --verbose');
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}