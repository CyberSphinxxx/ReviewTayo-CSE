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

## Session 7 — 2026-10-07 — Phase 8
### Phase 8 — Learn (complete)
- `src/domain/learn/` holds the four claims Learn makes and nothing about how they are drawn: which
  concept to read next, which quick sheets to offer, how far into each subject the learner is, and
  what the guides contain. Every list is built from `subjectsForTrack`, which is what makes the two
  CSE tracks differ without a single CSE-specific branch.
- Mastery became a first-class derivation (`src/domain/exams/mastery.ts`) because Learn needs a level
  it can trust: level is computed from correct/wrong evidence with the exam's own policy, damped by
  an evidence floor of five answers and quantised to three decimals before any threshold is applied
  (D-029). `RTBadge` now re-exports the vocabulary from the domain instead of declaring a second
  copy of it, and `conceptsForTrack` joined the registry next to `subjectsForTrack`.
- Continue Learning resumes the concept the learner is partway through — most recently answered
  first — falls back to their track's first unmastered lesson labelled `Start here`, and shows no row
  at all once everything is mastered (D-032).
- Quick Sheets are one concept summary per subject; Study Guides are the same material at full depth,
  generated from the pack's concepts rather than a second corpus (D-030), and reachable as two new
  routes (`/guide`, `/concept`) so back, deep links and text-size changes behave natively.
- Subjects list accuracy per subject with the concept count it is measured over, and says "not
  started" rather than reporting a confident zero (D-031). Review Due deliberately does not appear on
  this screen, and a test asserts it never returns.
- Tests: 27 suites / 373 tests — 13 mastery cases (ramp, weighting, ladder, clamping, policy
  sensitivity), 24 Learn domain cases (resume/start/fully-mastered, both tracks, accuracy and mastery
  arithmetic, guide order, concept reference) and 11 integration cases over the real router and a
  seeded database (title, resume, quick sheets, subjects, both tracks, no Review Due, subject→guide→
  concept routing, the full guide index, both themes, unknown concept).

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 27 suites, 373 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 9 — Practice + Quiz: the Smart Drill domain service, Weakest Area, Timed Practice, Random set,
Build a Quiz, Mastery Rounds, Practice by Subject, progressive disclosure, the question screen and
answer checking.

## Session 8 — 2026-10-08 — Phase 9 (+ a Phase 8 audit)
### Phase 8 audit (fixed before continuing)
- The audit found four real defects in Learn, now fixed and committed separately (`f6a54d5`): Study
  Guides listed one row per subject and duplicated the Subjects list above it; `useLearn`/`useReference`
  exposed an `exam` and a `trackId` nothing read; `/guide` claimed "Nothing to read yet" while it was
  still loading; and the guide row's `onPress` handed React Native's press event into a route param,
  which arrived as `[object Object]`. The same `onPress={fn}` shape was swept for across the app.
- Session sizing and the shared evidence shapes moved out of Home into `src/domain/sessions/`
  (`sizing.ts`, `evidence.ts`) so Practice and the quiz could use them without importing Home.

### Phase 9 — Practice + Quiz (complete)
- `src/domain/practice/` holds everything Practice claims and nothing about how it is drawn: the drill
  ranking (`drill.ts`), the catalogue of honest actions (`catalogue.ts`), the answer and results copy
  (`feedback.ts`), the plan-task mapping (`task-kind.ts`) and the shared types. Every mode is data —
  an action carries its own request — so the screen never decides how a mode works.
- Smart Drill ranks every concept of the learner's track with the exam's own `SmartDrillWeights`
  (weakness, due review, unseen, low coverage, recent lesson) and hands the top of that list to the
  same generic planner every other mode uses (D-035). Weakest Area names a real subject or does not
  appear at all (D-036). Mastery Rounds drills every concept that is not yet `Mastered`, and drops the
  filter when that would be the whole track.
