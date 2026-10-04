# ADR-003 — Contract-first backend integration with a local-only default transport

## Status
Accepted (2026-10-05)

## Context
The pack requires reusing existing ReviewTayo APIs "where practical" and real sync "when APIs
permit". The Phase 0 audit established that **no backend, API schema, authentication provider
or sync endpoint exists in this repository** (see `agent/PHASE-0-AUDIT.md`). There is
therefore nothing to bind to, and the mobile app must ship complete and offline-first anyway.

## Decision
Define the integration as a contract the backend can adopt, and keep the client working
without it:

1. `src/data/remote/api-contract.ts` declares versioned request/response types for the
   endpoints the app needs (auth handshake, content pack manifest + fetch, answer/activity
   push, profile pull, saved-question set merge).
2. `ApiTransport` is an interface with two implementations:
   - `HttpApiTransport` (used only when `EXPO_PUBLIC_API_BASE_URL` is configured over https);
   - `LocalOnlyTransport` (default), which reports `offline` and is what the app uses when no
     backend exists.
3. Payload validation happens at the boundary with runtime narrowing — remote JSON is never
   trusted because a TypeScript type compiled.
4. Sync is an **outbox** of immutable events with idempotency keys, processed by a worker with
   bounded exponential backoff. Local writes always win immediately; sync never blocks study.

## Alternatives considered
1. **Wait for a backend before implementing sync** — would leave an entire phase unbuildable
   and untestable.
2. **Invent REST endpoints and hard-code assumptions** — untestable against reality and would
   silently break when the real backend appears.
3. **Skip sync entirely for v1** — violates the requirement and removes offline-to-online
   recovery, which the Definition of Done requires.

## Consequences
- Every sync behaviour (retry, backoff, idempotency, conflict merge) is testable now against a
  fake transport.
- Live integration is one implementation swap plus credentials, and is tracked as the only
  external dependency in `agent/BLOCKERS.md`.
- The backend contract is documented in-repo, so the future backend has an exact target.

## Verification
Sync suites prove: idempotent re-delivery produces no duplicate events; failed deliveries back
off without busy-looping; a long offline period followed by reconnection drains the outbox;
and sync failure never blocks answering a question.
