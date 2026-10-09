import type { Repositories } from '@/data/repositories';
import { savedQuestionEvent } from '@/domain/sync';

/**
 * Saved questions.
 *
 * A bookmark is a set membership: it is either saved or it is not, and the newest
 * intent wins when two devices disagree (D-054). The local row and the event that
 * records the intent are written in one transaction, so a bookmark can never exist
 * without the event that would carry it to another device.
 */

export interface ToggleSavedInput {
  readonly repositories: Repositories;
  readonly examId: string;
  readonly questionId: string;
  readonly now?: Date;
}

export const saveQuestion = async ({
  repositories,
  examId,
  questionId,
  now = new Date(),
}: ToggleSavedInput): Promise<void> => {
  const at = now.toISOString();
  await repositories.transaction(async (transaction) => {
    await repositories.savedQuestions.save({ questionId, examId, savedAt: at }, { transaction });
    await repositories.outbox.enqueue(savedQuestionEvent({ questionId, examId, at }, true), {
      transaction,
    });
  });
};

export const removeSavedQuestion = async ({
  repositories,
  examId,
  questionId,
  now = new Date(),
}: ToggleSavedInput): Promise<void> => {
  const at = now.toISOString();
  await repositories.transaction(async (transaction) => {
    await repositories.savedQuestions.remove(questionId, { transaction });
    await repositories.outbox.enqueue(savedQuestionEvent({ questionId, examId, at }, false), {
      transaction,
    });
  });
};
