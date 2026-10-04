# Exam Content Packs

Suggested layout:

```text
content/exams/cse/
├── manifest.json
├── exam.json
├── subjects.json
├── concepts.json
├── tracks/
│   ├── professional.json
│   └── subprofessional.json
└── questions/
    ├── verbal.json
    ├── numerical.json
    ├── analytical.json
    ├── clerical.json
    └── general-information.json
```

Manifest fields:
- examId
- schemaVersion
- contentVersion
- generatedAt
- minimumAppVersion optional
- checksum optional

All content must pass validation before import/publish.