- `src/services/practice.ts` is the one place a session is created and an answer is committed:
  `startSession` (including `similarToQuestionId` → `buildSimilarQuestionPlan`), `submitAnswer` (one
  transaction: the answer, mastery per concept, the review schedule, today's activity, the plan task
  and the session's score — D-033, D-034), `finishSession`, `pauseSession` and `hasSimilarQuestion`.
- The four modules the screen needs landed behind them: `/quiz` (one question at a time), `/build-quiz`
  (subject chips and length), `/subject-practice` (one row per track subject with real counts) and a
  real Practice tab — eyebrow, editorial title, one dominant Smart Drill, the targeted rows that can
  be honestly offered, and everything else behind a single disclosure.
- The wrong-answer recovery loop is the prototype's: another question about the same idea (offered
  only when a related question exists — D-037), the concept's own reference page, then the next
  question. Bookmarking lives in the quiz header and reads its state back from the database.
- Timed Practice runs on a stored deadline rather than a counted-down variable, and a clock that runs
  out finishes the session with what was answered (D-038). Closing a session pauses it; reopening by
  `sessionId` restores the stored order, the score so far, the clock's remainder and the first
  unanswered question — and Home's resume card now carries that id, so it truly resumes.
- Results report the score without judging it and then recommend one next action from the score and
  the distinct concepts missed: widen to a mixed set, drill again, or take the misses to Review.
