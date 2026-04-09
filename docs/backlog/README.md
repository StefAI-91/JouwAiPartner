# Backlog

## DevHub Fase 1 — Bug Intake & Triage

Gegenereerd op 2026-04-09 op basis van `docs/specs/prd-devhub.md` Fase 1.
Bijgewerkt op 2026-04-09: Status Page en Duplicate Detection verplaatst naar fase 2.
Requirements register: `docs/specs/requirements-devhub.md`

### Overzicht

| #      | Sprint                                | Laag              | Prerequisites          | Requirements                                                                                                             | Status           |
| ------ | ------------------------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| DH-001 | Database: issues tabellen + RLS       | 1 - Database      | Geen                   | DATA-101..162, SEC-101..114, AUTH-103                                                                                    | Backlog          |
| DH-002 | Queries en mutations                  | 2 - Data access   | DH-001                 | FUNC-144..156                                                                                                            | Backlog          |
| DH-003 | DevHub app setup + auth + layout      | 3 - App shell     | DH-001                 | AUTH-101..106, UI-119..122                                                                                               | Backlog          |
| DH-004 | Issue list + filters + triage sidebar | 3 - Core UI       | DH-002, DH-003         | UI-101..109, UI-117..118, UI-126..129                                                                                    | Backlog          |
| DH-005 | Issue CRUD + detail + triage acties   | 3 - Core features | DH-002, DH-003, DH-004 | FUNC-101..114, FUNC-139..141, FUNC-145..146, UI-110..116                                                                 | Backlog          |
| DH-006 | AI classificatie agent                | 4 - AI            | DH-001, DH-002, DH-005 | FUNC-103..104, FUNC-123..129, FUNC-143, RULE-118, EDGE-103, PERF-104                                                     | Backlog          |
| DH-007 | Userback API integratie + sync        | 5 - Integratie    | DH-001..003, DH-006    | FUNC-115..122, FUNC-126, FUNC-130..132, FUNC-142, INT-101..105, RULE-101..117, UI-123..125, EDGE-101..102, PERF-101..103 | Backlog          |
| DH-008 | Status page app                       | **Fase 2**        | DH-001, DH-002         | FUNC-133..138, SEC-115..116, UI-130..136, EDGE-104                                                                       | Backlog (fase 2) |
| DH-009 | Duplicate detection via embeddings    | **Fase 2**        | DH-001, DH-002, DH-006 | FUNC-147..152, PERF-105..106                                                                                             | Backlog (fase 2) |

### Dependency graph

```
FASE 1:
DH-001 Database: issues tabellen (incl. triage status, issue_number_seq, embedding kolom voorbereid)
├── DH-002 Queries en mutations
│   └── DH-004 Issue list + filters + triage sidebar
│       └── DH-005 Issue CRUD + detail + triage acties
│           └── DH-006 AI classificatie agent
│               └── DH-007 Userback API integratie (items → triage)
└── DH-003 DevHub app setup + auth
    ├── DH-004 Issue list + filters
    └── DH-007 Userback sync UI

FASE 2 (na afronding fase 1):
DH-008 Status page (hangt af van DH-001, DH-002)
DH-009 Duplicate detection via embeddings (hangt af van DH-001, DH-002, DH-006)
```

### Aanbevolen uitvoeringsvolgorde (fase 1)

1. DH-001 (database — incl. triage status, issue_number_seq, embedding kolom voorbereid)
2. DH-002 (queries) + DH-003 (app setup) — parallel mogelijk
3. DH-004 (issue list + triage sidebar)
4. DH-005 (CRUD + detail + triage acties)
5. DH-006 (AI classificatie)
6. DH-007 (Userback sync → items naar triage)

### Fase 2 (na afronding fase 1)

7. DH-008 (status page)
8. DH-009 (duplicate detection via embeddings)

### Dekking

- Totaal requirements: 125 (119 + 6 nieuw: FUNC-145..152, PERF-105..106)
- Gedekt: 125 (100%)
- Niet gedekt: 0

### Totaal

- Fase 1 sprints: 7 (DH-001 t/m DH-007)
- Fase 2 sprints: 2 (DH-008, DH-009)
- Geschatte inspanning fase 1: 7 Claude Code sessies

---

## Eerdere backlog: Single Responsibility Fixes

Gegenereerd op 2026-03-30 op basis van audit bevindingen.

### Overzicht

| #   | Sprint                    | Prioriteit | Prerequisites | Fixes      | Status  |
| --- | ------------------------- | ---------- | ------------- | ---------- | ------- |
| 01  | Security & Validatie      | KRITIEK    | Geen          | F1, F2, F3 | Backlog |
| 02  | Pagina's opsplitsen (SRP) | Middel     | Geen          | F4, F5     | Backlog |
| 03  | API Routes refactoren     | Middel     | 01            | F6, F7     | Backlog |
| 04  | Structuur & Cleanup       | Laag       | 01, 03        | F8-F13     | Backlog |

### Dependency graph

```
01 Security & Validatie
├── 03 API Routes refactoren
│   └── 04 Structuur & Cleanup
│
02 Pagina's opsplitsen (onafhankelijk)
```

### Alle fixes

| Fix | Beschrijving                                      | Sprint | Complexiteit          |
| --- | ------------------------------------------------- | ------ | --------------------- |
| F1  | SQL injection fix: whitelist voor table parameter | 01     | Laag                  |
| F2  | Zod schemas toevoegen voor alle Server Actions    | 01     | Middel                |
| F3  | Standaardiseer action return types                | 01     | Laag                  |
| F4  | Architectuur pagina opsplitsen (823 regels)       | 02     | Middel                |
| F5  | Help pagina opsplitsen (278 regels)               | 02     | Laag                  |
| F6  | Fireflies ingest route naar thin gateway          | 03     | Laag                  |
| F7  | Fireflies webhook route naar thin gateway         | 03     | Laag                  |
| F8  | Directe DB calls uit services halen               | 04     | Middel                |
| F9  | Actions folder verplaatsen naar src/actions/      | 04     | Laag (veel bestanden) |
| F10 | Login naar (auth) route group                     | 04     | Laag                  |
| F11 | MCP tools type safety (12x any verwijderen)       | 04     | Middel                |
| F12 | Hardcoded config values centraliseren             | 04     | Laag                  |
| F13 | entity-resolution.ts splitsen                     | 04     | Laag                  |
