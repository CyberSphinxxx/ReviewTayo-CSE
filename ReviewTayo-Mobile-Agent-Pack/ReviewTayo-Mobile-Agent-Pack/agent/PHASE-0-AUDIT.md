# Phase 0 — Repository Audit Report

Audit date: 2026-10-05 · Branch: `main` · Baseline commit: `bf353d6 add: v1 prototype`

## 1. What actually exists in the repository

| Area | Finding |
|---|---|
| Version control | Single commit (`bf353d6`). Branch `main`, remote `origin/main`. |
| Existing web application | **None.** There is no frontend framework project, no `package.json` app, no build tooling outside the agent pack. |
| Backend / API | **None.** No server code, no OpenAPI/GraphQL schema, no route definitions. |
| Database | **None.** No schema, no migrations, no ORM config. |
| Authentication | **None.** No provider config, no auth code, no client IDs. |
| Question data | Only the prototype's inline sample bank (8 questions) in the archived prototype. |
| Sync behaviour | **None.** No outbox, no endpoints, no conflict policy. |
| Prototype code | `archives/mobile-prototype/` — dependency-free HTML/CSS/JS "V4.2" five-tab prototype (53 files). |
| Design reference | `ReviewTayo-Mobile-Agent-Pack/.../references/merged-prototype/` — authoritative. |
| Mobile app | Does not exist yet. |

### Consequence for "reuse existing contracts"

The instruction to reuse the existing ReviewTayo backend/API/contracts **has no artefact to reuse in this repository**. Nothing is being ignored or skipped — the contracts do not exist here.

This is recorded as an architectural fact, not a blocker, because it does not require user-owned credentials to proceed:

1. The mobile app defines a **versioned, transport-agnostic API contract** (`src/data/remote/`) that a future backend can implement directly.
2. Sync is designed against repository/outbox interfaces with a **local-only transport** as the default, so the app is fully functional today and gains remote sync by swapping one implementation.
3. Only **live credential/endpoint verification** is external-blocked (see `BLOCKERS.md`).

### Source-of-truth conflict resolved

`archives/mobile-prototype/AGENTS.md` states four tabs ("Do not add a fifth bottom tab"), while the merged reference and the agent pack require five tabs with Home centred. **Resolution:** the merged prototype and this pack win. The archive is retained for behaviour that the merged reference does not cover (owl mood states, mastery ladder wording) and must not be treated as the current IA.

## 2. Reusable assets inventory

| Asset | Reuse decision |
|---|---|
| Design tokens (`css/app.css` `:root` blocks) | Transcribed into `src/theme/tokens.ts` as the light + dark palettes. |
| Owl mascot SVG (`index.html` `<defs>`) | Re-implemented natively as `RTOwlMark` (theme-aware, two moods, cropped nav variant). |
| Navigation glyphs (5 icons) | Re-implemented as `react-native-svg` icon components. |
| Interaction model (sheet flows, quiz flow, review flashcards, onboarding steps) | Rebuilt as router routes + native components; step order and copy preserved. |
| Sample question bank | Used only as a seed for the real CSE content pack; the pack is authored and validated in Phase 3/4. |
| Component CSS classes | Used as the visual spec; **not** ported as styles. |
| Prototype JS state/mocks | Deliberately not reused — replaced by domain services + SQLite. |

## 3. Mobile integration plan (decided)

- `/mobile` is an **independent npm package** with its own lockfile. No root `package.json`, no workspace hoisting, so the existing repository is never destabilised by mobile dependency churn.
- Root `.gitignore` added; `/mobile/.gitignore` already excludes `android/`, `ios/`, `.expo/`, `node_modules/`.
- App identifier `com.reviewtayo.cse` on both platforms.
- No refactor of anything outside `/mobile`.

## 4. Environment audit

| Item | Value | Impact |
|---|---|---|
| Node | v24.16.0 | `node:sqlite` available → real SQLite in tests. |
| npm | 11.13.0 | npm lockfile. |
| Expo SDK | 57.0.26 (React Native 0.86.3, React 19.2.3, TypeScript 6.0.3) | Latest stable. |
| Java | 25.0.1 | Present; not sufficient alone for an APK. |
| Android SDK / emulator | **Not installed** | Production build path verified by config/prebuild + cloud-build profile; on-device APK build requires the SDK (documented, not a coding blocker). |
| Network | npm registry reachable | Install reproducible. |

## 5. Baseline commands (verified this session)

```bash
cd mobile
npm ci                 # reproducible install from lockfile
npm run typecheck      # tsc --noEmit                      -> PASS
npm run lint           # eslint .                          -> PASS (0 errors, 0 warnings)
npm run format:check   # prettier --check                  -> PASS
npm test               # jest                              -> PASS (64 tests)
npm run config:dump    # resolved Expo config, identifiers
npx expo export --platform android   # full bundle compile -> PASS (Hermes bytecode emitted)
```

`expo export` is the launch-equivalent gate in this environment: it compiles the entire
module graph and fails on any unresolvable import, syntax error or invalid config. Device
launch requires an emulator or physical device, which is not available here.

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| No backend contract to validate sync against | Contract-first client + fake transport in tests + documented adoption guide. |
| Android build cannot be proven locally | `expo prebuild` config verified, EAS profile authored, CI job defined; documented as environment-limited. |
| Prototype fidelity drifting | Design tokens transcribed verbatim; `VISUAL-QA.md` checklist per screen; contrast suite automated. |
| CSE logic leaking into generic services | Exam config is data; lint-enforced boundaries; fixture exam contract test. |
| Unstable prototype reference | `archives/mobile-prototype` marked non-authoritative. |

## 7. Phase 0 exit criteria

- [x] Repository layout inspected
- [x] Existing web exam architecture inspected (does not exist)
- [x] API/auth/sync contracts inspected (do not exist; contract defined)
- [x] Prototype folder inspected and inventoried
- [x] Brand assets inventoried
- [x] Question/content format inventoried
- [x] Architecture decisions recorded (`DECISIONS.md`, ADRs 001–003)
- [x] `/mobile` integration plan established
- [x] Baseline test/build commands established and verified
