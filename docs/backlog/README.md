# Backlog: Single Responsibility Fixes

Gegenereerd op 2026-03-30 op basis van audit bevindingen.

## Overzicht

| # | Sprint | Prioriteit | Prerequisites | Fixes | Status |
|---|--------|-----------|---------------|-------|--------|
| 01 | Security & Validatie | KRITIEK | Geen | F1, F2, F3 | Backlog |
| 02 | Pagina's opsplitsen (SRP) | Middel | Geen | F4, F5 | Backlog |
| 03 | API Routes refactoren | Middel | 01 | F6, F7 | Backlog |
| 04 | Structuur & Cleanup | Laag | 01, 03 | F8-F13 | Backlog |

## Dependency graph

```
01 Security & Validatie
├── 03 API Routes refactoren
│   └── 04 Structuur & Cleanup
│
02 Pagina's opsplitsen (onafhankelijk)
```

Sprint 02 is onafhankelijk en kan parallel met elke andere sprint worden uitgevoerd.

## Alle fixes

| Fix | Beschrijving | Sprint | Complexiteit |
|-----|-------------|--------|-------------|
| F1 | SQL injection fix: whitelist voor table parameter | 01 | Laag |
| F2 | Zod schemas toevoegen voor alle Server Actions | 01 | Middel |
| F3 | Standaardiseer action return types | 01 | Laag |
| F4 | Architectuur pagina opsplitsen (823 regels) | 02 | Middel |
| F5 | Help pagina opsplitsen (278 regels) | 02 | Laag |
| F6 | Fireflies ingest route naar thin gateway | 03 | Laag |
| F7 | Fireflies webhook route naar thin gateway | 03 | Laag |
| F8 | Directe DB calls uit services halen | 04 | Middel |
| F9 | Actions folder verplaatsen naar src/actions/ | 04 | Laag (veel bestanden) |
| F10 | Login naar (auth) route group | 04 | Laag |
| F11 | MCP tools type safety (12x any verwijderen) | 04 | Middel |
| F12 | Hardcoded config values centraliseren | 04 | Laag |
| F13 | entity-resolution.ts splitsen | 04 | Laag |

## Totaal

- Sprints: 4
- Fixes: 13
- Geschatte inspanning: 4 Claude Code sessies (sprint 04 kan evt. 2 sessies nodig hebben)
