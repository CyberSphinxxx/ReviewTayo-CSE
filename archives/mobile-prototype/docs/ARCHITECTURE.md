# Prototype Architecture — ReviewTayo V4.1
## Simplification, Information Hierarchy, and Navigation Cleanup

## Goal

Keep the prototype fast to open directly via `index.html`, completely dependency-free, and easy for AI agents to edit while maintaining strict modular boundaries that can survive a future migration to React Native, Expo, Flutter, or another production stack.

## Architecture Principle: "Keep the intelligence. Hide the machinery."

All screens adhere to:
> **One primary action, two or three secondary actions, everything else behind progressive disclosure.**

## Dependency Direction

```text
index.html
   ↓
core + data + state
   ↓
UI utilities (overlays, toasts)
   ↓
features (navigation, journey, mastery, quiz, review-due, streak, etc.)
   ↓
app.js initialization
```

Feature files may read and modify `core`, `data`, `state`, and call `ui`.
`app.js` is strictly an initialization layer.

---

## Data Layer Responsibilities (`js/data/`)

- `questions.js`: Mock question bank with `tag`, `subjectKey`, `concept`, `conceptStatus`, `difficulty`, concise explanations (`e`), simplified AI analogies (`simplified`), step breakdowns (`steps`), real-world examples (`example`), and related question linkages (`relatedTo`).
- `concepts.js`: Granular concept mastery hierarchy for Professional and Sub-Professional tracks with statuses (`learning`, `developing`, `strong`, `mastered`).
- `review-due.js`: Spaced repetition queue definitions, categories, and flashcard prompt/answer pairs.
- `study-plan.js`: Metadata, estimated durations, and identifiers for the Today 3-step sequence.
- `journey.js`: Journey phase definitions (`foundation`, `accuracy`, `speed`, `mock_week`, `final_review`), day thresholds, and focus statements.
- `mock-results.js`: Simulated full-length mock scores, subject breakdowns, and mock-generated 7-day action plans.

---

## State Layer Responsibilities (`js/state/store.js`)

Single in-memory store (`window.ReviewTayo.state.store`) tracking:
- `activeTab`: Currently active bottom tab (`today`, `learn`, `practice`, `progress`).
- `exam`: Exam track (`professional` vs `subprofessional`), target exam date, and offline toggle.
- `journey`: Active journey phase ID and computed days remaining.
- `streak`: Current study streak, best streak, and `maintainedToday` flag.
- `dailyPlan`: Daily Question, Smart Drill, and Review Due completion flags.
- `weeklyGoal`: Pacing targets and completed counts for drills, review, and timed sprint.
- `continuity`: Mock cross-device activity status and progress string.
- `quiz`: Active quiz session state, current question index, score, difficulty level, and streak in drill.
- `reviewDueSession`: Active flashcard queue, current card, and revealed status.

---

## Feature Ownership (`js/features/`)

### `navigation.js`
Owns top-level 4-tab switching: `Today`, `Learn` (formerly Study), `Practice`, `Progress`. Maintains backward compatibility aliases and scroll reset.

### `journey.js`
Computes remaining days from target exam date, updates journey phase based on thresholds. Renders single-line phase indicator on Today hero (`Accuracy Phase · 43 days left`) and collapsed disclosure on Progress (`CSE Journey >`).

### `mastery.js`
Renders 4 high-level subject rows on Progress. Opens `#masteryOverlay` sheet one layer deeper when a subject is tapped. Wires `Needs attention` practice CTA.

### `review-due.js`
Controls the spaced review flashcard overlay. Manages card flip reveal and `[ Again ]` (re-queues card near end) / `[ Got it ]` (advances card) confidence feedback. Marks `reviewDue` complete on Today's plan.

### `streak.js`
Maintains the single-line compact study streak (`🔥 12 day streak`).

### `study-plan.js`
Tracks Today's 3-step sequence (`dailyQuestion`, `smartDrill`, `reviewDue`). Manages the quiet "Done For Today" hero transformation when all tasks are cleared.

### `owl.js`
Renders context-aware SVG mascot expressions (`neutral`, `happy`, `thinking`, `concerned`, `celebrating`, `resting`) at key emotional moments only.

### `mock-results.js`
Simulates full mock exam completion, renders the score breakdown modal and displays the generated 7-day action plan inside the collapsed Recent Mock disclosure.

### `quiz.js`
Drives interactive question sessions:
- Adaptive selection mix simulation (40% weak, 25% recent, 20% review-due, 10% maintenance, 5% random).
- Concise answer explanation (`Not quite`, correct answer, concise why, concept badge).
- Primary recovery button: `[ Try another like this ]` for in-place concept question swapping.
- Progressive disclosure AI explanation (`Still confused? Explain simply` drawer).
- Post-session single recommended next action.

### `review.js`
Manages the dedicated Review destination (`#reviewScreen`): Review Due top card, empty state transition when caught up, and grouped revisit rows (`Mistakes 23 >`, `Saved 8 >`, `Concepts to revisit 3 >`, `Review history >`). Updates `#reviewDueBadge` dynamically.

### `settings.js`
Manages CSE level toggling and target exam date updates with real-time propagation across journey and mastery features.

### `study.js` (aliased as `RT.features.learn`)
Connects Learn-tab tools (Continue Learning hero, collapsed `Subjects >`, `Quick Sheets >`, and collapsed `More learning resources >`).

### `practice.js`
Manages Practice screen hierarchy: dominant Smart Drill card, targeted testing rows (Weakest Area, Timed Practice), and collapsed disclosures (`More practice options >`, `Mock Exam >`, `Practice by subject >`).

### `navigation.js`
Owns top-level 5-tab switching: `Learn`, `Practice`, `Home` (center anchor), `Review`, `Progress`. Maintains backward compatibility aliases (`today` -> `home`, `study` -> `learn`) and scroll reset.

---

## Prototype → Production Mapping

- `css/tokens.css` → Design tokens / theme variables
- `css/components/` → Reusable UI components
- `css/screens/` → Screen layouts and views
- `js/data/` → API/Repository mock fixtures
- `js/state/store.js` → Production state store (e.g. Zustand, Redux, Pinia)
- `js/features/` → Feature controllers, services, or custom hooks
- `js/ui/` → UI primitives (modals, sheets, toast banners)
