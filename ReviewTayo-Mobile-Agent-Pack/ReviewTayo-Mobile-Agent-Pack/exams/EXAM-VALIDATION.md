# Exam Validation

Validator must check at least:
- unique ids,
- manifest/schema version,
- valid tracks,
- valid subject references,
- valid concept references,
- valid blueprint references,
- question answer validity,
- question subject/concept validity,
- related-question group integrity,
- difficulty enum validity,
- timing/scoring required fields,
- no orphaned published content.

Validation failure must fail CI/content import.
