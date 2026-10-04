# Definition of Done

The mobile app is complete only when every required item below is checked or explicitly marked as an external blocker.

## Repository / source
- [ ] `/mobile` is integrated cleanly into the existing repository.
- [ ] npm install is reproducible from lockfile.
- [ ] formatter passes.
- [ ] ESLint passes.
- [ ] strict TypeScript passes.
- [ ] no known architecture-boundary violations.
- [ ] no committed secrets.
- [ ] no unresolved internal blockers.

## App foundation
- [ ] Expo + React Native + TypeScript configured.
- [ ] Expo Router configured.
- [ ] Android package/application id is `com.reviewtayo.cse`.
- [ ] iOS bundle identifier is configured consistently.
- [ ] light/dark/device theme works.
- [ ] global error boundary exists.
- [ ] safe-area handling works.
- [ ] text scaling is supported.

## Navigation
- [ ] Learn tab.
- [ ] Practice tab.
- [ ] centered Home tab.
- [ ] Review tab.
- [ ] Progress tab.
- [ ] Settings route.
- [ ] Quiz route.
- [ ] Mock exam route.
- [ ] onboarding route.
- [ ] deep/navigation state behaves correctly after process restart where required.

## Onboarding
- [ ] Guest path.
- [ ] Google auth architecture/path.
- [ ] Professional/Sub-Professional selection.
- [ ] starting point.
- [ ] optional target exam date.
- [ ] study days.
- [ ] optional session length.
- [ ] daily question goal.
- [ ] generated plan summary/edit.
- [ ] appearance preference.
- [ ] text size preference.
- [ ] reminders.
- [ ] completion screen.
- [ ] rerun onboarding from Settings for prototype/debug builds.
- [ ] onboarding state persists correctly.

## Home
- [ ] exam phase/countdown.
- [ ] Smart Drill recommendation.
- [ ] Daily Question.
- [ ] daily plan.
- [ ] Review Due link.
- [ ] streak.
- [ ] resume interrupted mock/quiz when applicable.
- [ ] Done For Today state.

## Learn
- [ ] Continue Learning.
- [ ] Quick Sheets.
- [ ] Subjects.
- [ ] Study Guides/reference content.
- [ ] Professional/Sub-Professional subject differences.

## Practice
- [ ] Smart Drill.
- [ ] Weakest Area.
- [ ] Timed Practice.
- [ ] Mock Exam.
- [ ] Practice by Subject.
- [ ] More Practice.
- [ ] Random set.
- [ ] Build a Quiz.
- [ ] Mastery Rounds.
- [ ] practice modes preserve progressive disclosure.

## Quiz
- [ ] answer selection.
- [ ] check answer.
- [ ] correct/incorrect states.
- [ ] concise explanation.
- [ ] concept mastery status.
- [ ] Try Another Like This.
- [ ] Review Concept.
- [ ] save/bookmark.
- [ ] pause/resume.
- [ ] session result.
- [ ] recommended next action.
- [ ] timed session handling.
- [ ] interruption recovery.

## Review
- [ ] Review Due queue.
- [ ] Again / Got It flow.
- [ ] mistakes.
- [ ] saved questions.
- [ ] concepts to revisit.
- [ ] review history.
- [ ] empty/caught-up state.
- [ ] review scheduling persists offline.

## Progress
- [ ] Study Score.
- [ ] Needs Attention.
- [ ] subject accuracy.
- [ ] concept mastery drill-down.
- [ ] CSE Journey.
- [ ] weekly activity/goal.
- [ ] recent mock result.
- [ ] no claim of pass probability.

## Mock Exam
- [ ] Professional blueprint supported.
- [ ] Sub-Professional blueprint supported.
- [ ] timed session.
- [ ] answer persistence.
- [ ] mark/review if in scope of final design.
- [ ] pause/resume behavior defined.
- [ ] result summary.
- [ ] subject breakdown.
- [ ] next-study-plan recommendation.

## CSE
- [ ] Professional track.
- [ ] Sub-Professional track.
- [ ] Analytical vs Clerical switch.
- [ ] timing/blueprint from CSE config, not UI hardcoding.
- [ ] validation tests for CSE exam config.

## Multi-exam architecture
- [ ] ExamRuleConfig implemented.
- [ ] ExamRegistry implemented.
- [ ] generic subject/concept/question contracts.
- [ ] generic quiz engine.
- [ ] generic review/mastery input contracts.
- [ ] generic mock blueprint.
- [ ] content versioning.
- [ ] exam validation tooling.
- [ ] `ADDING-A-NEW-EXAM.md` verified against a fixture/sample second exam.
- [ ] no inappropriate CSE branching in generic services.

## Persistence / offline
- [ ] SQLite initialized.
- [ ] migrations implemented.
- [ ] repositories implemented.
- [ ] core study works offline after content is available.
- [ ] progress survives app restart.
- [ ] interrupted quiz survives restart when required.
- [ ] interrupted mock survives restart.
- [ ] offline outbox exists for syncable events.
- [ ] migrations are covered by tests.

## Auth / sync
- [ ] Guest identity model.
- [ ] Google provider boundary.
- [ ] secure token storage.
- [ ] backend integration uses existing ReviewTayo APIs/contracts when available.
- [ ] sync outbox/retry.
- [ ] idempotency strategy.
- [ ] conflict strategy documented and implemented for supported entities.
- [ ] sync failures never block local studying.

## Notifications
- [ ] real local reminder scheduling.
- [ ] reminder preferences.
- [ ] study-day selection respected.
- [ ] reminder time respected.
- [ ] permission requested at point of value.
- [ ] permission denied state handled.

## Quality
- [ ] loading states.
- [ ] empty states.
- [ ] recoverable error states.
- [ ] offline states.
- [ ] fatal error handling.
- [ ] accessibility basics verified.
- [ ] performance audit completed.
- [ ] security audit completed.
- [ ] visual QA against references completed.

## Automated tests
- [ ] domain unit tests.
- [ ] component tests.
- [ ] repository/database tests.
- [ ] feature integration tests.
- [ ] migration tests.
- [ ] offline tests.
- [ ] sync merge/idempotency tests.
- [ ] E2E core journey.
- [ ] E2E Sub-Professional journey.
- [ ] E2E review journey.
- [ ] E2E mock journey.
- [ ] regression suite green.

## Release
- [ ] development build works on Android.
- [ ] production Android build path verified.
- [ ] iOS project/config is build-ready.
- [ ] icons/splash configured.
- [ ] permissions audited.
- [ ] environment variables documented.
- [ ] build profiles documented.
- [ ] release checklist complete.
- [ ] store listing preparation documented.
