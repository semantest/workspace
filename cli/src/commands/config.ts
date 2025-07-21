import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface Config {
  server?: string;
  timeout?: number;
  verbose?: boolean;
  [key: string]: any;
}

export class ConfigCommand {
  private configPath: string;
  private defaultConfig: Config = {
    server: 'ws://localhost:8080',
    timeout: 30000,
    verbose: false
  };

  constructor() {
    this.configPath = path.join(os.homedir(), '.semantest', 'config.json');
  }

  async execute(options: any): Promise<void> {
    if (options.list) {
      await this.listConfig();
    } else if (options.get) {
      await this.getConfig(options.get);
    } else if (options.set) {
      await this.setConfig(options.set);
    } else if (options.reset) {
      await this.resetConfig();
    } else {
      console.log(chalk.yellow('Please specify an action: --list, --get, --set, or --reset'));
    }
  }

  private async loadConfig(): Promise<Config> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return { ...this.defaultConfig, ...JSON.parse(data) };
    } catch (error) {
      return this.defaultConfig;
    }
  }

  private async saveConfig(config: Config): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  private async listConfig(): Promise<void> {
    const config = await this.loadConfig();
    console.log(chalk.blue('Current configuration:'));
    Object.entries(config).forEach(([key, value]) => {
      console.log(`  ${chalk.gray(key)}: ${value}`);
    });
  }

  private async getConfig(key: string): Promise<void> {
    const config = await this.loadConfig();
    if (key in config) {
      console.log(config[key]);
    } else {
      console.error(chalk.red(`Unknown configuration key: ${key}`));
      process.exit(1);
    }
  }

  private async setConfig(keyValue: string): Promise<void> {
    const [key, ...valueParts] = keyValue.split('=');
    const value = valueParts.join('=');

    if (!value) {
      console.error(chalk.red('Invalid format. Use: --set key=value'));
      process.exit(1);
    }

    const config = await this.loadConfig();
    
    // Parse value type
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    config[key] = parsedValue;
    await this.saveConfig(config);
    
    console.log(chalk.green('✓ Configuration updated'));
    console.log(`  ${chalk.gray(key)}: ${parsedValue}`);
  }

  private async resetConfig(): Promise<void> {
    await this.saveConfig(this.defaultConfig);
    console.log(chalk.green('✓ Configuration reset to defaults'));
    await this.listConfig();
  }
}