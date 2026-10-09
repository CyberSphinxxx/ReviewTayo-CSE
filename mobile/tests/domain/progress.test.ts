import { conceptsForTrack, journeyTimeline } from '@/domain/exams';
import type { ConceptEvidence, SubjectAccuracy } from '@/domain/sessions';
import { startOfWeek, toIsoDate } from '@/domain/study-plan';
import {
  MASTERY_SOLID,
  NO_EXAM_DATE_LINE,
  SCORE_WEIGHTS,
  STUDY_SCORE_WEEKS,
  buildWeek,
  conceptMasteryRows,
  describeMasteryEvidence,
  describeMasteryLine,
  journeyProgress,
  mockScorePercent,
  needsAttention,
  recentMockResult,
  scoreFrom,
  studyScore,
  summarizeMastery,
  type MockAttempt,
  type StudyAnswer,
  type WeekActivityDay,
} from '@/domain/progress';

import { loadCsePack } from '@tests/utils/exam-fixtures';

/**
 * Progress domain.
 *
 * The score and its arithmetic, the subject to work on next, concept mastery, the
 * exam's phases as a timeline, this week's bars and the last mock. These are asserted
 * here rather than through a screen because a wrong score is a product fault however it
 * is drawn — and because the score reads the answer history, it is the one number in
 * the app that could quietly reward the wrong behaviour.
 */

const { exam } = loadCsePack();
const policy = exam.studyPolicy;
const TRACK = 'professional';
const CONCEPT_IDS = conceptsForTrack(exam, TRACK).map((concept) => concept.id);
const CONCEPT_COUNT = CONCEPT_IDS.length;

/** Local noon, so window boundaries are days and never time zones. */
const NOW = new Date(2026, 9, 8, 12);

const dayOf = (daysAgo: number, hour = 9): Date => new Date(2026, 9, 8 - daysAgo, hour);

const answer = (daysAgo: number, conceptIndex: number, isCorrect = true): StudyAnswer => ({
  conceptIds: [CONCEPT_IDS[conceptIndex % CONCEPT_COUNT] as string],
  isCorrect,
  answeredAt: dayOf(daysAgo).toISOString(),
});

const activity = (
  daysAgo: number,
  questionsAnswered: number,
  correctCount: number,
): WeekActivityDay => ({
  day: toIsoDate(dayOf(daysAgo)),
  questionsAnswered,
  correctCount,
});

const evidence = (
  conceptId: string,
  correctCount: number,
  wrongCount: number,
  lastAnsweredAt: string | null = dayOf(1).toISOString(),
): ConceptEvidence => ({ conceptId, correctCount, wrongCount, lastAnsweredAt });

const accuracy = (subjectId: string, answered: number, correct: number): SubjectAccuracy => ({
  subjectId,
  answered,
  correct,
});

const attempt = (overrides: Partial<MockAttempt> = {}): MockAttempt => ({
  id: 'mock-1',
  trackId: TRACK,
  status: 'completed',
  totalItems: 170,
  answeredCount: 170,
  correctCount: 116,
  completedAt: dayOf(3).toISOString(),
  ...overrides,
});

