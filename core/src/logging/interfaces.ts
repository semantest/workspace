/**
 * Logging interfaces for Semantest platform
 */

/**
 * Log levels following standard severity
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Numeric log level values for comparison
 */
export const LogLevelValue: Record<LogLevel, number> = {
  [LogLevel.TRACE]: 10,
  [LogLevel.DEBUG]: 20,
  [LogLevel.INFO]: 30,
  [LogLevel.WARN]: 40,
  [LogLevel.ERROR]: 50,
  [LogLevel.FATAL]: 60
};

/**
 * Base log context that all logs should include
 */
export interface LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  service?: string;
  module?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Structured log entry
 */
export interface LogEntry extends LogContext {
  /**
   * Error information if applicable
   */
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  
  /**
   * Performance metrics if applicable
   */
  performance?: {
    duration?: number;
    startTime?: string;
    endTime?: string;
  };
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   */
  level: LogLevel;
  
  /**
   * Service name for all logs
   */
  service: string;
  
  /**
   * Default metadata to include in all logs
   */
  defaultMetadata?: Record<string, any>;
  
  /**
   * Whether to output to console
   */
  console: boolean;
  
  /**
   * Whether to pretty print logs (dev) or use JSON (prod)
   */
  prettyPrint: boolean;
  
  /**
   * Custom log transports
   */
  transports?: LogTransport[];
  
  /**
   * Fields to redact from logs
   */
  redactFields?: string[];
  
  /**
   * Maximum size for arrays/objects in logs
   */
  maxDepth?: number;
}

/**
 * Log transport interface for custom outputs
 */
export interface LogTransport {
  /**
   * Transport name
   */
  name: string;
  
  /**
   * Write log entry to transport
   */
  write(entry: LogEntry): void | Promise<void>;
  
  /**
   * Optional flush method for buffered transports
   */
  flush?(): void | Promise<void>;
  
  /**
   * Optional close method for cleanup
   */
  close?(): void | Promise<void>;
}

/**
 * Logger interface
 */
export interface ILogger {
  /**
   * Log at trace level
   */
  trace(message: string, context?: Record<string, any>): void;
  
  /**
   * Log at debug level
   */
  debug(message: string, context?: Record<string, any>): void;
  
  /**
   * Log at info level
   */
  info(message: string, context?: Record<string, any>): void;
  
  /**
   * Log at warn level
   */
  warn(message: string, context?: Record<string, any>): void;
  
  /**
   * Log at error level
   */
  error(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void;
  
  /**
   * Log at fatal level
   */
  fatal(message: string, error?: Error | Record<string, any>, context?: Record<string, any>): void;
  
  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): ILogger;
  
  /**
   * Set correlation ID for all subsequent logs
   */
  setCorrelationId(correlationId: string): void;
  
  /**
   * Start performance timing
   */
  startTimer(label: string): () => void;
  
  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void;
}

/**
 * Log formatter interface
 */
export interface LogFormatter {
  /**
   * Format log entry for output
   */
  format(entry: LogEntry): string;
}

/**
 * Log filter interface
 */
export interface LogFilter {
  /**
   * Check if log entry should be output
   */
  shouldLog(entry: LogEntry): boolean;
}

/**
 * Performance timer interface
 */
export interface PerformanceTimer {
  /**
   * Start the timer
   */
  start(): void;
  
  /**
   * Stop the timer and return duration
   */
  stop(): number;
  
  /**
   * Get current duration without stopping
   */
  peek(): number;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  /**
   * Increment a counter
   */
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  
  /**
   * Record a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  
  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  
  /**
   * Record a timing
   */
  timing(name: string, duration: number, tags?: Record<string, string>): void;
  
  /**
   * Create a timer for measuring duration
   */
  timer(name: string, tags?: Record<string, string>): PerformanceTimer;
}