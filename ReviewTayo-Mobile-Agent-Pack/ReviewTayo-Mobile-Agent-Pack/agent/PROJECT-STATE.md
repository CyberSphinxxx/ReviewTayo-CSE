# Project State

**Phase:** 3 — Exam core (complete) → starting Phase 4 — Data / offline
**Current task:** Phase 4 — SQLite bootstrap, migration framework, repositories, content import, outbox
**Last completed task:** Phase 3 exam core — generic contracts, registry, validator, session planning
engine, CSE Professional and Sub-Professional config with a 88-question content pack, and a non-CSE
fixture exam proving extensibility.
**Next action:** Implement the `DatabasePort` (expo-sqlite + node:sqlite adapters), the migration
framework, repository interfaces and local implementations, content import, and the sync outbox.
**Last successful build:** `npx expo export --platform android` → PASS (Hermes bundle)
**Known failing tests:** None. `npx jest` → 182 passed / 182.
**External blockers:** Live Google OAuth credentials and a production API endpoint (verify-only;
everything else works without them).
**Internal blockers:** None.

## Verified baseline (run from `mobile/`)
| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm run format:check` | PASS |
| `npm test` | PASS — 182 tests |
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
D-007 database port · D-008 platform fonts · D-009 modal screens are routes · D-010 bundled
validated content packs · D-011 E2E strategy · D-012 route placement · D-013 exam phase derived.
ADRs: 001 integration, 002 database port, 003 contract-first sync.

## Content note
88 authored CSE questions across 22 concepts (4 per concept, every concept covered in both
tracks that examine it). Expanding the bank is a content task tracked in HANDOFF.md; nothing in
the engine depends on the current volume.
