# Agent Handoff

## Current phase
Phases 0–9 complete. Starting Phase 10 (Review).

## Current task
Phase 10 — Review: the review scheduler, the Due queue, Again/Got It, mistakes, saved questions,
concepts to revisit, review history, the caught-up state and the tab's due badge.

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
npx jest                              # PASS — 31 suites, 437 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build Review (`mobile/app/(tabs)/review.tsx`) from the approved prototype on the data Phase 9
   already writes: the due queue, mistakes, saved questions and concepts to revisit.
2. Add the review domain service over the existing review repository: due ordering, the interval a
   Got It earns and the relapse an Again records, so the scheduler is testable without a screen.
3. Make the tab's due badge read the same count as the queue, and cover the caught-up state and
   review history.
4. Tests: scheduling and interval arithmetic, the Again/Got It flow against a real database, the
   empty and caught-up states, both themes and routing; then run the gate, update agent docs and
   commit.

## Decisions made
D-033 … D-038 (see `agent/DECISIONS.md`): correctness decided by the service from the question · one
submitted answer is one transaction · the drill's ranking stays a ranking · Practice omits a mode it
cannot honestly offer · "Try another like this" only when the follow-up exists · a timed session runs
on a deadline and expiring finishes it.
Previous session: D-029 … D-032 (mastery derived from evidence and quantised before thresholds ·
reference content generated from concepts · the Subjects bar is accuracy with mastery underneath ·
Continue Learning never recommends a mastered lesson). Earlier: D-019 … D-028 (appearance
vocabulary, atomic onboarding commit, Home derives everything, streak semantics, resume dismissal).
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
