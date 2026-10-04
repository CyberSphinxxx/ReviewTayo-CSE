# Database

Recommended persistent domains:
- exam packs
- questions/content indexes
- user exam profiles
- practice sessions
- answers
- mastery
- review queue
- saved questions
- study plans/tasks
- mock sessions/answers
- settings
- sync outbox/metadata

Requirements:
- versioned migrations
- transactional multi-write operations
- indexes for common filters
- test migration from prior schemas
- never drop/recreate user DB as an upgrade strategy