describe('study score', () => {
  it('is built from accuracy, coverage and consistency, in that order of weight', () => {
    expect(SCORE_WEIGHTS.accuracy).toBeGreaterThan(SCORE_WEIGHTS.coverage);
    expect(SCORE_WEIGHTS.coverage).toBeGreaterThan(SCORE_WEIGHTS.consistency);
    expect(scoreFrom({ accuracy: 1, coverage: 1, consistency: 1 })).toBe(100);
    expect(scoreFrom({ accuracy: 0, coverage: 0, consistency: 0 })).toBe(0);
    expect(scoreFrom({ accuracy: 0.5, coverage: 0, consistency: 0 })).toBe(
      Math.round(50 * SCORE_WEIGHTS.accuracy),
    );
  });

  it('reads accuracy from the window and counts every day of it', () => {
    const answers = Array.from({ length: 7 }, (_unused, index) => answer(index, index, index < 4));
    const score = studyScore({ exam, trackId: TRACK, answers, now: NOW });

    expect(score.components.accuracy).toBeCloseTo(4 / 7, 5);
    expect(score.components.coverage).toBeCloseTo(7 / CONCEPT_COUNT, 5);
    expect(score.components.consistency).toBe(1);
    expect(score.value).toBe(scoreFrom(score.components));
  });

  it('counts a concept once however often it is answered', () => {
    const repeated = Array.from({ length: 6 }, () => answer(0, 0));
    const spread = [0, 1, 2, 3, 4, 5].map((index) => answer(0, index));

    const narrow = studyScore({ exam, trackId: TRACK, answers: repeated, now: NOW });
    const wide = studyScore({ exam, trackId: TRACK, answers: spread, now: NOW });

    expect(narrow.components.coverage).toBeCloseTo(1 / CONCEPT_COUNT, 5);
    expect(wide.components.coverage).toBeCloseTo(6 / CONCEPT_COUNT, 5);
    expect(wide.value).toBeGreaterThan(narrow.value);
  });

  it('counts days of work, not the number of answers', () => {
    const oneDay = Array.from({ length: 5 }, (_unused, index) => answer(0, index));
    const fiveDays = [0, 1, 2, 3, 4].map((daysAgo) => answer(daysAgo, 0));

    const crammed = studyScore({ exam, trackId: TRACK, answers: oneDay, now: NOW });
    const steady = studyScore({ exam, trackId: TRACK, answers: fiveDays, now: NOW });

    expect(crammed.components.consistency).toBeCloseTo(1 / 7, 5);
    expect(steady.components.consistency).toBeCloseTo(5 / 7, 5);
  });

  it('ignores answers from before the window', () => {
    const inside = studyScore({ exam, trackId: TRACK, answers: [answer(0, 0)], now: NOW });
    const outside = studyScore({ exam, trackId: TRACK, answers: [answer(20, 0)], now: NOW });

    expect(inside.components.accuracy).toBe(1);
    expect(outside.components.accuracy).toBe(0);
    expect(outside.value).toBeLessThan(inside.value);
  });

  it('plots six weekly points and ends on the week that ends today', () => {
    const answers = [0, 7, 8, 14, 21].map((daysAgo) => answer(daysAgo, 0));
    const score = studyScore({ exam, trackId: TRACK, answers, now: NOW });

    expect(score.series).toHaveLength(STUDY_SCORE_WEEKS);
    expect(score.series[score.series.length - 1]).toBe(score.value);
    expect(score.series.every((point) => point >= 0 && point <= 100)).toBe(true);
    // The point before this week is last week's window, so this week's answers do not
    // move it.
    const withoutThisWeek = studyScore({
      exam,
      trackId: TRACK,
      answers: [7, 8, 14, 21].map((daysAgo) => answer(daysAgo, 0)),
      now: NOW,
    });
    expect(score.series[score.series.length - 2]).toBe(
      withoutThisWeek.series[withoutThisWeek.series.length - 2],
    );
  });

  it('calls a better week improving and a worse week slipping', () => {
    const thisWeekUp = [0, 1, 2, 3, 4, 5, 6].map((daysAgo) => answer(daysAgo, daysAgo, true));
    const lastWeekDown = [7, 8, 9, 10, 11, 12, 13].map((daysAgo) => answer(daysAgo, 0, false));

    const improving = studyScore({
      exam,
      trackId: TRACK,
      answers: [...thisWeekUp, ...lastWeekDown],
      now: NOW,
    });
    const slipping = studyScore({
      exam,
      trackId: TRACK,
      answers: [
        ...thisWeekUp.map((entry) => ({ ...entry, isCorrect: false })),
        ...lastWeekDown.map((entry) => ({ ...entry, isCorrect: true })),
      ],
      now: NOW,
    });

    expect(improving.trend.direction).toBe('improving');
    expect(improving.trend.label).toContain('Improving');
    expect(improving.trend.delta).toBeGreaterThan(0);
    expect(slipping.trend.direction).toBe('slipping');
    expect(slipping.trend.label).toContain('Slipping');
    expect(slipping.trend.delta).toBeLessThan(0);
  });

  it('holds steady when the two weeks are the same', () => {
    const week = (offset: number) =>
      [0, 1, 2, 3, 4, 5, 6].map((daysAgo) => answer(daysAgo + offset, daysAgo, daysAgo % 2 === 0));

    const score = studyScore({
      exam,
      trackId: TRACK,
      answers: [...week(0), ...week(7)],
      now: NOW,
    });
    expect(score.trend.direction).toBe('steady');
    expect(score.trend.delta).toBe(0);
  });

  it('refuses a trend it has no history for', () => {
    const score = studyScore({ exam, trackId: TRACK, answers: [], now: NOW });

    expect(score.value).toBe(0);
    expect(score.trend.direction).toBe('unknown');
    expect(score.trend.label).toBe('Not enough history yet');
    expect(score.series).toEqual(new Array(STUDY_SCORE_WEEKS).fill(0));
  });
});

