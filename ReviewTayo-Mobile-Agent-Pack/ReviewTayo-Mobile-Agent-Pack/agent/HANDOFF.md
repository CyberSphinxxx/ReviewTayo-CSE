# Agent Handoff

## Current phase
Phases 0–7 complete. Starting Phase 8 (Learn).

## Current task
Phase 8 — Learn: Continue Learning, Quick Sheets, Subjects and Study Guides from the approved
prototype, reading subjects, concepts and progress from the imported content pack.

## Files changed (Phase 7)
- `/mobile/src/domain/home/**` — today's plan and progress, the done-for-today rule, the streak,
  session sizing and hero copy, all derived and all pure.
- `/mobile/src/domain/study-plan/progress.ts` — task completion, where `skipped` counts as answered
  for so Home stops asking for the same work.
- `/mobile/src/features/home/**` — `useHome` (reloads on focus, reads profile, plan, activity, due
  count and resumable sessions) plus the hero, Today timeline, ring and resume card.
- `/mobile/app/(tabs)/home.tsx` — the real Home screen: readiness wrapper, editorial hero, three
  daily actions, goal ring, resume card, done banner and the routes each action owns.
- `/mobile/tests/domain/home.test.ts`, `/mobile/tests/app/home-screen.test.tsx` — 37 new cases.

## Files changed (Phase 6)
- `/mobile/src/domain/preferences.ts` — new authoritative appearance vocabulary (theme, text size,
  labels, coercion of legacy values).
- `/mobile/src/domain/onboarding/**` — step ids, draft defaults and the pure draft operations
  (parsing, clamping, date normalisation, presenters, first activity, step machine).
- `/mobile/src/domain/study-plan/**` — `buildWeeklyPlan`: answers in, a dated week of tasks out,
  sized from the exam's own blueprint.
- `/mobile/src/services/{onboarding,app-settings,exams}.ts` — draft load, the single atomic commit,
  validated settings read/write and active-exam resolution.
- `/mobile/src/features/onboarding/**` — the state machine plus the eight approved step bodies.
- `/mobile/src/features/settings/use-settings.ts` — settings model: reload on focus, immediate
  persistence for appearance/reminders, step-targeted reopening of the flow.
- `/mobile/src/store/AppearanceBootstrap.tsx` — hydrates stored appearance before first paint.
- `/mobile/app/{index,onboarding,settings,_layout}.tsx` — first-run gate, the flow shell, the
  grouped settings screen and the new provider order.
- `/mobile/src/data/**` — `Repositories.transaction`, `studyPlans.getByWeek`, and wholesale task
  replacement on save so an edited plan cannot keep removed tasks.
- `/mobile/tests/{domain,services,app,store}/**` — six suites covering the phase.

## Tests run
```
cd mobile
npx tsc --noEmit                      # PASS
npx eslint .                          # PASS (0 errors, 0 warnings)
npx prettier --check .                # PASS
npx jest                              # PASS — 24 suites, 325 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build Learn (`mobile/app/(tabs)/learn.tsx`) from the approved prototype: Continue Learning (the
   concept the learner is partway through), Quick Sheets, Subjects with progress, and Study Guides.
2. Add a Learn feature module (`src/features/learn`) so the screen holds layout only, and keep the
   progress arithmetic in the domain.
3. Tests: progress per subject from answers and mastery, the continue-learning choice, empty states
   for a learner who has answered nothing yet, both themes and routing; then run the gate, update
   agent docs and commit.

## Decisions made
D-019 … D-028 (see `agent/DECISIONS.md`); ADR-001 integration, ADR-002 database port,
ADR-003 contract-first sync.

## New blockers
Only external ones (see `agent/BLOCKERS.md`): live Google credentials, a production API endpoint,
and Android SDK/signing for a local APK production build. No internal blockers.

## Repository housekeeping note (not caused by this session)
`git status` shows the older prototype as deleted from `mobile-prototype/` with the same content
present untracked under `archives/mobile-prototype/`. This reorganisation pre-dates this session;
it was left untouched. Commit or discard it deliberately before release.

## Commit/hash
See the checkpoint commit created at the end of Phase 7 (`feat(home): …`).
