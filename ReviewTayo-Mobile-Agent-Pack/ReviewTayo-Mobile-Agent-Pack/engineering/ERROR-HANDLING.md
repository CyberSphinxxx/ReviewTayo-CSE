# Error Handling

Represent expected failures explicitly.

Every feature must consider:
- loading
- success
- empty
- offline
- recoverable error
- fatal/unexpected error

Never:
- swallow errors silently
- show raw stack traces to users
- block study because telemetry/sync failed

Add an app-level error boundary and structured internal logging.
