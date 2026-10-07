import { resolveExamPhase } from '@/domain/exams';
import type { StudyPolicy } from '@/domain/exams/types';
import {
  BALANCED_CONTEXT,
  computeStreak,
  dailyQuestionSpec,
  describeGoalProgress,
  describeResumeProgress,
  describeStreakLine,
  DONE_CONTEXT,
  DONE_HEADLINE,
  needsAttentionLine,
  phasePill,
  reviewDueSpec,
  smartDrillHeadline,
  smartDrillSpec,
  summarizeToday,
  tasksForDay,
  type ActivityDay,
  type HomeTask,
} from '@/domain/home';

import { loadFixturePack } from '@tests/utils/exam-fixtures';

/**
 * Home domain.
 *
 * Home makes three claims that must be true: what is planned for today, whether the
 * learner is done, and what action to recommend. Each is derived here from committed
 * state, so these tests work against fixed inputs rather than a rendered screen.
 */

const NOW = new Date('2026-10-07T09:00:00');

const policy = (): StudyPolicy => loadFixturePack().exam.studyPolicy;

const task = (day: string, status: HomeTask['status'] = 'pending'): HomeTask => ({
  day,
  kind: 'practice',
  label: 'Practice set',
  targetCount: 10,
  completedCount: status === 'completed' ? 10 : 0,
  status,
});

const day = (value: string, questionsAnswered: number, goalMet = false): ActivityDay => ({
  day: value,
  questionsAnswered,
  correctCount: Math.round(questionsAnswered / 2),
  goalMet,
});

describe('today', () => {
  it('keeps only the tasks planned for the given day', () => {
    const tasks = [task('2026-10-07'), task('2026-10-06'), task('2026-10-07')];
    expect(tasksForDay(tasks, '2026-10-07')).toHaveLength(2);
    expect(tasksForDay(tasks, '2026-10-09')).toHaveLength(0);
  });

  it('measures progress against the daily goal, not the plan', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [task('2026-10-07')],
      activity: day('2026-10-07', 5),
      dailyGoal: 10,
      dueCount: 3,
    });

    expect(summary.answered).toBe(5);
    expect(summary.progress).toBe(0.5);
    expect(describeGoalProgress(summary)).toBe('5 of 10 questions');
    expect(summary.doneForToday).toBe(false);
  });

  it('caps the ring and the count line at the goal so they cannot overshoot', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [],
      activity: day('2026-10-07', 24, true),
      dailyGoal: 10,
      dueCount: 0,
    });

    expect(summary.progress).toBe(1);
    expect(describeGoalProgress(summary)).toBe('10 of 10 questions');
    expect(summary.goalMet).toBe(true);
  });

  it('treats a skipped task as answered for, so Home stops asking for it', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [task('2026-10-07', 'completed'), task('2026-10-07', 'skipped')],
      activity: null,
      dailyGoal: 10,
      dueCount: 0,
    });

    expect(summary.completedTaskCount).toBe(2);
    expect(summary.planComplete).toBe(true);
    expect(summary.doneForToday).toBe(true);
  });

  it('is not done while anything is still due for review', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [task('2026-10-07', 'completed')],
      activity: day('2026-10-07', 12, true),
      dailyGoal: 10,
      dueCount: 4,
    });

    expect(summary.planComplete).toBe(true);
    expect(summary.goalMet).toBe(true);
    expect(summary.doneForToday).toBe(false);
  });

  it('does not call a day with no plan and no activity done', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [],
      activity: null,
      dailyGoal: 10,
      dueCount: 0,
    });

    expect(summary.planComplete).toBe(false);
    expect(summary.progress).toBe(0);
    expect(summary.doneForToday).toBe(false);
  });

  it('never divides by a goal of zero', () => {
    const summary = summarizeToday({
      day: '2026-10-07',
      tasks: [],
      activity: day('2026-10-07', 3),
      dailyGoal: 0,
      dueCount: 0,
    });

    expect(summary.progress).toBe(0);
    expect(summary.doneForToday).toBe(false);
  });
});

