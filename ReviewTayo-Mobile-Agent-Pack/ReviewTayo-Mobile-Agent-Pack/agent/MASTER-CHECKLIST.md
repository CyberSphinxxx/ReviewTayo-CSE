# Master Checklist

Status legend:
- `[ ]` pending
- `[x]` complete
- `[~]` in progress
- `[!]` externally blocked
- `[b]` internally blocked and must be revisited

## Phase 0 — Repository audit
- [x] Inspect existing repository layout.
- [x] Inspect existing web ReviewTayo exam architecture. *(audit: no web app exists — see PHASE-0-AUDIT.md)*
- [x] Inspect existing API/auth/sync contracts. *(audit: none exist; contract defined in ADR-003)*
- [x] Inspect current mobile/prototype folder if present.
- [x] Inventory reusable brand assets.
- [x] Inventory existing question/content format.
- [x] Record architecture decisions.
- [x] Establish `/mobile` integration plan.
- [x] Establish baseline test/build commands.

## Phase 1 — Mobile foundation
- [x] Bootstrap Expo + React Native + TypeScript.
- [x] Configure Expo Router.
- [x] Configure npm scripts.
- [x] Configure strict TypeScript.
- [x] Configure ESLint.
- [x] Configure formatter.
- [x] Configure test runner.
- [x] Configure environment handling.
- [x] Configure app identifiers.
- [x] Configure error boundary.
- [x] Establish src directory structure.

## Phase 2 — Design system
- [x] Design tokens.
- [x] Light theme.
- [x] Dark theme.
- [x] Device theme.
- [x] Typography system.
- [x] spacing/radius/shadow tokens.
- [x] base Button.
- [x] base Card/Surface.
- [x] ListRow.
- [x] Segmented control.
- [x] Badge.
- [x] Progress components.
- [x] Bottom nav. *(built in Phase 5)*
- [x] Owl/brand component.
- [x] accessibility defaults.
- [ ] responsive/small-device checks. *(needs a device/emulator pass — tracked in VISUAL-QA.md)*

## Phase 3 — Exam core
- [x] ExamRuleConfig.
- [x] ExamRegistry.
- [x] ExamTrack.
- [x] SubjectDefinition.
- [x] ConceptDefinition.
- [x] Question contract.
- [x] ExamBlueprint.
- [x] TimingRules.
- [x] ScoringRules.
- [x] StudyPolicy.
- [x] config validation.
- [x] content manifest/versioning.
- [x] CSE Professional config.
- [x] CSE Sub-Professional config.
- [x] exam fixture for second-exam validation.
- [x] generic engine tests.

## Phase 4 — Data / offline
- [x] SQLite bootstrap.
- [x] migration framework.
- [x] repository interfaces.
- [x] local repositories.
- [x] question/content import.
- [x] user exam profile storage.
- [x] practice session persistence.
- [x] answer persistence.
- [x] mastery persistence.
- [x] review queue persistence.
- [x] saved questions persistence.
- [x] study plan persistence.
- [x] mock persistence.
- [x] sync outbox.
- [x] database/migration tests.

## Phase 5 — Navigation shell
- [x] five tabs.
- [x] centered Home.
- [x] route groups.
- [x] settings route.
- [x] quiz route.
- [x] mock route.
- [x] onboarding route.
- [x] theme-aware nav.
- [x] due-count badge.
- [x] accessibility/keyboard/screen-reader labels. *(labels + badge verified by tests and
  router integration; a physical-device keyboard/screen-reader pass is tracked in VISUAL-QA.md)*

## Phase 6 — Onboarding/settings
- [x] onboarding shell/progress. *(`Step N of 8` eyebrow, progress bar and Back/Close from
  `RTScreenShell`; verified in `tests/app/onboarding-flow.test.tsx`)*
- [x] Guest. *(default choice; `account=google` shows the sync note, and the commit records the
  choice in the plan payload. The Google button stays inert until Phase 13 supplies real client
  IDs — see BLOCKERS.md)*
- [x] Google auth architecture. *(onboarding collects the intent and stores it; the OAuth client
  wiring is Phase 13. No credential is faked or hardcoded.)*
- [x] CSE level. *(`level` step; track list is read from the exam config, so Sub-Professional and
  Professional both work without CSE-specific code)*
