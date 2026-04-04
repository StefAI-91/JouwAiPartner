# Backlog

## v2 Sprints (afgerond)

Sprints 008-014 zijn afgerond. Zie `sprints/done/`.

## v2.5: Testing Sprints

| #   | Sprint                              | Laag         | Prerequisites | Requirements                          | Status     |
| --- | ----------------------------------- | ------------ | ------------- | ------------------------------------- | ---------- |
| 015 | Testframework Setup (Vitest)        | 0 - Infra    | Geen          | TEST-001..005                         | Backlog    |
| 016 | Zod Schema Validatietests           | 1 - Unit     | 015           | TEST-011..055, TEST-065..067          | Backlog    |
| 017 | Test Utilities en Database Setup    | 0 - Infra    | 015           | TEST-006..010                         | Backlog    |
| 018 | Server Actions Integratietests      | 2 - Integratie | 015, 017    | TEST-056..064                         | Backlog    |
| 019 | MCP Server en Tool Registratie Tests | 1 - Unit    | 015           | TEST-068                              | Backlog    |

## Dependency graph

```
015 Testframework Setup
├── 016 Zod Schema Validatietests
├── 017 Test Utilities + DB Setup
│   └── 018 Server Actions Integratietests
└── 019 MCP Server Tests
```

016, 017 en 019 zijn onafhankelijk van elkaar en kunnen parallel na 015.
018 is afhankelijk van 017 (test utilities).

## Dekking

- Totaal requirements (testing): 68
- Gedekt: 68 (100%)
- Niet gedekt: 0

Volledig requirements register: `docs/specs/requirements-testing.md`

## Totaal

- Sprints: 5
- Geschatte inspanning: 5 Claude Code sessies
