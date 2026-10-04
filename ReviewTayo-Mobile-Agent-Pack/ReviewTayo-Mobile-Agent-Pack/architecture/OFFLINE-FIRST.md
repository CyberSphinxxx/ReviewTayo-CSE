# Offline-First Model

Core study must work offline once content is available.

## Local-first write
1. user performs action,
2. transaction updates SQLite,
3. sync event is appended to outbox when syncable,
4. UI updates immediately,
5. network sync happens independently.

## Offline-supported
- lessons/quick sheets already downloaded
- question practice
- Smart Drill from available content
- Review Due
- saved questions
- progress updates
- mock exams
- settings
- study plan

## Online-required
- Google sign-in
- initial/updated content download if not bundled
- server sync
- remote announcements/resources

Never block answering a question on a network request.
