# Agent Handoff

## Current phase
Phases 0–11 complete. Starting Phase 12 (Mock Exam).

## Current task
Phase 12 — Mock Exam: blueprints, timer, pause/resume, submission and the result breakdown.

## Next exact action
Build `/mobile/app/mock.tsx` for real on the engine that already exists: `resolveBlueprint` and
`resolveTiming` give the Professional (170 items · 3h 10m) and Sub-Professional (165 · 2h 40m)
sessions, `buildMockSessionPlan` orders the questions inside it, and `repositories.mock` already
stores the session and its items with a wall-clock deadline. Then the result: `summarizeMock` for the
score, the subject breakdown from the same blueprint, and one recommended next plan. Progress's
"Recent mock" row already reads the newest completed session and opens `/mock`, so finishing a mock
should make that row appear without any change to Progress.

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
npx jest                              # PASS — 34 suites, 484 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build Progress (`mobile/app/(tabs)/progress.tsx`) from the approved prototype on the same derived
   mastery and answer evidence: the Study Score with its week-over-week line, Needs Attention with a
   drill that says what to fix, subject accuracy and concept mastery.
2. Add the progress domain over `domain/sessions` evidence and `domain/exams/mastery`: a score that
   is a claim about study behaviour (not a grade), a needs-attention pick that shares
   `weakestSubject` with Practice, and the per-concept list the metric is derived from.
3. Make Needs Attention's drill reuse the Practice catalogue's request rather than inventing a
   second one, and cover the empty and no-history states honestly.
4. Tests: score arithmetic and its bands, needs-attention ordering, the concept list, both themes and
   routing; then run the gate, update agent docs and commit.

## Decisions made
D-039 … D-042 (see `agent/DECISIONS.md`): one review schedule written by the domain · a flashcard does
not credit mastery · Review is a deck, not another quiz · the review queue belongs to the exam, not
the track.
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
See the checkpoint commit created at the end of Phase 8 (`feat(learn): …`).
