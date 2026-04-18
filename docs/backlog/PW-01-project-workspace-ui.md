# Micro Sprint PW-01: Project Workspace UI met bestaande data

> **Scope:** Herbouw `/projects/[id]` tot een 5-panel commandobrug. Gebruik data die er NU al is — structured `extractions` (action_items), `summaries` (markdown-parsing voor risico's/besluiten), meetings-timeline en briefings. Geen nieuwe AI-agents, geen nieuwe extractie-types.
>
> **Aanleiding:** De oorspronkelijke pijn is "project-scherm is weggestopt, ik weet niet wat te doen". Dat is een UI-probleem. Dit sprint lost 80% daarvan op met bestaande data. Verdere verfijning volgt in PW-02 (structured extractie) en PW-03 (Orchestrator).

## Doel

Aan het eind van deze sprint opent Stef `/projects/cai-studio`, ziet direct de 5 panelen uit de /shift-mockup gevuld, en weet binnen 5 seconden wat er vandaag speelt. De panels gebruiken bestaande data — sommige velden zijn via markdown-parse (tijdelijk lelijk, werkt), andere via bestaande structured queries.

## Requirements

| ID        | Beschrijving                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------- |
| FUNC-P001 | `/projects/[id]` toont header + 5 panelen in grid-layout (zie /shift mockup)                   |
| FUNC-P002 | Paneel "Risico's" toont markdown-geparseerde `**Risico:**` bullets uit `summaries.kernpunten`  |
| FUNC-P003 | Paneel "Besluiten" toont markdown-geparseerde `**Besluit:**` bullets                           |
| FUNC-P004 | Paneel "Wachten op klant" toont action_items WHERE `category='wachten_op_extern'`              |
| FUNC-P005 | Paneel "Pulse + prep" toont `briefing_summary` + aankomende geplande meetings                  |
| FUNC-P006 | Paneel "Wie wacht op wie" is placeholder met "Wordt gevuld in volgende sprint (PW-02)"         |
| FUNC-P007 | Header: klantnaam + projectnaam + status-pipeline + deadline + teamleden                       |
| FUNC-P008 | Homepage `/` heeft project-switcher bovenaan (actieve projecten als cards, sortering urgentie) |
| FUNC-P009 | Elke kaart op homepage → klik → opent direct /projects/[id]                                    |
| FUNC-P010 | Elk item in panelen heeft herkomst-link naar source meeting/email                              |
| FUNC-P011 | Lege staten per paneel ("Geen risico's gedetecteerd", etc.)                                    |
| FUNC-P012 | Quick-action chips onder elk action_item: "Toewijzen", "Draft mail", "Markeer opgelost"        |
| DATA-P010 | Nieuwe query `getProjectWorkspaceData(projectId)` — parallel load van alle panel-data          |
| DATA-P011 | Helper `parseMarkdownExtractions(kernpunten: string[])` — regex-based parser voor `**Type:**`  |
| RULE-P010 | Geen wijziging aan bestaande extractor/summarizer (die zijn stabiel)                           |
| RULE-P011 | Geen nieuwe DB-migraties                                                                       |
| EDGE-P010 | Project zonder meetings → panelen tonen leeg-staat, geen errors                                |
| EDGE-P011 | Summary met malformed markdown → parser slaat over, geen crash                                 |

## Bronverwijzingen

- Shift mockup (visie): `apps/cockpit/src/app/(dashboard)/shift/page.tsx`
- Bestaande project-pagina: `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`
- Project query: `packages/database/src/queries/projects.ts` → `getProjectById()`
- Bestaande summaries: `packages/ai/src/validations/summarizer.ts` — `kernpunten: string[]` met `**Risico:**` prefixes
- Bestaande action_items: `extractions` tabel met `type='action_item'` + category

## Context

### Probleem

De /shift-pagina laat zien wat de visie is. Maar de huidige `/projects/[id]` is een data-lijst, niet een command-center. Stef opent het nooit omdat het geen regie biedt.

### Oplossing

Rebuild met de 5-panel layout uit /shift. Data komt uit wat er al is:

| Paneel           | Bron                              | Hoe                                                                          |
| ---------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| Risico's         | `summaries.kernpunten[]`          | Markdown-parse `**Risico:** X` → `{type:'risk', content:'X'}`                |
| Besluiten        | `summaries.kernpunten[]`          | Markdown-parse `**Besluit:** X`                                              |
| Wachten op klant | `extractions`                     | Query `type='action_item' AND category='wachten_op_extern' AND project_id=X` |
| Pulse + prep     | `summaries.briefing` + `meetings` | Briefing van laatste + aankomende meetings                                   |
| Wie wacht op wie | —                                 | Placeholder tot PW-02                                                        |

Dit is **niet** een definitieve oplossing — het is een tussenstap. In PW-02 worden de panelen omgezet naar structured extractions. Maar hiermee zie je wél nu al de waarde.

### Markdown-parser

```typescript
export interface ParsedExtraction {
  type: "risico" | "besluit" | "behoefte" | "signaal" | "visie" | "afspraak" | "context";
  content: string;
  theme: string | null; // from "### [Project] Themanaam" above
}

export function parseMarkdownExtractions(kernpunten: string[]): ParsedExtraction[] {
  // Loop through kernpunten, track current theme from "### [X] Y" headers,
  // extract bullets starting with **Type:** into ParsedExtraction objects.
}
```

### Files touched

| Bestand                                                             | Wijziging                                    |
| ------------------------------------------------------------------- | -------------------------------------------- |
| `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`           | herbouw — 5-panel layout                     |
| `apps/cockpit/src/app/(dashboard)/page.tsx`                         | project-switcher bovenaan                    |
| `apps/cockpit/src/components/projects/workspace-header.tsx`         | nieuw — header met pipeline-stub             |
| `apps/cockpit/src/components/projects/risks-panel.tsx`              | nieuw (markdown-parse)                       |
| `apps/cockpit/src/components/projects/decisions-panel.tsx`          | nieuw (markdown-parse)                       |
| `apps/cockpit/src/components/projects/waiting-client-panel.tsx`     | nieuw (action_items query)                   |
| `apps/cockpit/src/components/projects/pulse-panel.tsx`              | nieuw (briefing + meetings)                  |
| `apps/cockpit/src/components/projects/waiting-placeholder.tsx`      | nieuw (stub voor PW-02)                      |
| `apps/cockpit/src/components/dashboard/project-switcher.tsx`        | nieuw (homepage cards)                       |
| `packages/database/src/queries/project-workspace.ts`                | nieuw — `getProjectWorkspaceData(projectId)` |
| `packages/ai/src/utils/summary-markdown-parser.ts`                  | nieuw — regex-parser                         |
| `packages/ai/__tests__/utils/summary-markdown-parser.test.ts`       | nieuw — parse edge-cases                     |
| `apps/cockpit/src/components/projects/__tests__/workspace.test.tsx` | component-tests per paneel                   |

## Prerequisites

Geen. Alle benodigde data + componenten bestaan al.

## Taken

### TDD-first

- [ ] `summary-markdown-parser.test.ts`: parse een voorbeeld-kernpunten array met thema-headers + 5 type-bullets → juiste output; malformed markdown → skip zonder error.
- [ ] Component tests per paneel: lege staat; gevuld met 0/3/10 items; herkomst-link aanwezig.

### Implementatie

- [ ] Parser schrijven.
- [ ] Query `getProjectWorkspaceData` — parallel load van alle panel-data.
- [ ] 5 panel-components.
- [ ] Herbouw `/projects/[id]/page.tsx`.
- [ ] Project-switcher op homepage.
- [ ] Sortering op homepage: projecten met urgente action_items eerst.

### Validatie

- [ ] `npm run type-check` + `lint` + `test` groen.
- [ ] Handmatig: open 3 verschillende projecten, alle panelen gevuld of met lege-staat.
- [ ] Handmatig: vanaf homepage → klik project → binnen 3 sec op werkblad.

## Acceptatiecriteria

- [ ] [FUNC-P001-P012] Panelen werken met bestaande data.
- [ ] [DATA-P010-P011] Queries + parser werken.
- [ ] [RULE-P010-P011] Geen agent/migratie wijzigingen.
- [ ] [EDGE-P010-P011] Edge-cases gedekt.
- [ ] 5 seconden-test: open project X, binnen 5 sec weet je de topprioriteit.

## Dependencies

Geen.

## Out of scope

- Structured extractie van risico's/besluiten (komt in PW-02 — panelen schakelen dan over van markdown-parse naar DB-query).
- Wie-wacht-op-wie data (placeholder tot PW-02 commitments extract).
- Project Orchestrator "Next actions" AI-paneel (komt in PW-03).
- Action composers (draft mail, scheduling) — wel chip in UI, geen werkende flow nog.
