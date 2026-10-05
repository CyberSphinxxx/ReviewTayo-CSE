# Agent Handoff

## Current phase
Phases 0–5 complete. Starting Phase 6.

## Current task
Phase 6 — onboarding and settings: onboarding shell/progress, Guest identity, Google auth
architecture, CSE level, starting point, exam date, study days, session length, daily goal,
generated plan, plan editing, appearance, text size, reminders, completion, settings
integration, rerun-onboarding dev tool.

## Files changed (Phase 5)
- `/mobile/app/_layout.tsx` — root layout now wraps `LocalDataProvider` (composition root) and a
  themed data gate; route presentations declared for the shell and modal routes.
- `/mobile/app/index.tsx` — redirects into `(tabs)/home` until Phase 6 adds the onboarding gate.
- `/mobile/app/(tabs)/**` — tab layout plus five destination screens (placeholders until their
  phases: Home 7, Learn 8, Practice 9, Review 10, Progress 11).
- `/mobile/app/{settings,quiz,mock,onboarding}.tsx` — real routes for later phases.
- `/mobile/src/store/LocalDataProvider.tsx` — database bootstrap + repositories context.
- `/mobile/src/navigation/**` — tab definitions, themed `TabBarIcon`, due-count helper/hook.
- `/mobile/src/domain/exams/bootstrap.ts` — idempotent startup registration (D-018).
- `/mobile/tests/app/**`, `/mobile/tests/store/**` — navigation, provider and real router
  integration tests.

## Tests run
```
cd mobile
npx tsc --noEmit                      # PASS
npx eslint .                          # PASS (0 errors, 0 warnings)
npx prettier --write .                # PASS
npx jest                              # PASS — 16 suites, 243 tests
npx expo export --platform android    # PASS — Hermes bundle emitted
```

## Passing
All of the above.

## Failing
None.

## Root cause if failing
N/A.

## Next exact action
1. Build the onboarding flow in `app/onboarding.tsx` (eight steps from the merged reference):
   guest/Google choice, CSE level, starting point + optional exam date, study days + session
   length, daily goal, plan preview/edit, appearance + text size + reminders, completion.
2. Persist via `Repositories.profile` / `Repositories.settings`; generate the first study plan
   through the domain study-policy code and store it with `Repositories.studyPlans`.
3. Wire the bootstrap gate in `app/index.tsx` (profile complete → tabs, otherwise onboarding),
   hydrate `AppearanceProvider` from settings, build `app/settings.tsx`, and add a rerun-onboarding
   developer action.
4. Tests: onboarding step state machine, validation, persistence round trip, gate redirect and
   settings edits — then run the gate, update agent docs and commit.

## Decisions made
D-007 … D-018 (see `agent/DECISIONS.md`); ADR-001 integration, ADR-002 database port,
ADR-003 contract-first sync.

## New blockers
Only external ones (see `agent/BLOCKERS.md`): live Google credentials, a production API endpoint,
and Android SDK/signing for a local APK production build. No internal blockers.

## Repository housekeeping note (not caused by this session)
`git status` shows the older prototype as deleted from `mobile-prototype/` with the same content
present untracked under `archives/mobile-prototype/`. This reorganisation pre-dates this session;
it was left untouched. Commit or discard it deliberately before release.

## Commit/hash
See the checkpoint commit created at the end of Phase 5 (`feat(navigation): …`).
