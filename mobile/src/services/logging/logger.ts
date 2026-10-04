import { appConfig } from '@/config/env';

/**
 * Logging abstraction.
 *
 * Production builds suppress debug noise and never log raw user content, tokens
 * or question text. Errors and warnings are always kept so sync failures and
 * unexpected states stay diagnosable. `console` is used directly here because
 * this module *is* the logging boundary — nowhere else in the app should call it.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface LogSink {
  write(level: LogLevel, message: string, context?: LogContext): void;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|email|id_?token)/i;

/**
 * Redacts values that must never appear in logs. Keys are filtered by name and
 * long free-text strings are truncated so question content does not leak into
 * crash reports.
 */
export const redactContext = (context: LogContext | undefined): LogContext | undefined => {
  if (context === undefined) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[redacted]';
      continue;
    }
    if (typeof value === 'string' && value.length > 120) {
      output[key] = `${value.slice(0, 120)}…`;
      continue;
    }
    output[key] = value;
  }
  return output;
};

const consoleSink: LogSink = {
  write(level, message, context) {
    const payload = context === undefined ? undefined : redactContext(context);
    const line = `[reviewtayo] ${message}`;
    switch (level) {
      case 'debug':
        if (!appConfig.isProduction) console.log(line, payload ?? '');
        break;
      case 'info':
        if (!appConfig.isProduction) console.info(line, payload ?? '');
        break;
      case 'warn':
        console.warn(line, payload ?? '');
        break;
      case 'error':
        console.error(line, payload ?? '');
        break;
    }
  },
};

let sink: LogSink = consoleSink;

/** Allows tests and future crash-reporting integrations to capture log output. */
export const setLogSink = (next: LogSink): void => {
  sink = next;
};

export const resetLogSink = (): void => {
  sink = consoleSink;
};

export const createLogger = (scope: string): Logger => ({
  debug: (message, context) => sink.write('debug', `${scope}: ${message}`, context),
  info: (message, context) => sink.write('info', `${scope}: ${message}`, context),
  warn: (message, context) => sink.write('warn', `${scope}: ${message}`, context),
  error: (message, error, context) =>
    sink.write('error', `${scope}: ${message}`, {
      ...(context ?? {}),
      error: error instanceof Error ? `${error.name}: ${error.message}` : error,
    }),
});
