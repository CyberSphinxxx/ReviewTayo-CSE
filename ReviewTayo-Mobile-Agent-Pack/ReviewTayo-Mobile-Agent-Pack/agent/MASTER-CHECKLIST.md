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
- [x] review scheduler. *(`src/domain/review/schedule.ts`: the exam's own `gotItIntervalDays` ladder
  indexed by mastery, `againIntervalDays` for a lapse, a counted lapse and a counted review, and
  every due date computed from a passed-in clock. The answer writer in `services/practice` now uses
  the same function, so an answer and a card said "Got it" to move one due date, not two (D-039).)*
- [x] due queue. *(`loadReviewQueue` reads what is due oldest first, capped by the exam's
  `dailyDueLimit`, and says how many were due in total so the screen can admit to the remainder.)*
- [x] Again. *(a lapse: the interval goes back to `againIntervalDays`, the lapse count rises and the
  card leaves the deck — the schedule already knows when to bring it back, so repeating it in the
  same session would record two lapses for one honest look at it.)*
- [x] Got It. *(the interval the concept's mastery has earned: `gotItIntervalDays[level]`, with the
  review count raised and `lastReviewedAt` set. Mastery itself is not credited — a flashcard proves
  you can read a definition, not that you can answer a question about it (D-040).)*
- [x] mistakes. *(`/review-list?kind=mistakes`: every concept-level item an answer created, with its
  subject, when it returns and how many times it has been missed.)*
