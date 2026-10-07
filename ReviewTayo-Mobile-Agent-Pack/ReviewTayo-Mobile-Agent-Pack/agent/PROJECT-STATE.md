# Project State

**Phase:** 7 — Home (complete) → starting Phase 8 — Learn
**Current task:** Phase 8 — Learn (Continue Learning, Quick Sheets, Subjects, Study Guides)
**Last completed task:** Phase 7 Home — the editorial hero with the exam phase and countdown, one
Smart Drill recommendation sized from the learner's goal, the three daily actions, the goal ring
with the streak, the contextual resume card and the derived Done For Today state.
**Next action:** Build Learn from the approved prototype, reading subjects, concepts and lesson
progress from the imported content pack and the practice history.
**Last successful build:** `npx expo export --platform android` → PASS (Hermes bundle)
**Known failing tests:** None. `npx jest` → 325 passed / 325.
**External blockers:** Live Google OAuth credentials and a production API endpoint (verify-only;
everything else works without them).
**Internal blockers:** None.

## Verified baseline (run from `mobile/`)
| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm run format:check` | PASS |
| `npm test` | PASS — 325 tests across 24 suites |
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
D-026 Home derives everything and stores nothing · D-027 a streak counts answered questions and
tolerates an empty today · D-028 resume dismissal stays in screen state until the mock phase.
Earlier: D-019 appearance vocabulary lives in the domain · D-020 preference parsing never throws on
an untrusted row · D-021 bootstrap hydrates appearance before first paint · D-022 onboarding commits
in one transaction · D-023 a same-week rerun replaces that week's plan in place · D-024 settings
saves immediate preferences and delegates plan edits to onboarding · D-025 edit-mode exit falls back
to Home without history. Also earlier: D-014 storage errors keep the driver message · D-015 transactions are passed down, never
nested · D-016 content import is version-gated and wholesale · D-017 identifier generation lives in
services · D-018 startup content registration is idempotent · D-007 database port · D-008 platform
fonts · D-009 modal screens are routes · D-010 bundled validated content packs · D-011 E2E strategy ·
D-012 route placement · D-013 exam phase derived. ADRs: 001 integration, 002 database port,
003 contract-first sync.

## Content note
88 authored CSE questions across 22 concepts (4 per concept, every concept covered in both
tracks that examine it). Expanding the bank is a content task tracked in HANDOFF.md; nothing in
the engine depends on the current volume.
