# Micro Sprint EX-007: Context extractor

> **Scope:** Type-specialist agent voor `context` — achtergrond, methodiek, expertise, personen-info. Gevoelige info krijgt admin-only filter.

## Doel

Achtergrond-info extracten die andere agents (Communicator, Planner) nodig hebben om te gronden. Denk aan: "X is verantwoordelijk voor Y bij klant Z", "Klant gebruikt methodiek A". Zonder deze laag hallucineren toekomstige agents over rollen en expertises.

## Requirements

| ID        | Beschrijving                                                                         |
| --------- | ------------------------------------------------------------------------------------ |
| AI-E070   | Nieuwe agent `context-extractor.ts` (Sonnet) extract context-items                   |
| AI-E071   | Retourneert optioneel `about_person` en `about_org` (namen/refs)                     |
| AI-E072   | Retourneert `domain` (methodology/background/expertise/process/preferences/personal) |
| AI-E073   | Prompt onderscheidt context (achtergrond) van need (wenselijk) en decision (beslist) |
| AI-E074   | Persoonlijke/gezondheids-context krijgt `metadata.sensitive=true` automatisch        |
| DATA-E070 | `context` in type-enum                                                               |
| FUNC-E080 | `context` in harness dropdown                                                        |
| FUNC-E081 | Context zichtbaar op organization-detail en people-detail pagina's                   |
| FUNC-E082 | Context op project-werkblad in collapsible sectie                                    |
| FUNC-E083 | Sensitive context standaard niet zichtbaar; admin kan toggle om te zien              |
| QUAL-E070 | Spot-check door Stef op 5 meetings >= 75%                                            |
| RULE-E070 | Sensitive context alleen zichtbaar via `requireAdmin()`-guard                        |
| EDGE-E070 | Context zonder about_person/about_org → scope is project/org-niveau (beide null)     |
| EDGE-E071 | Persoonlijke medische/gezin-info → `sensitive=true` automatisch                      |

## Bronverwijzingen

- EX-001 (prerequisite): tier-infrastructuur
- Bestaand: `**Context:**` markdown-tag in Summarizer

## Context

### Probleem

Context zit verspreid: soms in summaries, soms handmatig op people-detail, soms nergens. Toekomstige agents (Communicator, Planner) hebben deze grond nodig.

### Oplossing

Expliciet context-type met entity-attributie. Sensitive flag beschermt privé-info (gezondheid, gezin) — alleen zichtbaar voor admin.

### Sensitive context

Gezondheid, gezinssituatie, persoonlijke druk zijn relevant voor beschikbaarheid en inlevingsvermogen, maar niet voor algemene zichtbaarheid. `metadata.sensitive=true` + `requireAdmin()`-guard in queries.

### Files touched

| Bestand                                                          | Wijziging                                          |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `packages/ai/src/agents/test-extractors/context-extractor.ts`    | nieuw                                              |
| `packages/ai/src/validations/test-extractors/context.ts`         | nieuw                                              |
| `packages/ai/src/agents/test-extractors/registry.ts`             | entry                                              |
| `supabase/migrations/20260426000001_extraction_type_context.sql` | type-enum                                          |
| `packages/database/src/queries/context.ts`                       | `listContextForEntity(type, id, includeSensitive)` |
| `apps/cockpit/src/components/organizations/context-list.tsx`     | nieuw                                              |
| `apps/cockpit/src/components/people/context-list.tsx`            | nieuw                                              |
| `apps/cockpit/src/components/projects/context-section.tsx`       | nieuw (collapsible)                                |
| Tests                                                            | nieuw                                              |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: entity-attributie; sensitive-detection; context vs need/decision.
- [ ] Component tests: sensitive-hiding voor non-admin; collapsible.

### Database + code

- [ ] Migratie type-enum.
- [ ] Zod + agent + diverse context-voorbeelden.
- [ ] Registry + dropdown.
- [ ] Queries met sensitive-filter.
- [ ] Components op 3 locaties.

### Tunen

- [ ] 5 meetings met mix van project/person/org context.

### Validatie

- [ ] Tests groen.
- [ ] Handmatig: non-admin ziet geen sensitive context; admin wel.

## Acceptatiecriteria

- [ ] [AI-E070-E074] Agent werkt.
- [ ] [DATA-E070] DB klaar.
- [ ] [FUNC-E080-E083] UI op 3 locaties + admin-toggle.
- [ ] [QUAL-E070] Spot-check.
- [ ] [RULE-E070] Sensitive admin-only geverifieerd.
- [ ] [EDGE-E070, E071] Edge-cases.

## Dependencies

EX-001.

## Out of scope

- `subtype` (example/general) onderscheid — defer tot Tier-2 `idea` sprint als het blijkt te overlappen.
- Context-zoeken via MCP.
- Cross-project context matching.
- Auto-update van people/org profielen vanuit context.
