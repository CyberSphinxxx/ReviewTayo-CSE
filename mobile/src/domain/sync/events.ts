/**
 * Sync events.
 *
 * An event is a fact about something that already happened locally, addressed by a
 * deterministic idempotency key, so re-delivering it changes nothing on the
 * server. The payload builders take structural inputs rather than repository
 * records — the domain does not know what a table looks like — and every key is
 * derived from data that already exists (the record's own id, or the instant of
 * the change), never from a counter that would reset with the process.
 */

export const SYNC_EVENT_TYPES = [
  'answer.recorded',
  'settings.updated',
  'saved-question.saved',
  'saved-question.removed',
] as const;
export type SyncEventType = (typeof SYNC_EVENT_TYPES)[number];

export const SYNC_ENTITY_TYPES = ['answer', 'settings', 'saved-question'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

/** `answer:<id>` — stable across retries, restarts and reinstalls of the app on top. */
export const answerIdempotencyKey = (answerId: string): string => `answer:${answerId}`;

/** `settings:<updatedAt>` — the instant of the intent, so the newest one wins. */
export const settingsIdempotencyKey = (updatedAt: string): string => `settings:${updatedAt}`;

/** `saved-question:<id>:<at>` — saving and unsaving are two different intents. */
export const savedQuestionIdempotencyKey = (questionId: string, at: string): string =>
  `saved-question:${questionId}:${at}`;

export interface SyncEventDraft {
  readonly eventType: SyncEventType;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
}

export interface AnswerEventInput {
  readonly id: string;
  readonly questionId: string;
  readonly examId: string;
  readonly subjectId: string;
  readonly conceptIds: readonly string[];
  readonly chosenChoiceId: string;
  readonly correctChoiceId: string;
  readonly isCorrect: boolean;
  readonly source: string;
  readonly answeredAt: string;
  readonly timeSpentSeconds: number | null;
}

export const answerEvent = (answer: AnswerEventInput): SyncEventDraft => ({
  eventType: 'answer.recorded',
  entityType: 'answer',
  entityId: answer.id,
  occurredAt: answer.answeredAt,
  idempotencyKey: answerIdempotencyKey(answer.id),
  payload: {
    questionId: answer.questionId,
    examId: answer.examId,
    subjectId: answer.subjectId,
    conceptIds: [...answer.conceptIds],
    chosenChoiceId: answer.chosenChoiceId,
    correctChoiceId: answer.correctChoiceId,
    isCorrect: answer.isCorrect,
    source: answer.source,
    answeredAt: answer.answeredAt,
    timeSpentSeconds: answer.timeSpentSeconds,
  },
});

export interface SettingsEventInput {
  readonly updatedAt: string;
  readonly themePreference: string;
  readonly textSize: string;
  readonly remindersEnabled: boolean;
  readonly reminderTime: string;
  readonly reminderTimezone: string | null;
}

export const settingsEvent = (settings: SettingsEventInput): SyncEventDraft => ({
  eventType: 'settings.updated',
  entityType: 'settings',
  entityId: 'app-settings',
  occurredAt: settings.updatedAt,
  idempotencyKey: settingsIdempotencyKey(settings.updatedAt),
  payload: {
    themePreference: settings.themePreference,
    textSize: settings.textSize,
    remindersEnabled: settings.remindersEnabled,
    reminderTime: settings.reminderTime,
    reminderTimezone: settings.reminderTimezone,
    updatedAt: settings.updatedAt,
  },
});

export interface SavedQuestionEventInput {
  readonly questionId: string;
  readonly examId: string;
  readonly at: string;
}

export const savedQuestionEvent = (
  input: SavedQuestionEventInput,
  saved: boolean,
): SyncEventDraft => ({
  eventType: saved ? 'saved-question.saved' : 'saved-question.removed',
  entityType: 'saved-question',
  entityId: input.questionId,
  occurredAt: input.at,
  idempotencyKey: savedQuestionIdempotencyKey(input.questionId, input.at),
  payload: { questionId: input.questionId, examId: input.examId, saved, changedAt: input.at },
});

/** `1 answer recorded` — a one-line summary of what a batch of events contains. */
export const describeEventCount = (eventType: SyncEventType, count: number): string => {
  const noun =
    eventType === 'answer.recorded'
      ? 'answer'
      : eventType === 'settings.updated'
        ? 'settings change'
        : 'saved question';
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};
