# Agent Handoff

## Current phase
Phases 0–13 complete. Starting Phase 14 (Notifications).

## Current task
Phase 14 — Notifications: the permission request, the reminder schedule on study days, the
denied-permission state and rescheduling on preference changes.

## Next exact action
Replace the reminder intent captured in Phase 6 with real local notifications. `services/app-settings.ts`
already stores `remindersEnabled`, `reminderTime` and `reminderTimezone`, and onboarding captures the
learner's study days — so Phase 14 needs the permission request, a schedule built from those fields
(`expo-notifications` is installed and already mocked in `tests/setup.ts`), the honest denied state
(no nagging, no silent no-op), and a reschedule whenever the preference, the time or the plan changes.
The identifier of the scheduled notification should be recorded so it can be cancelled and replaced
rather than duplicated.

## Files changed (Phase 13)
- `/mobile/src/domain/identity/**` — `identity.ts`, the guest/Google vocabulary: descriptions, initials,
  the untrusted-record narrowing and the pure id-token reader.
- `/mobile/src/domain/sync/**` — `events.ts` (event types, payload builders, idempotency keys),
  `backoff.ts` (bounded exponential backoff with equal jitter and an attempt ceiling) and `policies.ts`
  (per-entity conflict policies with their merge functions).
- `/mobile/src/data/remote/**` — `api-contract.ts` (versioned requests/responses plus runtime
  narrowing) and `transport.ts` (`ApiTransport`, `LocalOnlyTransport`, `HttpApiTransport`,
  `createApiTransport`).
- `/mobile/src/services/credentials.ts`, `/mobile/src/services/auth.ts`,
  `/mobile/src/services/google-auth.ts` — the keystore boundary, the account lifecycle (device id,
  sign-in, sign-out, the server exchange) and the Google provider.
- `/mobile/src/services/sync.ts` and `/mobile/src/services/saved-questions.ts` — the outbox worker and
  the bookmark write path that appends its event.
- `/mobile/src/services/practice.ts` and `/mobile/src/services/app-settings.ts` — the answer and
  settings events, appended in the same transaction as the change they describe.
- `/mobile/src/features/settings/use-account.ts` and `/mobile/app/settings.tsx` — the account and sync
  model and its rows (identity, queue, sign-in/sign-out, Sync now).
- `/mobile/src/features/quiz/use-quiz.ts` — bookmarks now write through the service, so saving and
  unsaving each append an event.
- `/mobile/tests/domain/identity.test.ts`, `/mobile/tests/domain/sync.test.ts`,
  `/mobile/tests/data/api-transport.test.ts`, `/mobile/tests/services/auth.test.ts`,
  `/mobile/tests/services/sync.test.ts` and 4 new cases in `/mobile/tests/app/settings-flow.test.tsx` —
  90 new cases.

## Files changed (Phase 12)
- `/mobile/src/domain/mock/**` — `progress.ts` (the answer/correct/flag counts, the first unanswered
  question a resumed paper opens at, the progress and flag lines, and a clock read against the stored
  `expiresAt` with a paused remainder and clamping to zero) and `result.ts` (the score out of the items
  the paper holds with unanswered counting wrong, the blueprint-ordered sections with the weakest
  marked, and one of four honest next steps). Nothing here knows the exam is CSE.
