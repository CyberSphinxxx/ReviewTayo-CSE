# Project State

**Phase:** 5 — Navigation shell (complete) → starting Phase 6 — Onboarding / settings
**Current task:** Phase 6 — onboarding flow (guest/Google architecture, level, schedule, plan) and
settings integration
**Last completed task:** Phase 5 navigation shell — `LocalDataProvider` composition root, five-tab
shell with centred Home, modal/onboarding routes, real due-count badge from the review queue, and a
router integration test over a seeded database.
**Next action:** Build the onboarding steps and persistence (profile, settings, first study plan),
add the bootstrap gate that chooses onboarding vs the shell, build settings, and hydrate appearance
from stored settings.
**Last successful build:** `npx expo export --platform android` → PASS (Hermes bundle)
**Known failing tests:** None. `npx jest` → 243 passed / 243.
**External blockers:** Live Google OAuth credentials and a production API endpoint (verify-only;
everything else works without them).
**Internal blockers:** None.

## Verified baseline (run from `mobile/`)
| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm run format:check` | PASS |
| `npm test` | PASS — 243 tests |
| `npx expo export --platform android` | PASS |

## Repository reality (Phase 0 audit)
- No existing web app, backend, API schema, database, auth provider or sync endpoints exist in
  this repository. Full findings: `agent/PHASE-0-AUDIT.md`.
- `references/merged-prototype/` is the design/interaction source of truth.
- `archives/mobile-prototype/` is a **non-authoritative** older prototype (it specifies four
  tabs; the pack and merged reference specify five with Home centred).

## Important fixed decisions
- Android + iOS; Android primary QA.
- `/mobile` inside existing repo.
- Expo + React Native + TypeScript + Expo Router.
- npm.
- app id `com.reviewtayo.cse`.
- offline-first.
- real Guest + Google architecture.
- reuse existing ReviewTayo APIs/contracts where practical. *(None exist in this repo — see
  ADR-003: contract-first client with a local-only default transport.)*
- real sync when APIs permit.
- CSE-only v1 UI; generic multi-exam core.
- real local notifications.
- vendor-neutral analytics/crash interfaces with no-op/local default.
- light = current ReviewTayo; dark = merged Claude visual system.
- do not refactor the web app merely to share code.

## Decisions added this session
D-014 storage errors keep the driver message · D-015 transactions are passed down, never nested ·
D-016 content import is version-gated and wholesale · D-017 identifier generation lives in
services · D-018 startup content registration is idempotent. Earlier: D-007 database port · D-008 platform fonts · D-009 modal screens are routes ·
D-010 bundled validated content packs · D-011 E2E strategy · D-012 route placement · D-013 exam
phase derived. ADRs: 001 integration, 002 database port, 003 contract-first sync.

## Content note
88 authored CSE questions across 22 concepts (4 per concept, every concept covered in both
tracks that examine it). Expanding the bank is a content task tracked in HANDOFF.md; nothing in
the engine depends on the current volume.
