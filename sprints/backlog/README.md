# Backlog: v2 — Review & Dashboard

## Overzicht

| #   | Sprint                       | Laag            | Prerequisites | Requirements                                                                                       | Status  |
| --- | ---------------------------- | --------------- | ------------- | -------------------------------------------------------------------------------------------------- | ------- |
| 008 | Monorepo Setup               | 1 - Infra       | Geen          | FUNC-001..007                                                                                      | Backlog |
| 009 | DB Migration + Security      | 1 - Database    | 008           | DATA-001..010, SEC-001..005, FUNC-008..009, AUTH-001, AUTH-003, RULE-003..004, RULE-007, PERF-001  | Backlog |
| 010 | Review Queue                 | 2 - Core UI     | 009           | FUNC-010..016, UI-001..018, UI-027, RULE-001..002, RULE-008..010, VAL-001..003, AUTH-002, AUTH-004 | Backlog |
| 011 | Meeting Detail               | 2 - Core UI     | 010           | FUNC-017..020, UI-019..021, EDGE-001, EDGE-003                                                     | Backlog |
| 012 | Projects Overview + Detail   | 3 - Features    | 011           | FUNC-021..023, UI-022..023, RULE-011, EDGE-002                                                     | Backlog |
| 013 | Dashboard + Clients + People | 3 - Features    | 012           | FUNC-024..027, UI-024..026                                                                         | Backlog |
| 014 | MCP Verification Filter      | 4 - Integration | 013           | FUNC-028..033, RULE-005..006, AUTH-005, INT-001                                                    | Backlog |

## Dependency graph

```
008 Monorepo Setup
 |
 v
009 DB Migration + Security
 |
 v
010 Review Queue
 |
 v
011 Meeting Detail
 |
 v
012 Projects Overview + Detail
 |
 v
013 Dashboard + Clients + People
 |
 v
014 MCP Verification Filter
```

Sequentieel. Elke sprint bouwt op de vorige.

## Dekking

- Totaal requirements (v2): 98
- Gedekt: 98 (100%)
- Niet gedekt: 0

Volledig requirements register: `docs/specs/requirements-v2.md`

## Totaal

- Sprints: 7
- Geschatte inspanning: 7 Claude Code sessies
