import {
  DEFAULT_BACKOFF,
  answerEvent,
  backoffSeconds,
  describeBackoff,
  describeEventCount,
  isExhausted,
  mergeAnswers,
  mergeSavedQuestions,
  nextAttemptAt,
  policyFor,
  resolveLatestIntent,
  savedQuestionEvent,
  settingsEvent,
  type SavedQuestionChange,
} from '@/domain/sync';

/**
 * Sync domain.
 *
 * Three pure things are held to account here: the retry schedule (bounded, jittered,
 * and exhausted rather than endless), the events (each keyed by data that already
 * exists, so a retry and a replay are the same event), and the merge policies (one
 * per kind of change, because one rule for everything would be wrong for most of
 * it).
 */

const AT = '2026-10-10T09:00:00.000Z';
const HALF = () => 0.5;

describe('sync backoff', () => {
  it('doubles the delay with each attempt and stops at the ceiling', () => {
    const policy = { baseSeconds: 10, factor: 2, maxSeconds: 100, maxAttempts: 8 };

    expect(backoffSeconds(0, policy, () => 1)).toBe(10);
    expect(backoffSeconds(1, policy, () => 1)).toBe(20);
    expect(backoffSeconds(2, policy, () => 1)).toBe(40);
    expect(backoffSeconds(3, policy, () => 1)).toBe(80);
    expect(backoffSeconds(4, policy, () => 1)).toBe(100);
    expect(backoffSeconds(9, policy, () => 1)).toBe(100);
  });

  it('jitters between half and all of the delay', () => {
    const policy = { baseSeconds: 100, factor: 2, maxSeconds: 900, maxAttempts: 8 };

    expect(backoffSeconds(0, policy, () => 0)).toBe(50);
    expect(backoffSeconds(0, policy, HALF)).toBe(75);
    expect(backoffSeconds(0, policy, () => 0.999)).toBe(100);
  });

  it('never returns a zero delay, even at the smallest ceiling', () => {
    expect(backoffSeconds(0, { ...DEFAULT_BACKOFF, baseSeconds: 1 }, () => 0)).toBe(1);
  });

  it('schedules the next attempt from the instant of the failure', () => {
    const now = new Date(2026, 9, 10, 9, 0, 0);
    const at = nextAttemptAt(
      1,
      now,
      { baseSeconds: 10, factor: 2, maxSeconds: 900, maxAttempts: 8 },
      () => 1,
    );
    expect(Date.parse(at) - now.getTime()).toBe(20_000);
  });

  it('exhausts an event after the policy maximum and not before', () => {
    const policy = { ...DEFAULT_BACKOFF, maxAttempts: 3 };
    expect(isExhausted(0, policy)).toBe(false);
    expect(isExhausted(1, policy)).toBe(false);
    expect(isExhausted(2, policy)).toBe(true);
  });

  it('describes the schedule in learner language', () => {
    expect(describeBackoff()).toContain('15 minutes');
    expect(describeBackoff()).toContain('8 times');
  });
});

describe('sync events', () => {
  it('keys an answer by its own id, so a retry is the same event', () => {
    const answer = {
      id: 'answer-1',
      questionId: 'q1',
      examId: 'cse',
      subjectId: 'verbal-ability',
      conceptIds: ['vocabulary', 'synonyms'],
      chosenChoiceId: 'a',
      correctChoiceId: 'b',
      isCorrect: false,
      source: 'practice',
      answeredAt: AT,
      timeSpentSeconds: 22,
    };

    const event = answerEvent(answer);
    expect(event).toMatchObject({
      eventType: 'answer.recorded',
      entityType: 'answer',
      entityId: 'answer-1',
      occurredAt: AT,
      idempotencyKey: 'answer:answer-1',
    });
    expect(event.payload).toMatchObject({
      questionId: 'q1',
      isCorrect: false,
      conceptIds: ['vocabulary', 'synonyms'],
    });
    expect(answerEvent(answer).idempotencyKey).toBe(event.idempotencyKey);
  });

  it('keys settings by the instant the learner meant them', () => {
    const event = settingsEvent({
      updatedAt: AT,
      themePreference: 'dark',
      textSize: 'large',
      remindersEnabled: true,
      reminderTime: '19:00',
      reminderTimezone: 'Asia/Manila',
    });

    expect(event.eventType).toBe('settings.updated');
    expect(event.entityType).toBe('settings');
    expect(event.idempotencyKey).toBe(`settings:${AT}`);
    expect(event.payload).toMatchObject({ themePreference: 'dark', remindersEnabled: true });
  });

  it('tells a save from an unsave, in both the type and the key', () => {
    const saved = savedQuestionEvent({ questionId: 'q1', examId: 'cse', at: AT }, true);
    const removed = savedQuestionEvent({ questionId: 'q1', examId: 'cse', at: AT }, false);

    expect(saved.eventType).toBe('saved-question.saved');
    expect(removed.eventType).toBe('saved-question.removed');
    expect(saved.idempotencyKey).toBe(`saved-question:q1:${AT}`);
    expect(removed.idempotencyKey).toBe(`saved-question:q1:${AT}`);
    expect(saved.payload).toMatchObject({ saved: true });
    expect(removed.payload).toMatchObject({ saved: false });
  });

  it('counts a batch in words', () => {
    expect(describeEventCount('answer.recorded', 1)).toBe('1 answer');
    expect(describeEventCount('answer.recorded', 3)).toBe('3 answers');
    expect(describeEventCount('settings.updated', 2)).toBe('2 settings changes');
  });
});

