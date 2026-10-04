import { appConfig } from '@/config/env';
import { createLogger, type LogContext } from '@/services/logging/logger';

const log = createLogger('analytics');

/**
 * Vendor-neutral analytics boundary.
 *
 * Product logic must never depend on analytics succeeding, and no provider is
 * required for v1. The default implementation records events in memory, which
 * keeps the integration testable and lets the app ship without a third-party SDK.
 */

export type AnalyticsEventName =
  | 'onboarding_completed'
  | 'practice_started'
  | 'practice_completed'
  | 'review_started'
  | 'review_completed'
  | 'mock_started'
  | 'mock_completed'
  | 'quiz_abandoned'
  | 'theme_changed'
  | 'text_size_changed'
  | 'reminders_changed'
  | 'content_pack_updated'
  | 'sync_completed'
  | 'sync_failed';

export interface AnalyticsEvent {
  readonly name: AnalyticsEventName;
  readonly properties?: LogContext;
  readonly occurredAt: string;
}

export interface AnalyticsClient {
  track(name: AnalyticsEventName, properties?: LogContext): void;
  screen(name: string): void;
}

const MAX_BUFFERED_EVENTS = 100;

class LocalAnalyticsClient implements AnalyticsClient {
  private readonly buffer: AnalyticsEvent[] = [];

  track(name: AnalyticsEventName, properties?: LogContext): void {
    const event: AnalyticsEvent = {
      name,
      properties,
      occurredAt: new Date().toISOString(),
    };
    this.buffer.push(event);
    if (this.buffer.length > MAX_BUFFERED_EVENTS) this.buffer.shift();
    log.debug('event', { name, ...(appConfig.isProduction ? {} : { properties }) });
  }

  screen(name: string): void {
    log.debug('screen', { name });
  }

  /** Test/diagnostic helper; never surfaced in the UI. */
  recentEvents(): readonly AnalyticsEvent[] {
    return [...this.buffer];
  }
}

let client: AnalyticsClient = new LocalAnalyticsClient();

export const analytics: AnalyticsClient = {
  track: (name, properties) => {
    try {
      client.track(name, properties);
    } catch (error) {
      // Analytics must never break a study session.
      log.warn('tracking failed', { error: String(error) });
    }
  },
  screen: (name) => {
    try {
      client.screen(name);
    } catch (error) {
      log.warn('screen tracking failed', { error: String(error) });
    }
  },
};

export const setAnalyticsClient = (next: AnalyticsClient): void => {
  client = next;
};

export const resetAnalyticsClient = (): void => {
  client = new LocalAnalyticsClient();
};
