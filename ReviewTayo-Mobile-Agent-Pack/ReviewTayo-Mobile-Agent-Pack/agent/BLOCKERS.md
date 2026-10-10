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

### B-EXT-4 — Build-chain dependency advisories (upstream, non-blocking)
- **What:** `npm audit` reports 66 vulnerabilities, but only 5 distinct advisories — `braces`,
  `decode-uri-component`, `node-forge`, `sprintf-js`, `uuid` — and every one of them sits in a
  build-time chain: the Expo CLI, Metro, Jest, and `xcode` under the config plugins.
- **Impact:** none on the shipped app. None of the affected packages is imported by `src/` or `app/`,
  so none can reach the Hermes bundle; they run on the build machine, not the learner's device.
- **Why not fixed:** the fixes are upstream releases that the Expo SDK pins; `npm audit fix` cannot
  clear them and `--force` would break the SDK's own dependency graph for no runtime gain. Phase 15
  deliberately did not force it. To be re-checked at Phase 17 against the next SDK release.
- **Owner:** upstream (Expo/RN toolchain), watched by the project.

### B-EXT-5 — EAS project id and store accounts
- **Needed for:** cloud builds via EAS and any store submission.
- **Status when blocked:** `eas.json` defines the development / preview / production profiles
  (channels, remote version source, auto-increment, per-profile env), the local prebuild + Gradle
  path is documented, and `expo config` resolves cleanly. `app.json` still carries a placeholder
  `extra.eas.projectId`.
- **Owner:** user (Expo account, Google Play Console, Apple Developer program).

## Internal blockers
None.

Internal coding blockers must be actively revisited before final completion.
