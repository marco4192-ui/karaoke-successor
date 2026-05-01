/**
 * Simple structured logger for the Karaoke Successor Tauri app.
 *
 * Provides log levels (debug, info, warn, error) with optional context tags.
 * In production builds, debug messages are suppressed.
 * All output goes to console with a consistent prefix format.
 *
 * Usage:
 *   import { logger } from '@/lib/utils/logger';
 *   logger.info('Song loaded', { id: song.id, title: song.title });
 *   logger.error('Pitch detection failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Optional context tag for categorizing log messages (e.g. 'audio', 'db', 'parser') */
  context?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function formatTimestamp(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

function formatMessage(level: LogLevel, context: string | undefined, message: string): string {
  const ts = formatTimestamp();
  const tag = context ? `[${context}]` : '';
  return `${ts} ${level.toUpperCase().padEnd(5)} ${tag} ${message}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

/** Create a child logger with a fixed context tag. */
export function createLogger(context: string) {
  return {
    debug: (msg: string, data?: unknown) => log('debug', context, msg, data),
    info: (msg: string, data?: unknown) => log('info', context, msg, data),
    warn: (msg: string, data?: unknown) => log('warn', context, msg, data),
    error: (msg: string, data?: unknown) => log('error', context, msg, data),
  };
}

function log(level: LogLevel, context: string | undefined, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const prefix = formatMessage(level, context, message);
  const args: unknown[] = [prefix];

  if (data !== undefined) {
    args.push(data);
  }

  switch (level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.log(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

/** Default logger instance — use createLogger() for module-specific loggers. */
export const logger = {
  debug: (msg: string, data?: unknown, options?: LogOptions) => log('debug', options?.context, msg, data),
  info: (msg: string, data?: unknown, options?: LogOptions) => log('info', options?.context, msg, data),
  warn: (msg: string, data?: unknown, options?: LogOptions) => log('warn', options?.context, msg, data),
  error: (msg: string, data?: unknown, options?: LogOptions) => log('error', options?.context, msg, data),
};
