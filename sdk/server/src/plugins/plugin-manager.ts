import { EventEmitter } from 'events';
import { Plugin, PluginHooks } from '../types/orchestration';

/**
 * Plugin manager for extensibility
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private hookExecutionOrder: string[] = [];

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    // Initialize plugin if needed
    if (plugin.initialize) {
      try {
        await plugin.initialize();
      } catch (error) {
        throw new Error(`Failed to initialize plugin ${plugin.name}: ${error}`);
      }
    }

    this.plugins.set(plugin.name, plugin);
    this.hookExecutionOrder.push(plugin.name);
    
    this.emit('plugin:registered', plugin);
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    // Destroy plugin if needed
    if (plugin.destroy) {
      try {
        await plugin.destroy();
      } catch (error) {
        console.error(`Error destroying plugin ${name}:`, error);
      }
    }

    this.plugins.delete(name);
    this.hookExecutionOrder = this.hookExecutionOrder.filter(n => n !== name);
    
    this.emit('plugin:unregistered', name);
  }

  /**
   * Execute a hook across all plugins
   */
  async executeHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void> {
    const errors: Array<{ plugin: string; error: Error }> = [];

    for (const pluginName of this.hookExecutionOrder) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) continue;

      const hook = plugin.hooks[hookName];
      if (!hook) continue;

      try {
        // @ts-ignore - TypeScript has trouble with this dynamic call
        await hook(...args);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        errors.push({ plugin: pluginName, error: errorObj });
        
        // Call error hook if available
        if (plugin.hooks.onError && hookName !== 'onError') {
          try {
            await plugin.hooks.onError(errorObj, { hook: hookName, args });
          } catch (errorHandlerError) {
            console.error(`Error in error handler for plugin ${pluginName}:`, errorHandlerError);
          }
        }
      }
    }

    if (errors.length > 0) {
      this.emit('hook:errors', { hookName, errors });
    }
  }

  /**
   * Execute a filter hook that can modify data
   */
  async executeFilterHook<T>(
    hookName: keyof PluginHooks,
    data: T,
    ...additionalArgs: any[]
  ): Promise<T> {
    let result = data;

    for (const pluginName of this.hookExecutionOrder) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) continue;

      const hook = plugin.hooks[hookName];
      if (!hook) continue;

      try {
        // @ts-ignore
        const hookResult = await hook(result, ...additionalArgs);
        if (hookResult !== null && hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`Error in filter hook ${hookName} for plugin ${pluginName}:`, error);
        
        // Call error hook if available
        if (plugin.hooks.onError) {
          try {
            await plugin.hooks.onError(
              error instanceof Error ? error : new Error(String(error)),
              { hook: hookName, data: result, additionalArgs }
            );
          } catch (errorHandlerError) {
            console.error(`Error in error handler for plugin ${pluginName}:`, errorHandlerError);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Set plugin execution order
   */
  setExecutionOrder(order: string[]): void {
    // Validate all plugins exist
    for (const name of order) {
      if (!this.plugins.has(name)) {
        throw new Error(`Plugin ${name} not found`);
      }
    }

    // Ensure all plugins are included
    const missing = Array.from(this.plugins.keys()).filter(name => !order.includes(name));
    if (missing.length > 0) {
      throw new Error(`Missing plugins in execution order: ${missing.join(', ')}`);
    }

    this.hookExecutionOrder = order;
  }

  /**
   * Get plugin execution order
   */
  getExecutionOrder(): string[] {
    return [...this.hookExecutionOrder];
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    const errors: Array<{ plugin: string; error: Error }> = [];

    // Shutdown in reverse order
    const reverseOrder = [...this.hookExecutionOrder].reverse();
    
    for (const pluginName of reverseOrder) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) continue;

      if (plugin.destroy) {
        try {
          await plugin.destroy();
        } catch (error) {
          errors.push({
            plugin: pluginName,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }

    this.plugins.clear();
    this.hookExecutionOrder = [];

    if (errors.length > 0) {
      this.emit('shutdown:errors', errors);
    }

    this.emit('shutdown');
  }
}