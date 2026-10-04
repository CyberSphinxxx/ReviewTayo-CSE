# State Management

Separate:

## Persistent domain state
SQLite/repositories:
- profile
- answers
- sessions
- mastery
- review
- study plans
- settings
- sync metadata

## Ephemeral UI/session state
Feature-local hooks/store:
- open sheet
- selected answer before commit
- onboarding draft
- transient filters
- animation state

Do not mirror the full database into one global JS store.

Use a global store only for truly app-wide ephemeral state such as:
- active exam profile summary
- theme preference
- authenticated account summary
where repository-backed data can be observed cleanly.
