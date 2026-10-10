# Project State

**Phase:** 16 — Full regression (complete) → starting Phase 17 — Release readiness
**Current task:** Phase 17 — Release readiness: icons, splash, permissions, environment docs, a
development build, the Android production build path, iOS-ready config, CI quality gates, the release
checklist, Play Store and App Store preparation docs, and the final Definition of Done review.
**Last completed task:** Phase 16 Full regression — every checklist row mapped to the suites that
exist and recorded beside it, one new continuous journey suite (fresh install → onboarding → first
answered question; interrupted session surviving a close-and-reopen), and the one regression it
found fixed: Home's Daily Question was served as a ten-question drill because the route's default
count overrode the mode's own one-question planner (D-061).
**Next action:** Work the Phase 17 checklist row by row: verify the icon/splash/permission config
honestly, document the environment and both build paths, set up the CI quality gates, prepare the
store submission docs, and close with the Definition of Done review. Anything that needs a device or
store account stays tracked in `BLOCKERS.md`/`VISUAL-QA.md` rather than being claimed.
**Last successful build:** `npx expo export --platform android` → PASS (Hermes bundle)
**Known failing tests:** None. `npx jest` → 723 passed / 723.
**External blockers:** Live Google OAuth credentials and a production API endpoint (verify-only;
everything else works without them). Build-chain dependency advisories (5 distinct, none in the app
bundle) are recorded as a limitation, not fixed by force.
**Internal blockers:** None.

## Verified baseline (run from `mobile/`)
| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors, 0 warnings) |
| `npm run format:check` | PASS |
| `npm test` | PASS — 723 tests across 49 suites |
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
D-061 a mode's size belongs to the mode, not to the route's default.
Previous session: D-059 overlapping writes queue, a nested transaction is still an error · D-060 a
finished session owns no clock, and finishing is idempotent.
Earlier session: D-057 permission is asked only at the point of value · D-058 the schedule is rebuilt
whole, and a denied device is reported, not nagged.
Two sessions ago: D-051 a guest is a device, not a missing account · D-052 sync is a drain, not a
daemon · D-053 an answer appends its sync event in the same transaction · D-054 each kind of change
has its own merge policy, and settings are intents · D-055 the transport is the only thing that talks
to a network · D-056 signing in does not depend on the backend.
Three sessions ago: D-047 a mock counts through the same answer writer practice uses · D-048 a mock
reveals nothing until it is submitted · D-049 the clock is a deadline and an expired paper is still a
result · D-050 a paper is scored out of the items it holds, and unanswered counts wrong.
Earlier session: D-043 the Study Score is a mark, not a forecast · D-044 Progress names the subject
Practice would have offered · D-045 concept mastery is listed least mastered first, unanswered
concepts included · D-046 the weekly goal is the learner's own, and only exists if they set one.
Earlier: D-039 one review schedule, written by the domain · D-040 a flashcard does not credit
mastery · D-041 Review is a deck, not another quiz · D-042 the review queue belongs to the exam, not the
track.
Earlier session: D-033 correctness is decided by the service from the question itself · D-034 one
submitted answer is one transaction · D-035 the drill's ranking stays a ranking · D-036 Practice omits
a mode it cannot honestly offer · D-037 "Try another like this" is offered only when the follow-up
exists · D-038 a timed session runs on a deadline and expiring finishes it rather than discarding the
work.
Earlier session: D-029 mastery is derived from answer evidence and quantised before thresholds ·
D-030 reference content is generated from concepts, not written twice · D-031 Learn's subject bar is
accuracy and mastery is the line underneath · D-032 Continue Learning never recommends a lesson
already mastered.
Earlier: D-026 Home derives everything and stores nothing · D-027 a streak counts answered questions and
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
the engine depends on the current volume. One consequence is now visible on Progress: mastery's
evidence floor is five answers, so with four questions per concept a concept can reach `Strong` but
not `Mastered` — the ladder is correct and simply waiting for more questions per concept.
