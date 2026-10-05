import type { Migration } from '../migration-runner';

/**
 * Initial schema.
 *
 * Content and user data are separate concerns and are kept in separate tables so a
 * content pack can be replaced without touching study history. Historical answers
 * store the question id and the concept ids that were true at the time, so a question
 * that is later edited or retired never rewrites what the learner did.
 */

const contentTables = [
  `CREATE TABLE content_exams (
     id TEXT PRIMARY KEY NOT NULL,
     version INTEGER NOT NULL,
     content_version TEXT NOT NULL,
     short_name TEXT NOT NULL,
     payload TEXT NOT NULL,
     imported_at TEXT NOT NULL
   )`,
  `CREATE TABLE content_subjects (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL REFERENCES content_exams(id) ON DELETE CASCADE,
     display_order INTEGER NOT NULL,
     payload TEXT NOT NULL
   )`,
  `CREATE INDEX idx_content_subjects_exam ON content_subjects(exam_id, display_order)`,
  `CREATE TABLE content_concepts (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL REFERENCES content_exams(id) ON DELETE CASCADE,
     subject_id TEXT NOT NULL,
     name TEXT NOT NULL,
     payload TEXT NOT NULL
   )`,
  `CREATE INDEX idx_content_concepts_subject ON content_concepts(exam_id, subject_id)`,
  `CREATE TABLE content_questions (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL REFERENCES content_exams(id) ON DELETE CASCADE,
     subject_id TEXT NOT NULL,
     difficulty TEXT NOT NULL,
     status TEXT NOT NULL,
     content_version TEXT NOT NULL,
     related_group_id TEXT,
     payload TEXT NOT NULL
   )`,
  `CREATE INDEX idx_questions_exam_subject_status
     ON content_questions(exam_id, subject_id, status)`,
  `CREATE INDEX idx_questions_related_group
     ON content_questions(exam_id, related_group_id)`,
  `CREATE TABLE content_question_tracks (
     question_id TEXT NOT NULL REFERENCES content_questions(id) ON DELETE CASCADE,
     track_id TEXT NOT NULL,
     exam_id TEXT NOT NULL,
     PRIMARY KEY (question_id, track_id)
   )`,
  `CREATE INDEX idx_question_tracks_lookup
     ON content_question_tracks(exam_id, track_id, question_id)`,
  `CREATE TABLE content_question_concepts (
     question_id TEXT NOT NULL REFERENCES content_questions(id) ON DELETE CASCADE,
     concept_id TEXT NOT NULL,
     exam_id TEXT NOT NULL,
     PRIMARY KEY (question_id, concept_id)
   )`,
  `CREATE INDEX idx_question_concepts_lookup
     ON content_question_concepts(concept_id, question_id)`,
];

