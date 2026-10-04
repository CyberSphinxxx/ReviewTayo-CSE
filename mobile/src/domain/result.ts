/**
 * Result type used across domain, data and feature boundaries.
 *
 * Expected failures (validation problems, missing content, offline transports)
 * are modelled explicitly instead of being thrown, so callers cannot silently
 * forget to handle them and user-facing screens never receive a raw exception.
 */
export type Result<T, E = AppError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type AppErrorCode =
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'storage'
  | 'network'
  | 'unauthorized'
  | 'unsupported'
  | 'unknown';

/**
 * Structured application error. `code` is machine-readable, `message` is safe to
 * show to a user, and `cause` is retained for internal logs only.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

/** Normalises anything thrown into an AppError so logs and UI stay consistent. */
export const toAppError = (value: unknown, fallbackMessage?: string): AppError => {
  if (isAppError(value)) return value;
  if (value instanceof Error) {
    return new AppError('unknown', fallbackMessage ?? value.message, { cause: value });
  }
  return new AppError('unknown', fallbackMessage ?? 'Unexpected error', { cause: value });
};

/** Unwraps a Result, throwing the AppError. Use only at composition boundaries. */
export const unwrap = <T>(result: Result<T>): T => {
  if (result.ok) return result.value;
  throw result.error;
};
