# Definition of Done — review

The pack's `DEFINITION-OF-DONE.md`, reviewed row by row against the built app on
2026-10-11 (Phase 17). ✓ means verified with named evidence; **external** means the
item is complete as far as this environment allows and the remainder is an external
blocker, named. Nothing is ticked without a source.

## Repository / source — ✓
`/mobile` is a clean package inside the repo; `npm ci` reproduces from
`package-lock.json`; prettier, ESLint (0 problems) and strict `tsc` pass; the two
architecture rules (domain purity, UI never importing SQLite/network) are enforced by
ESLint; no secret is committed (Phase 15 logging/secret audit, `.gitignore`); internal
blockers: none.

## App foundation — ✓
Expo SDK 57 + RN 0.86 + TS 6 + Expo Router; `com.reviewtayo.cse` on both platforms
(`expo config`); light/dark/device and text scaling are domain preferences rendered by
`theme/`; `components/errors/ErrorBoundary.tsx` wraps the root layout; safe-area
handling is in the root and every screen shell.

## Navigation — ✓
All five tabs (Home centred), Settings, Quiz, Mock and Onboarding routes exist and are
driven by the real router in `tests/app/`; restart behaviour (returning to Home,
resuming a stored session) is covered by `first-run-gate`, `release-journey` and the
quiz/mock resume tests.

## Onboarding — ✓
Guest path and Google architecture (Phase 13); Professional/Sub-Professional selection;
starting point; optional exam date; study days; session length; daily goal; generated
plan with edit mode; appearance and text-size preferences; reminders; completion screen;
`settings-rerun-onboarding`; committed state asserted over a real database in
`onboarding-flow`.

## Home / Learn / Practice / Quiz / Review / Progress / Mock — ✓
Every row is asserted by the corresponding `tests/app/*-screen.test.tsx` suite over the
real router and database: Home's phase, Smart Drill, Daily Question, plan, Review Due,
streak, resume card and done state; Learn's Continue Learning, Quick Sheets, subjects,
guides and the Professional/Sub-Professional subject difference; Practice's modes behind
one disclosure; the quiz's selection, checking, explanation, mastery line, both
recoveries, bookmark, pause/resume, results and recommendation; Review's deck, grading,
four lists and caught-up state; Progress's score, needs-attention, subject bars,
mastery drill-down (which never claims pass probability), CSE journey, week and mock
row; the mock's blueprints, clock, persistence, flags, pause/resume, result, section
breakdown and recommendation.

## CSE and multi-exam architecture — ✓
Both tracks and the analytical/clerical switch come from the content pack
(`content/exams/cse/`), timing and blueprint included, validated by the pack's own tests
and `tests/content/content-pack.test.ts`. `ExamRuleConfig`, the registry, the generic
question/subject/concept contracts, quiz engine, review/mastery inputs, mock blueprint,
content versioning and validation are exercised against a **second, non-CSE fixture
exam** (`content/exams/fixture-exam/`) by the registry, validation, home, onboarding and
provider suites — the proof `exams/ADDING-A-NEW-EXAM.md` asks for. No CSE branching
exists in generic services.

## Persistence / offline — ✓
SQLite initialized and migrated (versioned, tested); repositories implemented; the
bundled content pack makes core study fully offline; progress survives restart
(`offline-durability` closes and reopens a real database file, and the release journey
does it through the UI); an interrupted quiz and an interrupted mock both survive
restart, and the sync outbox is append-only and transactional.

## Auth / sync — ✓
Guest identity, the Google provider boundary behind an interface, keystore token
storage, the versioned contract-first client (no existing ReviewTayo backend was found
in this repo — ADR-003), outbox with retry/backoff, idempotency keys, per-entity
conflict policies and a worker whose failures never touch local studying. Live
verification against Google's servers and a real API is **external** (B-EXT-1, B-EXT-2).

## Notifications — ✓
Real weekly local reminders scheduled from the learner's own study days and chosen time;
the preference, the day selection and the time are all respected; permission is asked
only by the enabling action (D-057); a denial is a reported state, not a nag. Actual
delivery on a locked device is **external** (a device pass, VISUAL-QA).

## Quality — ✓
Loading, empty, recoverable-error and offline states are rendered through `RTStateView`
on every route; fatal errors are caught by the error boundary; accessibility basics were
audited and fixed in Phase 15; performance and security audits completed there; visual QA
automated against the references, with the device capture pass **external** (no Android
SDK — B-EXT-3).

## Automated tests — ✓
Domain, component, repository/database, feature integration, migration, offline, sync
merge/idempotency and the E2E journeys (core, Sub-Professional, review, mock) are all in
the 49-suite / 723-test run, including the continuous release journey added in Phase 16.

## Release — ✓ except where external
Icons, splash, adaptive icon and notification icon configured and resolved; permissions
audited (`INTERNET` + notification permissions only, with legacy storage permissions
removed from the merged manifest); environment variables documented (`.env.example`,
README); build profiles documented (`eas.json`, `docs/release-checklist.md`); release
checklist complete; Play Store and App Store preparation written from the actual
storage and permissions.

**External, unchanged:** the development build running on a real Android device, the
signed production Android build and the iOS archive all need an Android SDK/EAS account,
signing credentials and store access (B-EXT-3, plus the placeholder EAS project id,
B-EXT-5). These are recordable limitations, not code gaps — the paths are documented and
config-verified.
