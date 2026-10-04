# Authentication

## v1 modes
- Guest
- Google

Guest must be fully functional offline.

Google architecture must use a provider boundary, not auth code scattered through screens.

Use secure storage for credentials/tokens.

If credentials are unavailable during implementation:
- implement provider interface,
- implement configuration,
- test with a fake provider,
- mark only live credential verification as external-blocked.