- `/mobile/src/services/mock.ts` — `loadMockSetup` (the exam's own summary + per-section allocation +
  the bank's shortfall), `startMock`, `answerMockItem`, `flagMockItem`, `pauseMock`, `resumeMock`,
  `submitMock` (idempotent, through the same `submitAnswer` practice uses — D-047) and `loadMockResult`.
- `/mobile/src/features/mock/**` — `useMock` (setup / running / result, submitting an expired paper on
  the way in), `useMockRunner` (the deadline-derived clock that submits at zero, choice without
  feedback, flags, pause/resume — D-048, D-049) and the section components.
- `/mobile/app/mock.tsx` — the real route with its three faces, the `RunningPaper` inner component that
  owns the tick, and the recommendation wired to the route that does it.
- `/mobile/src/data/repositories/mock-repository.ts` and
  `/mobile/src/data/local/repositories/sqlite-mock-repository.ts` — the session patch gained `expiresAt`
  and SQLite writes `expires_at`, so resuming a paused paper moves its deadline.
- `/mobile/src/domain/progress/mock.ts` — an `expired` session with a `completedAt` now counts as a
  result, so Progress and the result screen cannot disagree.
- `/mobile/tests/domain/mock.test.ts`, `/mobile/tests/services/mock.test.ts`,
  `/mobile/tests/app/mock-screen.test.tsx` — 33 new cases; `tests/domain/progress.test.ts` updated for
  the expired-mock change.

## Files changed (Phase 11)
- `/mobile/src/domain/progress/**` — `score.ts` (the Study Score's three ingredients, its weekly
  series and its trend), `needs-attention.ts` (Practice's own weakest-area judgement, named),
  `mastery.ts` (the track's concepts least mastered first, with the summary above them), `journey.ts`
  (the exam's phases as done / current / upcoming), `week.ts` (Monday-first bars, ahead-of-today days
  and the learner's own weekly target) and `mock.ts` (the newest completed mock, never an unfinished
  one).
- `/mobile/src/domain/sessions/evidence.ts` — `describeAccuracyPercent` moved here from the two
  copies in `domain/practice` and `domain/review`, so every screen prints one format (audit fix).
- `/mobile/src/services/progress.ts` — `loadProgressOverview` (one read for the whole tab) and
  `loadConceptMastery` (the same rows narrowed to one subject). Subject accuracy is Learn's own
  `subjectProgressRows`, reused rather than recomputed.
- `/mobile/src/features/progress/**` — `useProgress` (the tab, reloaded on focus), `useConceptMastery`
  (the drill-down) and the section components.
- `/mobile/src/components/primitives/RTProgress.tsx` — `RTSparkline`, the third chart primitive, also
  shown on `app/dev/design-system.tsx`.
- `/mobile/app/(tabs)/progress.tsx` and `/mobile/app/progress-list.tsx` — the real tab and its one
  drill-down, with the `Stack.Screen` entry in `app/_layout.tsx`.
- `/mobile/tests/domain/progress.test.ts`, `/mobile/tests/services/progress.test.ts`,
  `/mobile/tests/app/progress-screen.test.tsx` — 54 new cases.

## Files changed (Phase 10)
- `/mobile/src/domain/review/**` — `schedule.ts` (the exam's interval ladder, lapses, local-day
  due-date arithmetic), `deck.ts` (one card per due concept, and how a deck ends) and `progress.ts`
  (concepts to revisit from mastery evidence, and the week's history from `lastReviewedAt`).
- `/mobile/src/services/practice.ts` — the answer writer now schedules through
  `domain/review.nextReviewSchedule`, so an answer and a graded card move one due date (D-039).
- `/mobile/src/services/review.ts` — `loadReviewQueue`, `loadReviewOverview`, `gradeReviewItem` and
  `loadReviewList` for the four lists.
- `/mobile/src/features/review/**` — `useReview` (the tab, reloaded on focus), `useReviewSession`
  (one card at a time, a write before the deck moves) and the section components.
- `/mobile/app/(tabs)/review.tsx`, `/mobile/app/review-session.tsx`, `/mobile/app/review-list.tsx` —
  the real tab, the deck and the four lists, with their `Stack.Screen` entries in `app/_layout.tsx`.
- `/mobile/tests/domain/review.test.ts`, `/mobile/tests/services/review.test.ts`,
  `/mobile/tests/app/review-screen.test.tsx` — 47 new cases.

## Files changed (Phase 9)
- `/mobile/src/domain/practice/**` — `drill.ts` (concept weighting with the exam's own
  `SmartDrillWeights`, `weakestSubject`, `unmasteredConceptIds`), `catalogue.ts` (the honest action
  list, per track and per policy), `feedback.ts` (answer checking, mastery copy, session summary,
  `recommendNext`), `task-kind.ts` and `types.ts`.
- `/mobile/src/domain/sessions/**` — `sizing.ts` and `evidence.ts`, moved out of `domain/home` so
  Practice and the quiz share them without importing Home.
- `/mobile/src/services/practice.ts` — `startSession`, `submitAnswer` (one transaction for the answer,
  mastery, the review schedule, activity, the plan task and the session score), `finishSession`,
  `pauseSession`, `hasSimilarQuestion`.
- `/mobile/src/features/practice/**` and `/mobile/src/features/quiz/**` — `usePractice` (catalogue +
  a destination per action), `useQuiz` (start or resume, one question at a time, the real clock,
  best-effort bookmark and similar-question lookups), `useTrackSubjects`, and the section components
  for the practice list, the question, the checked answer and the results.
- `/mobile/app/(tabs)/practice.tsx`, `/mobile/app/quiz.tsx`, `/mobile/app/build-quiz.tsx`,
  `/mobile/app/subject-practice.tsx` — the real screens, with the two new modals registered in
  `/mobile/app/_layout.tsx`.
- `/mobile/app/(tabs)/home.tsx` — the resume card now carries the session id and mode, so it resumes
  the practice session instead of only offering it.
- `/mobile/tests/domain/practice.test.ts`, `/mobile/tests/services/practice-session.test.ts`,
  `/mobile/tests/app/practice-screen.test.tsx`, `/mobile/tests/app/quiz-screen.test.tsx` — 64 new cases.

## Files changed (Phase 8 audit)
- `/mobile/src/features/learn/**` and `/mobile/app/guide.tsx` — the Study Guides index collapsed to a
  single row, the loading state distinguished from an empty one, and the guide row no longer hands its
  press event into a route param.

## Files changed (Phase 8)
- `/mobile/src/domain/exams/mastery.ts` — mastery as a derivation: weighted accuracy from the stored
  correct/wrong counts, damped by an evidence floor, quantised before thresholds, and mapped onto the
  exam's own ladder. `RTBadge` re-exports this vocabulary instead of declaring its own copy.
- `/mobile/src/domain/exams/registry.ts` — `conceptsForTrack`, the one place a track's lessons are
  gathered in subject-then-lesson order.
- `/mobile/src/domain/learn/**` — `continue-learning` (what to read next and how to label it),
  `subject-progress` (accuracy per subject with its concept count and mastered tally), `sheets`
  (quick sheets and the study guide index) and `guide` (the drill-down sections and a single concept
  reference).
- `/mobile/src/features/learn/**` — `useLearn` (reloads on focus: profile track, mastery, accuracy),
  `useReference` (one-shot load for the two reference pages) and the section layout.
- `/mobile/app/(tabs)/learn.tsx` — the real Learn screen: eyebrow and editorial title, Continue
  Learning, Quick Sheets, Subjects with accuracy bars, Study Guides. Review Due is deliberately absent.
- `/mobile/app/guide.tsx`, `/mobile/app/concept.tsx` — the reference routes, plus their `Stack.Screen`
  entries in `/mobile/app/_layout.tsx`.
- `/mobile/src/components/primitives/RTChip.tsx` — the pill-shaped chip the Quick Sheets row needed.
- `/mobile/tests/domain/mastery.test.ts`, `/mobile/tests/domain/learn.test.ts`,
  `/mobile/tests/app/learn-screen.test.tsx` — 48 new cases.

## Files changed (Phase 7)
- `/mobile/src/domain/home/**` — today's plan and progress, the done-for-today rule, the streak,
  session sizing and hero copy, all derived and all pure.
- `/mobile/src/features/home/**` and `/mobile/app/(tabs)/home.tsx` — `useHome` plus the editorial
  hero, Today timeline, goal ring, resume card and done banner.
- `/mobile/src/domain/study-plan/progress.ts` — task completion, where `skipped` counts as answered
  for so Home stops asking for the same work.

## Tests run
```
cd mobile
npx tsc --noEmit                      # PASS
npx eslint .                          # PASS (0 errors, 0 warnings)
npx prettier --check .                # PASS
npx jest                              # PASS — 45 suites, 662 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build the notification service (`mobile/src/services/notifications.ts`) over `expo-notifications`:
   as permission request that explains itself, a schedule built from the stored `remindersEnabled`,
   `reminderTime`, `reminderTimezone` and the learner's study days, and a stored handle per scheduled
   notification so a change cancels and replaces rather than duplicates.
2. Decide and encode the denied-permission state: the preference is the learner's, the permission is the
   OS's, and the screen must say which one is missing without asking twice.
3. Reschedule on every change that could move the schedule — reminders on/off, time, study days, and an
   onboarding edit — from one place, the same way settings writes go through one service.
4. Tests: the schedule built from real stored preferences, the permission outcomes, cancellation and
   replacement, a denied permission, and the settings screen's rows; then run the gate, update agent
   docs and commit.

## Decisions made
D-051 … D-056 (see `agent/DECISIONS.md`): a guest is a device, not a missing account · sync is a drain,
not a daemon · an answer appends its sync event in the same transaction · each kind of change has its
own merge policy, and settings are intents · the transport is the only thing that talks to a network ·
signing in does not depend on the backend.
Previous session: D-047 … D-050 (a mock counts through the same answer writer practice uses · a mock
reveals nothing until it is submitted · the clock is a deadline and an expired paper is still a result ·
a paper is scored out of the items it holds and unanswered counts wrong).
Earlier: D-043 … D-046 (the Study Score is a mark, not a forecast · Progress names the subject Practice
would have offered · mastery is listed least mastered first · the weekly goal is the learner's own).
Previous session: D-033 … D-038 (correctness decided by the service from the question · one submitted
answer is one transaction · the drill's ranking stays a ranking · Practice omits a mode it cannot
honestly offer · "Try another like this" only when the follow-up exists · a timed session runs on a
deadline and expiring finishes it). Earlier: D-019 … D-032 (appearance vocabulary, atomic onboarding
commit, Home derives everything, streak semantics, resume dismissal, mastery derived from evidence).
ADRs: 001 integration, 002 database port, 003 contract-first sync.

## New blockers
Only external ones (see `agent/BLOCKERS.md`): live Google credentials, a production API endpoint,
and Android SDK/signing for a local APK production build. No internal blockers.

## Repository housekeeping note (not caused by this session)
`git status` shows the older prototype as deleted from `mobile-prototype/` with the same content
present untracked under `archives/mobile-prototype/`. This reorganisation pre-dates this session;
it was left untouched. Commit or discard it deliberately before release.

## Commit/hash
See the checkpoint commit created at the end of Phase 13 (`feat(auth): add the account, the outbox and
the sync worker`).
