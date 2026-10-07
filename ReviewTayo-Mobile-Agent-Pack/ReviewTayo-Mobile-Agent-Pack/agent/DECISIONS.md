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

## D-019 — The appearance vocabulary lives in the domain
`device|light|dark` and `standard|large|extra` are product vocabulary: onboarding collects them,
settings edits them, the theme resolves them and the database stores them. They live in
`src/domain/preferences.ts` and every other layer re-exports them, so the four layers cannot drift
into four slightly different string sets. `src/theme/tokens.ts` keeps its presentation concerns
(labels, scale, options) but no longer owns the vocabulary.

## D-020 — Preference parsing never throws on an untrusted row
`toThemePreference` / `toTextSizePreference` / `parseStudyDays` accept `unknown`, coerce values an
older build could have written and fall back otherwise, instead of assuming the stored shape. A row
written by a bad build, a partial import or a hand-edited database must degrade a single preference,
never take the first screen of the app down. `extra-large` is kept as an alias of `extra` so a rename
can never silently reset a learner's choice.

## D-021 — Appearance hydrates before the first paint
`AppearanceBootstrap` reads the stored theme and text size before mounting the themed tree, and
returns nothing until the read settles. A launch that paints the default theme and then jumps to the
learner's is a visible defect that no screen test would catch, so the bootstrap is verified by
recording every appearance value the tree ever observes. A failed read falls back to defaults:
appearance is a preference, not a prerequisite for launching.

## D-022 — Onboarding commits once, in one transaction
The flow edits an ephemeral draft and writes nothing until the learner finishes; the commit writes
profile, settings and the generated weekly plan in a single transaction. A partially onboarded
install — a profile that says "done" with no plan, or a plan for no profile — cannot exist, which is
also what lets the bootstrap gate trust a single field (`onboardingCompletedAt`).

## D-023 — A same-week rerun replaces that week's plan in place
The schema keeps one plan per exam per week (`UNIQUE (exam_id, week_start)`). Rerunning onboarding
inside the same week therefore reuses that plan's id and replaces its tasks wholesale (delete then
insert), keeping the original `createdAt`. The learner is already following that plan; creating a
second one for the same week is how a schedule silently splits in two.

