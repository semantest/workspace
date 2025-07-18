import { 
  ILogger, 
  LogLevel, 
  LogLevelValue, 
  LogEntry, 
  LoggerConfig, 
  LogTransport,
  LogContext 
} from './interfaces';
import { ConsoleTransport } from './transports/console';
import { JsonFormatter } from './formatters/json';
import { PrettyFormatter } from './formatters/pretty';
import { redactSensitiveData } from './utils/redact';

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  service: 'semantest',
  console: true,
  prettyPrint: process.env.NODE_ENV !== 'production',
  transports: [],
  redactFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],
  maxDepth: 5
};

/**
 * Semantest Logger implementation
 */
export class Logger implements ILogger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};
  private transports: LogTransport[] = [];
  private correlationId?: string;
  private timers: Map<string, number> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...defaultConfig, ...config };
    this.initializeTransports();
  }

  private initializeTransports(): void {
    // Add console transport if enabled
    if (this.config.console) {
      const formatter = this.config.prettyPrint 
        ? new PrettyFormatter()
        : new JsonFormatter();
      
      this.transports.push(new ConsoleTransport(formatter));
    }

    // Add custom transports
    if (this.config.transports) {
      this.transports.push(...this.config.transports);
    }
  }

  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    const logContext = { ...context };
    
    if (error instanceof Error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).code && { code: (error as any).code }
      };
    } else if (error) {
      logContext.error = error;
    }
    
    this.log(LogLevel.ERROR, message, logContext);
  }

  fatal(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void {
    const logContext = { ...context };
    
    if (error instanceof Error) {
      logContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any).code && { code: (error as any).code }
      };
    } else if (error) {
      logContext.error = error;
    }
    
    this.log(LogLevel.FATAL, message, logContext);
    
    // Fatal errors might require special handling
    // e.g., sending alerts, shutting down gracefully
  }

  child(context: Record<string, any>): ILogger {
    const childLogger = new Logger(this.config);
    childLogger.context = { ...this.context, ...context };
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  startTimer(label: string): () => void {
    const startTime = Date.now();
    this.timers.set(label, startTime);
    
    return () => {
      const duration = Date.now() - startTime;
      this.timers.delete(label);
      
      this.info(`Timer ${label} completed`, {
        performance: {
          duration,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString()
        }
      });
      
      return duration;
    };
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.transports = [];
    this.initializeTransports();
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check if we should log this level
    if (LogLevelValue[level] < LogLevelValue[this.config.level]) {
      return;
    }

    // Build log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.config.service,
      correlationId: this.correlationId,
      ...this.config.defaultMetadata,
      ...this.context,
      ...context
    };

    // Redact sensitive fields
    const redactedEntry = this.config.redactFields 
      ? redactSensitiveData(entry, this.config.redactFields)
      : entry;

    // Send to all transports
    for (const transport of this.transports) {
      try {
        const result = transport.write(redactedEntry);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`Transport ${transport.name} error:`, err);
          });
        }
      } catch (err) {
        console.error(`Transport ${transport.name} error:`, err);
      }
    }
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    const flushPromises = this.transports
      .filter(t => t.flush)
      .map(t => t.flush!());
    
    await Promise.all(flushPromises);
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    const closePromises = this.transports
      .filter(t => t.close)
      .map(t => t.close!());
    
    await Promise.all(closePromises);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger({
  service: 'semantest',
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
});

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string, context?: Record<string, any>): ILogger {
  return logger.child({ module, ...context });
}