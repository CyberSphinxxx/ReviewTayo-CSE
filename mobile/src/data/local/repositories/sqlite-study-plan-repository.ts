import { jsonParam } from '@/data/local/database-port';
import type { DatabasePort, SqlValue } from '@/data/local/database-port';
import { withTransaction } from '@/data/local/unit-of-work';
import type {
  StudyPlanRecord,
  StudyPlanRepository,
  StudyTaskRecord,
} from '@/data/repositories/study-plan-repository';
import type { WriteOptions } from '@/data/repositories/types';

import { decodePayload, fromSqlBool, toSqlBool } from './mappers';

interface PlanRow {
  id: string;
  exam_id: string;
  track_id: string;
  week_start: string;
  generated_at: string;
  is_active: number;
  payload: string;
}

const PLAN_SELECT = `
  SELECT id, exam_id, track_id, week_start, generated_at, is_active, payload
  FROM study_plans`;

const toPlan = (row: PlanRow): StudyPlanRecord => ({
  id: row.id,
  examId: row.exam_id,
  trackId: row.track_id,
  weekStart: row.week_start,
  generatedAt: row.generated_at,
  isActive: fromSqlBool(row.is_active),
  payload: decodePayload<unknown>(row.payload) ?? null,
});

interface TaskRow {
  id: string;
  plan_id: string;
  day: string;
  kind: string;
  label: string;
  target_count: number;
  completed_count: number;
  status: string;
  position: number;
}

const toTask = (row: TaskRow): StudyTaskRecord => ({
  id: row.id,
  planId: row.plan_id,
  day: row.day,
  kind: row.kind as StudyTaskRecord['kind'],
  label: row.label,
  targetCount: row.target_count,
  completedCount: row.completed_count,
  status: row.status as StudyTaskRecord['status'],
  position: row.position,
});

export class SqliteStudyPlanRepository implements StudyPlanRepository {
  constructor(private readonly database: DatabasePort) {}

  async getById(id: string): Promise<StudyPlanRecord | null> {
    const row = await this.database.queryOne<PlanRow>(`${PLAN_SELECT} WHERE id = ?`, [id]);
    return row === null ? null : toPlan(row);
  }

  async getActive(examId: string): Promise<StudyPlanRecord | null> {
    const row = await this.database.queryOne<PlanRow>(
      `${PLAN_SELECT} WHERE exam_id = ? AND is_active = 1 ORDER BY generated_at DESC LIMIT 1`,
      [examId],
    );
    return row === null ? null : toPlan(row);
  }

  async getByWeek(examId: string, weekStart: string): Promise<StudyPlanRecord | null> {
    const row = await this.database.queryOne<PlanRow>(
      `${PLAN_SELECT} WHERE exam_id = ? AND week_start = ?`,
      [examId, weekStart],
    );
    return row === null ? null : toPlan(row);
  }

  async listTasks(planId: string): Promise<StudyTaskRecord[]> {
    const rows = await this.database.query<TaskRow>(
      `SELECT id, plan_id, day, kind, label, target_count, completed_count, status, position
       FROM study_tasks WHERE plan_id = ? ORDER BY day, position, id`,
      [planId],
    );
    return rows.map(toTask);
  }

  async savePlan(
    plan: StudyPlanRecord,
    tasks: readonly StudyTaskRecord[],
    options: WriteOptions = {},
  ): Promise<void> {
    await withTransaction(this.database, options.transaction, async (tx) => {
      // Exactly one active plan per exam: the new plan is inserted first, then
      // every other plan is deactivated, so a failure cannot leave two actives.
      await tx.execute(
        `INSERT INTO study_plans (id, exam_id, track_id, week_start, generated_at, is_active, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           track_id = excluded.track_id,
           week_start = excluded.week_start,
           generated_at = excluded.generated_at,
           is_active = excluded.is_active,
           payload = excluded.payload`,
        [
          plan.id,
          plan.examId,
          plan.trackId,
          plan.weekStart,
          plan.generatedAt,
          toSqlBool(plan.isActive),
          jsonParam(plan.payload),
        ],
      );
      await tx.execute(`UPDATE study_plans SET is_active = 0 WHERE exam_id = ? AND id != ?`, [
        plan.examId,
        plan.id,
      ]);

      // The plan's task list is its current definition, so it is replaced rather
      // than merged; otherwise an edited plan keeps tasks it no longer contains.
      await tx.execute(`DELETE FROM study_tasks WHERE plan_id = ?`, [plan.id]);

      for (const task of tasks) {
        await tx.execute(
          `INSERT INTO study_tasks
             (id, plan_id, day, kind, label, target_count, completed_count, status, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             day = excluded.day,
             kind = excluded.kind,
             label = excluded.label,
             target_count = excluded.target_count,
             completed_count = excluded.completed_count,
             status = excluded.status,
             position = excluded.position`,
          [
            task.id,
            plan.id,
            task.day,
            task.kind,
            task.label,
            task.targetCount,
            task.completedCount,
            task.status,
            task.position,
          ],
        );
      }
    });
  }

  async updateTask(
    taskId: string,
    patch: { completedCount?: number; status?: StudyTaskRecord['status'] },
    options: WriteOptions = {},
  ): Promise<void> {
    const assignments: string[] = [];
    const params: SqlValue[] = [];
    if (patch.completedCount !== undefined) {
      assignments.push('completed_count = ?');
      params.push(patch.completedCount);
    }
    if (patch.status !== undefined) {
      assignments.push('status = ?');
      params.push(patch.status);
    }
    if (assignments.length === 0) return;
    params.push(taskId);
    await withTransaction(this.database, options.transaction, async (tx) => {
      await tx.execute(`UPDATE study_tasks SET ${assignments.join(', ')} WHERE id = ?`, params);
    });
  }

  async listPlans(examId: string, limit = 20): Promise<StudyPlanRecord[]> {
    const rows = await this.database.query<PlanRow>(
      `${PLAN_SELECT} WHERE exam_id = ? ORDER BY generated_at DESC LIMIT ?`,
      [examId, limit],
    );
    return rows.map(toPlan);
  }
}
