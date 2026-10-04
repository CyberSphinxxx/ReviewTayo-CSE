# ADR-002 — DatabasePort with `expo-sqlite` and `node:sqlite` adapters

## Status
Accepted (2026-10-05)

## Context
Persistence is SQLite on device via `expo-sqlite`. Migration and repository behaviour is
the highest-risk area of an offline-first app: a bad migration destroys study history. That
behaviour must be covered by automated tests that run in CI, which has no Android emulator
and no native modules.

## Decision
Repositories depend on a narrow asynchronous `DatabasePort` interface, not on
`expo-sqlite` directly:

```
repositories → DatabasePort ← ExpoSqliteDatabase (device runtime)
                            ← NodeSqliteDatabase   (tests / CI)
```

- `ExpoSqliteDatabase` wraps `expo-sqlite`'s async API.
- `NodeSqliteDatabase` wraps Node 22+'s built-in `node:sqlite` (`DatabaseSync`), adapted to
  the same promise-based interface with no third-party dependency.
- Both execute the *same* SQL text and the same migration list, so migration tests exercise
  the real production SQL.

`DatabasePort` exposes: parameterised `execute`, `query`, `transaction`, and `close`.
Parameterised statements are mandatory (no string interpolation of values).

## Alternatives considered
1. **`better-sqlite3` in tests** — native compilation, version churn, adds a build toolchain.
2. **`sql.js` (WASM)** — different SQLite build; divergence risk from the device engine.
3. **Mock the database in tests** — would not catch real migration and constraint failures,
   which is precisely what must be verified.
4. **`expo-sqlite` mocked via jest-expo** — no real SQL execution.

## Consequences
- Real SQL, real constraints and real transactions are covered in CI at near-zero cost.
- The port is the only place that knows about a driver, keeping the dependency rule intact.
- Transaction semantics must be expressed with primitives both drivers support
  (`BEGIN`/`COMMIT`/`ROLLBACK`), which is a documented constraint on repository code.

## Verification
Migration and repository suites run green in plain Node; each migration is exercised on a
fresh database and through every upgrade path, and full-text history survives content
updates (see `testing/MIGRATION-TESTS.md`).
