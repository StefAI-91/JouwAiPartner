# Backlog

## Foundation — Shared Packages (multi-app fundament)

Aangemaakt op 2026-04-09 na architectuur-review van de DevHub.
Drie apps gepland: **cockpit** (PM), **devhub** (development), **portal** (klant delivery).
Deze sprints leggen het fundament zodat alle apps dezelfde basis delen.

**Voer deze sprints uit VOOR verdere DevHub features (DH-006, DH-007).**

### Overzicht

| #       | Sprint                         | Laag            | Prerequisites | Doel                                                     | Status  |
| ------- | ------------------------------ | --------------- | ------------- | -------------------------------------------------------- | ------- |
| FND-001 | packages/ui/                   | Shared UI       | Geen          | Gedeelde UI componenten (Button, Badge, Card, Sheet etc) | Backlog |
| FND-002 | packages/auth/                 | Shared Auth     | Geen          | Gedeelde auth helpers + middleware factory               | Backlog |
| FND-003 | Shared constants & validations | Shared Data     | Geen          | Constanten + Zod schemas in packages/database/           | Backlog |
| FND-004 | Fix DevHub architectuur        | DevHub refactor | FND-003       | Server Components, URL-based project selectie            | Backlog |

### Dependency graph

```
FND-001 packages/ui/ (onafhankelijk)
FND-002 packages/auth/ (onafhankelijk)
FND-003 Shared constants & validations (onafhankelijk)
└── FND-004 Fix DevHub architectuur (gebruikt gedeelde constanten)

Na FND-004:
└── DH-006 AI classificatie agent
    └── DH-007 Userback API integratie
```

### Aanbevolen uitvoeringsvolgorde

1. FND-001 + FND-002 + FND-003 — **parallel mogelijk** (onafhankelijk van elkaar)
2. FND-004 (hangt af van FND-003 voor constanten)
3. Daarna: DH-006 → DH-007 (DevHub features)

### Wat wordt opgelost

| Probleem                                       | Sprint  | Impact                          |
| ---------------------------------------------- | ------- | ------------------------------- |
| UI componenten gedupliceerd (2 apps, straks 3) | FND-001 | 1 bron, 3 consumenten           |
| `getAuthenticatedUser()` 9x gekopieerd         | FND-002 | 1 definitie, alle apps          |
| Middleware 90% identiek in 2 apps              | FND-002 | Factory pattern, per-app config |
| Issue-constanten op 4+ plekken                 | FND-003 | 1 bron in database package      |
| Zod schemas gedupliceerd                       | FND-003 | 1 bron, gedeeld                 |
| Issues-pagina breekt Server Component regel    | FND-004 | Architectuur hersteld           |
| localStorage project-selectie                  | FND-004 | URL-based, SSR-compatible       |
| Sidebar client-side data fetching              | FND-004 | Server-side via props           |

---

## DevHub Fase 1 — Bug Intake & Triage

Gegenereerd op 2026-04-09 op basis van `docs/specs/prd-devhub.md` Fase 1.
Bijgewerkt op 2026-04-09: Status Page en Duplicate Detection verplaatst naar fase 2.
Requirements register: `docs/specs/requirements-devhub.md`

### Overzicht

| #      | Sprint                                | Laag              | Prerequisites                | Requirements                                                                                                             | Status           |
| ------ | ------------------------------------- | ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| DH-001 | Database: issues tabellen + RLS       | 1 - Database      | Geen                         | DATA-101..162, SEC-101..114, AUTH-103                                                                                    | Done             |
| DH-002 | Queries en mutations                  | 2 - Data access   | DH-001                       | FUNC-144..156                                                                                                            | Done             |
| DH-003 | DevHub app setup + auth + layout      | 3 - App shell     | DH-001                       | AUTH-101..106, UI-119..122                                                                                               | Done             |
| DH-004 | Issue list + filters + triage sidebar | 3 - Core UI       | DH-002, DH-003               | UI-101..109, UI-117..118, UI-126..129                                                                                    | Done             |
| DH-005 | Issue CRUD + detail + triage acties   | 3 - Core features | DH-002, DH-003, DH-004       | FUNC-101..114, FUNC-139..141, FUNC-145..146, UI-110..116                                                                 | Done             |
| DH-006 | AI classificatie agent                | 4 - AI            | DH-005, **FND-003, FND-004** | FUNC-103..104, FUNC-123..129, FUNC-143, RULE-118, EDGE-103, PERF-104                                                     | Backlog          |
| DH-007 | Userback API integratie + sync        | 5 - Integratie    | DH-006, **FND-003, FND-004** | FUNC-115..122, FUNC-126, FUNC-130..132, FUNC-142, INT-101..105, RULE-101..117, UI-123..125, EDGE-101..102, PERF-101..103 | Backlog          |
| DH-008 | Status page app                       | **Fase 2**        | DH-001, DH-002               | FUNC-133..138, SEC-115..116, UI-130..136, EDGE-104                                                                       | Backlog (fase 2) |
| DH-009 | Duplicate detection via embeddings    | **Fase 2**        | DH-001, DH-002, DH-006       | FUNC-147..152, PERF-105..106                                                                                             | Backlog (fase 2) |

### Dependency graph

```
FASE 1 (DH-001 t/m DH-005: DONE):
DH-001 Database ✓
├── DH-002 Queries ✓
│   └── DH-004 Issue list ✓
│       └── DH-005 CRUD + detail ✓
└── DH-003 App setup ✓

FOUNDATION (nieuw, voor DH-006+):
FND-001 packages/ui/ ──────────────┐
FND-002 packages/auth/ ────────────┤ parallel
FND-003 Shared constants ──────────┤
                                   └── FND-004 Fix DevHub architectuur
                                          └── DH-006 AI classificatie
                                                └── DH-007 Userback sync

FASE 2 (na fase 1):
DH-008 Status page
DH-009 Duplicate detection
```

### Aanbevolen uitvoeringsvolgorde (resterend)

1. **FND-001 + FND-002 + FND-003** (foundation — parallel)
2. **FND-004** (architectuur fix)
3. DH-006 (AI classificatie)
4. DH-007 (Userback sync → items naar triage)

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
