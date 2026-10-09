# Visual QA

For each screen capture both Light and Dark at representative Android sizes.

Required:
- Onboarding key steps
- Home
- Learn
- Practice
- Quiz unanswered
- Quiz correct
- Quiz incorrect/explanation
- Review
- Review Due
- Progress
- Mock setup
- Mock exam
- Mock result
- Settings

Compare:
- visual hierarchy
- spacing
- typography
- color roles
- bottom navigation
- owl/brand usage
- card density
- progressive disclosure

Do not require pixel-perfect HTML matching. Require faithful design intent and native-quality layout.

## Status
- Phase 5: the bottom navigation exists in both themes and is exercised by automated tests
  (tab order, centred Home, due badge, accessibility labels). Device screenshots are still pending
  — no emulator is available in this environment.
- Phase 6: onboarding and settings are built and covered by integration tests over a real database,
  but no screen captures exist yet. Two things need a device pass specifically:
  - all eight onboarding steps in Light and Dark, at a small (360×640) and a regular Android size;
  - the live text-size preview at Standard / Large / Extra, to confirm the sample line and the
    step headings reflow rather than clip.
  The follow-up prompt is "capture the onboarding and settings screens on a device/emulator in both
  themes", to be collected with the Phase 7 Home captures.
- Phase 7: Home exists in both themes and its composition is asserted from the rendered tree — the
  hero is the brand maroon surface, the canvas follows the theme, the headline keeps inverse text,
  and the phase pill, three daily actions, goal ring, streak, resume card and done state all come
  from committed data. What automated tests cannot judge is the part that matters most on this
  screen: whether the hero reads as one dominant recommendation at real sizes, how the owl sits in
  the crop, and whether the type scale still feels editorial at Extra Large. Capture Home (light
  and dark, 360×640 and 390×844, Standard and Extra Large) with the rest.
- Phase 8: Learn exists in both themes and its composition is asserted from the rendered tree — the
  editorial eyebrow and title, the Continue Learning row with its mastery badge, the Quick Sheets
  cards with their reading time, the Subjects list with an accuracy bar and its supporting line, and
  the Study Guides index. The two reference pages behind it (`/guide`, `/concept`) are exercised the
  same way, including the empty-concept state. What automated tests cannot judge is the part this
  screen lives on: whether the Quick Sheets wrap into a scannable row rather than a ragged stack at
  360 px, whether the Subjects bars read as one column of comparable lengths, and whether the guide's
  long concept list stays airy at Extra Large text. Capture Learn, Learn at Extra Large, a subject
  guide and a concept page (light and dark, 360×640 and 390×844) with the rest.
- Phase 9: Practice, Build a Quiz, Practice by Subject and the quiz flow exist in both themes and
  their behaviour is asserted from the rendered tree and the database behind it — one dominant Smart
  Drill card, the targeted rows that can honestly be offered, the disclosure, the question with its
  choices locked after the first press, the checked answer with its explanation and mastery line, the
  Try Another Like This / Review Concept pair, the bookmark control in the header, the timed clock
  and the results with their recommendation. What automated tests cannot judge is exactly what this
  screen is for: whether the question, its choices and the explanation read as one calm column at
  360 px without the feedback pushing the next button below the fold, whether the choices are
  comfortably tappable one-handed, whether the header still fits once the clock and the bookmark
  share it at Large text, and whether the Practice list's disclosure reads as a natural "and more"
  rather than a second menu. Capture Practice (light and dark), a quiz question unanswered, a checked
  correct answer, a checked wrong answer with both recovery actions, the results with a
  recommendation, and a timed session counting down — at 360×640 and 390×844, Standard and Extra
  Large. A device pass is also the only way to confirm the clock keeps honest time when the app is
  backgrounded mid-session.
- Phase 10: Review exists in both themes and every state is asserted from the rendered tree and the
  database behind it — the count with its duration, the caught-up state with the resting owl, the
  four rows, a card face and its revealed answer, Again and Got it writing the schedule they claim,
  the completion copy and the four lists. What automated tests cannot judge is what this screen is
  built on: whether the card reads as one calm, legible object at 360 px with the answer long enough
  to need scrolling, whether the Again / Got it pair is comfortably reachable one-handed right where
  the thumb already is, whether the 96 px count is a statement rather than a shout at Extra Large
  text, and whether the four rows still read as a quiet list under it. Capture Review (light and
  dark), the caught-up state, a card face, a revealed card, the completion state and both a full and
  an empty list — at 360×640 and 390×844, Standard and Extra Large. A device pass is also the only
  way to confirm the deck still feels like a deck when a real thumb is tapping through it.
- Phase 11: Progress exists in both themes and every state is asserted from the rendered tree and the
  database behind it — the score with its trend and sparkline, the needs-attention card and the drill
  it starts, the four subject bars, the mastery row and both mastery lists, the CSE journey at four
  horizons, this week's bars and its goal, and both mock states. What automated tests cannot judge is
  what this screen lives on: whether the 88 px score with its curve reads as one editorial statement
  rather than two competing blocks at 360 px, whether the seven week bars stay legible when one day is
  six times another, whether the journey's five stopping points read as a timeline rather than a list,
  and whether "0 of 22 mastered · 1 started" still reads as encouragement at Extra Large text. Capture
  Progress (light and dark), the score at the top of a scrolled screen, the needs-attention card, the
  subject bars, the journey with a phase in progress, this week with and without a target, the mastery
  list for one subject, and the empty recent-mock row — at 360×640 and 390×844, Standard and Extra
  Large.
- The mock screen is still a placeholder until Phase 12; captures are collected as each phase lands.