describe('needs attention', () => {
  const minimum = policy.weakestAreaMinimumAttempts;

  it('names the weakest subject with the evidence behind it', () => {
    const row = needsAttention({
      exam,
      trackId: TRACK,
      accuracy: [
        accuracy('verbal-ability', 25, 16),
        accuracy('numerical-ability', 25, 20),
        accuracy('general-information', 25, 24),
      ],
      policy,
    });

    expect(row).not.toBeNull();
    expect(row?.subjectId).toBe('verbal-ability');
    expect(row?.subjectName).toBe('Verbal Ability');
    expect(row?.line).toBe('64% accuracy');
    expect(row?.hint).toBe('16 of 25 answers right');
    expect(row?.count).toBe(Math.max(1, policy.drillSize));
  });

  it('says nothing when no subject has been answered enough to judge', () => {
    const row = needsAttention({
      exam,
      trackId: TRACK,
      accuracy: [accuracy('verbal-ability', minimum - 1, 0)],
      policy,
    });
    expect(row).toBeNull();
  });

  it('ignores a subject the learner\u2019s track does not examine', () => {
    const row = needsAttention({
      exam,
      trackId: TRACK,
      accuracy: [accuracy('clerical-ability', minimum + 10, 0)],
      policy,
    });
    expect(row).toBeNull();
  });
});

describe('concept mastery', () => {
  const rowsFor = (evidenceRows: readonly ConceptEvidence[]) =>
    conceptMasteryRows({ exam, trackId: TRACK, evidence: evidenceRows, policy: policy.mastery });

  it('covers the whole track, including concepts never answered', () => {
    const rows = rowsFor([]);
    expect(rows).toHaveLength(CONCEPT_COUNT);
    expect(rows.every((row) => row.level === 'Learning' && !row.started)).toBe(true);
  });

  it('puts the least mastered concept first, untouched concepts leading', () => {
    const strong = CONCEPT_IDS[0] as string;
    const weak = CONCEPT_IDS[3] as string;
    const rows = rowsFor([evidence(strong, 12, 1), evidence(weak, 1, 4)]);

    const untouched = rows.filter((row) => !row.started);
    expect(untouched).toHaveLength(CONCEPT_COUNT - 2);
    // An unanswered concept is the largest gap, so it is listed before a concept the
    // learner has answered and got mostly wrong.
    expect(rows.slice(0, untouched.length).every((row) => !row.started)).toBe(true);

    const weakIndex = rows.findIndex((row) => row.conceptId === weak);
    const strongIndex = rows.findIndex((row) => row.conceptId === strong);
    expect(rows[weakIndex]?.level).toBe('Learning');
    expect(rows[strongIndex]?.level).toBe('Mastered');
    expect(weakIndex).toBeLessThan(strongIndex);
  });

  it('can be narrowed to one subject without changing the order', () => {
    const subjectId = 'verbal-ability';
    const rows = conceptMasteryRows({
      exam,
      trackId: TRACK,
      evidence: [],
      policy: policy.mastery,
      subjectId,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.subjectId === subjectId)).toBe(true);
    expect(rows.every((row) => row.subjectName === 'Verbal Ability')).toBe(true);
  });

  it('summarises how much of the syllabus is solid', () => {
    const mastered = CONCEPT_IDS[0] as string;
    const strong = CONCEPT_IDS[1] as string;
    const summary = summarizeMastery(rowsFor([evidence(mastered, 20, 0), evidence(strong, 10, 2)]));

    expect(summary.total).toBe(CONCEPT_COUNT);
    expect(summary.started).toBe(2);
    expect(summary.mastered).toBe(1);
    expect(summary.strong).toBe(1);
    expect(summary.solidRatio).toBeCloseTo(2 / CONCEPT_COUNT, 5);
    expect(MASTERY_SOLID).toBe('Strong');
    expect(summary.line).toBe(`1 of ${CONCEPT_COUNT} mastered · 2 started`);
  });

  it('says a subject has not been started rather than showing a confident zero', () => {
    expect(describeMasteryLine({ total: 0, started: 0, mastered: 0 })).toBe(
      'No concepts in this exam yet',
    );
    expect(describeMasteryLine({ total: 5, started: 0, mastered: 0 })).toBe(
      '5 concepts · not started yet',
    );
    expect(describeMasteryLine({ total: 1, started: 0, mastered: 0 })).toBe(
      '1 concept · not started yet',
    );
  });

  it('describes the evidence behind a level', () => {
    const rows = rowsFor([evidence(CONCEPT_IDS[0] as string, 4, 2)]);
    const answered = rows.find((row) => row.attempts > 0);
    const untouched = rows.find((row) => row.attempts === 0);

    expect(answered === undefined ? '' : describeMasteryEvidence(answered)).toBe(
      '67% accuracy · 6 answered',
    );
    expect(untouched === undefined ? '' : describeMasteryEvidence(untouched)).toBe(
      'Not answered yet',
    );
  });
});

