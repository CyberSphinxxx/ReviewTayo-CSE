# Logging

Create a small logging abstraction:
- debug
- info
- warn
- error

Production logs must avoid sensitive content.

Sync failures and unexpected errors should be diagnosable.

Do not scatter `console.log` through final production code.
