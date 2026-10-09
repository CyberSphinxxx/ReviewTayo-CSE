/**
 * Sync.
 *
 * The pure half of the sync engine: what an event is and how it is keyed
 * (`events.ts`), when a failed delivery is tried again (`backoff.ts`), and how two
 * devices reconcile each kind of change (`policies.ts`). The worker that talks to
 * a transport lives in `services/sync.ts`.
 */

export {
  DEFAULT_BACKOFF,
  backoffSeconds,
  describeBackoff,
  isExhausted,
  nextAttemptAt,
  type BackoffPolicy,
} from './backoff';
export {
  SYNC_ENTITY_TYPES,
  SYNC_EVENT_TYPES,
  answerEvent,
  answerIdempotencyKey,
  describeEventCount,
  savedQuestionEvent,
  savedQuestionIdempotencyKey,
  settingsEvent,
  settingsIdempotencyKey,
  type AnswerEventInput,
  type SavedQuestionEventInput,
  type SettingsEventInput,
  type SyncEntityType,
  type SyncEventDraft,
  type SyncEventType,
} from './events';
export {
  CONFLICT_POLICIES,
  POLICY_DESCRIPTIONS,
  describePolicy,
  mergeAnswers,
  mergeSavedQuestions,
  policyFor,
  resolveLatestIntent,
  type AnswerLike,
  type ConflictPolicy,
  type DirectedValue,
  type SavedQuestionChange,
} from './policies';
