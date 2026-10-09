import type { ApiFailure, ApiTransport } from '@/data/remote';
import { parseStoredGoogleIdentity } from '@/domain/identity';
import { AppError, err, ok, type Result } from '@/domain/result';
import {
  CREDENTIAL_KEYS,
  createMemoryCredentialStore,
  type CredentialStore,
} from '@/services/credentials';
import {
  exchangeGoogleSession,
  loadAccount,
  loadDeviceId,
  signInAsGuest,
  signInWithGoogle,
} from '@/services/auth';
import type { GoogleAuthProvider } from '@/services/google-auth';

/**
 * Accounts.
 *
 * The behaviour that matters is what survives a bad day: a device with no keystore,
 * a provider without client IDs, a backend that cannot be reached. None of those may
 * lose the learner's work or pretend they are signed in, and signing in must not
 * depend on the backend being up.
 */

const AT = new Date('2026-10-10T09:00:00.000Z');

const ACCOUNT = {
  subject: 'google-123',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  photoUrl: null,
};

const provider = (overrides: Partial<GoogleAuthProvider> = {}): GoogleAuthProvider => ({
  kind: 'google',
  clientId: 'client-1',
  isConfigured: true,
  signIn: async () => ok({ account: ACCOUNT, idToken: 'header.payload.signature' }),
  ...overrides,
});

const failingProvider = (error: AppError): GoogleAuthProvider =>
  provider({ signIn: async () => err(error) });

const transport = (
  options: {
    readonly available?: boolean;
    readonly replies?: readonly Result<unknown, ApiFailure>[];
  } = {},
): ApiTransport => {
  const replies = [...(options.replies ?? [])];
  return {
    name: 'fake',
    isRemote: true,
    isAvailable: async () => options.available ?? true,
    send: async () =>
      replies.shift() ??
      err({
        message: 'Unexpected request.',
        status: null,
        retryable: false,
        code: 'unknown',
      }),
  };
};