- Tests: 31 suites / 437 tests — 24 domain cases (catalogue per policy and per track, ranking,
  weakest area, mastery rounds, feedback copy, recommendations), 17 service cases (session creation,
  the answer transaction, the plan task, pause/resume, similar questions), 10 Practice screen cases
  and 13 quiz cases over the real router and a seeded database (checking, explaining, mastery,
  queueing a miss, no second answer, the walk to the results, resuming, bookmark, follow-up concept
  and similar-question routing, the recommendation's destinations, an unsatisfiable request).

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 31 suites, 437 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 10 — Review: the review scheduler, the Due queue, Again/Got It, mistakes, saved questions,
concepts to revisit, history, the caught-up state and the tab's due badge.

## Session 9 — 2026-10-08 — Phase 10
### Phase 10 — Review (complete)
- `src/domain/review/` holds the three things Review claims: the schedule (`schedule.ts` — the
  exam's own `gotItIntervalDays` ladder indexed by mastery, `againIntervalDays` for a lapse, local-day
  arithmetic for "Due tomorrow" and a counted lapse and review), the deck (`deck.ts` — one card per
  due concept, front the concept's name and back its own summary) and what Review says about the
  learner rather than about their queue (`progress.ts` — concepts to revisit, read from mastery
  evidence, and the week's history, read from each item's own `lastReviewedAt`).
- The Again / Got it arithmetic moved out of `services/practice` and into the domain, and the answer
  writer now uses it (D-039): a drill answer and a card said "Got it" to move one due date. Grading a
  card changes the schedule and nothing else — mastery stays answer-derived (D-040) — and Review is a
  deck rather than another quiz, because the concept has already been answered and got wrong once
  (D-041). The queue belongs to the exam rather than the track, so the badge, Home's line and the deck
  count the same rows (D-042).
- `src/services/review.ts` is the one place the queue is read and a card is graded: `loadReviewQueue`
  (oldest first, capped by `dailyDueLimit`, with the total so the screen can admit the remainder),
  `loadReviewOverview` (the counts and the duration Home already quotes), `gradeReviewItem` and
  `loadReviewList` for the four lists behind the rows.
- The tab leads with the number: review due today, what it costs, one action. When nothing is due it
  says "You're caught up." once instead of drawing an empty queue, and when a list is empty it says
  which list it is rather than showing a blank screen. `review-list` carries all four of Review's
  lists as one shape driven by a parameter — a title, what it belongs to and one supporting line —
  and an unknown parameter lands on Mistakes rather than on an error.
- Tests: 34 suites / 484 tests — 19 domain cases (the ladder, lapses, due-date wording, the deck,
  revisit ordering and the history window), 13 service cases (the queue, the daily cap, grading, the
  schedule shared with the answer writer, the four lists) and 15 integration cases over the real
  router and a seeded database (the count and its duration, the caught-up state, the rows, the badge
  agreeing with the number, reveal-then-grade, Again and Got it writing the right schedule, walking a
  deck to its completion copy, both themes, every list, and opening the concept behind a card).

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 34 suites, 484 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 11 — Progress: Study Score, Needs Attention, subject accuracy, concept mastery.

## Session 10 — 2026-10-09 — Phase 11
### Phase 11 — Progress (complete)
- `src/domain/progress/` is the five things Progress claims, each from evidence the app already had:
  the score (`score.ts` — three answer-derived ingredients over a seven-day window, with the same
  arithmetic giving last week and the six-week curve; D-043), the subject to work on
  (`needs-attention.ts` — Practice's own `weakestSubject` judgement, D-044), mastery
  (`mastery.ts` — the whole track, least mastered first, unanswered concepts leading; D-045), the
  exam's phases (`journey.ts`), this week (`week.ts` — Monday-first bars, ahead-of-today days marked as
  ahead, and a weekly goal of the learner's own `dailyGoal × chosen study days`; D-046) and the last
  simulation (`mock.ts` — the newest completed mock, never an unfinished one).
- `src/services/progress.ts` composes them over one read: `loadProgressOverview` (score, needs
  attention, subject accuracy reused from Learn's own derivation, mastery summary, journey, week, mock)
  and `loadConceptMastery` (the same rows narrowed to one subject). Subject accuracy is deliberately
  *not* recomputed: Progress and Learn read `subjectProgressRows`, so the two screens cannot disagree.
- The screen follows the reference: the Study Score with its week-over-week line and a sparkline of the
  six weeks behind it, Needs Attention with the one action that fixes it, subject accuracy bars, mastery
  one layer below them, the CSE journey, this week and the last mock. The two sections that need history
  a learner may not have yet (needs attention, the last mock) are absent or say so rather than inventing
  a number, and `/progress-list` is the one drill-down behind both the mastery row and any subject row.
- `RTSparkline` is a new design-system primitive (a bar, ring and now a line), drawn in a fixed
  coordinate space that scales to its container, announced to assistive technology with its own series,
  and it is on the design-system dev screen beside the other two.
- Tests: 37 suites / 538 tests — 31 domain cases (the score's ingredients and window edges, the series
  and all four trend directions, needs-attention emptiness, mastery ordering and summary, the journey at
  four horizons and with no date, the week's bars and goal, the mock row), 11 service cases over a real
  database and real answers (an empty learner, the score moving with answers, subject accuracy, the
  weakest subject, the mastery summary, the weekly target, the journey, the mock row, the concept list
  and its track scoping, mastery moving) and 12 integration cases over the real router (every section,
  the reload on focus, needs attention appearing only once it can be honest and starting the right
  drill, both mastery lists, the week, the journey, both mock states, the dark theme).
### Audit findings fixed this session
- `describeAccuracyPercent` existed twice, in `domain/practice/drill.ts` (row-shaped) and
  `domain/review/progress.ts` (number-shaped), exported from both barrels under one name. It now lives
  once in `domain/sessions/evidence.ts` (the shared evidence module) and every caller — Practice's
  catalogue, Review's revisit list and Progress — reads that one implementation, so "64% accuracy"
  means the same thing wherever it is printed. Call sites and the two affected suites were updated.
- Needs Attention's card was briefly one accessible node containing the Practice button, which would
  have hidden the button from a screen reader; the label now lives on the text and the action stays its
  own element.
- The score's windows are half-open (`[from, to)`), so an answer at exactly the read instant falls
  outside the current week. In practice the write always precedes the read, and the service test reads a
  second after it answers rather than pretending the edge does not exist.
- Content observation, not a defect: the pack has four questions per concept, and mastery's evidence
  floor is five, so a concept can reach `Strong` but not `Mastered` on today's bank (asserted in
  `tests/services/progress.test.ts`). More questions per concept is a content task, already tracked.

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 37 suites, 538 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 12 — Mock Exam: mock setup, the Professional and Sub-Professional blueprints, the timer, answer
persistence, pause/resume, submission, the result score, the subject breakdown and the recommended next
plan.

## Session 11 — 2026-10-10 — Phase 12
### Phase 12 — Mock Exam (complete)
- `src/domain/mock/` is the two things a running examination adds to the engine, both derived from the
  stored session: where the learner is inside the paper and how much time is left (`progress.ts` — the
  answer/correct/flag counts, the first unanswered question a resumed paper opens at, the progress and
  flag lines, and a clock read against the session's own stored `expiresAt`, with a paused paper using
  its stored remainder and a negative remainder clamped to zero; D-049), and what the finished paper
  says (`result.ts` — the score out of the items the paper actually holds with unanswered counting
  wrong, the sections in the exam's own blueprint order, the weakest section marked, and one of four
  honest next steps; D-050). The engine still owns what a paper *is* — blueprint, sections and clock
  come from `domain/exams`, and nothing in the mock module knows the exam is CSE.
- `src/services/mock.ts` owns the paper's life and nothing else: `loadMockSetup` (the exam's own summary
  plus the plan's per-section allocation, with the bank's shortfall said plainly — `72 of the 170 items
  this paper asks for`), `startMock`, `answerMockItem`, `flagMockItem`, `pauseMock`, `resumeMock`,
  `submitMock` and `loadMockResult`. Two rules make it safe: while running, only the paper's item rows
  are written, so changing an answer is free and an abandoned paper changes nothing; on submission every
  answered item goes through the *same* `submitAnswer` practice uses, tagged `source: 'mock'` and
  carrying the mock's own session id, which is what makes the attempt count towards mastery, the review
  queue, the streak and the day — and what makes submitting twice a no-op (D-047).
- `src/features/mock/` is the screen's model: `useMock` picks the face from what is stored (setup,
  running, result) and submits a paper whose clock ran out while the app was closed on the way in
  rather than resuming it; `useMockRunner` owns the running paper — a one-second interval re-derives the
  remainder from the deadline and submits at zero, `choose` shows the choice but never whether it was
  right, the flag and its grid are navigation aids, and pause/resume stop and restart the stored clock
  (D-048). `RunningPaper` in `app/mock.tsx` is its own component so the tick only exists while the paper
  does, and the route hides the tab bar while the examination is open.
- The result screen follows the reference: the score out of the paper with the exam's passing mark as
  context, what was skipped and wrong, per-section bars with the weakest named, and one recommended next
  step wired to the route that does it — `weakest-area` runs a drill filtered to that subject, `review`
  opens Review, `progress` opens Progress, and a cut-short paper offers a retake that starts a fresh one.
  `domain/progress/mock.ts` was taught to count an `expired` session with a `completedAt` as a result
  too, so the progress row and the result screen cannot disagree about the same attempt.
- Tests: 40 suites / 572 tests — 13 domain cases (counts, where a resumed paper opens, the clock against
  a deadline, a paused remainder, expiry and clamping, scoring with skips, section order and the weakest
  mark, all four recommendations), 11 service cases over a real database and the real bank (setup and
  its shortfall, starting, an empty bank, answering and changing an answer, flags, pause/resume, expiry
  without loss, the idempotent submission through the answer writer, the result, mastery moving) and 9
  integration cases over the real router (setup, starting, answering without feedback, marking, leaving
  to Home and resuming, submitting with a summary, the result and its recommendation action, and an
  expired paper submitted on the way in).
### Audit findings fixed this session
- `MockSessionState.answeredCountLine` was referenced by a test but never existed on the type; the
  assertion now reads the real `progressLine`, so `tsc` covers the whole suite again.
- The mock repository's session patch gained `expiresAt` (and the SQLite implementation writes
  `expires_at`), because `resumeMock` must move the deadline when the pause ends — without it a resumed
  paper would have kept the original deadline and lost the paused time twice.
- Progress's mock row previously ignored `expired` papers entirely, which would have made a paper that
  ran out of time vanish from Progress while its result screen still showed a score. It now counts
  `expired` + `completedAt`, and only an in-progress or paused paper is excluded (it belongs to Home's
  resume card).

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 40 suites, 572 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 13 — Auth/sync: guest identity, the Google provider, secure credential storage, the API client
boundary, the backend contract, the sync outbox worker with retry/backoff and idempotency, conflict
policies and offline-to-online recovery. External prerequisites still outstanding: live Google OAuth
client IDs and the production API base URL/credentials (`agent/BLOCKERS.md`).

## Session 12 — 2026-10-10 — Phase 13
### Phase 13 — Auth/sync (complete)
- `domain/identity/` is who is using the app: a guest with its own device id, or a Google account, with
  the stored record narrowed field by field rather than cast — a truncated record, a device restore or
  an older build falls back to guest instead of showing a half-parsed name (D-051). Reading an OIDC id
  token is here too, pure and unverified: the client only needs the claims it is allowed to see, and
  the server does the verification (D-056).
- `data/remote/` is the backend contract and the one network boundary. The contract is the versioned
  request/response pair ADR-003 specified (event push, Google auth exchange) with runtime narrowing for
  both responses; the transport is an interface whose default is `LocalOnlyTransport` — offline, not
  broken — with `HttpApiTransport` used only for an https base URL and every outcome mapped to a
  retryable or permanent `ApiFailure` (D-055).
- `services/auth.ts`, `services/credentials.ts` and `services/google-auth.ts` are the account: a device
  id generated once and kept, the identity and provider tokens in the keystore rather than SQLite, the
  authorization-code + PKCE flow behind a provider interface that tests replace with a fake, and a
  sign-in that succeeds locally even when the server exchange cannot (D-056).
- `services/sync.ts` and `domain/sync/` are the outbox: events keyed by data that already exists, a
  bounded exponential backoff with jitter, per-entity conflict policies (answers append-only, settings
  and bookmarks latest-intent-wins, mastery recomputed rather than copied), and a worker that is a
  drain rather than a daemon — one pass over what is due, a summary as its result, and no way for a
  failure to reach the learner's work (D-052, D-054).
- The write sites now append their own events inside the transaction that makes the change: an answer
  (`submitAnswer`), a settings change (`saveAppSettings`) and a bookmark (`services/saved-questions.ts`)
  — so a long offline stretch can never lose one (D-053). Settings shows the account and the queue, and
  drains whatever is due when it is opened.
- Tests: 45 suites / 662 tests — 32 domain cases (both identities, untrusted stored records, id-token
  reading, the backoff schedule and its ceiling and jitter, event keys, every merge policy), 25 transport
  cases (the local-only default, plaintext refusal, request shape and headers, every HTTP status class,
  a dead socket, a real abort, both response narrowings), 16 auth cases (device id stability, stored
  account, unreadable record, sign-in with and without a backend, cancelled sign-in, sign-out keeping
  the device id, no keystore, a read-only keystore, the narrowed exchange), 13 worker cases over a real
  database (the event appended with its answer, settings and bookmarks doing the same, offline leaving
  the outbox alone, delivery, backoff and the delivered retry, permanent failure, exhausted attempts, a
  server rejection, an unreadable response, the drain after a long offline stretch, a throwing transport
  and the local work surviving it, both overview lines) and 4 account cases on the settings screen.
### Audit findings fixed this session
- `saveAppSettings` is the only writer of the settings row that a learner drives directly, so the sync
  event was put there rather than at either of its two callers — one write path, one event.
- The settings screen's old "Sign-in and sync arrive in a later update" row had become false the moment
  this phase landed; it is replaced by the real account, the real queue and a Sync now action.
- Offline-to-online recovery is not only a service test: opening the screen that reads sync drains
  whatever is due, so the behaviour exists in the app rather than only in the suite.
- The auth service deliberately does not import the Google provider module, so its tests never touch the
  OAuth libraries; the provider arrives as a parameter and the screen supplies the real one.

### Verification evidence
| Command (from `mobile/`) | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npx eslint .` | PASS — 0 errors, 0 warnings |
| `npx prettier --check .` | PASS |
| `npx jest` | PASS — 45 suites, 662 tests |
| `npx expo export --platform android` | PASS — Hermes bundle emitted |

### Next session starts at
Phase 14 — Notifications: the permission request, the reminder schedule on study days at the learner's
chosen time, the denied-permission state, and rescheduling whenever the preference changes.
