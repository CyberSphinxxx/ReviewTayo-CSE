import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { bundledContentPacks } from '@content/exams';

import { bootstrapLocalDatabase } from '@/data/local/content-import';
import type { DatabasePort } from '@/data/local/database-port';
import { createLocalRepositories } from '@/data/local/repositories';
import { openExpoDatabase } from '@/data/local/sqlite/expo-database';
import type { Repositories } from '@/data/repositories';
import { registerBundledPacks } from '@/domain/exams/bootstrap';
import type { ExamContentPack } from '@/domain/exams/types';
import { err, ok, toAppError, type AppError, type Result } from '@/domain/result';
import { createLogger } from '@/services/logging/logger';

const log = createLogger('local-data');

/**
 * Local data provider.
 *
 * The composition root for everything persisted: it opens the device database,
 * brings the schema up to date, imports bundled content, and exposes repositories
 * to the tree. Screens never touch SQLite directly (enforced by lint), and tests
 * inject a database factory so the exact same wiring is exercised off-device.
 */

export type LocalDataStatus = 'starting' | 'ready' | 'failed';

export interface LocalDataContextValue {
  readonly status: LocalDataStatus;
  readonly repositories: Repositories | null;
  readonly error: AppError | null;
  readonly retry: () => void;
}

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

export interface LocalDataProviderProps {
  readonly children: ReactNode;
  /** Test/alternative seam; defaults to the on-device SQLite database. */
  readonly openDatabase?: () => Promise<DatabasePort>;
  /** Test seam; defaults to registering the bundled, validated content packs. */
  readonly loadPacks?: () => Result<readonly ExamContentPack[], AppError>;
}

const DEFAULT_DATABASE_NAME = 'reviewtayo.db';

const defaultOpenDatabase = (): Promise<DatabasePort> => openExpoDatabase(DEFAULT_DATABASE_NAME);

const loadBundledPacks = (): Result<readonly ExamContentPack[], AppError> => {
  const result = registerBundledPacks(bundledContentPacks);
  if (!result.ok) return err(result.error);
  return ok(result.value.registered);
};

export const LocalDataProvider = ({
  children,
  openDatabase = defaultOpenDatabase,
  loadPacks = loadBundledPacks,
}: LocalDataProviderProps) => {
  const [status, setStatus] = useState<LocalDataStatus>('starting');
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const databaseRef = useRef<DatabasePort | null>(null);
  const mountedRef = useRef(true);
  const attemptRef = useRef(0);

  const open = useCallback(async () => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setStatus('starting');
    setError(null);

    try {
      const database = await openDatabase();
      const packs = loadPacks();
      if (!packs.ok) throw packs.error;

      await bootstrapLocalDatabase(database, packs.value);
      const wired = createLocalRepositories(database);

      if (!mountedRef.current || attemptRef.current !== attempt) {
        await database.close();
        return;
      }

      databaseRef.current = database;
      setRepositories(wired);
      setStatus('ready');
      log.info('local data ready', { exams: packs.value.map((pack) => pack.exam.id) });
    } catch (cause) {
      const failure = toAppError(cause, 'Could not open your study data.');
      log.error('local data bootstrap failed', failure);
      if (mountedRef.current && attemptRef.current === attempt) {
        setRepositories(null);
        setError(failure);
        setStatus('failed');
      }
    }
  }, [loadPacks, openDatabase]);

  useEffect(() => {
    mountedRef.current = true;
    // Deferred by a tick so the first render paints the launch state without a
    // synchronous state update from inside the effect.
    const start = setTimeout(() => {
      void open();
    }, 0);
    return () => {
      clearTimeout(start);
      mountedRef.current = false;
      const database = databaseRef.current;
      databaseRef.current = null;
      if (database !== null) void database.close();
    };
  }, [open]);

  const retry = useCallback(() => {
    void open();
  }, [open]);

  const value = useMemo<LocalDataContextValue>(
    () => ({ status, repositories, error, retry }),
    [error, repositories, retry, status],
  );

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
};

export const useLocalData = (): LocalDataContextValue => {
  const value = useContext(LocalDataContext);
  if (value === null) {
    throw new Error('useLocalData must be used inside <LocalDataProvider>.');
  }
  return value;
};
