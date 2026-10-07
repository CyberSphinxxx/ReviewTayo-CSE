import type { SessionMode } from '@/domain/exams';
import type { StudyTaskKind } from '@/domain/study-plan';

/**
 * Which planned task a session answers for.
 *
 * The plan promises a review session on some days and a mock on others; finishing a
 * session is what marks the promise kept. The mapping lives here, in one place, so a
 * new practice mode cannot silently stop advancing the plan.
 */
export const taskKindForMode = (mode: SessionMode): StudyTaskKind => {
  switch (mode) {
    case 'review-due':
      return 'review';
    case 'mock-exam':
      return 'mock';
    case 'mastery-rounds':
    case 'build-a-quiz':
    case 'practice-by-subject':
    case 'timed-practice':
    case 'weakest-area':
    case 'random-set':
    case 'smart-drill':
    case 'daily-question':
    case 'try-another-like-this':
    default:
      return 'practice';
  }
};
