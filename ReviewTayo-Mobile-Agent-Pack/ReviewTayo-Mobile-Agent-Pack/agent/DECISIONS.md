# Engineering Decisions

Record consequential decisions here or create an ADR.

## D-001 — Mobile stack
Expo + React Native + TypeScript + Expo Router.

## D-002 — Repository placement
Mobile app lives in `/mobile` inside the existing ReviewTayo repository.

## D-003 — Offline-first
Local persistence is authoritative for immediate study UX. Sync is asynchronous and must not block studying.

## D-004 — Exam strategy
CSE-only UI in v1, generic multi-exam engine underneath.

## D-005 — Theme
Light follows current ReviewTayo. Dark follows merged Claude-inspired burgundy direction.

## D-006 — Analytics/crash
Use vendor-neutral interfaces. Default to no-op/local implementations until a provider is intentionally chosen.

## D-007 — Database port (see ADR-002)
Repositories depend on a narrow `DatabasePort`, implemented by `expo-sqlite` on device and
Node's built-in `node:sqlite` in tests. Migration and repository tests therefore run against a
real SQLite engine in CI with no native build step.

## D-008 — Typography uses platform fonts
Editorial serif resolves to Georgia (iOS) / `serif` (Android) and body copy to the platform
sans. This avoids bundling font binaries and a font-loading dependency while keeping the
reference's editorial character. A single `serifFontFamily` token makes swapping in a bundled
open font a one-file change if brand requirements change.

## D-009 — Modal screens are router routes, not DOM-style overlays
The prototype renders sheets as absolutely-positioned overlays. Natively these become modal
routes using a shared `RTScreenShell`, so Android hardware back, deep links, state restoration
and screen-reader focus all behave correctly.

## D-010 — Bundled, validated content packs
Exam content ships as JSON content packs under `content/exams/`, validated by the exam
validator in tests and at import into SQLite. Bundling guarantees first-run offline usability
(the app has no useful state without content), while the manifest carries `contentVersion` so a
remote pack can supersede it later without a release.

## D-011 — E2E strategy
Maestro flows are authored in `e2e/` for device/emulator execution, and the same journeys are
mirrored as React Native Testing Library journey tests that run in CI against a real SQLite
database. Device-only execution is not available in this environment, so CI executes the
mirrored journeys rather than skipping them.

## D-012 — Routes live in `app/` at the mobile package root
Following `architecture/ARCHITECTURE.md`, route files live in `mobile/app/` while all other code
lives in `mobile/src/`. The `@/` alias maps to `src/`, keeping imports unambiguous.

## D-013 — Exam phase is derived, never stored
The CSE Journey phase and countdown are computed from the target exam date and the exam
config's phase policy. Storing a phase would let it drift from the date and from config.

## D-014 — Storage errors keep the driver's message
`asStorageError` appends the underlying SQLite text (e.g. `UNIQUE constraint failed: …`) to the
typed `AppError`, because constraint failures are only identifiable from it. Detection is
duck-typed rather than `instanceof Error`: native-driver errors can originate in another realm,
where `instanceof` is false inside Jest even though the message is intact.

## D-015 — Transactions are passed down, never nested
Every repository write accepts an optional active transaction and otherwise opens its own via
`withTransaction`. Neither engine supports nested transactions, and silently turning nesting
into savepoints would let device and test behaviour diverge. Use cases that change several
repositories together (answer + mastery + review + outbox) receive one transaction.

## D-016 — Content import is version-gated and wholesale
Startup imports a bundled pack only when its `contentVersion` differs from what is stored, and a
changed pack replaces that exam's content atomically (cascading delete, then insert) with
`content_meta` bookkeeping. Learner history references question ids rather than foreign keys, so
replacing content can never rewrite or delete what a learner did.

## D-017 — Identifier generation lives in services
`createId` (an `expo-crypto` UUID) lives in `src/services/ids.ts`, not `src/domain`, because the
lint boundary forbids Expo imports in the domain layer. Domain code receives ids; it does not
create them, which also keeps persisted test fixtures deterministic.

## D-018 — Startup content registration is idempotent
`registerBundledPacks` treats an already-registered pack with the same `contentVersion` as
current instead of a duplicate error, and replaces the registration when the bundled version is
newer. Startup runs again after a fast refresh or a second provider mount, and that must not
disable content or fail the launch. The `ExamRegistry` itself still rejects true duplicate ids
from other callers.
