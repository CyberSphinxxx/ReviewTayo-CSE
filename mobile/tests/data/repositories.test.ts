import type { DatabasePort } from '@/data/local/database-port';
import type {
  AnswerRecord,
  AppSettingsRecord,
  ConceptMasteryRecord,
  MockItemRecord,
  MockSessionRecord,
  PracticeSessionRecord,
  Repositories,
  ReviewItemRecord,
  SavedQuestionRecord,
  StudyPlanRecord,
  StudyTaskRecord,
  UserExamProfileRecord,
} from '@/data/repositories';

import { createMigratedDatabase } from '@tests/utils/database';
import { restoreLogs, silenceLogs } from '@tests/utils/logs';

/**
 * Repository tests.
 *
 * They run against a real SQLite engine through the same SQL that ships, so a
 * round trip here is evidence a learner's data survives the app, not evidence
 * that a mock agreed with itself.
 */

const NOW = '2026-10-06T08:00:00.000Z';

const profileRecord = (overrides: Partial<UserExamProfileRecord> = {}): UserExamProfileRecord => ({
  examId: 'cse',
  trackId: 'professional',
  startingPoint: 'beginner',
  examDate: '2027-02-01',
  studyDays: ['mon', 'tue', 'wed'],
  sessionLength: 'standard',
  dailyGoal: 20,
  onboardingCompletedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const settingsRecord = (overrides: Partial<AppSettingsRecord> = {}): AppSettingsRecord => ({
  themePreference: 'dark',
  textSize: 'large',
  remindersEnabled: true,
  reminderTime: '19:30',
  reminderTimezone: null,
  updatedAt: NOW,
  ...overrides,
});

const sessionRecord = (overrides: Partial<PracticeSessionRecord> = {}): PracticeSessionRecord => ({
  id: 'session-1',
  examId: 'cse',
  trackId: 'professional',
  mode: 'smart-drill',
  status: 'in-progress',
  requestedCount: 3,
  correctCount: 0,
  startedAt: NOW,
  updatedAt: NOW,
  completedAt: null,
  durationSeconds: 0,
  timeLimitSeconds: null,
  timeRemainingSeconds: null,
  ...overrides,
});

const answerRecord = (overrides: Partial<AnswerRecord> = {}): AnswerRecord => ({
  id: 'answer-1',
  sessionId: 'session-1',
  questionId: 'q1',
  examId: 'cse',
  subjectId: 'verbal-ability',
  conceptIds: ['vocabulary', 'grammar'],
  chosenChoiceId: 'a',
  correctChoiceId: 'b',
  isCorrect: false,
  source: 'practice',
  answeredAt: NOW,
  timeSpentSeconds: 35,
  ...overrides,
});

const masteryRecord = (overrides: Partial<ConceptMasteryRecord> = {}): ConceptMasteryRecord => ({
  conceptId: 'vocabulary',
  examId: 'cse',
  correctCount: 3,
  wrongCount: 1,
  level: 2,
  streak: 2,
  lastAnsweredAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const reviewRecord = (overrides: Partial<ReviewItemRecord> = {}): ReviewItemRecord => ({
  id: 'review-1',
  examId: 'cse',
  conceptId: 'vocabulary',
  questionId: null,
  source: 'mistake',
  dueAt: '2026-10-07T00:00:00.000Z',
  intervalDays: 1,
  easeLevel: 0,
  lapses: 0,
  reviews: 0,
  lastReviewedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const planRecord = (overrides: Partial<StudyPlanRecord> = {}): StudyPlanRecord => ({
  id: 'plan-1',
  examId: 'cse',
  trackId: 'professional',
  weekStart: '2026-10-05',
  generatedAt: NOW,
  isActive: true,
  payload: { rationale: 'first week' },
  ...overrides,
});

const taskRecord = (overrides: Partial<StudyTaskRecord> = {}): StudyTaskRecord => ({
  id: 'task-1',
  planId: 'plan-1',
  day: '2026-10-06',
  kind: 'practice',
  label: 'Smart Drill',
  targetCount: 10,
  completedCount: 0,
  status: 'pending',
  position: 0,
  ...overrides,
});

const mockRecord = (overrides: Partial<MockSessionRecord> = {}): MockSessionRecord => ({
  id: 'mock-1',
  examId: 'cse',
  trackId: 'professional',
  status: 'in-progress',
  totalItems: 2,
  answeredCount: 0,
  correctCount: 0,
  startedAt: NOW,
  updatedAt: NOW,
  completedAt: null,
  expiresAt: '2026-10-06T11:00:00.000Z',
  pausedAt: null,
  remainingSeconds: null,
  payload: null,
  ...overrides,
});

const mockItemRecord = (overrides: Partial<MockItemRecord> = {}): MockItemRecord => ({
  mockSessionId: 'mock-1',
  questionId: 'q1',
  position: 0,
  chosenChoiceId: null,
  isCorrect: null,
  flagged: false,
  answeredAt: null,
  ...overrides,
});

describe('learner repositories', () => {
  let db: DatabasePort;
  let repositories: Repositories;

  beforeEach(async () => {
    ({ db, repositories } = await createMigratedDatabase());
  });

  afterEach(async () => {
    await db.close();
  });

  describe('profile and settings', () => {
    it('returns null before anything has been saved', async () => {
      expect(await repositories.profile.get()).toBeNull();
      expect(await repositories.settings.get()).toBeNull();
    });

    it('stores and updates the single learner profile row', async () => {
      await repositories.profile.save(profileRecord());
      expect(await repositories.profile.get()).toEqual(profileRecord());

      await repositories.profile.save(
        profileRecord({ trackId: 'subprofessional', examDate: null }),
      );

      const updated = await repositories.profile.get();
      expect(updated?.trackId).toBe('subprofessional');
      expect(updated?.examDate).toBeNull();
      const rows = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM user_exam_profile`,
      );
      expect(rows?.count).toBe(1);
    });

    it('round-trips settings values including booleans and a null timezone', async () => {
      await repositories.settings.save(settingsRecord());
      expect(await repositories.settings.get()).toEqual(settingsRecord());

      await repositories.settings.save(
        settingsRecord({
          themePreference: 'device',
          remindersEnabled: false,
          reminderTimezone: 'Asia/Manila',
        }),
      );

      const updated = await repositories.settings.get();
      expect(updated?.themePreference).toBe('device');
      expect(updated?.remindersEnabled).toBe(false);
      expect(updated?.reminderTimezone).toBe('Asia/Manila');
    });
  });

  describe('practice sessions', () => {
    it('creates a session with its question order and resumes the latest', async () => {
      await repositories.practice.create(sessionRecord(), ['q1', 'q2', 'q3']);
      await repositories.practice.create(
        sessionRecord({ id: 'session-2', updatedAt: '2026-10-06T09:00:00.000Z' }),
        ['q4', 'q5'],
      );

      const questions = await repositories.practice.listQuestions('session-1');
      expect(questions.map((entry) => entry.questionId)).toEqual(['q1', 'q2', 'q3']);
      expect(questions.map((entry) => entry.position)).toEqual([0, 1, 2]);

      expect((await repositories.practice.findResumable('cse'))?.id).toBe('session-2');

      await repositories.practice.update('session-2', {
        status: 'completed',
        completedAt: '2026-10-06T10:00:00.000Z',
        correctCount: 2,
        updatedAt: '2026-10-06T10:00:00.000Z',
      });

      expect((await repositories.practice.findResumable('cse'))?.id).toBe('session-1');
      expect(await repositories.practice.countCompleted('cse')).toBe(1);
      expect((await repositories.practice.listRecent('cse')).map((entry) => entry.id)).toEqual([
        'session-2',
        'session-1',
      ]);
    });

    it('rolls the whole session back when the question list is invalid', async () => {
      silenceLogs();
      try {
        await expect(repositories.practice.create(sessionRecord(), ['q1', 'q1'])).rejects.toThrow(
          /Database operation failed/,
        );
        expect(await repositories.practice.getById('session-1')).toBeNull();
      } finally {
        restoreLogs();
      }
    });
  });

  describe('answers', () => {
    it('records answers and aggregates accuracy per subject', async () => {
      await repositories.answers.record(answerRecord());
      await repositories.answers.record(
        answerRecord({ id: 'answer-2', questionId: 'q2', isCorrect: true }),
      );
      await repositories.answers.record(
        answerRecord({
          id: 'answer-3',
          questionId: 'q3',
          subjectId: 'numerical-ability',
          isCorrect: true,
        }),
      );

      const found = await repositories.answers.findBySessionAndQuestion('session-1', 'q1');
      expect(found?.conceptIds).toEqual(['vocabulary', 'grammar']);
      expect(found?.isCorrect).toBe(false);
      expect(await repositories.answers.listBySession('session-1')).toHaveLength(3);
      expect(await repositories.answers.countAnswered('cse')).toBe(3);

      expect(await repositories.answers.subjectAccuracy('cse')).toEqual([
        { subjectId: 'numerical-ability', answered: 1, correct: 1 },
        { subjectId: 'verbal-ability', answered: 2, correct: 1 },
      ]);
    });
  });

  describe('mastery', () => {
    it('saves, updates and lists mastery per concept', async () => {
      await repositories.mastery.save(masteryRecord());
      await repositories.mastery.saveMany([
        masteryRecord({ conceptId: 'grammar', level: 1, correctCount: 2, wrongCount: 2 }),
        masteryRecord({ conceptId: 'arithmetic', level: 3 }),
      ]);

      expect(await repositories.mastery.get('vocabulary')).toEqual(masteryRecord());
      expect(
        (await repositories.mastery.listByExam('cse')).map((entry) => entry.conceptId),
      ).toEqual(['arithmetic', 'grammar', 'vocabulary']);

      await repositories.mastery.save(
        masteryRecord({ correctCount: 4, level: 3, updatedAt: '2026-10-07T00:00:00.000Z' }),
      );
      expect((await repositories.mastery.get('vocabulary'))?.level).toBe(3);
      expect(await repositories.mastery.listByExam('cse')).toHaveLength(3);
    });
  });

  describe('review queue', () => {
    it('separates concept-level from question-level items and updates in place', async () => {
      await repositories.review.upsert(reviewRecord());
      await repositories.review.upsert(
        reviewRecord({ id: 'review-2', questionId: 'q-1', dueAt: '2026-10-08T00:00:00.000Z' }),
      );

      expect((await repositories.review.findByConcept('cse', 'vocabulary'))?.id).toBe('review-1');
      expect((await repositories.review.findByConcept('cse', 'vocabulary', 'q-1'))?.id).toBe(
        'review-2',
      );

      await repositories.review.upsert(
        reviewRecord({ dueAt: '2026-10-09T00:00:00.000Z', reviews: 1, lastReviewedAt: NOW }),
      );
      const updated = await repositories.review.getById('review-1');
      expect(updated?.reviews).toBe(1);
      expect(updated?.dueAt).toBe('2026-10-09T00:00:00.000Z');
    });

    it('lists due items oldest first and counts only what is due', async () => {
      await repositories.review.upsert(
        reviewRecord({ id: 'r-late', dueAt: '2026-10-07T12:00:00.000Z' }),
      );
      await repositories.review.upsert(
        reviewRecord({ id: 'r-early', conceptId: 'grammar', dueAt: '2026-10-07T00:00:00.000Z' }),
      );
      await repositories.review.upsert(
        reviewRecord({
          id: 'r-future',
          conceptId: 'arithmetic',
          dueAt: '2026-11-01T00:00:00.000Z',
        }),
      );

      const due = await repositories.review.listDue('cse', '2026-10-08T00:00:00.000Z');
      expect(due.map((entry) => entry.id)).toEqual(['r-early', 'r-late']);
      expect(await repositories.review.countDue('cse', '2026-10-08T00:00:00.000Z')).toBe(2);
      expect(
        (await repositories.review.listDue('cse', '2026-11-02T00:00:00.000Z', 1)).map(
          (entry) => entry.id,
        ),
      ).toEqual(['r-early']);

      await repositories.review.delete('r-late');
      expect(await repositories.review.getById('r-late')).toBeNull();
      expect(await repositories.review.listAll('cse')).toHaveLength(2);
    });
  });

  describe('saved questions', () => {
    it('saves, lists and removes bookmarked questions', async () => {
      const saved: SavedQuestionRecord = { questionId: 'q1', examId: 'cse', savedAt: NOW };
      await repositories.savedQuestions.save(saved);

      expect(await repositories.savedQuestions.isSaved('q1')).toBe(true);
      expect(await repositories.savedQuestions.count('cse')).toBe(1);
      expect(await repositories.savedQuestions.list('cse')).toEqual([saved]);

      await repositories.savedQuestions.remove('q1');
      expect(await repositories.savedQuestions.isSaved('q1')).toBe(false);
      expect(await repositories.savedQuestions.count('cse')).toBe(0);
    });
  });

  describe('study plans', () => {
    it('keeps one active plan per exam and stores its tasks', async () => {
      await repositories.studyPlans.savePlan(planRecord(), [
        taskRecord(),
        taskRecord({ id: 'task-2', day: '2026-10-07', position: 1 }),
      ]);

      const active = await repositories.studyPlans.getActive('cse');
      expect(active?.id).toBe('plan-1');
      expect((await repositories.studyPlans.listTasks('plan-1')).map((task) => task.id)).toEqual([
        'task-1',
        'task-2',
      ]);

      await repositories.studyPlans.savePlan(
        planRecord({
          id: 'plan-2',
          weekStart: '2026-10-12',
          generatedAt: '2026-10-12T00:00:00.000Z',
        }),
        [taskRecord({ id: 'task-3', planId: 'plan-2' })],
      );

      expect((await repositories.studyPlans.getActive('cse'))?.id).toBe('plan-2');
      expect((await repositories.studyPlans.getById('plan-1'))?.isActive).toBe(false);

      await repositories.studyPlans.updateTask('task-3', {
        completedCount: 5,
        status: 'in-progress',
      });
      const task = (await repositories.studyPlans.listTasks('plan-2'))[0];
      expect(task?.completedCount).toBe(5);
      expect(task?.status).toBe('in-progress');
      expect(await repositories.studyPlans.listPlans('cse')).toHaveLength(2);
    });
  });

  describe('mock sessions', () => {
    it('persists a mock with items, answers, flags and resume state', async () => {
      await repositories.mock.create(mockRecord(), [
        mockItemRecord(),
        mockItemRecord({ questionId: 'q2', position: 1 }),
      ]);
      expect((await repositories.mock.listItems('mock-1')).map((item) => item.questionId)).toEqual([
        'q1',
        'q2',
      ]);

      await repositories.mock.saveItem('mock-1', 'q1', {
        chosenChoiceId: 'a',
        isCorrect: true,
        answeredAt: NOW,
      });
      await repositories.mock.saveItem('mock-1', 'q2', { flagged: true });

      const items = await repositories.mock.listItems('mock-1');
      expect(items[0]).toMatchObject({
        chosenChoiceId: 'a',
        isCorrect: true,
        answeredAt: NOW,
        flagged: false,
      });
      expect(items[1]?.flagged).toBe(true);
      expect(items[1]?.chosenChoiceId).toBeNull();

      await repositories.mock.updateSession('mock-1', {
        answeredCount: 1,
        correctCount: 1,
        pausedAt: NOW,
        remainingSeconds: 1800,
        updatedAt: '2026-10-06T09:00:00.000Z',
      });
      const resumable = await repositories.mock.findResumable('cse');
      expect(resumable?.remainingSeconds).toBe(1800);
      expect(resumable?.pausedAt).toBe(NOW);

      await repositories.mock.updateSession('mock-1', {
        status: 'completed',
        completedAt: '2026-10-06T10:00:00.000Z',
        payload: { score: 1, total: 2 },
      });
      expect(await repositories.mock.findResumable('cse')).toBeNull();
      expect((await repositories.mock.listRecent('cse'))[0]?.payload).toEqual({
        score: 1,
        total: 2,
      });
    });

    it('refuses to save an item that is not part of the mock', async () => {
      silenceLogs();
      try {
        await repositories.mock.create(mockRecord(), [mockItemRecord()]);
        await expect(
          repositories.mock.saveItem('mock-1', 'unknown-question', { flagged: true }),
        ).rejects.toThrow(/not part of mock/);
      } finally {
        restoreLogs();
      }
    });
  });

  describe('activity', () => {
    it('increments daily counters and keeps a met goal met', async () => {
      await repositories.activity.recordQuestion({
        day: '2026-10-06',
        examId: 'cse',
        correct: true,
        minutes: 3,
      });
      await repositories.activity.recordQuestion({
        day: '2026-10-06',
        examId: 'cse',
        correct: false,
        minutes: 2,
      });

      const first = await repositories.activity.get('2026-10-06', 'cse');
      expect(first).toMatchObject({
        questionsAnswered: 2,
        correctCount: 1,
        minutes: 5,
        goalMet: false,
      });

      await repositories.activity.recordQuestion({
        day: '2026-10-06',
        examId: 'cse',
        correct: true,
        minutes: 1,
        goalMet: true,
      });
      await repositories.activity.recordQuestion({
        day: '2026-10-06',
        examId: 'cse',
        correct: false,
        minutes: 1,
      });

      const later = await repositories.activity.get('2026-10-06', 'cse');
      expect(later?.questionsAnswered).toBe(4);
      expect(later?.goalMet).toBe(true);

      await repositories.activity.recordQuestion({
        day: '2026-10-07',
        examId: 'cse',
        correct: true,
      });
      expect(
        (await repositories.activity.listRange('cse', '2026-10-06', '2026-10-07')).map(
          (entry) => entry.day,
        ),
      ).toEqual(['2026-10-06', '2026-10-07']);
      expect((await repositories.activity.listRecent('cse', 1)).map((entry) => entry.day)).toEqual([
        '2026-10-07',
      ]);
    });
  });
});
