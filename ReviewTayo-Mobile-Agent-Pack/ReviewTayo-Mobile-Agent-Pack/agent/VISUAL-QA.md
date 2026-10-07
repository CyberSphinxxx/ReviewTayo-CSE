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
- Screens are placeholders until their phases (Home 7, Learn 8, Practice/Quiz 9, Review 10,
  Progress 11, Mock 12); captures are collected as each phase lands.
