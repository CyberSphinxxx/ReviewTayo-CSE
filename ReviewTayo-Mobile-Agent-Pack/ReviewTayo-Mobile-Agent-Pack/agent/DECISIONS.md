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

## D-039 — One review schedule, written by the domain
The Again / Got it arithmetic moved out of `services/practice` into `src/domain/review/schedule.ts`,
and the answer writer now uses it too. There is one rule for when a concept comes back: a correct
answer in a drill and a card said "Got it" to in the deck move the same due date and take the same
rung of the exam's interval ladder. Two implementations would have drifted into a queue whose dates
depended on which screen the learner happened to be on.

## D-040 — A flashcard does not credit mastery
Grading a review card changes the schedule and nothing else. Mastery stays derived from answers
(D-029): recognising a concept's definition is proof that the learner can read it, not that they can
answer a question about it, and crediting mastery for a tap would inflate the one number Progress
and the Smart Drill both trust. The deck is a memory aid, not a second, softer exam.

## D-041 — Review is a deck, not another quiz
Review Due shows one card per due concept — the concept on the front, its own summary on the back —
rather than sending the learner back into four-option questions. A missed concept is one they have
already answered and got wrong, so the question worth asking is whether they still know it, and that
is a thing they answer about themselves. Both answers end the card's turn: "Again" is a statement
about the learner, not a command to ask the same card again in a minute, and the schedule it just
wrote is what brings it back.

## D-042 — The review queue belongs to the exam, not the track
The deck, the badge and Home's Review Due line all count the exam's due items, including concepts
from a track the learner has since switched away from. The queue is the record of what they got
wrong; changing which exam they are sitting does not make yesterday's mistakes irrelevant, and
filtering by track would silently leave due items that the badge kept counting. The one place the
track does matter is "concepts to revisit", which is about the material being studied right now.

## D-043 — The Study Score is a mark, not a forecast
Progress puts one number on "how am I doing?" out of 100, and it is built only from what the app can
see the learner do: the share of the window's answers that were right (weight 0.5), how much of the
track's syllabus the window touched (0.35), and how many of the window's seven days had work in them
(0.15). It is deliberately not a pass probability — the app has no calibrated model of the real
examination, and a number presented as one would be a claim nobody could stand behind. Because the
same arithmetic runs over any seven-day window, this week, last week and the six weeks behind them are
all computed from the answer history that already exists; nothing is stored to draw the trend.

## D-044 — Progress names the subject Practice would have offered
Needs Attention reads the same `weakestSubject` judgement Practice has used since Phase 9, over the
same subject accuracy and the same `weakestAreaMinimumAttempts` floor, and its one action starts the
same `weakest-area` drill filtered to that subject. Two screens naming different weakest areas from one
history would look like a bug in the learner's own record, and a learner without enough answers gets no
section at all rather than a subject picked from noise.

## D-045 — Concept mastery is listed least mastered first, unanswered concepts included
The drill-down behind Progress is the track's whole syllabus rather than only what has been answered: a
concept nobody has touched is the largest gap there is, so it leads the list, and an untouched concept
reads "Not answered yet" instead of a confident 0%. Ordering is the derived level, then accuracy, then
attempts, with the track's own order as the tie-break, so the list is stable between visits. Mastery
itself stays answer-derived (D-029) — a focus or a review card never moves it (D-040).

## D-046 — The weekly goal is the learner's own, and only exists if they set one
This week's target is `dailyGoal × the study days the learner chose during onboarding`, and the line
under the bars counts chosen days that actually had work in them ("3 of 5 study days"). No daily goal
means no target, and the section shows the week's activity without inventing a bar to fill. Days ahead
of today are drawn as ahead rather than as zeros, so a Wednesday is never presented as a missed day on
a Monday.

## D-047 — A mock counts through the same answer writer practice uses
While the paper is running, only the mock's own item rows are written: changing an answer is free and
an abandoned paper leaves no trace on the learner. On submission every answered item is replayed
through the one `submitAnswer` practice uses, tagged `source: 'mock'` and carrying the mock's own
session id, so mastery, the review queue, the streak and the day's activity all see the paper without a
second implementation of "an answer". That session id is also what makes submission idempotent: an item
this paper already recorded is skipped rather than counted twice, so a double submit, a retry after a
failure or an expired paper submitted on the way in all produce one result.

## D-048 — A mock reveals nothing until it is submitted
This is the mark/review decision the phase asked for. The runner never shows whether an answer was
right: the stored `isCorrect` is written but not read back, choices show only that one was taken, and
there is no feedback panel, because a simulation that grades as it goes stops being a simulation. The
flag is therefore a navigation aid, not a grading one — marked questions appear in the grid with their
answered state so the learner can jump back to them, and the header counts them (`3 marked for
review`). Nothing about this needs the exam to be CSE: the grid is the paper's own items and the flag
is one boolean.

