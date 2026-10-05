import type { ExamContentRepository } from './exam-content-repository';
import type { MasteryRepository } from './mastery-repository';
import type { MockSessionRepository } from './mock-repository';
import type { AnswerRepository, PracticeSessionRepository } from './practice-repository';
import type { SettingsRepository, UserExamProfileRepository } from './profile-repository';
import type { ActivityRepository } from './progress-repository';
import type { QuestionRepository } from './question-repository';
import type { ReviewRepository, SavedQuestionRepository } from './review-repository';
import type { StudyPlanRepository } from './study-plan-repository';
import type { SyncOutboxRepository, SyncStateRepository } from './sync-repository';

export * from './types';
export * from './exam-content-repository';
export * from './question-repository';
export * from './profile-repository';
export * from './practice-repository';
export * from './mastery-repository';
export * from './review-repository';
export * from './study-plan-repository';
export * from './mock-repository';
export * from './progress-repository';
export * from './sync-repository';

/**
 * Every repository the app uses, wired together over one database.
 *
 * Feature code receives this object (or the individual repositories it needs)
 * rather than importing a concrete SQLite class, which is what keeps the domain
 * and feature layers testable without a device.
 */
export interface Repositories {
  readonly content: ExamContentRepository;
  readonly questions: QuestionRepository;
  readonly profile: UserExamProfileRepository;
  readonly settings: SettingsRepository;
  readonly practice: PracticeSessionRepository;
  readonly answers: AnswerRepository;
  readonly mastery: MasteryRepository;
  readonly review: ReviewRepository;
  readonly savedQuestions: SavedQuestionRepository;
  readonly studyPlans: StudyPlanRepository;
  readonly mock: MockSessionRepository;
  readonly activity: ActivityRepository;
  readonly outbox: SyncOutboxRepository;
  readonly syncState: SyncStateRepository;
}
