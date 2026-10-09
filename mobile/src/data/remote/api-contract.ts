import { AppError, err, ok, type Result } from '@/domain/result';

/**
 * The backend contract.
 *
 * No backend exists in this repository (ADR-003), so the integration is written as
 * a contract for one to adopt. Everything is versioned, and every response is
 * narrowed field by field before it is trusted: TypeScript types prove nothing
 * about JSON that arrived over a socket.
 */

export const API_CONTRACT_VERSION = 1;

export interface ApiEnvelope<T> {
  readonly contractVersion: number;
  readonly data: T;
}

/** Server-received form of a sync event; the outbox row plus its key. */
export interface SyncEventBody {
  readonly id: string;
  readonly eventType: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly payload: unknown;
}

export interface PushEventsBody {
  readonly deviceId: string | null;
  readonly events: readonly SyncEventBody[];
}

export interface RejectedEvent {
  readonly id: string;
  readonly reason: string;
}

export interface PushEventsResult {
  /** Event ids the server accepted (or had already seen, which is the same thing). */
  readonly accepted: readonly string[];
  readonly rejected: readonly RejectedEvent[];
  readonly serverTime: string;
}

export interface AuthExchangeBody {
  readonly provider: 'google';
  /** The provider's id token; the server verifies it and mints its own session. */
  readonly idToken: string;
  readonly deviceId: string;
}

export interface AuthExchangeResult {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export const API_PATHS = {
  pushEvents: '/v1/sync/events',
  authExchange: '/v1/auth/google',
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const malformed = (what: string): AppError =>
  new AppError('unsupported', `The server sent ${what} this build does not understand.`);

/** Narrows `POST /v1/sync/events`. */
export const narrowPushEventsResult = (value: unknown): Result<PushEventsResult, AppError> => {
  if (!isRecord(value)) return err(malformed('a response'));
  const accepted = value.accepted;
  const rejected = value.rejected;
  const serverTime = readString(value.serverTime);
  if (!Array.isArray(accepted) || !Array.isArray(rejected) || serverTime === null) {
    return err(malformed('a sync response'));
  }

  const acceptedIds: string[] = [];
  for (const entry of accepted) {
    const id = readString(entry);
    if (id === null) return err(malformed('a sync response'));
    acceptedIds.push(id);
  }

  const rejections: RejectedEvent[] = [];
  for (const entry of rejected) {
    if (!isRecord(entry)) return err(malformed('a sync response'));
    const id = readString(entry.id);
    const reason = readString(entry.reason);
    if (id === null || reason === null) return err(malformed('a sync response'));
    rejections.push({ id, reason });
  }

  return ok({ accepted: acceptedIds, rejected: rejections, serverTime });
};

/** Narrows `POST /v1/auth/google`. */
export const narrowAuthExchangeResult = (value: unknown): Result<AuthExchangeResult, AppError> => {
  if (!isRecord(value)) return err(malformed('an auth response'));
  const userId = readString(value.userId);
  const email = readString(value.email);
  const accessToken = readString(value.accessToken);
  const refreshToken = readString(value.refreshToken);
  const expiresAt = readString(value.expiresAt);
  if (
    userId === null ||
    email === null ||
    accessToken === null ||
    refreshToken === null ||
    expiresAt === null
  ) {
    return err(malformed('an auth response'));
  }

  return ok({
    userId,
    email,
    displayName: readString(value.displayName) ?? email.split('@')[0] ?? 'There',
    accessToken,
    refreshToken,
    expiresAt,
  });
};
