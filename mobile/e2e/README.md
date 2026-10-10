# Device flows (Maestro)

These are the ten journeys in the pack's `testing/E2E-TESTS.md`, authored for a real
device or emulator. They are the device half of the E2E strategy (D-011): the same
journeys are mirrored by the router-level journey suites in `tests/app/`, which run in
CI against a real SQLite database, while these flows exercise the parts only a device
can — the OS keyboard, the Android back gesture, the app being killed and relaunched.

## Running

```bash
# once
curl -Ls "https://get.maestro.mobile.dev" | bash

# a development build or a release build installed on a connected device/emulator
maestro test e2e/01-onboarding-first-practice.yaml
maestro test e2e/            # every flow
```

The app id the flows target is `com.reviewtayo.cse`. A flow that needs a clean install
starts with `launchApp: clearState: true`; the restart flows use `stopApp` and
`launchApp` without clearing state, because surviving a relaunch is the thing they
are testing.

## Status

Authored but **not executed in this environment** — no Android SDK or emulator is
available here (`agent/BLOCKERS.md`, B-EXT-3). Running them is part of the device pass
tracked in `agent/VISUAL-QA.md`. Text assertions deliberately use test ids rather than
copy, so a content-pack edit does not break a flow.