describe('auth service', () => {
  it('starts as a guest with a device id it keeps', async () => {
    const store = createMemoryCredentialStore();

    const first = await loadAccount({ store, provider: provider() });
    expect(first.identity.mode).toBe('guest');
    expect(first.canSync).toBe(false);
    expect(first.storageAvailable).toBe(true);
    expect(first.providerConfigured).toBe(true);

    const second = await loadAccount({ store, provider: provider() });
    expect(second.identity).toEqual(first.identity);
  });

  it('reads a stored account and its provider session back', async () => {
    const store = createMemoryCredentialStore({
      [CREDENTIAL_KEYS.identity]: JSON.stringify({
        mode: 'google',
        ...ACCOUNT,
        signedInAt: '2026-10-09T09:00:00.000Z',
      }),
      [CREDENTIAL_KEYS.googleTokens]: JSON.stringify({
        idToken: 'header.payload.signature',
        server: null,
        signedInAt: '2026-10-09T09:00:00.000Z',
      }),
    });

    const account = await loadAccount({ store, provider: provider() });
    expect(account.identity.mode).toBe('google');
    expect(account.canSync).toBe(true);
    expect(account.session?.idToken).toBe('header.payload.signature');
  });

  it('ignores an unreadable stored record and stays a guest', async () => {
    const store = createMemoryCredentialStore({ [CREDENTIAL_KEYS.identity]: '{not json' });
    const account = await loadAccount({ store, provider: provider() });
    expect(account.identity.mode).toBe('guest');
  });

  it('signs in with Google and remembers the account', async () => {
    const store = createMemoryCredentialStore();

    const result = await signInWithGoogle({ store, provider: provider(), now: AT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.identity).toMatchObject({ mode: 'google', subject: 'google-123' });
    expect(result.value.syncNote).toContain('Sync begins when the backend is reachable');

    const account = await loadAccount({ store, provider: provider() });
    expect(account.identity).toMatchObject({ mode: 'google', email: 'ada@example.com' });
    expect(account.session?.signedInAt).toBe(AT.toISOString());
  });

  it('exchanges the id token for a server session when a backend is reachable', async () => {
    const store = createMemoryCredentialStore();

    const result = await signInWithGoogle({
      store,
      provider: provider(),
      transport: transport({
        replies: [
          ok({
            userId: 'user-1',
            displayName: 'Ada Lovelace',
            email: 'ada@example.com',
            accessToken: 'access',
            refreshToken: 'refresh',
            expiresAt: '2026-10-11T09:00:00.000Z',
          }),
        ],
      }),
      now: AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.syncNote).toBe('Signed in. Your progress syncs to this account.');
    expect(result.value.session.server?.accessToken).toBe('access');

    const account = await loadAccount({ store, provider: provider() });
    expect(account.session?.server?.userId).toBe('user-1');
  });

  it('signs in locally when the exchange fails, and says so', async () => {
    const store = createMemoryCredentialStore();

    const result = await signInWithGoogle({
      store,
      provider: provider(),
      transport: transport({
        replies: [
          err({
            message: 'Could not reach the server.',
            status: null,
            retryable: true,
            code: 'network',
          }),
        ],
      }),
      now: AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.syncNote).toContain('could not start yet');
    expect(result.value.session.server).toBeNull();
    expect(
      parseStoredGoogleIdentity(JSON.parse((await store.get(CREDENTIAL_KEYS.identity)) ?? 'null')),
    ).not.toBeNull();
  });

  it('does not try an exchange when the transport is unavailable', async () => {
    const store = createMemoryCredentialStore();
    const unavailable = transport({ available: false });

    const result = await signInWithGoogle({
      store,
      provider: provider(),
      transport: unavailable,
      now: AT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.session.server).toBeNull();
  });

  it('reports a provider that is not configured instead of failing at the end', async () => {
    const store = createMemoryCredentialStore();
    const result = await signInWithGoogle({
      store,
      provider: failingProvider(
        new AppError('unsupported', 'Google sign-in is not set up in this build yet.'),
      ),
      now: AT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported');
    expect(await store.get(CREDENTIAL_KEYS.identity)).toBeNull();
  });

  it('reports a cancelled sign-in as unauthorized', async () => {
    const store = createMemoryCredentialStore();
    const result = await signInWithGoogle({
      store,
      provider: failingProvider(new AppError('unauthorized', 'Google sign-in was cancelled.')),
      now: AT,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unauthorized');
  });

  it('signs out to a guest without losing the device id', async () => {
    const store = createMemoryCredentialStore();
    await signInWithGoogle({ store, provider: provider(), now: AT });
    const deviceId = await loadDeviceId(store);

    const result = await signInAsGuest(store);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ mode: 'guest', deviceId });

    const account = await loadAccount({ store, provider: provider() });
    expect(account.identity).toEqual({ mode: 'guest', deviceId });
    expect(account.session).toBeNull();
    expect(await store.get(CREDENTIAL_KEYS.identity)).toBeNull();
  });

  it('stays a guest on a device with no keystore, and says the storage is missing', async () => {
    const unavailable: CredentialStore = {
      isAvailable: async () => false,
      get: async () => {
        throw new AppError('storage', 'No keystore here.');
      },
      set: async () => {
        throw new AppError('storage', 'No keystore here.');
      },
      delete: async () => {
        throw new AppError('storage', 'No keystore here.');
      },
    };

    const account = await loadAccount({ store: unavailable, provider: provider() });
    expect(account.identity.mode).toBe('guest');
    expect(account.storageAvailable).toBe(false);
    expect((account.identity as { deviceId: string }).deviceId.length).toBeGreaterThan(0);
  });

  it('reports a keystore that cannot write, rather than claiming to be signed in', async () => {
    const readOnly: CredentialStore = {
      isAvailable: async () => true,
      get: async () => null,
      set: async () => {
        throw new AppError('storage', 'The keystore is full.');
      },
      delete: async () => undefined,
    };

    const result = await signInWithGoogle({ store: readOnly, provider: provider(), now: AT });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('storage');
  });

  it('narrows the exchange response before storing it', async () => {
    const result = await exchangeGoogleSession({
      transport: transport({ replies: [ok({ userId: 'user-1' })] }),
      idToken: 'header.payload.signature',
      deviceId: 'device-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unsupported');
  });

  it('unwraps an envelope the server wrapped its own response in', async () => {
    const result = await exchangeGoogleSession({
      transport: transport({
        replies: [
          ok({
            contractVersion: 1,
            data: {
              userId: 'user-1',
              displayName: 'Ada',
              email: 'ada@example.com',
              accessToken: 'access',
              refreshToken: 'refresh',
              expiresAt: '2026-10-11T09:00:00.000Z',
            },
          }),
        ],
      }),
      idToken: 'header.payload.signature',
      deviceId: 'device-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('user-1');
  });

  it('passes a transport failure through untouched', async () => {
    const result = await exchangeGoogleSession({
      transport: transport({
        replies: [
          err({
            message: 'Could not reach the server.',
            status: null,
            retryable: true,
            code: 'network',
          }),
        ],
      }),
      idToken: 'header.payload.signature',
      deviceId: 'device-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({ code: 'network', retryable: true });
  });

  it('keeps the sync body contract versioned', async () => {
    const calls: unknown[] = [];
    const capture: ApiTransport = {
      name: 'capture',
      isRemote: true,
      isAvailable: async () => true,
      send: async (request) => {
        calls.push(request.body);
        return ok({
          userId: 'user-1',
          email: 'ada@example.com',
          accessToken: 'a',
          refreshToken: 'r',
          expiresAt: 'later',
        });
      },
    };

    await exchangeGoogleSession({ transport: capture, idToken: 'token-1', deviceId: 'device-1' });
    expect(calls[0]).toEqual({
      contractVersion: 1,
      data: { provider: 'google', idToken: 'token-1', deviceId: 'device-1' },
    });
  });
});
