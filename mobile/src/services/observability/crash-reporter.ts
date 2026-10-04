import { appConfig } from '@/config/env';
import { createLogger, redactContext, type LogContext } from '@/services/logging/logger';

const log = createLogger('crash');

/**
 * Vendor-neutral crash reporting boundary.
 *
 * Default behaviour keeps reports in a bounded in-memory ring so fatal errors are
 * diagnosable in development and through the diagnostics screen, without shipping
 * a third-party SDK or leaking user content.
 */

export interface CrashReport {
  readonly message: string;
  readonly stack?: string;
  readonly componentStack?: string;
  readonly context?: LogContext;
  readonly isFatal: boolean;
  readonly occurredAt: string;
}

export interface CrashReporter {
  report(report: CrashReport): void;
}

const MAX_REPORTS = 20;

class LocalCrashReporter implements CrashReporter {
  private readonly reports: CrashReport[] = [];

  report(report: CrashReport): void {
    this.reports.push({ ...report, context: redactContext(report.context) });
    if (this.reports.length > MAX_REPORTS) this.reports.shift();
    log.error(report.message, report.stack ?? undefined, {
      isFatal: report.isFatal,
      componentStack: report.componentStack,
      environment: appConfig.environment,
    });
  }

  recentReports(): readonly CrashReport[] {
    return [...this.reports];
  }
}

const localReporter = new LocalCrashReporter();
let reporter: CrashReporter = localReporter;

export const crashReporter: CrashReporter = {
  report: (report) => {
    try {
      reporter.report(report);
    } catch {
      // Never let reporting failure cascade into another failure.
    }
  },
};

export const setCrashReporter = (next: CrashReporter): void => {
  reporter = next;
};

export const resetCrashReporter = (): void => {
  reporter = localReporter;
};

export const getRecentCrashReports = (): readonly CrashReport[] => localReporter.recentReports();
