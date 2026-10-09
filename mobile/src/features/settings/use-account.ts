import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { appConfig } from '@/config/env';
import type { Repositories } from '@/data/repositories';
import { createApiTransport, type ApiTransport } from '@/data/remote';
import { describeIdentity, identityActorId, identityInitial, isSignedIn } from '@/domain/identity';
import type { AppError } from '@/domain/result';
import { toAppError } from '@/domain/result';
import { createSecureCredentialStore, type CredentialStore } from '@/services/credentials';
import { createGoogleAuthProvider, type GoogleAuthProvider } from '@/services/google-auth';
import { loadAccount, signInAsGuest, signInWithGoogle } from '@/services/auth';
import { loadSyncOverview, syncNow } from '@/services/sync';

/**
 * Account and sync model for Settings.
 *
 * The two things the screen needs are who is using the app and whether anything is
 * waiting to leave the device. Both are read from the same account state the rest
 * of the app uses, and every action here is explicitly non-blocking: study never
 * waits for the network (D-052). Dependencies are injectable so the screen can be
 * exercised with a memory keystore and a fake transport.
 */

export type AccountStatus = 'loading' | 'ready';

export interface AccountDependencies {
  readonly store?: CredentialStore;
  readonly provider?: GoogleAuthProvider;
  readonly transport?: ApiTransport;
}

export interface AccountModel {
  readonly status: AccountStatus;
  readonly identityTitle: string;
  readonly identitySubtitle: string;
  readonly identityDetail: string;
  readonly identityInitial: string;
  readonly signedIn: boolean;
  readonly canSync: boolean;
  readonly providerConfigured: boolean;
  readonly storageAvailable: boolean;
  readonly syncLine: string;
  readonly pendingLine: string;
  readonly busy: boolean;
  readonly notice: string | null;
  readonly error: AppError | null;
  readonly signIn: () => void;
  readonly continueAsGuest: () => void;
  readonly runSync: () => void;
}

export const useAccount = (
  repositories: Repositories,
  dependencies: AccountDependencies = {},
): AccountModel => {
  const store = useMemo(
    () => dependencies.store ?? createSecureCredentialStore(),
    [dependencies.store],
  );
  const transport = useMemo(
    () => dependencies.transport ?? createApiTransport(appConfig),
    [dependencies.transport],
  );
  const provider = useMemo(
    () => dependencies.provider ?? createGoogleAuthProvider(appConfig.googleAuth),
    [dependencies.provider],
  );

  const [status, setStatus] = useState<AccountStatus>('loading');
  const [identityTitle, setIdentityTitle] = useState('Guest');
  const [identitySubtitle, setIdentitySubtitle] = useState('Saved on this device only');
  const [identityDetail, setIdentityDetail] = useState(
    'Sign in to sync your progress across devices.',
  );
  const [initial, setInitial] = useState('G');
  const [signedIn, setSignedIn] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [actorId, setActorId] = useState<string | null>(null);
  const [syncLine, setSyncLine] = useState('Saved on this device');
  const [pendingLine, setPendingLine] = useState('Nothing waiting');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async () => {
    try {
      const account = await loadAccount({ store, provider, transport });
      const described = describeIdentity(account.identity);
      setIdentityTitle(described.title);
      setIdentitySubtitle(described.subtitle);
      setIdentityDetail(described.detail);
      setInitial(identityInitial(account.identity));
      setSignedIn(isSignedIn(account.identity));
      setCanSync(account.canSync);
      setProviderConfigured(account.providerConfigured);
      setStorageAvailable(account.storageAvailable);
      setActorId(identityActorId(account.identity));

      // Offline-to-online recovery: opening a screen that reads sync is the
      // natural moment to drain whatever queued while there was no connection.
      let overview = await loadSyncOverview({ repositories, transport });
      if (overview.available && overview.pending > 0) {
        await syncNow({
          repositories,
          transport,
          actorId: identityActorId(account.identity),
        });
        overview = await loadSyncOverview({ repositories, transport });
      }
      setSyncLine(overview.line);
      setPendingLine(overview.pendingLine);
      setError(null);
      setStatus('ready');
    } catch (cause) {
      setError(toAppError(cause, 'Could not read your account.'));
      setStatus('ready');
    }
  }, [provider, repositories, store, transport]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const signIn = useCallback(() => {
    setBusy(true);
    setNotice(null);
    void (async () => {
      try {
        const result = await signInWithGoogle({ store, provider, transport });
        setNotice(result.ok ? result.value.syncNote : result.error.message);
      } catch (cause) {
        setNotice(toAppError(cause, 'Sign-in could not be completed.').message);
      } finally {
        setBusy(false);
        void load();
      }
    })();
  }, [load, provider, store, transport]);

  const continueAsGuest = useCallback(() => {
    setBusy(true);
    setNotice(null);
    void (async () => {
      try {
        const result = await signInAsGuest(store);
        if (!result.ok) setNotice(result.error.message);
        else setNotice('Signed out. Your work stays on this device.');
      } finally {
        setBusy(false);
        void load();
      }
    })();
  }, [load, store]);

  const runSync = useCallback(() => {
    setBusy(true);
    setNotice(null);
    void (async () => {
      try {
        const summary = await syncNow({ repositories, transport, actorId });
        setNotice(summary.message);
      } catch (cause) {
        setNotice(toAppError(cause, 'Sync could not run.').message);
      } finally {
        setBusy(false);
        void load();
      }
    })();
  }, [actorId, load, repositories, transport]);

  return {
    status,
    identityTitle,
    identitySubtitle,
    identityDetail,
    identityInitial: initial,
    signedIn,
    canSync,
    providerConfigured,
    storageAvailable,
    syncLine,
    pendingLine,
    busy,
    notice,
    error,
    signIn,
    continueAsGuest,
    runSync,
  };
};
