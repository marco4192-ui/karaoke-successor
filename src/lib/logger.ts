/**
 * Centralized Logger Module
 * 
 * Provides structured logging with context prefixes and log levels.
 * In production, debug logs are suppressed.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('[Context]', 'Message');
 *   logger.error('[Context]', 'Error:', error);
 *   logger.debug('[Context]', 'Debug info:', data);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  showTimestamp: boolean;
  isProduction: boolean;
}

// Default configuration
const config: LoggerConfig = {
  level: 'debug',
  showTimestamp: false,
  isProduction: typeof process !== 'undefined' && process.env?.NODE_ENV === 'production',
};

// Log level priority
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
};

/**
 * Formats the log prefix with optional timestamp
 */
function formatPrefix(level: LogLevel, context?: string): string {
  const parts: string[] = [];
  
  if (config.showTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }
  
  const levelUpper = level.toUpperCase().padEnd(5);
  
  // In browser, we don't use ANSI colors
  if (typeof window !== 'undefined') {
    parts.push(`[${levelUpper}]`);
  } else {
    parts.push(`${colors[level]}[${levelUpper}]${colors.reset}`);
  }
  
  if (context) {
    parts.push(context);
  }
  
  return parts.join(' ');
}

/**
 * Checks if a log level should be displayed based on current config
 */
function shouldLog(level: LogLevel): boolean {
  // In production, suppress debug logs
  if (config.isProduction && level === 'debug') {
    return false;
  }
  
  return levelPriority[level] >= levelPriority[config.level];
}

/**
 * Logs a debug message (suppressed in production)
 */
function debug(context: string, ...args: unknown[]): void {
  if (!shouldLog('debug')) return;
  
  const prefix = formatPrefix('debug', context);
  console.log(prefix, ...args);
}

/**
 * Logs an info message
 */
function info(context: string, ...args: unknown[]): void {
  if (!shouldLog('info')) return;
  
  const prefix = formatPrefix('info', context);
  console.log(prefix, ...args);
}

/**
 * Logs a warning message
 */
function warn(context: string, ...args: unknown[]): void {
  if (!shouldLog('warn')) return;
  
  const prefix = formatPrefix('warn', context);
  console.warn(prefix, ...args);
}

/**
 * Logs an error message
 */
function error(context: string, ...args: unknown[]): void {
  if (!shouldLog('error')) return;
  
  const prefix = formatPrefix('error', context);
  console.error(prefix, ...args);
}

/**
 * Creates a child logger with a fixed context
 */
function withContext(context: string) {
  return {
    debug: (...args: unknown[]) => debug(context, ...args),
    info: (...args: unknown[]) => info(context, ...args),
    warn: (...args: unknown[]) => warn(context, ...args),
    error: (...args: unknown[]) => error(context, ...args),
  };
}

/**
 * Updates the logger configuration
 */
function setConfig(newConfig: Partial<LoggerConfig>): void {
  Object.assign(config, newConfig);
}

// Export the logger object
export const logger = {
  debug,
  info,
  warn,
  error,
  withContext,
  setConfig,
};

// Default export
export default logger;