describe('conflict policies', () => {
  it('names a policy for every entity this build syncs', () => {
    expect(policyFor('answer')).toBe('append-only');
    expect(policyFor('settings')).toBe('latest-intent-wins');
    expect(policyFor('saved-question')).toBe('set-merge');
    expect(policyFor('mastery')).toBe('derive-from-answers');
  });

  it('refuses to merge what it does not know', () => {
    expect(policyFor('something-new')).toBe('unsupported');
  });

  it('takes the latest intent for settings, with the local device breaking a tie', () => {
    expect(
      resolveLatestIntent(
        { value: 'light', updatedAt: '2026-10-10T09:00:00.000Z' },
        { value: 'dark', updatedAt: '2026-10-10T10:00:00.000Z' },
      ),
    ).toBe('dark');
    expect(
      resolveLatestIntent(null, { value: 'dark', updatedAt: '2026-10-10T10:00:00.000Z' }),
    ).toBe('dark');
    expect(resolveLatestIntent({ value: 'light', updatedAt: AT }, null)).toBe('light');
    expect(resolveLatestIntent(null, null)).toBeNull();
    expect(
      resolveLatestIntent(
        { value: 'light', updatedAt: '2026-10-10T10:00:00.000Z' },
        { value: 'dark', updatedAt: '2026-10-10T10:00:00.000Z' },
      ),
    ).toBe('light');
  });

  it('merges saved questions by the newest intent and remembers an unsave', () => {
    const local: SavedQuestionChange[] = [
      { questionId: 'q2', saved: true, changedAt: '2026-10-10T09:00:00.000Z' },
      { questionId: 'q1', saved: false, changedAt: '2026-10-10T11:00:00.000Z' },
    ];
    const remote: SavedQuestionChange[] = [
      { questionId: 'q1', saved: true, changedAt: '2026-10-10T10:00:00.000Z' },
      { questionId: 'q3', saved: true, changedAt: '2026-10-10T08:00:00.000Z' },
    ];

    expect(mergeSavedQuestions(local, remote)).toEqual([
      { questionId: 'q1', saved: false, changedAt: '2026-10-10T11:00:00.000Z' },
      { questionId: 'q2', saved: true, changedAt: '2026-10-10T09:00:00.000Z' },
      { questionId: 'q3', saved: true, changedAt: '2026-10-10T08:00:00.000Z' },
    ]);
  });

  it('lets the local device win a set-merge tie', () => {
    const at = '2026-10-10T10:00:00.000Z';
    expect(mergeSavedQuestions([{ questionId: 'q1', saved: true, changedAt: at }], [])).toEqual([
      { questionId: 'q1', saved: true, changedAt: at },
    ]);
    expect(mergeSavedQuestions([], [])).toEqual([]);
  });

  it('appends answers, collapsing a redelivered one and ordering by time', () => {
    const first = { id: 'a1', answeredAt: '2026-10-10T09:00:00.000Z' };
    const second = { id: 'a2', answeredAt: '2026-10-10T11:00:00.000Z' };
    const third = { id: 'a3', answeredAt: '2026-10-10T10:00:00.000Z' };

    expect(mergeAnswers([second, first], [first, third])).toEqual([first, third, second]);
    expect(mergeAnswers([], [])).toEqual([]);
  });
});
