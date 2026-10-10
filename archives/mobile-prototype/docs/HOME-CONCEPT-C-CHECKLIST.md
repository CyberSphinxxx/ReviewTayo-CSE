# ReviewTayo: CSE Mobile Prototype
## Home Redesign — Concept C Editorial Direction Checklist

### 1. Pre-Implementation Review
- [x] Existing Home inspected
- [x] Concept C reference reviewed

### 2. Header & Branding
- [x] Header preserved (minimal: logo, brand text "CIVIL SERVICE EXAM / ReviewTayo: CSE", settings button)
- [x] No profile greeting, streak, or extra status crowded into topbar

### 3. Editorial Hero
- [x] Editorial hero implemented (open composition blending into warm cream canvas, replacing dark maroon rectangular box)
- [x] Serif headline hierarchy implemented (large editorial serif ~34–42px, line-height 0.98–1.08, dark maroon/deep ink, max 3 lines)
- [x] Headline text: "Small steps today,<br>big results later."
- [x] Hero eyebrow implemented: contextual greeting ("☀ GOOD MORNING" / "GOOD AFTERNOON" / "GOOD EVENING") adapting by local time
- [x] Supporting copy: concise ("Your next 10 questions are ready for Verbal Ability.")
- [x] Primary CTA: dominant maroon pill `Start Smart Drill →` (~48–52px height, high contrast, subtle shadow)
- [x] Smart Drill CTA works (launches adaptive smart drill flow)
- [x] Phase + days metadata preserved beneath CTA: compact single line (`ACCURACY PHASE · 44 DAYS LEFT`)
- [x] Owl mascot integrated into hero composition on the right side (~100–135px, sitting on books / graduation cap)
- [x] Restrained decorative background elements behind owl (abstract academic lines, books, soft circles, low opacity, aria-hidden)

### 4. Today Activity Cards
- [x] Today section heading: "Today" with optional right-side date (e.g. "Oct 3")
- [x] Today 3-card layout implemented (3 compact horizontal cards)
- [x] Differentiated subtle surfaces:
  - Daily Question: soft rose (`#FAF0F2`)
  - Smart Drill: soft lavender-maroon (`#F7EFF5`)
  - Review Due: soft warm cream/gold (`#FCF7EC`)
- [x] Card contents: icon, title, duration, small arrow indicator (no long descriptions)
- [x] Daily Question works (opens question of the day flow)
- [x] Smart Drill works (opens smart drill)
- [x] Review Due works (opens review screen/flow)
- [x] Completed Today states work (subtle checkmark, muted surface, clean)
- [x] Done For Today works (when all 3 completed: editorial shift with resting/celebrating owl, "TODAY COMPLETE", "Nice work. You're done for today...", and quiet "Extra practice" action)

### 5. Streak / Consistency Block
- [x] Streak card redesigned (compact horizontal card with "🔥 12 day streak")
- [x] Mini visual consistency bars (7 bars representing recent activity)
- [x] Short supporting message ("Keep it up." / "Daily question keeps it alive")
- [x] Streak logic preserved (increments/maintains upon study task)

### 6. Continue Mock Exam (Continuity)
- [x] Resume Mock redesigned (richer, compact visual card with "CONTINUE MOCK EXAM", progress "83 / 170", "Started on desktop", "[ Resume ]")
- [x] Optional subtle paper/exam sheet illustration or accent
- [x] Resume conditional behavior preserved (only shown when resumable session exists; dismissible)

### 7. Navigation & Architecture
- [x] 5-tab nav preserved: Learn, Practice, Home, Review, Progress
- [x] Home center nav refined (centered anchor, circular/soft container with white owl mark)
- [x] Review badge preserved (`12` items due)
- [x] Professional/Sub-Professional mode unaffected

### 8. Spacing & Rhythm
- [x] Spacing between sections matches Concept C vertical rhythm:
  - header → hero: 12–16px (14px)
  - hero → Today: 20–26px (22px)
  - Today title → activities: 10–14px (12px)
  - activities → streak: 16–20px (18px)
  - streak → resume: 12–16px (14px)
- [x] Content naturally distributes without excessive empty regions or unneeded scrolling

### 9. Responsive & Cross-Device Quality
- [x] 320px tested (clean fallback / tight fit without breaking or wrapping poorly)
- [x] 360px tested
- [x] 375px tested
- [x] 390px tested
- [x] 430px tested
- [x] No horizontal overflow
- [x] No console errors
- [x] No broken assets
- [x] No duplicate IDs

### 10. Accessibility & Polish
- [x] Reduced motion preserved (`@media (prefers-reduced-motion)`)
- [x] Keyboard focus preserved (`:focus-visible`)
- [x] Semantic HTML and aria attributes (`aria-current="page"`, `aria-hidden="true"` on decorative visuals)
- [x] High contrast text on all colored surfaces
