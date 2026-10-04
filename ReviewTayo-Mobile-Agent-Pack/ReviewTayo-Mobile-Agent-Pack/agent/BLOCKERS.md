# Blockers

## External blockers

### B-EXT-1 — Live Google OAuth credentials
- **Needed for:** verifying real Google sign-in against Google's servers.
- **Status when blocked:** provider boundary, configuration plumbing, secure token storage and a
  fake provider are implemented and covered by tests. Guest mode is fully functional offline.
- **Only the live round-trip is blocked.**
- **Owner:** user (Google Cloud project: web, Android and iOS client IDs).

### B-EXT-2 — Production ReviewTayo API endpoint and credentials
- **Needed for:** verifying live content download and progress sync.
- **Status when blocked:** contract-first API client, outbox, retry/backoff, idempotency and
  conflict policies are implemented and tested against a fake transport; the default transport is
  local-only so the app is fully usable.
- **Owner:** user (backend base URL + credentials, or confirmation that the backend is not yet
  available).

### B-EXT-3 — Android SDK / signing credentials (environment)
- **Needed for:** producing a locally signed APK/AAB on this machine.
- **Status when blocked:** Expo config, identifiers, permissions, prebuild output and build
  profiles are verified; the production build path is documented and CI-ready.
- **Owner:** environment/user (Android SDK install or EAS account).

## Internal blockers
None.

Internal coding blockers must be actively revisited before final completion.
