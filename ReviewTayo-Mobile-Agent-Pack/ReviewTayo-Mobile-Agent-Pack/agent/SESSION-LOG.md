# Session Log

## Pack creation
Development pack initialized.

## Session 1 — 2026-10-05 — Phases 0, 1, 2

### Phase 0 — Repository audit (complete)
- Read the full agent pack (entry docs, architecture, exams, design, product, engineering,
  testing, phases, release) and the merged reference prototype (HTML, CSS, JS, checklists).
- Extracted the merged prototype for study and transcribed its token system.
- Audited the repository: **no existing web app, backend, API, database, auth or sync code**.
  Only the agent pack, the merged reference and an archived older prototype exist.
- Produced `agent/PHASE-0-AUDIT.md` with findings, reusable-asset inventory, integration plan,
  environment audit, verified baseline commands and risks.
- Recorded ADR-001 (integration), ADR-002 (database port), ADR-003 (contract-first sync) and
  decisions D-007 … D-013.
- Resolved the IA conflict between the archived prototype (4 tabs) and the pack/reference (5 tabs,
  Home centred) in favour of the pack and merged reference.

### Phase 1 — Mobile foundation (complete)
- Scaffolded Expo SDK 57 (`expo@57.0.26`, RN 0.86.3, React 19.2.3, TypeScript 6.0.3) at `/mobile`
  with `--no-install`, then pinned and reconciled versions with `npx expo install --fix`.
- Configured Expo Router (`main: expo-router/entry`, `scheme: reviewtayo`, typed routes),
  app identifiers `com.reviewtayo.cse` for both platforms, `userInterfaceStyle: automatic`.
- Strict TypeScript with `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `@/` path alias.
- ESLint flat config with architecture-boundary rules (domain may not import RN/Expo; UI may not
  import SQLite or local data implementations). Prettier. Jest via `jest-expo` in a Node
  environment with RNTL v14 (async API).
- Environment handling with https-only API URL validation; logging abstraction with redaction;
  analytics + crash boundaries with local defaults; app-level error boundary with themed fallback.
- Root `.gitignore` added; no changes outside `/mobile` and the agent pack.

### Phase 2 — Design system (complete)
- Tokens transcribed from the merged reference: light palette (cream/maroon/rose/gold) and the
  distinct dark burgundy system; spacing (4pt scale), radii, border widths, touch targets.
- Semantic theme layer so screens never use raw colours. Dark mode intentionally re-maps the
  accent role to a light rose because filled maroon cannot carry text on a dark canvas.
- Typography roles (display → nav label) with proportional line-height scaling and a
  Standard/Large/Extra-Large preference.
- Primitives: Text, Surface, Button, IconButton, Badge (incl. mastery ladder), Progress bar +
  ring, ListRow/ListGroup, SegmentedControl, Choice, Stat, StateView/LoadingView, ScreenShell,
  BrandCard, OwlMark, ErrorBoundary/FatalErrorFallback, and an icon set.
- Design system probe screen (`app/dev/design-system.tsx`) renders every primitive per theme and
  text size for device visual QA.
- Accessibility defects found and fixed during testing: Views carrying a role were not
  discoverable because `accessible` was missing (progress bars, segmented control group).
- Automated WCAG suite: 44 contrast assertions covering body/secondary/accent/badge/nav/mastery
  pairs in both themes.

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check` | PASS |
| `npx jest` | PASS — 2 suites, 64 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |
| `npx expo install --check` | PASS — dependencies SDK-aligned |

### Next session starts at
Phase 3 — generic exam core (`src/domain/exams`), CSE Professional/Sub-Professional config,
second-exam fixture, validation tooling and tests.

## Session 2 — 2026-10-05 — Phase 3
### Phase 3 — Exam core (complete)
- Generic contracts (`ExamRuleConfig`, tracks, subjects, concepts, blueprint, timing, scoring,
  study policy) plus registry, validator and session planning in `src/domain/exams/`.
- CSE content pack: 88 questions across 22 concepts, Professional and Sub-Professional tracks,
  plus a second non-CSE fixture exam proving the engine is generic.
- Validator fix: the pack layout keeps subjects/concepts/tracks outside `exam.json`; the
  validator now assembles them before validating (was the Phase 3 suite failure).
- 182 tests green; Android bundle PASS.

## Session 3 — 2026-10-06 — Phase 4
### Phase 4 — Data / offline (complete)
- `DatabasePort` with two adapters: `node:sqlite` (tests/CI and repository verification against a
  real engine) and `expo-sqlite` (device). Nested transactions are refused; pragmas (WAL,
  `foreign_keys`, busy timeout) applied on every open.
- Migration framework: `PRAGMA user_version`, one transaction per migration, rollback with the
  failing migration named, downgrade refusal, `schema_meta` bookkeeping. Schema v1 covers
  content, learner history, study planning, progress and sync (27 tables).
- Repository interfaces by domain need plus SQLite implementations: exam content, questions,
  profile, settings, practice sessions, answers, mastery, review queue, saved questions, study
  plans/tasks, mock sessions/answers, activity days, sync outbox and sync state. Every write
  accepts an optional active transaction (D-015).
- Content import: validated packs imported idempotently by `contentVersion`, wholesale atomic
  replacement, `content_meta` bookkeeping, and `bootstrapLocalDatabase` to migrate + import at
  startup. Both CSE and the fixture exam import side by side.
- Tests added: content import (8), repositories (14), sync outbox (7), offline durability (3)
  including a file-backed reopen proving a session, its answers and its outbox survive restart.