## D-024 — Settings saves immediately; plan edits delegate to onboarding
Appearance and reminders persist the moment they change, while every plan row reopens the onboarding
flow in edit mode at the step that owns the field. There is exactly one definition of a valid plan
(the flow's own validation), and settings never grows a second, weaker copy of it.

## D-025 — Edit-mode onboarding falls back to Home without history
Edit mode usually returns to Settings with `router.back()`, but deep links and notification opens
arrive without history, and dispatching an unhandled `GO_BACK` strands the learner inside the flow.
The exit checks `router.canGoBack()` and otherwise replaces to Home.

## D-026 — Home derives everything and stores nothing
Every line on Home is computed from committed state: the phase from the profile's exam
date, the drill size from the daily goal capped by the exam policy, the due count from
the review queue, today's work from the active plan and today's activity. Nothing on
Home is cached, and nothing new is persisted for it. That is why the screen reloads on
focus: a drill finished on the Practice tab must change what Home says, without Home
holding a copy of it.

## D-027 — A streak is measured in answered questions, and today may be empty
The streak counts consecutive local days with at least one answered question, read from
study activity rather than from app opens. Today is allowed to be empty: the walk starts
at yesterday when today has nothing yet, so an evening studier does not watch their
streak reset every morning. Only a whole missed day breaks it.

## D-028 — Resume dismissal is session-only until the mock phase
The resume card can be dismissed, and the dismissal lives in the screen's own state: it
is not written to the profile or the plan. Persisting a dismissal needs a field that
says *which* session was dismissed and until when, and the session it refers to (a mock
that is paused or expired) is Phase 12's to define. Writing half of that now would leave
a preference that outlives the session it was about.

## D-029 — Mastery is derived from answer evidence, and quantised before it is compared
A concept's level comes from the correct and wrong counts stored against it, never from the stored
`level` column, which is treated as a cache. The exam's own `MasteryPolicy` supplies the increments
and the band boundaries, a confidence ramp based on an evidence floor of five answers keeps one
lucky answer from reading as mastery, and the score is quantised to three decimals before a
threshold decides anything — without that step `2/3 × 0.6` lands one ulp under `0.4` and a concept
sits a whole level lower for no reason a learner could ever explain. `src/domain/exams/mastery.ts`
is the only place that maps evidence to a level, so Learn, Progress and Review cannot disagree.

## D-030 — Reference content is generated from concepts, not written twice
Quick Sheets and Study Guides are built from the exam's own concepts: a quick sheet is a subject's
first concept and a guide is its concepts in order with their summaries. This means a new exam has
reference material the moment its content validates, and no reference text can drift away from the
questions it explains. The concept page and the guide are routes (`/concept`, `/guide`) rather than
overlays, so Android back, deep links and text-size changes behave natively.

## D-031 — Learn's subject bar is accuracy; mastery is the line underneath
The Subjects list measures what practice actually moves, so the bar is the learner's accuracy over
that subject's real answers, and the line under it names how many of the subject's concepts are
mastered. Learning strength is the more flattering number to show, but it moves for reasons a
learner cannot see; accuracy is the one they can act on.

## D-032 — Continue Learning never recommends a lesson already mastered
The row resumes the concept that is started and not yet mastered, most recently answered first, so
closing the app mid-topic lands back on the same topic. With no history it points at the first
lesson still to be mastered and labels it `Start here` rather than `Continue learning`, and when
every lesson in the track is mastered the row disappears instead of repeating finished work.

## D-033 — Correctness is decided by the service, from the question itself
`submitAnswer` takes the chosen choice and works out whether it was right; it never accepts an
`isCorrect` flag from a caller. The screen therefore cannot record a wrong answer as right — not by
a bug, not by a stale session, not by a hand-crafted route — and every consumer of an answer (Home's
streak, Progress's accuracy, the review queue, mastery) inherits that guarantee for free.

## D-034 — One submitted answer is one transaction
Recording an answer touches six things that must agree: the answer row, mastery for every concept it
touched, the review schedule, today's activity, the planned task it counts towards, and the session's
own score. They are written inside a single transaction. A crash between them would otherwise leave
mastery that no answer explains or a plan that never notices work the learner actually did, and no
later screen could tell which half happened.

## D-035 — The drill's ranking stays a ranking
`weightConcepts` scores every concept and the drill takes the top of that list, but the score, the
weights and the reasons behind a pick are never sent to the screen. Exposing them would invite the
learner to game a number instead of practising, and it would turn the exam's own policy into a
promise to the learner about their future questions. The catalogue says what a drill is, never why
this question was chosen.

## D-036 — Practice omits a mode it cannot honestly offer
The catalogue only contains actions the learner's own data supports: no Weakest Area until some
subject has `weakestAreaMinimumAttempts` answers, no Timed Practice when the policy does not support
it, and a filter that would name every concept in the track is dropped rather than sent. A row that
appears and then apologises is worse than a row that was never there, and the same rule is why the
Smart Drill card is the only dominant action on the screen.

## D-037 — "Try another like this" is offered only when the follow-up exists
The button is shown after a miss only when `hasSimilarQuestion` has already built the plan it would
start, so pressing it can never land on an empty session. The follow-up prefers the missed question's
own related group and falls back to its concept, and it always excludes the question the learner just
saw — being asked the same question twice is not practice, it is a repeat.

## D-038 — A timed session runs on a deadline, and expiring finishes it
Timed Practice stores the session's deadline and ticks once a second against it rather than counting
down a local variable, so a backgrounded app, a slow frame or a throttled timer cannot make the
session longer than the exam's own rules allow. When the clock reaches zero the session is finished
with what was answered: time running out is a result, not a reason to throw the work away.
