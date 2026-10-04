# Feature Boundaries

## Home
Composes recommendations and summary state. Does not calculate mastery directly.

## Learn
Presents lessons/reference material. Does not own Review Due.

## Practice
Chooses practice modes and creates session requests.

## Quiz
Owns active question session UI/lifecycle.

## Review
Owns due review, mistakes, saved, revisit concepts, history.

## Progress
Owns presentation of derived study/progress metrics.

## Mock Exam
Owns long-form timed exam lifecycle and result presentation.

## Onboarding
Collects preferences into a draft, commits at completion.

## Settings
Edits committed preferences.

Cross-feature behavior should move into domain/use cases rather than importing feature internals.