- Defect found and fixed by the suite: `asStorageError` dropped the driver message, so
  constraint failures were unidentifiable (D-014). Lint caught an Expo import in `src/domain`
  and id generation moved to `src/services` (D-017).
### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --write .` | PASS |
| `npx jest` | PASS — 13 suites, 229 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 5 — navigation shell: five tabs with Home centred, route groups, due-count badge from the
review repository, theme-aware nav and accessibility labels.

## Session 4 — 2026-10-06 — Phase 5
### Phase 5 — Navigation shell (complete)
- `LocalDataProvider` is the composition root: opens the device database, migrates, imports
  bundled content, exposes repositories, and gates the navigation tree behind a themed launch /
  recoverable-error state. Test seams allow the exact same wiring to run against `node:sqlite`.
- `(tabs)` route group with Learn / Practice / Home (centred, owl pill) / Review / Progress;
  theme-aware tab bar using the `nav*` roles prepared in Phase 2; modal/full-screen routes for
  settings, quiz, mock and onboarding; `index` redirects into the shell until Phase 6 adds the
  onboarding gate.
- Review badge reads `countDue` from the real review queue via `useDueReviewCount`; the tab's
  accessibility label announces the due count.
- Startup registration made idempotent so a fast refresh or remount cannot disable content
  (D-018).
- Tests: configuration order/centre, icon rendering per route/theme, due-count helper against a
  migrated database, provider happy path + recoverable failure with real retry, and a real
  expo-router integration test (redirect → Home, all five tabs, badge from seeded data, tab
  switching to Review/Progress). 16 suites / 243 tests.
### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --write .` | PASS |
| `npx jest` | PASS — 16 suites, 243 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 6 — onboarding and settings: guest/Google choice, CSE level, starting point, exam date,
study days, session length, daily goal, generated plan, appearance, text size, reminders.

## Session 5 — 2026-10-07 — Phase 6
### Phase 6 — Onboarding and settings (complete)
- Appearance vocabulary moved into the domain (`src/domain/preferences.ts`) so onboarding, settings,
  the theme and the stored row share one set of strings; a legacy `extra-large` row is coerced to
  `extra` rather than reset (D-019, D-020).
- Eight approved steps in `src/features/onboarding` over a pure draft module: account (guest/Google
  intent), CSE level from the exam config, starting point with an optional exam date, study-day grid
  and session length, daily goal with a custom 5–50 field, the generated plan preview with the first
  activity, appearance/text size/reminders, and the completion summary.
- `buildWeeklyPlan` turns the answers into a week of dated tasks from the exam's own blueprint —
  a Sub-Professional mock is 165 items, Professional 170, and neither number is hardcoded.
- Draft/commit: nothing is written while the flow is open; finishing writes profile, settings and the
  plan in one transaction (D-022). A rerun inside the same week replaces that week's plan in place
  and keeps the original `createdAt` (D-023).
- `app/index.tsx` became the gate between first run and the shell, reading `onboardingCompletedAt`
  from the profile rather than a flag kept in memory.
- Settings: grouped Account / Study plan / Appearance / Reminders / Offline content. Appearance and
  reminders save immediately; plan rows reopen the flow at the step that owns the field (D-024).
- `AppearanceBootstrap` hydrates the stored theme and text size before the first paint and falls back
  to defaults if the read fails (D-021).
- Fixed while testing: `parseStudyDays` threw on a non-string stored row and could take the whole flow
  down; it now degrades that day instead (D-020).
- Tests: 22 suites / 288 tests — the full eight-step flow and the edit-mode rerun over a real router
  and a real migrated database, settings persistence and step-targeted reopening, the first-run gate
  for three distinct starting states, appearance hydration (including what the tree observed on its
  first paint) and the domain/service layers.

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 22 suites, 288 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 7 — Home: the editorial layout from the approved prototype, exam phase and countdown, the
Smart Drill call to action, and today's plan read from the generated study plan.

## Session 6 — 2026-10-07 — Phase 7
### Phase 7 — Home (complete)
- `src/domain/home/` holds the derivations Home needs and no screen knows: today's plan and
  progress, the done-for-today rule, the streak, session sizing and the hero copy.
- The hero is the approved editorial composition: phase pill and countdown from the profile's exam
  date, one recommendation sized from the learner's own daily goal (capped by the exam's
  `drillSize`), the owl, the single gold Smart Drill action, and a line naming the subject that
  needs attention without exposing how it was chosen.
- "Today" is three small things — Daily Question, Smart Drill, Review Due — with durations from
  the exam policy and the real due count, followed by the goal ring and the streak.
- A resume card appears only when there is something to resume: an unfinished mock first, otherwise
  an unfinished practice session with progress counted from the answers themselves.
- Done For Today is derived, not stored: the day's plan is finished or the goal is met, and nothing
  is due. When it is true the hero switches to the approved completion copy.
- Home stores nothing new (D-026); the streak counts answered questions and tolerates an empty
  today (D-027); resume dismissal stays in screen state until the mock phase defines what it
  dismisses (D-028).
- Tests: 24 suites / 325 tests — 26 domain cases (progress, done rule, streak, sizing, hero copy)
  and 11 integration cases over the real router and a seeded database (hero, due count, both resume
  paths, done and not-done, plan-less day, both themes, routing).

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 24 suites, 325 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 8 — Learn: Continue Learning, Quick Sheets, Subjects and Study Guides from the approved
prototype, reading content from the imported pack.