describe('streak', () => {
  it('counts consecutive studied days back from today', () => {
    const days = ['2026-10-07', '2026-10-06', '2026-10-05'].map((value) => day(value, 4));
    expect(computeStreak(days, '2026-10-07')).toBe(3);
  });

  it('survives a day that has not been studied yet', () => {
    // Nothing today, but the run up to yesterday stands: a streak breaks only after
    // a whole missed day, not at midnight.
    const days = ['2026-10-06', '2026-10-05'].map((value) => day(value, 4));
    expect(computeStreak(days, '2026-10-07')).toBe(2);
  });

  it('breaks when yesterday was missed too', () => {
    const days = ['2026-10-05', '2026-10-04'].map((value) => day(value, 4));
    expect(computeStreak(days, '2026-10-07')).toBe(0);
  });

  it('ignores days the app was opened but nothing was answered', () => {
    const days = [day('2026-10-07', 0), day('2026-10-06', 3), day('2026-10-05', 0)];
    expect(computeStreak(days, '2026-10-07')).toBe(1);
  });

  it('does not care what order the days arrive in', () => {
    const days = ['2026-10-05', '2026-10-07', '2026-10-06'].map((value) => day(value, 2));
    expect(computeStreak(days, '2026-10-07')).toBe(3);
  });

  it('crosses a month boundary', () => {
    const days = ['2026-11-01', '2026-10-31', '2026-10-30'].map((value) => day(value, 2));
    expect(computeStreak(days, '2026-11-01')).toBe(3);
  });

  it('has a supportive line for a learner with no streak yet', () => {
    expect(describeStreakLine(0)).toBe('One question today starts a streak.');
    expect(describeStreakLine(6)).toBe('6-day streak · small steps count');
  });
});

describe('session sizing', () => {
  it('sizes the Smart Drill to the daily goal', () => {
    const spec = smartDrillSpec(10, policy());
    expect(spec.count).toBe(Math.min(10, policy().drillSize));
    expect(spec.meta).toContain('questions');
    expect(spec.minutes).toBeGreaterThan(0);
  });

  it('caps the drill at the exam policy rather than the goal', () => {
    const spec = smartDrillSpec(50, policy());
    expect(spec.count).toBe(policy().drillSize);
  });

  it('still offers one question when the goal is unset', () => {
    expect(smartDrillSpec(0, policy()).count).toBe(1);
    expect(smartDrillSpec(Number.NaN, policy()).count).toBe(policy().drillSize);
  });

  it('sizes review to what is waiting, capped by the daily due limit', () => {
    const limit = policy().review.dailyDueLimit;
    expect(reviewDueSpec(4, policy()).count).toBe(4);
    expect(reviewDueSpec(limit + 25, policy()).count).toBe(limit);
    expect(reviewDueSpec(4, policy()).meta).toBe('4 items · ~2 min');
    expect(reviewDueSpec(0, policy()).meta).toBe('0 items · 1 minute');
  });

  it('takes the daily question duration from the exam config', () => {
    const minutes = policy().dailyQuestionMinutes;
    expect(dailyQuestionSpec(policy()).meta).toBe(minutes <= 1 ? '1 minute' : `~${minutes} min`);
  });

  it('formats resume progress as answered over total', () => {
    expect(describeResumeProgress(83, 170)).toBe('83 / 170');
    expect(describeResumeProgress(0, 0)).toBe('0 / 1');
  });
});

describe('hero copy', () => {
  const { exam } = loadFixturePack();

  it('names the phase and the countdown, or just the phase without a date', () => {
    const dated = resolveExamPhase(exam, '2026-11-15', NOW);
    expect(phasePill(dated)).toBe(`${dated.phase.name} · ${dated.daysRemaining} days left`);

    const undated = resolveExamPhase(exam, null, NOW);
    expect(phasePill(undated)).toBe(undated.phase.name);
  });

  it('announces the size of the recommendation', () => {
    expect(smartDrillHeadline(8)).toBe('Your next 8 are ready.');
  });

  it('names the weakest attempted subject only when the data supports it', () => {
    const first = exam.subjects[0];
    const second = exam.subjects[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    const minimum = exam.studyPolicy.weakestAreaMinimumAttempts;
    const weak = needsAttentionLine(
      exam,
      exam.defaultTrackId,
      [
        { subjectId: first.id, answered: minimum + 4, correct: minimum },
        { subjectId: second.id, answered: minimum + 4, correct: minimum + 4 },
      ],
      exam.studyPolicy,
    );
    expect(weak).toBe(`${first.name} needs a little love today.`);
  });

  it('stays neutral when no subject has been attempted enough to judge', () => {
    const first = exam.subjects[0];
    expect(first).toBeDefined();
    if (first === undefined) return;

    const line = needsAttentionLine(
      exam,
      exam.defaultTrackId,
      [{ subjectId: first.id, answered: 1, correct: 0 }],
      exam.studyPolicy,
    );
    expect(line).toBe(BALANCED_CONTEXT);
  });

  it('stays neutral when every attempted subject is doing fine', () => {
    const accuracy = exam.subjects.map((subject) => ({
      subjectId: subject.id,
      answered: 40,
      correct: 38,
    }));
    expect(needsAttentionLine(exam, exam.defaultTrackId, accuracy, exam.studyPolicy)).toBe(
      BALANCED_CONTEXT,
    );
  });

  it('uses the approved completion copy', () => {
    expect(DONE_HEADLINE).toBe("You're done for today.");
    expect(DONE_CONTEXT).toBe('Come back tomorrow. Your brain files things while you rest.');
  });
});
