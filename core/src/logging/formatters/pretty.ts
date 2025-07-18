import { LogFormatter, LogEntry, LogLevel } from '../interfaces';

/**
 * Pretty formatter for human-readable logs in development
 */
export class PrettyFormatter implements LogFormatter {
  private readonly levelIcons: Record<LogLevel, string> = {
    [LogLevel.TRACE]: '🔍',
    [LogLevel.DEBUG]: '🐛',
    [LogLevel.INFO]: 'ℹ️ ',
    [LogLevel.WARN]: '⚠️ ',
    [LogLevel.ERROR]: '❌',
    [LogLevel.FATAL]: '💀'
  };

  format(entry: LogEntry): string {
    const parts: string[] = [];
    
    // Timestamp
    const time = new Date(entry.timestamp).toLocaleTimeString();
    parts.push(`[${time}]`);
    
    // Level with icon
    const icon = this.levelIcons[entry.level];
    parts.push(`${icon} ${entry.level.toUpperCase().padEnd(5)}`);
    
    // Service and module
    if (entry.module) {
      parts.push(`[${entry.service}:${entry.module}]`);
    } else {
      parts.push(`[${entry.service}]`);
    }
    
    // Correlation ID
    if (entry.correlationId) {
      parts.push(`(${entry.correlationId.substring(0, 8)}...)`);
    }
    
    // Message
    parts.push(entry.message);
    
    // Build main line
    let output = parts.join(' ');
    
    // Add error details
    if (entry.error) {
      output += '\n  Error: ' + entry.error.message;
      if (entry.error.code) {
        output += ` (${entry.error.code})`;
      }
      if (entry.error.stack && entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
        const stackLines = entry.error.stack.split('\n').slice(1, 4);
        stackLines.forEach(line => {
          output += '\n    ' + line.trim();
        });
      }
    }
    
    // Add performance metrics
    if (entry.performance) {
      output += '\n  Performance:';
      if (entry.performance.duration !== undefined) {
        output += ` duration=${entry.performance.duration}ms`;
      }
      if (entry.performance.startTime) {
        output += ` started=${new Date(entry.performance.startTime).toLocaleTimeString()}`;
      }
    }
    
    // Add selected context fields
    const contextFields = this.getContextFields(entry);
    if (Object.keys(contextFields).length > 0) {
      output += '\n  Context:';
      for (const [key, value] of Object.entries(contextFields)) {
        output += `\n    ${key}: ${this.formatValue(value)}`;
      }
    }
    
    return output;
  }

  private getContextFields(entry: LogEntry): Record<string, any> {
    const standardFields = new Set([
      'timestamp', 'level', 'message', 'service', 'correlationId',
      'module', 'error', 'performance'
    ]);
    
    const context: Record<string, any> = {};
    
    // Add user context
    if (entry.userId) context.userId = entry.userId;
    if (entry.requestId) context.requestId = entry.requestId;
    if (entry.sessionId) context.sessionId = entry.sessionId;
    
    // Add metadata
    if (entry.metadata) {
      Object.assign(context, entry.metadata);
    }
    
    // Add other non-standard fields
    for (const [key, value] of Object.entries(entry)) {
      if (!standardFields.has(key) && value !== undefined && !context[key]) {
        context[key] = value;
      }
    }
    
    return context;
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    
    try {
      const json = JSON.stringify(value);
      return json.length > 50 ? json.substring(0, 50) + '...' : json;
    } catch {
      return '[Complex Object]';
    }
  }
}