# Project State

**Phase:** 4 — Data / offline (complete) → starting Phase 5 — Navigation shell
**Current task:** Phase 5 — navigation shell: five tabs with Home centred, route groups, due badge,
accessibility labels
**Last completed task:** Phase 4 data/offline — `DatabasePort` (expo-sqlite + node:sqlite), migration
framework with schema v1, repository layer by domain need, idempotent version-gated content import,
sync outbox groundwork, and restart-durability tests against a file-backed database.
**Next action:** Wire database + repositories into app startup, build the `(tabs)` shell
(Learn / Practice / Home centred / Review / Progress) with stub settings/quiz/mock/onboarding
routes, the review due-count badge, theme-aware navigation and screen-reader labels.
**Last successful build:** `npx expo export --platform android` → PASS (Hermes bundle)
**Known failing tests:** None. `npx jest` → 229 passed / 229.
**External blockers:** Live Google OAuth credentials and a production API endpoint (verify-only;
everything else works without them).
**Internal blockers:** None.

## Verified baseline (run from `mobile/`)
| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm run format:check` | PASS |
| `npm test` | PASS — 229 tests |
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
services. Earlier: D-007 database port · D-008 platform fonts · D-009 modal screens are routes ·
D-010 bundled validated content packs · D-011 E2E strategy · D-012 route placement · D-013 exam
phase derived. ADRs: 001 integration, 002 database port, 003 contract-first sync.

## Content note
88 authored CSE questions across 22 concepts (4 per concept, every concept covered in both
tracks that examine it). Expanding the bank is a content task tracked in HANDOFF.md; nothing in
the engine depends on the current volume.
