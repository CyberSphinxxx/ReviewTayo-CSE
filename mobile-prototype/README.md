# ReviewTayo: CSE — Mobile Prototype V4.2
## Five-Tab Navigation and Review Architecture

A dependency-free mobile prototype for **ReviewTayo: CSE**.

## Run

Double-click `index.html` and open it directly in any browser.

There is intentionally:
- no `npm install`
- no build step
- no framework
- no backend / database
- no local server requirement

This keeps iteration cheap and preserves a zero-build file architecture.

---

## Core Philosophy: "Keep the intelligence. Hide the machinery."

> **One primary action, two or three secondary actions, everything else behind progressive disclosure.**

Top-level navigation is built around five distinct learner intentions, with **Home centered as the primary anchor**:

1. **Learn** — Help me understand something.
2. **Practice** — Test what I know with new/practice questions.
3. **Home** — Tell me what I should do right now (Center Anchor).
4. **Review** — Help me revisit material I have already encountered.
5. **Progress** — Show me how I am doing.

---

## Feature Map & Hierarchy (V4.2)

```text
Learn (Answers: "Help me understand something")
├── Primary: Continue Learning (Sentence Completion · 6 min · [ Continue ])
├── Subjects > (Collapsed disclosure: Verbal, Numerical, Analytical/Clerical, General Info)
├── Quick Sheets > (Math shortcuts, grammar rules & Constitution)
└── More learning resources > (Optional collapsed disclosure: Formula cheat sheet, Constitution)

Practice (Answers: "Test what I know with practice questions")
├── Dominant: Smart Drill (10 personalized questions · [ Start ])
│   └── Subtle "How this drill was chosen" disclosure
├── Targeted Practice (Grouped 2 rows: Weakest area >, Timed practice 5m >)
├── More practice options > (Collapsed: Random 10, Build a Quiz, Mastery Rounds)
├── Mock Exam > (Single row: 170 items · 3h 10m >)
└── Practice by subject > (Collapsed subject list)

Home (Center Anchor — Answers: "What should I do right now?")
├── Single-line phase & countdown (Accuracy Phase · 44 days left)
├── Concise hero recommendation (10 questions ready · Verbal Ability focus)
├── Dominant Primary CTA: [ Start Smart Drill → ]
├── Compact Today's Plan (Grouped: Daily Question 1m, Smart Drill 10m, Review Due 6m)
├── Compact Streak (🔥 12 day streak)
├── Contextual Continuity (Only visible when resumable mock session exists)
└── Done For Today State (Quiet celebratory/resting hero when 3 tasks complete)

Review (Answers: "Help me revisit material I have already encountered")
├── Hero Card: Review Due (12 due today · ~6 min · [ Review now ])
│   └── Clean Empty State when caught up: "You're caught up. Nothing needs review right now. [ Browse saved questions ]"
├── Revisit Group:
│   ├── Mistakes (23 questions previously missed >)
│   ├── Saved (8 bookmarked items & questions >)
│   └── Concepts to revisit (3 flagged for active reinforcement >)
└── Secondary: Review history > (48 concepts completed this week)

Progress (Answers: "Show me how I am doing")
├── Study Score (72% ring + subtle ⓘ info disclaimer affordance)
├── Needs attention (Verbal Ability 64% · [ Practice ])
├── Subjects (4 visible clean rows: Verbal, Numerical, Analytical/Clerical, General Info)
│   └── Tap any subject → Concept Mastery drill-down sheet (One layer deeper)
├── CSE Journey > (Collapsed row: Accuracy Phase · 44 days left >)
├── This week > (Collapsed row: 74 questions · 4 study days >)
└── Recent mock > (Collapsed row: 82% · Last attempt >)
```

---

## Structure

```text
ReviewTayo-CSE-Prototype/
│
├── index.html
├── README.md
├── AGENTS.md
│
├── assets/
│   └── mascot/
│       ├── owl.svg
│       └── owl-mark.svg
│
├── css/
│   ├── tokens.css
│   ├── foundation.css
│   ├── components/
│   │   ├── interactions.css
│   │   └── navigation.css
│   └── screens/
│       ├── today.css
│       ├── learn.css
│       ├── practice.css
│       ├── review.css
│       └── progress.css
│
├── js/
│   ├── app.js
│   ├── core/
│   │   ├── namespace.js
│   │   └── dom.js
│   ├── data/
│   │   ├── questions.js
│   │   ├── concepts.js
│   │   ├── review-due.js
│   │   ├── study-plan.js
│   │   ├── journey.js
│   │   └── mock-results.js
│   ├── state/
│   │   └── store.js
│   ├── ui/
│   │   ├── overlays.js
│   │   └── toast.js
│   └── features/
│       ├── navigation.js
│       ├── journey.js
│       ├── streak.js
│       ├── study-plan.js
│       ├── review-due.js
│       ├── review.js
│       ├── mastery.js
│       ├── weekly-goal.js
│       ├── owl.js
│       ├── mock-results.js
│       ├── settings.js
│       ├── study.js
│       ├── practice.js
│       └── quiz.js
│
└── docs/
    ├── ARCHITECTURE.md
    ├── V4-CHECKLIST.md
    ├── V4.1-CHECKLIST.md
    └── V4.2-CHECKLIST.md
```

---

## Preserved Intelligent Capabilities

- **Smart Drill Engine**: Adaptive question weighting (weak concepts, recent lessons, spaced repetition, coverage).
- **Try Another Like This**: Instant question replacement on missed items for active recovery.
- **Contextual AI Simplifier**: Simplified explanations with progressive disclosure (Step-by-step and Examples).
- **Spaced Review Due Flashcards**: Rapid `[ Again ]` / `[ Got it ]` confidence routing.
- **Concept Mastery**: Deep skill status per concept (Learning, Developing, Strong, Mastered) housed one layer deeper.
- **CSE Journey**: Dynamic date-driven phases (Foundation, Accuracy, Speed, Mock Week, Final Review).
- **Track Switching**: Full instant toggling between Professional and Sub-Professional tracks.
- **Owl Mascot States**: Nuanced emotional states (Neutral, Happy, Thinking, Concerned, Resting).