## D-049 — The clock is a deadline, and an expired paper is still a result
Like timed practice (D-038), the runner re-derives the remaining time from the session's stored
`expiresAt` on every tick instead of counting down in a component, so a throttled timer, a backgrounded
app or a pause cannot buy the learner minutes the examination never gave. The moment the remainder
reaches zero the paper is submitted as it stands, with no confirmation step — there is nothing to
confirm, the time is gone. A paper left open past its deadline is submitted on the way in rather than
discarded: the attempt happened, its score is real, and Progress counts an `expired` session with a
`completedAt` as the learner's latest mock. Pausing is the one exception, and deliberately: it stops the
clock and stores the remainder, because a pause is the learner choosing not to sit the paper right now.

## D-050 — A paper is scored out of the items it holds, and unanswered counts wrong
A mock's score is `correct / total items on the paper` — the count `startMock` actually planned from the
bank, not the blueprint's requested figure — because a score out of items nobody could answer would be
a lie. Unanswered items count wrong, exactly as they will on the day, so a paper abandoned halfway
cannot read as a good score. The exam's own passing percentage is shown as context (`Passing mark 80%`)
and never as a verdict the app is entitled to give, and the result is derived from the stored items each
time rather than frozen into a payload, so the result screen and Progress's mock row can never disagree
about the same attempt (D-029).

## D-051 — A guest is a device, not a missing account
Guest is a complete state rather than a degraded one: on first launch the app generates a device id,
keeps it in the keystore, and attributes everything the learner does to it, so the same install is the
same device across launches and a future account can claim its work. Local study needs no account and
no network, which is what makes the offline-first promise true rather than aspirational. A device with
no keystore still works: the id becomes per-session and the app says `storageAvailable: false` in
Settings rather than silently forgetting.

## D-052 — Sync is a drain, not a daemon
There is no background thread, no polling loop and no busy-wait: a pass over the outbox happens when
something asks for one (opening the screen that reads sync), takes the events whose next attempt is
due, and stops. A pass can fail, and it fails as a value — a summary the screen may show — so a broken
network, a slow server or a bad response can never interrupt answering a question. Events that keep
failing are abandoned with their reason after a bounded number of attempts rather than retried for
ever, because an outbox that never empties is just a hidden memory leak.

## D-053 — An answer appends its sync event in the same transaction
Submitting an answer already writes the answer, mastery, the review schedule, today's activity and the
planned task in one transaction (D-034). The outbox event joins them: a crash between the answer and
its event would leave a fact the account never hears about, or a mastery row no answer explains. The
same rule applies to settings and to saved questions. The event is appended, never the master copy —
the app's truth stays local, and sync is how it travels.

## D-054 — Each kind of change has its own merge policy, and settings are intents
Answers are appended and deduplicated by id; mastery is never copied but recomputed from the answers
that are; saved questions merge as a set, where saving and unsaving are both intents with a timestamp
and the newest wins; settings are latest-intent-wins too, keyed by the instant the learner meant them
rather than by a per-device counter. An entity this build does not know is refused (`unsupported`)
rather than merged by a guess, and ties go to the local device because that is the learner's own
screen.

## D-055 — The transport is the only thing that talks to a network
`ApiTransport` is the app's single network boundary, and its default implementation is `LocalOnlyTransport`,
which reports offline instead of failing. That is what lets a build with no backend behave exactly like
a build with one: writes queue, the settings screen says `Saved on this device`, and turning sync on
later is a configured base URL rather than a feature flag. Every HTTP outcome — a timeout, a dead
socket, a 429, an unreadable body — is a typed `ApiFailure` with a `retryable` flag, so the worker's
decision is data rather than a caught exception.

## D-056 — Signing in does not depend on the backend
Obtaining the provider's id token and being recognised by the server are two steps, and only the first
is required to sign in. If a backend is reachable the token is exchanged for a server session and the
learner is told their progress syncs; if it is not, sign-in still succeeds, the account is stored in
the keystore, and the note says sync will retry. A sign-in that failed because the server was down
would be a lie about the learner's own account, and the outbox already knows how to wait.

## D-057 — Permission is asked only at the point of value
A notification permission dialog shown on a screen load, or on a first launch that has promised
nothing, is a toll booth: the learner taps Allow to make a thing go away, and has spent the one ask
before there is anything to allow. So permission is requested from exactly one action — the toggle
that turns reminders on — where a denial costs only the line it was hoping for. Every other path is
read-only: opening Settings reads the device's state and prints it (`needs-permission`, `denied`), and
a sync that was not asked for never prompts.

## D-058 — The schedule is rebuilt whole, and a denied device is reported, not nagged
Every reminder change cancels the notifications this app scheduled (`kind === 'study-reminder'`, and
nothing else) and rebuilds the plan from the stored preference and study days, rather than patching
individual handles — a changed day, time or toggle then cannot leave an old reminder behind, and the
device's list always equals what the screen says it is. A denied permission is a state with an honest
line ("Notifications are turned off for ReviewTayo in your device settings"), not a second request or
a silent no-op: the OS owns that decision, and the app's job is to say so plainly and keep working
offline without it.
