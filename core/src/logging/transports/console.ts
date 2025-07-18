import { LogTransport, LogEntry, LogLevel } from '../interfaces';
import { LogFormatter } from '../interfaces';

/**
 * Console colors for different log levels
 */
const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: '\x1b[90m',  // Gray
  [LogLevel.DEBUG]: '\x1b[36m',  // Cyan
  [LogLevel.INFO]: '\x1b[32m',   // Green
  [LogLevel.WARN]: '\x1b[33m',   // Yellow
  [LogLevel.ERROR]: '\x1b[31m',  // Red
  [LogLevel.FATAL]: '\x1b[35m'   // Magenta
};

const RESET_COLOR = '\x1b[0m';

/**
 * Console transport for logging to stdout/stderr
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  
  constructor(private formatter: LogFormatter) {}

  write(entry: LogEntry): void {
    const formattedMessage = this.formatter.format(entry);
    const useColors = process.stdout.isTTY && process.env.NODE_ENV !== 'production';
    
    // Determine output stream
    const isError = entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL;
    const stream = isError ? process.stderr : process.stdout;
    
    // Apply colors in development
    if (useColors) {
      const color = LOG_COLORS[entry.level];
      stream.write(`${color}${formattedMessage}${RESET_COLOR}\n`);
    } else {
      stream.write(`${formattedMessage}\n`);
    }
  }
}