- [x] starting point. *(`starting-point` step; optional exam date in the same step with
  `YYYY-MM-DD` parsing and a days-to-go countdown)*
- [x] exam date. *(normalises `2026/11/15`, validates real calendar dates, blocks past dates,
  and can be cleared)*
- [x] study days. *(`schedule` step; Monday-first grid, no-day selection is a valid "flexible"
  answer)*
- [x] session length. *(quick/regular/long in the `schedule` step, skipped with the same Skip
  button)*
- [x] daily goal. *(`goal` step; 5/10/20 presets plus a custom 5–50 field that clamps and
  reports out-of-range input inline)*
- [x] generated plan. *(`buildWeeklyPlan` in `src/domain/study-plan` turns the answers into a
  week of dated tasks; mock length comes from the blueprint, so a Sub-Professional mock is
  165 items and Professional 170)*
- [x] edit plan. *(Settings reopens the flow with `mode=edit&step=<id>`; a rerun inside the same
  week replaces that week's plan in place and keeps the original `createdAt`)*
- [x] appearance. *(device/light/dark from `src/domain/preferences` — one vocabulary shared by
  onboarding, settings, the theme and the stored row. Dark is previewed live and reverted if
  the flow is abandoned.)*
- [x] text size. *(standard/large/extra with a live sample line; a legacy `extra-large` row is
  coerced rather than reset)*
- [x] reminders. *(opt-in switch; enabling captures the device timezone and the default
  19:00 reminder time. Scheduling is Phase 14.)*
- [x] completion. *(summary badges, first activity, and the single atomic commit — profile,
  settings and plan in one transaction)*
- [x] settings integration. *(`app/settings.tsx` grouped by Account / Study plan / Appearance /
  Reminders / Offline content; appearance and reminders save immediately, plan rows reopen the
  flow at the step that owns the field)*
- [x] rerun onboarding in dev/prototype tools. *(`__DEV__`-only "Run onboarding again" row)*
- [x] onboarding tests. *(`tests/domain/onboarding.test.ts`, `tests/services/onboarding.test.ts`,
  `tests/app/onboarding-flow.test.tsx`, `tests/app/settings-flow.test.tsx`,
  `tests/app/first-run-gate.test.tsx`, `tests/store/appearance-bootstrap.test.tsx`)*

## Phase 7 — Home
- [x] Claude-inspired editorial home layout. *(full-bleed maroon hero with the owl, one recommendation,
  then the "Today" timeline — no dashboard clutter, and no algorithm details on screen)*
- [x] light theme fidelity. *(hero is the brand maroon on the warm cream canvas; asserted against the
  theme tokens rather than a screenshot)*
- [x] dark theme fidelity. *(dark keeps the same hero and inverse text over the near-black burgundy
  canvas — a separate system, not an inversion)*
- [x] exam phase/countdown. *(`resolveExamPhase` from the profile's exam date; with no date the phase
  stands alone as "Flexible Study" and no countdown is invented)*
- [x] Smart Drill CTA. *(one dominant gold action, sized by the learner's daily goal and capped by the
  exam's `drillSize`; routes to the quiz route with `mode=smart-drill`)*
- [x] Daily Question. *(one question, duration from `dailyQuestionMinutes`; shows Done once the day has
  been answered)*
- [x] daily plan. *(today's tasks from the active weekly plan, with a link to each kind's destination)*
- [x] Review Due. *(reads the same due count as the tab badge and caps the session at the exam's
  `dailyDueLimit`)*
- [x] streak. *(consecutive days with at least one answered question, read from study activity;
  survives a day that has not started yet and breaks only after a whole missed day)*
- [x] resume card. *(unfinished mock or practice session with real progress; dismissal is session-only —
  durable dismissal belongs with the mock phase, see D-028)*
- [x] Done For Today. *(derived: the day's plan is finished or the goal is met, and nothing is due;
  the hero switches to the approved completion copy and a banner confirms it)*
- [x] Home tests. *(`tests/domain/home.test.ts` — 26 cases; `tests/app/home-screen.test.tsx` — 11
  cases over the real router and a seeded database. Device captures are tracked in VISUAL-QA.md.)*

## Phase 8 — Learn
- [x] Continue Learning. *(the concept the learner is partway through, most recently answered first;
  a learner with no history is pointed at their track's first unmastered lesson and told it is a
  start, and a fully mastered track shows no row at all rather than repeating a finished lesson)*
- [x] Quick Sheets. *(one concept summary per subject in track order, labelled with its reading time
  and opening that concept's own reference page)*
- [x] Subjects. *(every subject of the learner's track with an accuracy bar, the concept count it is
  measured over and how many concepts are mastered; an untouched subject says "not started" instead
  of reporting a confident zero)*
- [x] Study Guides. *(generated from the pack's concepts rather than a second hand-written corpus: a
  subject's lessons in order with the mastery each has earned, and each concept's own page with its
  summary and tags — the `/guide` and `/concept` routes)*
- [x] subject track switching. *(every list comes from `subjectsForTrack`, so Professional shows
  Analytical Ability while Sub-Professional shows Clerical Ability, with their own quick sheets,
  lesson counts and guide index; changing track in Settings changes Learn on its next focus)*
- [x] Learn tests. *(`tests/domain/mastery.test.ts` — 13 cases; `tests/domain/learn.test.ts` — 24
  cases; `tests/app/learn-screen.test.tsx` — 11 cases over the real router and a seeded database.
  Device captures are tracked in VISUAL-QA.md.)*

## Phase 9 — Practice + Quiz
- [x] Smart Drill domain service. *(`src/domain/practice/drill.ts` ranks every concept of the
  learner's track with the exam's own `SmartDrillWeights` — weakness, due review, unseen, low
  coverage, recent lesson — and `src/services/practice.ts` turns that ranking into a session through
  the same generic planner every other mode uses. The score is never sent to the screen: Practice
  offers a drill, not a league table.)*
- [x] Weakest Area. *(`weakestSubject` takes the lowest accuracy among the track's subjects that have
  at least `weakestAreaMinimumAttempts` answers; below that the row is absent rather than invented,
  and the row's meta line is the learner's real accuracy on that subject.)*
- [x] Timed Practice. *(`timedPracticeQuestionCount` / `timedPracticeMinutes` from the exam policy.
  The clock is a stored deadline plus a one-second tick, so a slow tick or a backgrounded app cannot
  borrow time, and a session whose clock runs out finishes with whatever was answered instead of
  discarding it.)*
- [x] Random set. *(`random-set` over the planner with no filter — any subject, any difficulty — and
  it is what the results screen widens to when there is nothing specific left to fix.)*
- [x] Build a Quiz. *(`/build-quiz`: subject chips built from the learner's own track (titles and
  question counts read from the bank, not hardcoded) and a 5/10/20 length control, then an ordinary
  session with `subjects=` supplied.)*
- [x] Mastery Rounds. *(`unmasteredConceptIds`: every concept of the track whose derived level is not
  `Mastered`, including ones never answered. When that is the whole track the filter is omitted —
  naming every concept in the URL would read as a narrowing that never happened.)*
- [x] Practice by Subject. *(`/subject-practice` lists the track's subjects with their real published
  question counts, in track order, and opens a drill per subject.)*
- [x] Practice progressive disclosure. *(one dominant Smart Drill, the two targeted rows that can be
  honestly offered, and everything else behind a single "More ways to practise" disclosure.)*
- [x] question screen. *(the `/quiz` route: one question at a time, segmented progress, the mode's
  own name in the eyebrow, a clock only for a mode that has one, and a close affordance that pauses
  rather than discards.)*
- [x] answer checking. *(the choices stop responding once one is picked, so a second press cannot
  replace the first answer — and correctness is decided inside `services/practice` from the question
  itself, never handed in by the caller.)*
- [x] explanations. *(the content's own explanation every time, plus the plainer restatement offered
  only after a miss; nothing is generated on the fly.)*
- [x] mastery feedback. *(`describeMasteryChange` names the concept's new level only when it moved;
  a concept that held still gets no line rather than a sentence describing arithmetic.)*
- [x] Try Another Like This. *(`hasSimilarQuestion` builds the follow-up plan first, so the button is
  only offered when a related question exists and can never lead to an empty session; the route
  starts a one-question `try-another-like-this` session that prefers the question's related group
  and falls back to its concept, and never asks the missed question straight back.)*
- [x] Review Concept. *(`/concept?conceptId=…` for the concept the miss landed on — the same reference
  page Learn opens, so there is one reading experience rather than two.)*
- [x] bookmark/save. *(the quiz header toggles a saved question for the question on screen and reads
  the state back from the database, so a bookmark made anywhere shows up here, and the row Review's
  saved list will read is written immediately.)*
- [x] pause/resume. *(closing pauses and leaves the session resumable; reopening it by `sessionId`
  restores the stored question order, the score so far, the clock's remainder and the first
  unanswered question. Home's resume card carries the session id, so it truly resumes.)*
- [x] results. *(the score, a summary that is not a judgement, the recommendation card, and both ways
  out — another session, or back to Practice.)*
- [x] recommended next action. *(`recommendNext` reads the score and the number of distinct concepts
  missed: a clean sheet widens to a mixed set, a rough set points at Review rather than deeper into
  the same material, and anything in between drills again.)*
- [x] tests. *(`tests/domain/practice.test.ts` — 24 cases (catalogue, ranking, weakest area, mastery
  rounds, feedback copy, recommendations); `tests/services/practice-session.test.ts` — 17 cases;
  `tests/app/practice-screen.test.tsx` — 10 cases; `tests/app/quiz-screen.test.tsx` — 13 cases over
  the real router and a seeded database. Device captures are tracked in VISUAL-QA.md.)*

## Phase 10 — Review
- [ ] review scheduler.
- [ ] due queue.
- [ ] Again.
- [ ] Got It.
- [ ] mistakes.
- [ ] saved.
- [ ] concepts to revisit.
- [ ] history.
- [ ] caught-up state.
- [ ] tab due badge.
- [ ] Review tests.

## Phase 11 — Progress
- [ ] Study Score.
- [ ] Needs Attention.
- [ ] subject accuracy.
- [ ] concept mastery.
- [ ] CSE Journey.
- [ ] weekly goal/activity.
- [ ] recent mock.
- [ ] Progress tests.

## Phase 12 — Mock Exam
- [ ] mock setup.
- [ ] Professional blueprint.
- [ ] Sub-Pro blueprint.
- [ ] timer.
- [ ] answer persistence.
- [ ] pause/resume.
- [ ] mark/review behavior decision.
- [ ] submission.
- [ ] result score.
- [ ] subject breakdown.
- [ ] recommended next plan.
- [ ] tests.

## Phase 13 — Auth/sync
- [ ] Guest identity.
- [ ] Google provider.
- [ ] secure credential storage.
- [ ] API client boundary.
- [ ] backend contract reuse.
- [ ] sync outbox worker.
- [ ] retry/backoff.
- [ ] idempotency.
- [ ] conflict policies.
- [ ] offline-to-online recovery.
- [ ] tests.

## Phase 14 — Notifications
- [ ] local notification permission.
- [ ] reminder schedule.
- [ ] study-day schedule.
- [ ] reminder time.
- [ ] denied permission state.
- [ ] rescheduling on preference changes.
- [ ] tests.

## Phase 15 — Hardening
- [ ] accessibility audit.
- [ ] large text audit.
- [ ] dark/light contrast audit.
- [ ] performance audit.
- [ ] SQLite index/query review.
- [ ] security audit.
- [ ] logging/privacy audit.
- [ ] dependency audit.
- [ ] loading/error/empty/offline audit.
- [ ] memory/startup review.

## Phase 16 — Full regression
- [ ] unit suite.
- [ ] component suite.
- [ ] integration suite.
- [ ] DB/migration suite.
- [ ] offline suite.
- [ ] sync suite.
- [ ] E2E onboarding.
- [ ] E2E Professional.
- [ ] E2E Sub-Professional.
- [ ] E2E Review.
- [ ] E2E Mock.
- [ ] visual QA.
- [ ] regression fixes complete.

## Phase 17 — Release readiness
- [ ] icons.
- [ ] splash.
- [ ] permissions.
- [ ] environment docs.
- [ ] development build.
- [ ] Android production build path.
- [ ] iOS-ready config.
- [ ] CI quality gates.
- [ ] release checklist.
- [ ] Play Store preparation docs.
- [ ] App Store preparation docs.
- [ ] final Definition of Done review.
