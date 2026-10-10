# ReviewTayo: CSE — Mobile

Offline-first React Native client for the Philippine Civil Service Examination, built with Expo,
TypeScript and Expo Router. The v1 interface is CSE-specific while the exam engine underneath is
generic, so additional exams are added mostly as validated content and configuration.

- **App identifier:** `com.reviewtayo.cse` (Android + iOS)
- **Platforms:** Android (primary QA) and iOS
- **Package manager:** npm

## Requirements

- Node.js >= 20.19.4 (Node 24 recommended — the test suite uses the built-in `node:sqlite`)
- npm 10+
- For device/emulator runs: Android SDK, or the Expo Go app, or an EAS development build

## Commands

```bash
npm ci                 # reproducible install from the lockfile
npm run start          # Expo dev server
npm run android        # dev server targeting an Android device/emulator
npm run ios            # dev server targeting the iOS simulator

npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run format:check   # prettier --check
npm test               # jest
npm run test:coverage  # jest --coverage
npm run verify         # format + lint + typecheck + tests

npm run doctor         # expo-doctor diagnostics
npm run config:dump    # resolved Expo config (identifiers, plugins, permissions)
npm run prebuild:android
npm run prebuild:ios
```

`npx expo export --platform android` compiles the whole module graph into a Hermes bundle and is
the fastest way to prove the app still builds without a device.

## Environment

Copy `.env.example` to `.env.local`. Only `EXPO_PUBLIC_*` values reach the bundle, and never put a
secret in them. Left unset, the app runs fully offline against the bundled content pack with a
local-only sync transport — that is the supported QA configuration.

## Directory layout

```
app/                    Expo Router routes (every file here is a screen)
  (tabs)/               Learn · Practice · Home · Review · Progress
  dev/                  development-only tooling screens
src/
  components/           reusable native primitives (theme-aware, accessible)
  config/              typed environment configuration
  data/                 SQLite port, migrations, repositories, sync
  domain/               pure business core — no React Native, no Expo
  features/             one module per user-facing workflow
  services/             logging, analytics, crash reporting, notifications
  store/                app-wide ephemeral state (appearance, session)
  theme/                design tokens, semantic themes, typography
  utils/                small focused helpers
content/exams/          validated exam content packs
tests/                  unit, component, integration, migration, offline, E2E-mirror suites
e2e/                    Maestro device flows
```

## Architecture rules (enforced)

1. **Dependency direction** — UI → feature → domain → repository interface → implementation.
   Dependencies never point upward.
2. **`src/domain` is pure.** It must not import React, React Native or Expo. Enforced by lint so
   the business core stays testable in plain Node and reusable by future clients.
3. **UI never touches SQLite or the network.** Screens depend on repository interfaces; ESLint
   blocks `expo-sqlite` and concrete local-data imports from `src/app` and `src/features`.
4. **No exam branching in generic services.** Exam differences live in `ExamRuleConfig` data.
5. **No magic colours in screens.** Only semantic theme roles.
6. **No silent catches.** Expected failures are modelled as `Result` values.

## Release

- **Build profiles:** `eas.json` defines `development` (dev client, internal),
  `preview` (internal) and `production` (auto-incrementing version, production channel),
  each setting `EXPO_PUBLIC_APP_ENV`.
- **Release checklist:** `docs/release-checklist.md` — every row answered with its
  evidence, and the external blockers named.
- **Store preparation:** `docs/play-store.md` (listing, Data safety, permissions,
  testing tracks, signed bundle) and `docs/app-store.md` (listing, App Privacy,
  purpose strings, TestFlight procedure).
- **Device flows:** `e2e/` — the pack's ten E2E journeys as Maestro flows, mirrored by
  the CI journey suites under `tests/app/`.
- **CI:** `.github/workflows/mobile-quality.yml` runs format, lint, typecheck, tests and
  the Android bundle export on every change under `mobile/`.

## Testing

Domain, data and migration tests run in a plain Node environment against a real SQLite database
through the `node:sqlite` adapter, so migrations and repositories are verified for real rather
than against mocks. Component tests use React Native Testing Library (v14, async API). Device-only
journeys are authored as Maestro flows in `e2e/` and mirrored as CI-executable journey tests.
