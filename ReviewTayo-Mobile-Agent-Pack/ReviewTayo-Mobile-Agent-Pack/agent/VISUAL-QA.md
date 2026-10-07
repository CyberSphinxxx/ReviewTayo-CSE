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
- Screens are placeholders until their phases (Home 7, Learn 8, Practice/Quiz 9, Review 10,
  Progress 11, Mock 12); captures are collected as each phase lands.
