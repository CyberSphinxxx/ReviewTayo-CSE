# Exam Contract

## ExamTrack
Fields should cover:
- stable id
- display name
- description
- enabled subject ids
- blueprint overrides if needed
- timing overrides if needed

## SubjectDefinition
- id
- name
- shortName
- order
- icon/category metadata if useful
- concept ids

## ConceptDefinition
- id
- subjectId
- name
- parentConceptId optional
- tags
- study metadata

IDs are stable content identifiers and must not be translated/localized strings.
