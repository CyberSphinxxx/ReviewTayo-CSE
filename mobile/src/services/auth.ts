import {
  API_PATHS,
  narrowAuthExchangeResult,
  type ApiFailure,
  type ApiTransport,
  type AuthExchangeBody,
  type AuthExchangeResult,
} from '@/data/remote';
import {
  canSync,
  googleIdentityFrom,
  parseStoredGoogleIdentity,
  type GoogleIdentity,
  type Identity,
} from '@/domain/identity';
import { AppError, err, ok, toAppError, type Result } from '@/domain/result';
import { createId } from '@/services/ids';
import { createLogger } from '@/services/logging/logger';

import {
  CREDENTIAL_KEYS,
  readCredentialJson,
  writeCredentialJson,
  type CredentialStore,
} from './credentials';
import { unavailableGoogleAuthProvider, type GoogleAuthProvider } from './google-auth';

/**
 * Accounts.
 *
 * The app is a guest until it is signed in, and guest is a complete state rather
 * than a placeholder: the device gets its own id, everything is saved locally, and
 * the only thing missing is somewhere to sync to (D-051). Signing in with Google
 * stores the account and the provider's id token in the keystore; if a backend is
 * reachable the token is exchanged for a server session, and if it is not, sign-in
 * still succeeds — the account is real either way, and the exchange can be retried
 * (D-056).
 *
 * Nothing here throws at the caller: storage failures come back as `storage`
 * AppErrors so a device without a keystore says so instead of pretending.
 */

const log = createLogger('auth');

export interface GoogleSession {
  readonly idToken: string;
  /** The server's own session, once a backend exchange has succeeded. */
  readonly server: AuthExchangeResult | null;
  readonly signedInAt: string;
}

export interface AccountState {
  readonly identity: Identity;
  /** False when this device cannot remember anything about an account. */
  readonly storageAvailable: boolean;
  readonly providerConfigured: boolean;
  readonly canSync: boolean;
  readonly session: GoogleSession | null;
}

export interface AuthDependencies {
  readonly store: CredentialStore;
  readonly provider?: GoogleAuthProvider;
  /** Absent means no backend is configured; the sign-in stays local. */
  readonly transport?: ApiTransport;
}

const guestIdentity = (deviceId: string): Identity => ({ mode: 'guest', deviceId });

/**
 * The device's own id.
 *
 * Generated once and kept, so a guest's answers are attributed to the same device
 * across launches. A device with no keystore still gets one for this session —
 * ephemeral, which is why `storageAvailable` is reported honestly beside it.
 */
export const loadDeviceId = async (store: CredentialStore): Promise<string> => {
  try {
    const existing = await store.get(CREDENTIAL_KEYS.deviceId);
    if (existing !== null && existing.trim().length > 0) return existing;
    const created = createId('device');
    await store.set(CREDENTIAL_KEYS.deviceId, created);
    return created;
  } catch (cause) {
    log.warn('device id could not be stored', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return createId('device');
  }
};

const readSession = (value: unknown, signedInAt: string): GoogleSession | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const idToken = typeof record.idToken === 'string' ? record.idToken : null;
  if (idToken === null || idToken.length === 0) return null;
  const server = record.server;
  return {
    idToken,
    server: server === undefined ? null : (server as AuthExchangeResult | null),
    signedInAt,
  };
};

/** Reads the stored account. Never fails: an unreadable store is a guest. */
export const loadAccount = async ({
  store,
  provider = unavailableGoogleAuthProvider(),
}: AuthDependencies): Promise<AccountState> => {
  const deviceId = await loadDeviceId(store);
  const available = await store.isAvailable().catch(() => false);

  let identity: Identity = guestIdentity(deviceId);
  let session: GoogleSession | null = null;

  if (available) {
    const stored = await readCredentialJson(store, CREDENTIAL_KEYS.identity).catch(() => null);
    const parsed = parseStoredGoogleIdentity(stored);
    if (parsed !== null) {
      identity = parsed;
      const rawSession = await readCredentialJson(store, CREDENTIAL_KEYS.googleTokens).catch(
        () => null,
      );
      session = readSession(rawSession, parsed.signedInAt);
    }
  }

  return {
    identity,
    storageAvailable: available,
    providerConfigured: provider.isConfigured,
    canSync: canSync(identity),
    session,
  };
};

