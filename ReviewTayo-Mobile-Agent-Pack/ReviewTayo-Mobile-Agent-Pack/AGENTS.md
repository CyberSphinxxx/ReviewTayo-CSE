# AGENTS.md — ReviewTayo Mobile

## Product principles

ReviewTayo: CSE is a focused Civil Service Exam study companion.

Primary UX principle:

> The app should make the next useful study action obvious.

Secondary principles:
- Hick's Law
- progressive disclosure
- one dominant action per decision region
- complex intelligence underneath, simple interface on top
- do not expose algorithms/configuration unless useful
- do not optimize for endless engagement
- "You're done for today" is a valid completion state

## Fixed v1 information architecture

Five top-level tabs:

1. Learn
2. Practice
3. Home
4. Review
5. Progress

Home is centered.

Do not add new top-level tabs without an explicit approved product decision.

## Fixed theme direction

Light:
- current ReviewTayo warm cream / maroon system

Dark:
- merged Claude-inspired deep burgundy / near-black maroon system
- gold may be used sparingly for high-priority dark-mode actions

Light and dark must use the same information architecture and component structure.

## Architecture rules

- UI must not query SQLite directly.
- UI must not call network clients directly.
- UI must not contain exam business rules.
- Domain logic must be testable without React Native.
- Repository interfaces belong above concrete local/remote implementations.
- CSE-specific config belongs in exam content/config, not scattered conditionals.
- Avoid `any`. If unavoidable, document the reason.
- No magic theme colors in feature screens.
- No silent catches.
- No business logic hidden inside JSX.
- No giant global store.
- No feature component over ~400 lines without a documented reason/refactor review.
- Prefer small cohesive modules, not arbitrary file fragmentation.

## Dependency rule

Before adding a meaningful dependency, verify:
- why built-in Expo/React Native capability is insufficient,
- maintenance status,
- native build implications,
- bundle/runtime impact,
- compatibility with the current Expo SDK.

Record architectural dependencies in `agent/DECISIONS.md` or an ADR.

## Testing rule

A task is not complete until:
- implementation exists,
- tests cover the important behavior,
- targeted tests pass,
- lint/typecheck for affected scope passes,
- no known regression is left untracked.

## Git rule

Prefer small stable commits with conventional-style messages.

Examples:
- `feat(theme): add shared light and dark tokens`
- `feat(exams): add exam registry and config validation`
- `test(review): cover review queue scheduling`
- `fix(onboarding): preserve draft state on back navigation`

Do not hide unrelated changes in the same commit.
