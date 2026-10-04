import { resetLogSink, setLogSink } from '@/services/logging/logger';

/**
 * Silences the logger for tests that deliberately trigger failures.
 *
 * Negative tests assert the returned error codes; printing the corresponding
 * error logs would bury real failures in the output.
 */
export const silenceLogs = (): void => {
  setLogSink({ write: () => undefined });
};

export const restoreLogs = (): void => {
  resetLogSink();
};
