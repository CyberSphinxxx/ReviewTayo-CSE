# Sync Engine

## Outbox event
Suggested fields:
- id
- eventType
- entityType
- entityId
- payload
- occurredAt
- attemptCount
- nextAttemptAt
- idempotencyKey
- status

## Policies

Answer history:
- append-only
- idempotent by stable event/answer id

Saved questions:
- merge as set operations

Settings:
- latest user-intent timestamp wins unless server contract specifies otherwise

Study activity/streak:
- sync activity events; recompute derived streak when possible

Mastery:
- derive from canonical answer/activity history where possible, not blind last-write-wins numeric overwrite

## Retry
Use bounded exponential backoff with jitter if implementation allows.
Never busy-loop.

## Sync errors
Must be observable but must not interrupt local study.