describe('CSE journey', () => {
  const at = (daysAway: number): string => toIsoDate(new Date(2026, 9, 8 + daysAway));

  it('walks the exam\u2019s own phases in presentation order', () => {
    const journey = journeyProgress({ exam, examDate: at(200), now: NOW });
    expect(journey.stops.map((stop) => stop.id)).toEqual(
      journeyTimeline(exam).map((phase) => phase.id),
    );
    expect(journey.stops).toHaveLength(exam.studyPolicy.journeyPhases.length);
  });

  it('marks the phase the date places the learner in', () => {
    const foundation = journeyProgress({ exam, examDate: at(200), now: NOW });
    expect(foundation.activeId).toBe('foundation');
    expect(foundation.stops[0]?.status).toBe('current');
    expect(foundation.stops.every((stop, index) => index === 0 || stop.status === 'upcoming')).toBe(
      true,
    );
    expect(foundation.line).toContain('Foundation Phase');

    const accuracyPhase = journeyProgress({ exam, examDate: at(45), now: NOW });
    expect(accuracyPhase.activeId).toBe('accuracy');
    expect(accuracyPhase.stops[0]?.status).toBe('done');
    expect(accuracyPhase.stops[1]?.status).toBe('current');
    expect(accuracyPhase.line).toContain('45 days left');

    const finalReview = journeyProgress({ exam, examDate: at(0), now: NOW });
    expect(finalReview.activeId).toBe('final-review');
    expect(finalReview.stops.filter((stop) => stop.status === 'done')).toHaveLength(4);
    expect(finalReview.line).toContain('Exam day');
  });

  it('places nobody when there is no exam date', () => {
    const journey = journeyProgress({ exam, examDate: null, now: NOW });

    expect(journey.activeId).toBeNull();
    expect(journey.activeName).toBeNull();
    expect(journey.daysRemaining).toBeNull();
    expect(journey.line).toBe(NO_EXAM_DATE_LINE);
    expect(journey.stops.every((stop) => stop.status === 'upcoming')).toBe(true);
  });
});