- [x] saved. *(`/review-list?kind=saved`: the questions bookmarked from the quiz header, each with
  the answer and the content's own explanation, and a link to the concept behind it.)*
- [x] concepts to revisit. *(`revisitConcepts` reads mastery evidence rather than the queue: started
  concepts still below `Strong`, weakest first, inside the learner's own track. Untouched material
  is Learn's, and a concept nobody has answered is not something to "revisit".)*
- [x] history. *(`buildReviewHistory`: the distinct concepts reviewed in the last seven days, newest
  first, read from each item's own `lastReviewedAt` so nothing new had to be stored for it.)*
- [x] caught-up state. *("You're caught up." with the resting owl, and no number to react to: the
  screen says it once instead of drawing an empty queue.)*
- [x] tab due badge. *(the Review tab's badge, Home's Review Due line, the deck's size and the
  screen's own number are all read from the same queue — asserted together in
  `tests/app/review-screen.test.tsx`.)*
- [x] Review tests. *(`tests/domain/review.test.ts` — 19 cases (the ladder, lapses, due-date wording,
  deck, revisit ordering, history window); `tests/services/review.test.ts` — 13 cases (queue, cap,
  grading, the shared schedule, the four lists); `tests/app/review-screen.test.tsx` — 15 cases over
  the real router and a seeded database. Device captures are tracked in VISUAL-QA.md.)*

## Phase 11 — Progress
- [x] Study Score. *(`domain/progress/score.ts`: 0–100 from three answer-derived ingredients —
  accuracy, how much of the syllabus was touched, and how many of the week's days had work in them —
  with the exam's own answers as the only input. It is explicitly not a pass probability, and the
  same arithmetic run over any seven-day window gives the trend and the six-week curve without
  storing anything (D-043).)*
- [x] Needs Attention. *(`domain/progress/needs-attention.ts` reuses Practice's own `weakestSubject`
  over the same `weakestAreaMinimumAttempts` rule, so Progress names the subject Practice would have
  offered; `null` rather than a guess for a learner without that many answers, and the section is then
  absent (D-044). Its single action starts `weakest-area` filtered to that subject.)*
- [x] subject accuracy. *(`services/progress.ts` maps Learn's own `subjectProgressRows`, so the
  accuracy bar on Progress and the accuracy bar on Learn can never disagree; each row opens that
  subject's concepts.)*
- [x] concept mastery. *(`domain/progress/mastery.ts`: the track's whole syllabus, least mastered
  first — an unanswered concept leads, because not knowing something is the largest gap — with level,
  accuracy and attempts behind each row, plus a summary counting `Strong` and above as solid. The
  drill-down is `/progress-list` (one row opens `/concept`), and mastery is still answer-derived
  (D-045).)*
- [x] CSE Journey. *(`domain/progress/journey.ts` walks the exam's own `journeyPhases` in presentation
  order and marks done / current / upcoming from `resolveExamPhase`; a phase list is content, so an
  exam with three phases or seven gets a correct timeline, and no exam date places nobody rather than
  guessing.)*
- [x] weekly goal/activity. *(`domain/progress/week.ts`: Monday-first bars of the learner's own
  activity against their daily goal, the days ahead marked as ahead rather than missed, and a weekly
  target of `dailyGoal × chosen study days` (D-046) with the planned days flagged in each bar's own
  label.)*
- [x] recent mock. *(`domain/progress/mock.ts` reports the newest completed mock from its stored
  session — an unfinished or expired attempt is not a result, and belongs to Home's resume card — and
  the row falls back to "No mock exam yet" opening `/mock` rather than showing a score that does not
  exist.)*
- [x] Progress tests. *(`tests/domain/progress.test.ts` — 31 cases (the score's three ingredients,
  window edges, the series, all four trend directions, needs-attention emptiness, mastery ordering
  and summary, the journey at four horizons and with no date, the week's bars and goal, the mock row);
  `tests/services/progress.test.ts` — 11 cases over a real database and real answers (the empty
  learner, the score moving, subject accuracy, the weakest subject, mastery summaries, the weekly
  target, the journey, the mock row, the concept list and its track scoping);
  `tests/app/progress-screen.test.tsx` — 12 cases over the real router (every section, the reload on
  focus, needs-attention appearing only once it can be honest, the drill it starts, both mastery
  lists, the week, the journey, both mock states, and the dark theme). Device captures are tracked in
  VISUAL-QA.md.)*

## Phase 12 — Mock Exam
- [x] mock setup. *(`services/mock.ts` `loadMockSetup` composes the exam's own `summarizeMock`
  (the blueprint's item count and duration), the plan's per-section allocation and the named sections
  this build can actually serve; `features/mock/mock-sections.tsx` `MockSetupView` shows the facts,
  the sections with requested-vs-planned counts and, when the bank cannot fill the blueprint, the
  shortfall said plainly — `This build can serve 72 of the 170 items this paper asks for.` Nothing on
  the setup screen is hardcoded to CSE: the numbers all come from the exam's own files.)*
- [x] Professional blueprint. *(`app/mock.tsx` reads the profile's `trackId` (defaulting to the
  exam's `defaultTrackId`) and every number flows from `resolveBlueprint`/`resolveTiming`; the
  Professional paper is the exam's own 170 items over 190 minutes because that is what
  `content/exams/cse` declares, not because the screen knows it.)*
- [x] Sub-Pro blueprint. *(`tests/domain/mock.test.ts` and `tests/services/mock.test.ts` both build
  their papers from the Sub-Professional track and assert its own section order and scoring, so the
  one engine serves both tracks; switching tracks changes only the resolved blueprint.)*
- [x] timer. *(`domain/mock/progress.ts` `remainingSeconds`/`isExpired` read the session's stored
  `expiresAt` (or, when paused, the stored remainder) rather than counting down, exactly as timed
  practice does (D-038). `startMock` sets `expiresAt = now + resolveTiming(exam, trackId).totalMinutes`;
  the runner's one-second interval re-derives the remainder from that deadline and submits the paper
  the moment it reaches zero — closing the app, backgrounding it or a throttled timer cannot lengthen
  the examination, and time running out is a result rather than a crash (D-049).)*
- [x] answer persistence. *(`answerMockItem` writes only the paper's own item row (`chosenChoiceId`,
  `isCorrect`, `answeredAt`) and refreshes the session's counts, so changing an answer is free and an
  abandoned paper leaves the learner untouched; `features/mock/use-mock-runner.ts` shows the choice
  immediately and persists behind it. `repositories.mock.saveItem`/`listItems` and the new
  `expires_at` column carry it through SQLite.)*
- [x] pause/resume. *(`pauseMock` stops the clock and stores what was left (`status: 'paused'`,
  `pausedAt`, `remainingSeconds`); `resumeMock` restarts from that remainder with a fresh deadline, so
  a paused paper does not run while the learner is away. The runner hides the questions behind a
  `paused` panel while stopped, and a resumed paper opens at `firstUnansweredIndex`.)*
- [x] mark/review behavior decision. *(`domain/mock` never exposes correctness: `answerMockItem`
  stores `isCorrect`, but the runner's `choose` shows only that a choice was taken, and the flag is a
  navigation aid (`flagMockItem`/`describeMockFlagged`) — a grid of every question with answered/marked
  state to jump by. A mock is the one place the learner is not told until the end (D-048).)*
- [x] submission. *(`submitMock` replays every answered item through the *same* `submitAnswer` practice
  uses, with `source: 'mock'` and the mock's own `sessionId`, so mastery, the review queue, the streak
  and the day's activity all see the paper (D-047); an item already recorded is skipped, which makes
  submitting twice a no-op. The session is then closed `completed`, or `expired` when the clock ran
  out, and `loadMockResult` builds the result from the stored items.)*
- [x] result score. *(`domain/mock/result.ts` `buildMockResult` scores the paper out of the items it
  actually holds, with unanswered counting wrong, and reports the exam's own passing mark as context —
  `Passing mark 80%` — never as a verdict (D-050). `describeMockSkipped` names what was left out
  (`1 skipped · 1 wrong`).)*
- [x] subject breakdown. *(`subjectResults` walks the exam's `sectionsForTrack` order, so the learner
  sees the sections they will actually sit, each with its own total, answered, correct and percent, and
  the weakest section that had answers is marked for the recommendation. Sections with no items are
  omitted rather than shown as zero.)*
- [x] recommended next plan. *(`recommendationFor` returns one of four honest next steps in order — a
  paper cut short is worth re-sitting (`retake`), a section under the exam's own `needsAttentionAccuracy`
  names itself (`weakest-area`, carrying its `subjectId`), a paper with misses goes to Review
  (`review`), and a clean paper is a reason to keep going (`progress`). `app/mock.tsx` wires each kind
  to the route that does it, and a retake starts a fresh paper.)*
- [x] tests. *(`tests/domain/mock.test.ts` — 13 cases (answers/correct/flagged counts, where a resumed
  paper opens, the progress and flag lines, the clock against a deadline, a paused remainder, expiry
  and clamping, low time, the rough line, scoring with skips, section order and the weakest mark, and
  all four recommendations); `tests/services/mock.test.ts` — 11 cases over a real database and the real
  bank (setup and its shortfall, starting a paper, empty bank, answering and changing an answer, flags,
  pause/resume, expiry without loss, the idempotent submission through the answer writer, the result,
  and mastery moving); `tests/app/mock-screen.test.tsx` — 9 cases over the real router (setup, the
  shortfall, starting, answering without feedback, marking, leaving to Home and resuming, submitting
  with a summary, the result and its recommendation action, and an expired paper submitted on the way
  in). Device captures are tracked in VISUAL-QA.md.)*

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
