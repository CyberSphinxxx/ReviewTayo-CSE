# Agent Handoff

## Current phase
Phases 0–6 complete. Starting Phase 7 (Home).

## Current task
Phase 7 — Home: the editorial home layout from the approved prototype, exam phase and countdown,
the Smart Drill call to action, and today's plan read from the generated study plan.

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
npx jest                              # PASS — 22 suites, 288 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build Home (`mobile/app/(tabs)/home.tsx`) from the approved prototype: editorial header with the
   owl, exam phase and countdown from the committed profile, the Smart Drill CTA, and today's tasks
   from the active weekly plan.
2. Add a Home feature module (`src/features/home`) so the screen holds layout only.
3. Tests: phase/countdown derivation from the profile, today's tasks from the generated plan, the
   empty states (no plan yet, rest day) and a router-level render in both themes; then run the gate,
   update agent docs and commit.

## Decisions made
D-019 … D-025 (see `agent/DECISIONS.md`); ADR-001 integration, ADR-002 database port,
ADR-003 contract-first sync.

## New blockers
Only external ones (see `agent/BLOCKERS.md`): live Google credentials, a production API endpoint,
and Android SDK/signing for a local APK production build. No internal blockers.

## Repository housekeeping note (not caused by this session)
`git status` shows the older prototype as deleted from `mobile-prototype/` with the same content
present untracked under `archives/mobile-prototype/`. This reorganisation pre-dates this session;
it was left untouched. Commit or discard it deliberately before release.

## Commit/hash
See the checkpoint commit created at the end of Phase 6 (`feat(onboarding): …`).