describe('this week', () => {
  const build = (
    days: readonly WeekActivityDay[],
    dailyGoal = 10,
    studyDays: readonly string[] = ['Mon', 'Wed', 'Fri'],
  ) => buildWeek({ days, now: NOW, dailyGoal, studyDays });

  it('starts on the Monday of the week that contains today', () => {
    const week = build([]);
    expect(week.days[0]?.day).toBe(startOfWeek(NOW));
    expect(week.days).toHaveLength(7);
    expect(week.days.map((day) => day.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(week.days.filter((day) => day.isToday)).toHaveLength(1);
    expect(week.days.find((day) => day.isToday)?.day).toBe(toIsoDate(NOW));
  });

  it('flags the days ahead rather than reading them as missed', () => {
    const week = build([]);
    const todayIndex = week.days.findIndex((day) => day.isToday);
    expect(week.days.slice(0, todayIndex).every((day) => !day.isFuture)).toBe(true);
    expect(week.days.slice(todayIndex + 1).every((day) => day.isFuture)).toBe(true);
  });

  it('marks the learner\u2019s own study days', () => {
    const week = build([], 10, ['Mon', 'Wed']);
    expect(week.plannedDays).toBe(2);
    expect(week.days[0]?.isPlanned).toBe(true);
    expect(week.days[1]?.isPlanned).toBe(false);
    expect(week.days[2]?.isPlanned).toBe(true);
    expect(week.goalLine).toBe('0 of 2 study days');
    expect(week.target).toBe(20);
  });

  it('measures the week against the goal the learner set', () => {
    const week = build([activity(0, 5, 3), activity(1, 12, 8)], 10);

    expect(week.questions).toBe(17);
    expect(week.correct).toBe(11);
    expect(week.studiedDays).toBe(2);
    expect(week.days.find((day) => day.isToday)?.intensity).toBe(0.5);
    expect(week.line).toBe('2 days studied · 17 questions');
    // Only the Wednesday was a day the learner planned to study.
    expect(week.goalLine).toBe('1 of 3 study days');
    expect(week.goalMet).toBe(false);
  });

  it('ignores activity from outside the week', () => {
    const lastWeek = new Date(2026, 8, 30, 9);
    const week = build([
      { day: toIsoDate(lastWeek), questionsAnswered: 40, correctCount: 40 },
      activity(0, 3, 1),
    ]);

    expect(week.questions).toBe(3);
    expect(week.studiedDays).toBe(1);
  });

  it('reports a week with no work without inventing a number', () => {
    const week = build([]);
    expect(week.questions).toBe(0);
    expect(week.studiedDays).toBe(0);
    expect(week.line).toBe('No questions answered this week yet');
    expect(week.progress).toBe(0);
    expect(week.goalMet).toBe(false);
  });

  it('treats any work as progress when the learner has set no daily goal', () => {
    const week = build([activity(0, 1, 1)], 0, []);
    expect(week.days.find((day) => day.isToday)?.intensity).toBe(1);
    expect(week.target).toBe(0);
    expect(week.goalLine).toBe('');
  });
});

describe('recent mock', () => {
  it('reports the most recent completed attempt', () => {
    const row = recentMockResult({
      exam,
      attempts: [
        attempt({ id: 'older', completedAt: dayOf(10).toISOString(), correctCount: 100 }),
        attempt({ id: 'newest', completedAt: dayOf(3).toISOString(), correctCount: 116 }),
      ],
    });

    expect(row?.id).toBe('newest');
    expect(row?.scorePercent).toBe(68);
    expect(row?.title).toBe('Full mock');
    expect(row?.subtitle).toBe('Professional · 68%');
  });

  it('counts a mock that was never submitted as no result at all', () => {
    expect(
      recentMockResult({
        exam,
        attempts: [
          attempt({ status: 'in-progress', completedAt: null }),
          attempt({ status: 'paused', completedAt: null }),
        ],
      }),
    ).toBeNull();
    expect(recentMockResult({ exam, attempts: [] })).toBeNull();
  });

  it('counts a paper that ran out of time as a result', () => {
    const row = recentMockResult({
      exam,
      attempts: [attempt({ id: 'expired', status: 'expired', correctCount: 51 })],
    });

    expect(row?.id).toBe('expired');
    expect(row?.scorePercent).toBe(30);
  });

  it('scores an empty mock as zero rather than dividing by nothing', () => {
    expect(mockScorePercent(attempt({ totalItems: 0, correctCount: 0 }))).toBe(0);
    expect(mockScorePercent(attempt({ totalItems: 165, correctCount: 0 }))).toBe(0);
    expect(mockScorePercent(attempt({ totalItems: 165, correctCount: 165 }))).toBe(100);
  });
});
