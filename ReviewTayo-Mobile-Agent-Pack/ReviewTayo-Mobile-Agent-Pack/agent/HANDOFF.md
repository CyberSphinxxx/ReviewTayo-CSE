# Agent Handoff

## Current phase
Phases 0–8 complete. Starting Phase 9 (Practice + Quiz).

## Current task
Phase 9 — Practice + Quiz: the Smart Drill domain service, Weakest Area, Timed Practice, Random set,
Build a Quiz, Mastery Rounds, Practice by Subject, progressive disclosure, the question screen and
answer checking.

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
npx jest                              # PASS — 27 suites, 373 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build the Practice tab (`mobile/app/(tabs)/practice.tsx`) from the approved prototype: the Smart
   Drill card, Weakest Area, Timed Practice, and Mock Exam / Practice by Subject / More Practice
   behind progressive disclosure.
2. Add the practice domain service over the existing `buildSessionPlan` planner: candidate selection
   weighted by weakness, due review and unseen coverage, then the session sizing the screen shows.
3. Build the question screen (`mobile/app/quiz.tsx`) with answer checking, feedback and progress,
   persisting answers, mastery and review items in one transaction.
4. Tests: the drill composition from a seeded history, answer checking and mastery updates, empty
   states, both themes and routing; then run the gate, update agent docs and commit.

## Decisions made
D-029 … D-032 (see `agent/DECISIONS.md`): mastery derived from evidence and quantised before
thresholds · reference content generated from concepts · the Subjects bar is accuracy with mastery
underneath · Continue Learning never recommends a mastered lesson.
Earlier: D-019 … D-028 (appearance vocabulary, atomic onboarding commit, Home derives everything,
streak semantics, resume dismissal). ADRs: 001 integration, 002 database port, 003 contract-first sync.

## New blockers
Only external ones (see `agent/BLOCKERS.md`): live Google credentials, a production API endpoint,
and Android SDK/signing for a local APK production build. No internal blockers.

## Repository housekeeping note (not caused by this session)
`git status` shows the older prototype as deleted from `mobile-prototype/` with the same content
present untracked under `archives/mobile-prototype/`. This reorganisation pre-dates this session;
it was left untouched. Commit or discard it deliberately before release.

## Commit/hash
See the checkpoint commit created at the end of Phase 8 (`feat(learn): …`).
