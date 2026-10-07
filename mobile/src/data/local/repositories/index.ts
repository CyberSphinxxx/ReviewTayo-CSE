import type { DatabasePort } from '@/data/local/database-port';
import type { Repositories } from '@/data/repositories';

import { SqliteExamContentRepository } from './sqlite-exam-content-repository';
import { SqliteMasteryRepository } from './sqlite-mastery-repository';
import { SqliteMockSessionRepository } from './sqlite-mock-repository';
import {
  SqliteAnswerRepository,
  SqlitePracticeSessionRepository,
} from './sqlite-practice-repository';
import {
  SqliteSettingsRepository,
  SqliteUserExamProfileRepository,
} from './sqlite-profile-repository';
import { SqliteActivityRepository } from './sqlite-progress-repository';
import { SqliteQuestionRepository } from './sqlite-question-repository';
import { SqliteReviewRepository, SqliteSavedQuestionRepository } from './sqlite-review-repository';
import { SqliteStudyPlanRepository } from './sqlite-study-plan-repository';
import { SqliteSyncOutboxRepository, SqliteSyncStateRepository } from './sqlite-sync-repository';

/**
 * Builds every repository over one database connection.
 *
 * The device and the Node test adapter both use this same wiring, so repository
 * behaviour verified in tests is exactly what ships.
 */
export const createLocalRepositories = (database: DatabasePort): Repositories => ({
  content: new SqliteExamContentRepository(database),
  questions: new SqliteQuestionRepository(database),
  profile: new SqliteUserExamProfileRepository(database),
  settings: new SqliteSettingsRepository(database),
  practice: new SqlitePracticeSessionRepository(database),
  answers: new SqliteAnswerRepository(database),
  mastery: new SqliteMasteryRepository(database),
  review: new SqliteReviewRepository(database),
  savedQuestions: new SqliteSavedQuestionRepository(database),
  studyPlans: new SqliteStudyPlanRepository(database),
  mock: new SqliteMockSessionRepository(database),
  activity: new SqliteActivityRepository(database),
  outbox: new SqliteSyncOutboxRepository(database),
  syncState: new SqliteSyncStateRepository(database),
  transaction: (work) => database.transaction(work),
});
