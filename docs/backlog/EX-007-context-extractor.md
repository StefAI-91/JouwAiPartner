# Micro Sprint EX-007: Context extractor

> **Scope:** Type-specialist agent voor `context` — achtergrond, methodiek, expertise, personen-info. Geen primair paneel in project-werkblad; voedt latere agents die context nodig hebben om te gronden.

## Doel

Achtergrond-informatie extracten die andere agents nodig hebben om goede output te leveren. Denk aan: "X is verantwoordelijk voor Y bij klant Z", "Klant gebruikt methodiek A", "Persoon X heeft achtergrond in B". Zonder deze laag hallucineren toekomstige agents over rollen en expertises.

## Requirements

| ID        | Beschrijving                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- |
| AI-E070   | Nieuwe agent `context-extractor.ts` (Sonnet) extract context-items                                       |
| AI-E071   | Retourneert optioneel `about_person` (UUID reference) en `about_org` (UUID reference) — via entity-match |
| AI-E072   | Retourneert `domain` (methodology/background/expertise/process/preferences/personal)                     |
| AI-E073   | Retourneert `subtype` (example/general) voor onderscheid tussen illustratieve voorbeelden en algemeen    |
| AI-E074   | Prompt onderscheidt context (achtergrond, geen acting) van need (wenselijk) en decision (beslist)        |
| AI-E075   | Persoonlijke/gezondheids-context krijgt `metadata.sensitive=true` en wordt alleen admin-zichtbaar        |
| DATA-E070 | `context` in type-enum                                                                                   |
| DATA-E071 | `metadata.sensitive` flag gedocumenteerd; UI-filter respects deze                                        |
| FUNC-E080 | `context` in harness dropdown                                                                            |
| FUNC-E081 | Context-items zichtbaar op organization-detail en people-detail pagina's                                 |
| FUNC-E082 | Context op project-werkblad alleen secundair (collapsible: "Context bij dit project")                    |
| FUNC-E083 | Sensitive context standaard niet zichtbaar; admin-only toggle                                            |
| QUAL-E070 | Spot-check 5 meetings >= 75% (subjectief type)                                                           |
| RULE-E070 | untuned context niet in productie                                                                        |
| RULE-E071 | Sensitive context alleen zichtbaar met `requireAdmin()`                                                  |
| EDGE-E070 | Context zonder duidelijke about_person/about_org → beide null, scope is project/org-niveau               |
| EDGE-E071 | Persoonlijke medische/gezin-info → `sensitive=true` automatisch                                          |

## Bronverwijzingen

- EX-001 (infrastructuur)
- Vision: §5.2 knowledge graph
- Bestaand: `**Context:**` markdown-tag in Summarizer

## Context

### Probleem

Context zit nu verspreid: sommige in summaries (methodologie-beschrijvingen), sommige in people-detail pagina's (handmatig ingevoerd), sommige nergens. Wanneer een toekomstige Communicator of Planner context nodig heeft om een klant-antwoord of PRD te schrijven, moet hij overal samenzoeken.

### Oplossing

Expliciet context-type met entity-attributie. Een context-item kan over een persoon, een organisatie, of een project gaan. Het subtype "example" markeert illustratieve voorbeelden apart zodat ze anders getoond kunnen worden.

### Sensitive context

Gezondheid, gezinssituatie, persoonlijke druk — deze info is relevant voor beschikbaarheid en inlevingsvermogen, maar niet voor algemene zichtbaarheid. `metadata.sensitive=true` zorgt dat deze items alleen met admin-toegang zichtbaar zijn.

### Files touched

| Bestand                                                          | Wijziging                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/ai/src/agents/test-extractors/context-extractor.ts`    | nieuw                                                      |
| `packages/ai/src/validations/test-extractors/context.ts`         | nieuw                                                      |
| `packages/ai/src/agents/test-extractors/registry.ts`             | entry                                                      |
| `supabase/migrations/20260426000001_extraction_type_context.sql` | nieuw                                                      |
| `packages/database/src/queries/context.ts`                       | nieuw — `listContextForEntity(type, id, includeSensitive)` |
| `apps/cockpit/src/components/organizations/context-list.tsx`     | nieuw                                                      |
| `apps/cockpit/src/components/people/context-list.tsx`            | nieuw                                                      |
| `apps/cockpit/src/components/projects/context-section.tsx`       | nieuw (collapsible)                                        |
| Tests                                                            | nieuw                                                      |

## Prerequisites

EX-000, EX-001 done.

## Taken

### TDD-first

- [ ] Agent tests: entity-attributie; sensitive-detection; onderscheid context/need/decision.
- [ ] Component tests: sensitive-hiding voor non-admin; collapsible behavior.

### Database

- [ ] Migratie type-enum + metadata veldconventies.

### Agent + Harness

- [ ] Zod schema + prompt met diverse context-voorbeelden.
- [ ] Registry entry + dropdown.

### UI

- [ ] Queries met sensitive-filter.
- [ ] Components op org / people / project detail.

### Tunen

- [ ] 5 meetings met mix van project/person/org context.

### Validatie

- [ ] Tests groen.
- [ ] Handmatig: non-admin ziet geen sensitive context; admin wel.

## Acceptatiecriteria

- [ ] [AI-E070-E075] Agent werkt.
- [ ] [DATA-E070, E071] DB klaar, sensitive-flag werkt.
- [ ] [FUNC-E080-E083] UI op drie locaties functioneel.
- [ ] [QUAL-E070] Spot-check.
- [ ] [RULE-E070, E071] untuned hidden + sensitive admin-only.
- [ ] [EDGE-E070, E071] Edge-cases.

## Dependencies

EX-001.

## Out of scope

- Context-zoeken via MCP (later).
- Cross-project context matching ("Weten we dit al bij andere klanten?").
- Auto-update van people/org profielen op basis van context.
