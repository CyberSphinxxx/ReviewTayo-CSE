# Test Strategy

## Unit
Pure domain logic:
- exam registry/config
- Smart Drill
- mastery
- review scheduling
- study planning
- scoring
- date/phase
- sync merge/idempotency

## Component
User-visible behavior:
- selections
- disabled/enabled CTAs
- theme state
- answer feedback
- badges
- disclosure

## Integration
- feature + repository
- SQLite migrations
- session persistence
- offline behavior
- sync outbox

## E2E
Critical full journeys on development builds.

## Visual QA
Compare native screens to reference in light and dark.

Do not chase arbitrary coverage percentage at the expense of meaningful behavior. Track coverage, but gate critical domains by explicit cases.
