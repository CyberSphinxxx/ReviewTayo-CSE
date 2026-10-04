# ADR-001 — Mobile app integration into the ReviewTayo repository

## Status
Accepted (2026-10-05)

## Context
The mobile app must live at `/mobile` inside the existing ReviewTayo repository. The
repository currently contains no JavaScript application, no root `package.json` and no
build tooling, but it is expected to host a web product later. Mobile dependencies move
quickly (Expo SDK, React Native, Hermes) and must not be able to break a future web build.

## Decision
`/mobile` is a self-contained npm package:

- its own `package.json` and `package-lock.json`;
- its own TypeScript, ESLint, Prettier and Jest configuration;
- no root `package.json`, no npm workspaces, no dependency hoisting;
- no shared build tooling with any future web app.

Code sharing with the web product happens only through **explicit contracts** (types and
documented payload shapes), never through a shared bundler or hoisted dependency tree.

## Alternatives considered
1. **npm workspaces monorepo** — enables shared packages, but couples install/upgrade
   cycles; a mobile SDK bump could break the web build.
2. **Copy the mobile app in as a nested project inside the web app** — makes the app
   unbuildable without the web toolchain.
3. **Separate repository** — contradicts the explicit `/mobile` requirement and loses the
   design reference and agent pack.

## Consequences
- Mobile verification commands run from `/mobile`; CI must `cd` into it.
- Future shared code must be published as a contract or mirrored with compatibility tests,
  per `architecture/ARCHITECTURE.md`.
- The root repository remains untouched, satisfying "do not destabilize the web app".

## Verification
`npm ci && npm run verify` inside `/mobile` must pass without any command being run at the
repository root, and no file outside `/mobile` is required for the app to build.
