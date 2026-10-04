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
- [ ] Bottom nav. *(Phase 5)*
- [x] Owl/brand component.
- [x] accessibility defaults.
- [ ] responsive/small-device checks. *(needs a device/emulator pass — tracked in VISUAL-QA.md)*

## Phase 3 — Exam core
- [ ] ExamRuleConfig.
- [ ] ExamRegistry.
- [ ] ExamTrack.
- [ ] SubjectDefinition.
- [ ] ConceptDefinition.
- [ ] Question contract.
- [ ] ExamBlueprint.
- [ ] TimingRules.
- [ ] ScoringRules.
- [ ] StudyPolicy.
- [ ] config validation.
- [ ] content manifest/versioning.
- [ ] CSE Professional config.
- [ ] CSE Sub-Professional config.
- [ ] exam fixture for second-exam validation.
- [ ] generic engine tests.

## Phase 4 — Data / offline
- [ ] SQLite bootstrap.
- [ ] migration framework.
- [ ] repository interfaces.
- [ ] local repositories.
- [ ] question/content import.
- [ ] user exam profile storage.
- [ ] practice session persistence.
- [ ] answer persistence.
- [ ] mastery persistence.
- [ ] review queue persistence.
- [ ] saved questions persistence.
- [ ] study plan persistence.
- [ ] mock persistence.
- [ ] sync outbox.
- [ ] database/migration tests.

## Phase 5 — Navigation shell
- [ ] five tabs.
- [ ] centered Home.
- [ ] route groups.
- [ ] settings route.
- [ ] quiz route.
- [ ] mock route.
- [ ] onboarding route.
- [ ] theme-aware nav.
- [ ] due-count badge.
- [ ] accessibility/keyboard/screen-reader labels.

## Phase 6 — Onboarding/settings
- [ ] onboarding shell/progress.
- [ ] Guest.
- [ ] Google auth architecture.
- [ ] CSE level.
- [ ] starting point.
- [ ] exam date.
- [ ] study days.
- [ ] session length.
- [ ] daily goal.
- [ ] generated plan.
- [ ] edit plan.
- [ ] appearance.
- [ ] text size.
- [ ] reminders.
- [ ] completion.
- [ ] settings integration.
- [ ] rerun onboarding in dev/prototype tools.
- [ ] onboarding tests.

## Phase 7 — Home
- [ ] Claude-inspired editorial home layout.
- [ ] light theme fidelity.
- [ ] dark theme fidelity.
- [ ] exam phase/countdown.
- [ ] Smart Drill CTA.
- [ ] Daily Question.
- [ ] daily plan.
- [ ] Review Due.
- [ ] streak.
- [ ] resume card.
- [ ] Done For Today.
- [ ] Home tests.

## Phase 8 — Learn
- [ ] Continue Learning.
- [ ] Quick Sheets.
- [ ] Subjects.
- [ ] Study Guides.
- [ ] subject track switching.
- [ ] Learn tests.

## Phase 9 — Practice + Quiz
- [ ] Smart Drill domain service.
- [ ] Weakest Area.
- [ ] Timed Practice.
- [ ] Random set.
- [ ] Build a Quiz.
- [ ] Mastery Rounds.
- [ ] Practice by Subject.
- [ ] Practice progressive disclosure.
- [ ] question screen.
- [ ] answer checking.
- [ ] explanations.
- [ ] mastery feedback.
- [ ] Try Another Like This.
- [ ] Review Concept.
- [ ] bookmark/save.
- [ ] pause/resume.
- [ ] results.
- [ ] recommended next action.
- [ ] tests.

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
