import { LogFormatter, LogEntry } from '../interfaces';

/**
 * JSON formatter for structured logging
 */
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    // Create a clean object for JSON serialization
    const output: Record<string, any> = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      service: entry.service
    };

    // Add optional fields
    if (entry.correlationId) {
      output.correlationId = entry.correlationId;
    }
    
    if (entry.module) {
      output.module = entry.module;
    }
    
    if (entry.userId) {
      output.userId = entry.userId;
    }
    
    if (entry.requestId) {
      output.requestId = entry.requestId;
    }
    
    if (entry.sessionId) {
      output.sessionId = entry.sessionId;
    }

    // Add error information
    if (entry.error) {
      output.error = entry.error;
    }

    // Add performance metrics
    if (entry.performance) {
      output.performance = entry.performance;
    }

    // Add metadata
    if (entry.metadata) {
      output.metadata = entry.metadata;
    }

    // Add any additional context fields
    const standardFields = new Set([
      'timestamp', 'level', 'message', 'service', 'correlationId',
      'module', 'userId', 'requestId', 'sessionId', 'error',
      'performance', 'metadata'
    ]);

    for (const [key, value] of Object.entries(entry)) {
      if (!standardFields.has(key) && value !== undefined) {
        output[key] = value;
      }
    }

    try {
      return JSON.stringify(output);
    } catch (err) {
      // Handle circular references or other JSON serialization issues
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        service: entry.service,
        error: {
          message: 'Failed to serialize log entry',
          originalError: err instanceof Error ? err.message : String(err)
        }
      });
    }
  }
}