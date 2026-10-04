# ReviewTayo Mobile Agent Pack — Start Here

This pack is the control system for building the **complete ReviewTayo: CSE mobile application**.

The target implementation is:

- Expo + React Native + TypeScript
- Expo Router
- Android + iOS, with Android as the primary QA target
- `/mobile` inside the existing ReviewTayo repository
- offline-first architecture
- real Guest + Google account architecture
- real sync with the ReviewTayo backend where existing APIs permit
- real local study reminders
- CSE-only user interface for v1, but a generic multi-exam engine underneath
- light theme based on the current ReviewTayo prototype
- dark theme based on the merged Claude-inspired burgundy prototype
- npm
- application identifier: `com.reviewtayo.cse`

## Before coding

The agent must read, in order:

1. `AGENTS.md`
2. `MASTER-AGENT-PROMPT.md`
3. `DEFINITION-OF-DONE.md`
4. `PRODUCT-REQUIREMENTS.md`
5. `agent/DEVELOPMENT-LOOP.md`
6. `agent/PROJECT-STATE.md`
7. `agent/MASTER-CHECKLIST.md`
8. `architecture/ARCHITECTURE.md`
9. `exams/EXAM-ENGINE.md`
10. `design/PROTOTYPE-MAPPING.md`

Then begin at `phases/00-REPO-AUDIT.md`.

## Sources of truth

### Product / design source of truth
`references/merged-prototype/`

The prototype defines the intended:
- information hierarchy
- visual direction
- interaction behavior
- light/dark theme personality
- five-tab navigation
- onboarding style
- question/review/progress flows

Do not mechanically port HTML/CSS. Rebuild it with proper React Native architecture.

### Engineering source of truth
- `AGENTS.md`
- `architecture/`
- `engineering/`
- `testing/`
- `exams/`
- `agent/MASTER-CHECKLIST.md`

If the prototype implementation conflicts with sound mobile architecture, preserve the **UX intent** and improve the implementation.

## Completion rule

Do not stop because:
- the app opens
- a screen looks complete
- a feature compiles
- tests pass for one phase
- an Android build succeeds

Stop only when **all required Definition of Done items pass** or an item is explicitly documented as an external blocker that cannot be solved without user-owned credentials/accounts.

Internal coding problems are never user blockers.
