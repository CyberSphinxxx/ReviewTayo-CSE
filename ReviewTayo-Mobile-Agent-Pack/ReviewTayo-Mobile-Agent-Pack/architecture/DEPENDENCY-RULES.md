# Dependency Rules

Allowed:
- UI -> feature
- feature -> domain
- feature -> repository interface
- data implementation -> domain contracts
- app composition -> all modules for dependency injection/wiring

Forbidden:
- domain -> React Native
- domain -> Expo
- domain -> SQLite implementation
- generic exam engine -> CSE feature UI
- repository interface -> concrete API client
- component library -> feature modules

A lint/import-boundary rule should be added if practical.
