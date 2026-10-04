# Data Layer

## Repository pattern

Define interfaces by domain need, not DB tables.

Examples:
- `QuestionRepository`
- `PracticeSessionRepository`
- `MasteryRepository`
- `ReviewRepository`
- `StudyPlanRepository`
- `ExamContentRepository`
- `UserExamProfileRepository`
- `SyncOutboxRepository`

Concrete implementations:
- SQLite
- remote ReviewTayo API
- composite/offline-first repository where appropriate

## Serialization
Validate remote/content payloads at boundaries.

Do not trust JSON merely because TypeScript types compile.
