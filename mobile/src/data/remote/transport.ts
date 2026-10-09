import { AppError, err, ok, type AppErrorCode, type Result } from '@/domain/result';
import { createLogger } from '@/services/logging/logger';

/**
 * The transport boundary.
 *
 * This is the only place in the app that speaks to a network. Two implementations
 * exist: `LocalOnlyTransport` is the default and what ships when no backend is
 * configured — it reports offline rather than failing, so every syncable action
 * simply queues — and `HttpApiTransport` is used only when an https base URL is
 * configured. Failures are values, never exceptions: a sync that cannot reach the
 * server must not interrupt studying (D-055).
 */

const log = createLogger('api');

export interface ApiRequest {
  readonly path: string;
  readonly method: 'GET' | 'POST';
  readonly body?: unknown;
  /** Sent as `Idempotency-Key`; makes a retried write safe to replay. */
  readonly idempotencyKey?: string;
  readonly timeoutMs?: number;
}

export interface ApiFailure {
  /** Safe to show a learner. */
  readonly message: string;
  /** HTTP status, or `null` when the request never completed. */
  readonly status: number | null;
  /** True when trying again could plausibly succeed. */
  readonly retryable: boolean;
  readonly code: AppErrorCode;
}

export interface ApiTransport {
  readonly name: string;
  /** True when this transport leaves the device. */
  readonly isRemote: boolean;
  /** False for the local-only transport, so the worker reports offline instead of retrying. */
  isAvailable(): Promise<boolean>;
  send(request: ApiRequest): Promise<Result<unknown, ApiFailure>>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const failure = (
  code: AppErrorCode,
  message: string,
  options: { status?: number | null; retryable?: boolean } = {},
): ApiFailure => ({
  code,
  message,
  status: options.status ?? null,
  retryable: options.retryable ?? false,
});

/**
 * The default transport: there is no backend, so nothing leaves the device.
 *
 * It is available only if a base URL is configured, which is why the worker can
 * treat "not available" as offline and leave the outbox untouched.
 */
export class LocalOnlyTransport implements ApiTransport {
  readonly name = 'local-only';
  readonly isRemote = false;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async send(_request: ApiRequest): Promise<Result<unknown, ApiFailure>> {
    return err(failure('network', 'No backend is configured in this build.', { retryable: true }));
  }
}

export interface HttpTransportOptions {
  /** https only; a plaintext base URL is refused by configuration before it gets here. */
  readonly baseUrl: string;
  /** Injected in tests; defaults to the platform `fetch`. */
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  /** Supplies auth headers per request; failures leave the request unauthenticated. */
  readonly authorize?: () => Promise<Record<string, string>>;
}

export class HttpApiTransport implements ApiTransport {
  readonly name = 'http';
  readonly isRemote = true;

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly authorize: (() => Promise<Record<string, string>>) | undefined;

  constructor({ baseUrl, fetchImpl, timeoutMs, authorize }: HttpTransportOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl ?? fetch;
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.authorize = authorize;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async send(request: ApiRequest): Promise<Result<unknown, ApiFailure>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? this.timeoutMs);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (request.body !== undefined) headers['Content-Type'] = 'application/json';
      if (request.idempotencyKey !== undefined) {
        headers['Idempotency-Key'] = request.idempotencyKey;
      }
      if (this.authorize !== undefined) {
        try {
          Object.assign(headers, await this.authorize());
        } catch {
          // An unavailable token is not a failed request: the server decides.
        }
      }

      const response = await this.fetchImpl(`${this.baseUrl}${request.path}`, {
        method: request.method,
        headers,
        ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return err(this.failureForStatus(response.status));
      }

      const text = await response.text();
      if (text.trim().length === 0) return ok(null);
      try {
        return ok(JSON.parse(text) as unknown);
      } catch {
        return err(failure('unsupported', 'The server sent a response this build cannot read.'));
      }
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === 'AbortError';
      log.warn('request failed', {
        path: request.path,
        aborted,
        cause: cause instanceof Error ? cause.message : String(cause),
      });
      return err(
        failure(
          'network',
          aborted ? 'The server took too long to answer.' : 'Could not reach the server.',
          { retryable: true },
        ),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private failureForStatus(status: number): ApiFailure {
    if (status === 401 || status === 403) {
      return failure('unauthorized', 'This account is not signed in any more.', { status });
    }
    if (status === 409) {
      return failure('conflict', 'The server has a newer version of this change.', { status });
    }
    if (status === 429 || status >= 500) {
      return failure('network', 'The server is busy. This will be retried.', {
        status,
        retryable: true,
      });
    }
    if (status >= 400) {
      return failure('validation', 'The server rejected this change.', { status });
    }
    return failure('unknown', 'The server answered with an unexpected status.', { status });
  }
}

export interface TransportConfig {
  readonly apiBaseUrl: string | null;
}

/** The transport for this build: HTTP when a base URL exists, local-only otherwise. */
export const createApiTransport = (
  config: TransportConfig,
  options: Omit<HttpTransportOptions, 'baseUrl'> = {},
): ApiTransport => {
  const baseUrl = config.apiBaseUrl;
  if (baseUrl === null) return new LocalOnlyTransport();
  if (!/^https:\/\//.test(baseUrl)) {
    // Configuration already refuses plaintext; this is the belt to that braces.
    log.warn('refusing a non-https API base URL');
    return new LocalOnlyTransport();
  }
  return new HttpApiTransport({ baseUrl, ...options });
};

/** Normalises anything thrown into an `ApiFailure` so the worker has one shape. */
export const toApiFailure = (value: unknown): ApiFailure => {
  if (value instanceof AppError) {
    return failure(value.code, value.message, { retryable: value.code === 'network' });
  }
  return failure('unknown', 'Something went wrong talking to the server.');
};