const userTables = [
  `CREATE TABLE user_exam_profile (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     exam_id TEXT NOT NULL,
     track_id TEXT NOT NULL,
     starting_point TEXT NOT NULL,
     exam_date TEXT,
     study_days TEXT NOT NULL,
     session_length TEXT NOT NULL,
     daily_goal INTEGER NOT NULL,
     onboarding_completed_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE app_settings (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     theme_preference TEXT NOT NULL,
     text_size TEXT NOT NULL,
     reminders_enabled INTEGER NOT NULL DEFAULT 0,
     reminder_time TEXT NOT NULL,
     reminder_timezone TEXT,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE practice_sessions (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     track_id TEXT NOT NULL,
     mode TEXT NOT NULL,
     status TEXT NOT NULL,
     requested_count INTEGER NOT NULL,
     correct_count INTEGER NOT NULL DEFAULT 0,
     started_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     completed_at TEXT,
     duration_seconds INTEGER NOT NULL DEFAULT 0,
     time_limit_seconds INTEGER,
     time_remaining_seconds INTEGER
   )`,
  `CREATE INDEX idx_practice_sessions_status ON practice_sessions(status, updated_at)`,
  `CREATE TABLE practice_session_questions (
     session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
     question_id TEXT NOT NULL,
     position INTEGER NOT NULL,
     PRIMARY KEY (session_id, question_id)
   )`,
  `CREATE TABLE answers (
     id TEXT PRIMARY KEY NOT NULL,
     session_id TEXT,
     question_id TEXT NOT NULL,
     exam_id TEXT NOT NULL,
     subject_id TEXT NOT NULL,
     concept_ids TEXT NOT NULL,
     chosen_choice_id TEXT NOT NULL,
     correct_choice_id TEXT NOT NULL,
     is_correct INTEGER NOT NULL,
     source TEXT NOT NULL,
     answered_at TEXT NOT NULL,
     time_spent_seconds INTEGER
   )`,
  `CREATE UNIQUE INDEX idx_answers_session_question
     ON answers(session_id, question_id) WHERE session_id IS NOT NULL`,
  `CREATE INDEX idx_answers_question ON answers(question_id, answered_at)`,
  `CREATE INDEX idx_answers_subject ON answers(exam_id, subject_id, answered_at)`,
  `CREATE TABLE concept_mastery (
     concept_id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     correct_count INTEGER NOT NULL DEFAULT 0,
     wrong_count INTEGER NOT NULL DEFAULT 0,
     level INTEGER NOT NULL DEFAULT 0,
     streak INTEGER NOT NULL DEFAULT 0,
     last_answered_at TEXT,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX idx_mastery_exam ON concept_mastery(exam_id, level)`,
  `CREATE TABLE review_items (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     concept_id TEXT NOT NULL,
     question_id TEXT,
     source TEXT NOT NULL,
     due_at TEXT NOT NULL,
     interval_days INTEGER NOT NULL,
     ease_level INTEGER NOT NULL DEFAULT 0,
     lapses INTEGER NOT NULL DEFAULT 0,
     reviews INTEGER NOT NULL DEFAULT 0,
     last_reviewed_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  // A question-level item and a concept-level item for the same concept are both
  // allowed, but only one of each: NULLs are distinct in SQLite unique indexes, so
  // the key is expressed as an expression index instead.
  `CREATE UNIQUE INDEX idx_review_items_unique
     ON review_items(concept_id, IFNULL(question_id, ''))`,
  `CREATE INDEX idx_review_items_due ON review_items(exam_id, due_at)`,
  `CREATE TABLE saved_questions (
     question_id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     saved_at TEXT NOT NULL
   )`,
  `CREATE INDEX idx_saved_questions_exam ON saved_questions(exam_id, saved_at)`,
  `CREATE TABLE study_plans (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     track_id TEXT NOT NULL,
     week_start TEXT NOT NULL,
     generated_at TEXT NOT NULL,
     is_active INTEGER NOT NULL DEFAULT 1,
     payload TEXT NOT NULL,
     UNIQUE (exam_id, week_start)
   )`,
  `CREATE TABLE study_tasks (
     id TEXT PRIMARY KEY NOT NULL,
     plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
     day TEXT NOT NULL,
     kind TEXT NOT NULL,
     label TEXT NOT NULL,
     target_count INTEGER NOT NULL,
     completed_count INTEGER NOT NULL DEFAULT 0,
     status TEXT NOT NULL,
     position INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX idx_study_tasks_plan ON study_tasks(plan_id, day, position)`,
  `CREATE TABLE mock_sessions (
     id TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     track_id TEXT NOT NULL,
     status TEXT NOT NULL,
     total_items INTEGER NOT NULL,
     answered_count INTEGER NOT NULL DEFAULT 0,
     correct_count INTEGER NOT NULL DEFAULT 0,
     started_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     completed_at TEXT,
     expires_at TEXT NOT NULL,
     paused_at TEXT,
     remaining_seconds INTEGER,
     payload TEXT
   )`,
  `CREATE INDEX idx_mock_sessions_status ON mock_sessions(status, updated_at)`,
  `CREATE TABLE mock_answers (
     mock_session_id TEXT NOT NULL REFERENCES mock_sessions(id) ON DELETE CASCADE,
     question_id TEXT NOT NULL,
     position INTEGER NOT NULL,
     chosen_choice_id TEXT,
     is_correct INTEGER,
     flagged INTEGER NOT NULL DEFAULT 0,
     answered_at TEXT,
     PRIMARY KEY (mock_session_id, question_id)
   )`,
  `CREATE INDEX idx_mock_answers_session ON mock_answers(mock_session_id, position)`,
  `CREATE TABLE activity_days (
     day TEXT PRIMARY KEY NOT NULL,
     exam_id TEXT NOT NULL,
     questions_answered INTEGER NOT NULL DEFAULT 0,
     correct_count INTEGER NOT NULL DEFAULT 0,
     minutes INTEGER NOT NULL DEFAULT 0,
     goal_met INTEGER NOT NULL DEFAULT 0,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX idx_activity_days_exam ON activity_days(exam_id, day)`,
];

const syncTables = [
  `CREATE TABLE sync_outbox (
     id TEXT PRIMARY KEY NOT NULL,
     event_type TEXT NOT NULL,
     entity_type TEXT NOT NULL,
     entity_id TEXT NOT NULL,
     payload TEXT NOT NULL,
     occurred_at TEXT NOT NULL,
     attempt_count INTEGER NOT NULL DEFAULT 0,
     next_attempt_at TEXT NOT NULL,
     idempotency_key TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL,
     last_error TEXT
   )`,
  `CREATE INDEX idx_outbox_pending ON sync_outbox(status, next_attempt_at)`,
  `CREATE TABLE sync_state (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE content_meta (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
];

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial-schema',
  statements: [...contentTables, ...userTables, ...syncTables],
};