/** Signs out of any account, keeping the device id. A guest is the resting state. */
export const signInAsGuest = async (
  store: CredentialStore,
): Promise<Result<Identity, AppError>> => {
  try {
    await store.delete(CREDENTIAL_KEYS.identity);
    await store.delete(CREDENTIAL_KEYS.googleTokens);
    return ok(guestIdentity(await loadDeviceId(store)));
  } catch (cause) {
    return err(toAppError(cause, 'Could not sign out on this device.'));
  }
};

export const signOut = signInAsGuest;

export interface ExchangeInput {
  readonly transport: ApiTransport;
  readonly idToken: string;
  readonly deviceId: string;
  readonly timeoutMs?: number;
}

/**
 * Trades the provider's id token for a server session.
 *
 * The body is the versioned contract request; the response is narrowed before it
 * is trusted. A failure is a value — the caller decides whether to retry — and a
 * malformed response is reported as `unsupported` rather than stored.
 */
export const exchangeGoogleSession = async ({
  transport,
  idToken,
  deviceId,
  timeoutMs,
}: ExchangeInput): Promise<Result<AuthExchangeResult, ApiFailure | AppError>> => {
  const body: AuthExchangeBody = { provider: 'google', idToken, deviceId };
  const response = await transport.send({
    path: API_PATHS.authExchange,
    method: 'POST',
    body: { contractVersion: 1, data: body },
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  if (!response.ok) return err(response.error);

  const envelope = response.value;
  const payload =
    typeof envelope === 'object' && envelope !== null && 'data' in envelope
      ? (envelope as { data: unknown }).data
      : envelope;
  const narrowed = narrowAuthExchangeResult(payload);
  return narrowed.ok ? ok(narrowed.value) : err(narrowed.error);
};

export interface SignInWithGoogleInput extends AuthDependencies {
  readonly provider: GoogleAuthProvider;
  readonly now?: Date;
}

export interface SignedIn {
  readonly identity: GoogleIdentity;
  readonly session: GoogleSession;
  /** One honest line about what did or did not happen with the backend. */
  readonly syncNote: string;
}

export const signInWithGoogle = async ({
  store,
  provider,
  transport,
  now = new Date(),
}: SignInWithGoogleInput): Promise<Result<SignedIn, AppError>> => {
  const result = await provider.signIn();
  if (!result.ok) return err(result.error);

  const signedInAt = now.toISOString();
  const identity = googleIdentityFrom(result.value.account, signedInAt);
  const baseSession: GoogleSession = { idToken: result.value.idToken, server: null, signedInAt };

  let session = baseSession;
  let syncNote = 'Signed in on this device. Sync begins when the backend is reachable.';

  if (transport !== undefined && (await transport.isAvailable().catch(() => false))) {
    const deviceId = await loadDeviceId(store);
    const exchanged = await exchangeGoogleSession({
      transport,
      idToken: result.value.idToken,
      deviceId,
    });
    if (exchanged.ok) {
      session = { ...baseSession, server: exchanged.value };
      syncNote = 'Signed in. Your progress syncs to this account.';
    } else {
      syncNote = 'Signed in on this device. Sync could not start yet and will retry.';
      log.warn('session exchange failed', { message: exchanged.error.message });
    }
  }

  try {
    await writeCredentialJson(store, CREDENTIAL_KEYS.identity, identity);
    await writeCredentialJson(store, CREDENTIAL_KEYS.googleTokens, session);
  } catch (cause) {
    return err(toAppError(cause, 'Could not save your account on this device.'));
  }

  return ok({ identity, session, syncNote });
};
