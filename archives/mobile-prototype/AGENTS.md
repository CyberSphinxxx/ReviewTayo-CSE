# AGENTS.md

## Product

ReviewTayo: CSE is a mobile-first Philippine Civil Service Exam study companion.

## Non-negotiable UX Principle

Reduce decision fatigue using progressive disclosure and strong defaults:
> ReviewTayo should decide what the learner should do next whenever possible.

When the learner is unsure, ReviewTayo should recommend the next useful study action rather than expose configuration.

## Navigation Contract

Current top-level tabs:
1. **Today** — What should I study right now?
2. **Study** — Teach me something.
3. **Practice** — Test what I know.
4. **Progress** — Show me what needs improvement.

Do not add a fifth bottom tab. Profile and exam settings live behind the top-bar button.

## Main Journey (V4)

Open app
→ Today ("43 days to exam" · "Accuracy Phase")
→ Recommended Smart Drill (Dominant CTA)
→ Adaptive Questions (Difficulty tracking)
→ Incorrect Answer → Contextual Explanation with Concept Mastery + "Try another like this" + "✨ Explain simply"
→ Correct Answer → Immediate reinforcement
→ Complete Session → One clear recommended next action
→ Spaced Review / Review Due (Again / Got it confidence feedback)
→ Finish Today's Plan → Today screen transforms to "Done For Today" state with resting/celebrating owl
→ Progress Tab → CSE Journey timeline, Weekly Goal, Subject Accuracy & Concept Mastery accordion, Mock result 7-day action plan

## Visual Contract

- Dark maroon ReviewTayo primary identity (`#721D34`)
- Warm cream/off-white background surfaces (`#FFF9F5`)
- Clean white cards with thin warm borders
- Owl mascot with contextual expressions (`neutral`, `happy`, `thinking`, `concerned`, `celebrating`, `resting`)
- Editorial serif display headings with clear UI sans-serif body text
- One dominant CTA per decision region
- Advanced options behind progressive disclosure
- Calm educational tone; no gamification fluff (no XP, coins, hearts, leagues, loot boxes)

## Code Ownership

- Shared design tokens → `css/tokens.css`
- Global shell & base styles → `css/foundation.css`
- Reusable UI & modal interactions → `css/components/interactions.css`, `navigation.css`
- Screen layouts → `css/screens/` (`today.css`, `study.css`, `practice.css`, `progress.css`)
- Mock content fixtures → `js/data/` (`questions.js`, `concepts.js`, `review-due.js`, `study-plan.js`, `journey.js`, `mock-results.js`)
- In-memory application state → `js/state/store.js`
- Generic UI primitives → `js/ui/` (`overlays.js`, `toast.js`)
- Feature logic → `js/features/`
- Startup wiring only → `js/app.js`

## Prototype Constraints

- HTML, Vanilla CSS, Vanilla JavaScript only.
- No build step, no npm runtime dependencies.
- `index.html` must work when opened directly in any browser.
- Dialog semantics (`role="dialog"`, `aria-modal="true"`) and Escape-to-close behavior must be preserved.
- Respect `prefers-reduced-motion`.
