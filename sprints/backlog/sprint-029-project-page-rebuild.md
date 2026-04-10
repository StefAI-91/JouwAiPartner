# Sprint 017: Project Page Rebuild (v3)

## Doel

De projectpagina herbouwen op basis van het test-project prototype: AI-summaries (context + briefing) bovenaan, actiepunten met overdue-detectie, besluiten, open behoeften, en meeting-historie. Inclusief projectlijst met filtering en de mogelijkheid om projectvelden te bewerken (eigenaar, contactpersoon, deadline, beschrijving).

## Requirements

| ID       | Beschrijving                                                                |
| -------- | --------------------------------------------------------------------------- |
| UI-030   | Project detail pagina: header met eigenaar, contactpersoon, datum, deadline |
| UI-031   | Project detail: AI Project Context summary sectie                           |
| UI-032   | Project detail: AI Briefing sectie met forward-looking analyse              |
| UI-033   | Project detail: organisatie-profiel (inklapbaar met org summary)            |
| UI-034   | Project detail: actiepunten sectie met overdue-detectie en status-counts    |
| UI-035   | Project detail: besluiten sectie met visueel onderscheid                    |
| UI-036   | Project detail: open behoeften sectie                                       |
| UI-037   | Project detail: meetings historie sectie                                    |
| UI-038   | Project detail: edit modal uitbreiden met nieuwe velden                     |
| UI-039   | Project lijst: filtering op status en organisatie                           |
| UI-040   | Project lijst: projectcard uitbreiden met deadline en eigenaar              |
| FUNC-041 | Server Action: updateProject met alle nieuwe velden                         |
| FUNC-042 | Tasks integratie: toon promoted tasks bij actiepunten                       |

## Bronverwijzingen

- Prototype: `apps/cockpit/src/app/(dashboard)/test-project/page.tsx` (design referentie)
- Huidige project detail: `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx`
- Huidige project componenten: `apps/cockpit/src/components/projects/`

## Context

### Design richting (gevalideerd via prototype)

- **Geen tabs** — alles op één scrollbare pagina
- **Typography-driven hierarchie** — groene uppercase sectie-headers, font-size voor onderscheid
- **Row-based layouts** — `space-y-2` met `bg-muted/30` rijen, geen gekleurde borders
- **Monochroom + brand-groen** — kleur alleen op headers, status-pipeline, overdue
- **Dichte spacing** — professioneel, niet airy
- **Inklapbare secties** — afgeronde actiepunten, bedrijfsprofiel

### Paginastructuur (van boven naar beneden)

```
1. Header: org naam, projectnaam (groen), status pipeline, meta (eigenaar, contact, dates)
2. Project Context: AI-samenvatting, neutraal, voor iedereen
3. AI Briefing: forward-looking, risico's, aanbevelingen
4. Bedrijfsprofiel: inklapbaar, org summary
5. Actiepunten: open (met overdue), afgerond (ingeklapt)
6. Besluiten: met context en bron
7. Open behoeften: met bron
8. Meetings: chronologisch, type + datum
```

### Tasks integratie

Actiepunten komen uit twee bronnen:

1. **Extracties** met type `action_item` (AI-geëxtraheerd)
2. **Tasks** tabel (promoted vanuit extracties)

Toon promoted tasks bij de actiepunten-sectie. Als een extractie een task heeft → toon task-status (active/done/dismissed). Anders → toon extractie-metadata (assignee, due_date uit metadata).

### Relevante business rules

- **Alleen verified content tonen** — draft extracties niet op de projectpagina
- **Project Context summary kan leeg zijn** — toon dan "Nog geen samenvatting beschikbaar"
- **AI Briefing kan leeg zijn** — toon dan "Nog geen briefing beschikbaar"

## Prerequisites

- [ ] Sprint 015: Database extensions
- [ ] Sprint 016: AI Summary pipeline

## Taken

### Project detail pagina

- [ ] Herbouw `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` — query met nieuwe velden + summaries
- [ ] Component: `ProjectHeader` — naam, org, status pipeline, eigenaar, contact, dates, deadline countdown
- [ ] Component: `ProjectSummary` — toont Project Context summary met meta (bijgewerkt, bron-count)
- [ ] Component: `ProjectBriefing` — toont AI Briefing met aanbeveling-blok
- [ ] Component: `OrgProfile` — inklapbaar, toont org summary
- [ ] Component: `ActionItemsList` — open items met overdue-detectie, afgerond ingeklapt, tasks-integratie
- [ ] Component: `DecisionsList` — besluiten met context, bron, datum, besluitnemers
- [ ] Component: `NeedsList` — open behoeften met bron
- [ ] Component: `MeetingsList` — meetings met type, participants, datum
- [ ] Component: `EditProject` uitbreiden — description, owner_id, contact_person_id, start_date, deadline

### Project lijst pagina

- [ ] Filter component: filter op status (dropdown) en organisatie (dropdown)
- [ ] `ProjectCard` uitbreiden met deadline en eigenaar

### Server Actions

- [ ] `updateProjectAction` uitbreiden met nieuwe velden + Zod validatie

### Queries

- [ ] `getProjectById` uitbreiden: owner join, contact_person join, latest summaries, tasks voor extracties

## Acceptatiecriteria

- [ ] [UI-030] Header toont eigenaar, contactpersoon, start/einddatum, deadline countdown
- [ ] [UI-031] Project Context summary zichtbaar bovenaan, of empty state
- [ ] [UI-032] AI Briefing zichtbaar met aanbeveling, of empty state
- [ ] [UI-033] Organisatie-profiel inklapbaar met org summary
- [ ] [UI-034] Actiepunten tonen overdue-count, "Xd overdue" in groen, afgerond ingeklapt
- [ ] [UI-035] Besluiten visueel onderscheidbaar (font-semibold, subtiele left-border)
- [ ] [UI-036] Open behoeften tonen bron-meeting
- [ ] [UI-037] Meetings tonen type, participants, datum
- [ ] [UI-038] Edit modal accepteert alle nieuwe velden
- [ ] [UI-039] Projectlijst filtert op status en organisatie
- [ ] [UI-040] ProjectCard toont deadline en eigenaar
- [ ] [FUNC-041] Server Action valideert en slaat alle velden op
- [ ] [FUNC-042] Promoted tasks verschijnen bij actiepunten met juiste status

## Geraakt door deze sprint

- `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` (gewijzigd — volledig herbouw)
- `apps/cockpit/src/app/(dashboard)/projects/page.tsx` (gewijzigd — filters toevoegen)
- `apps/cockpit/src/components/projects/project-header.tsx` (nieuw)
- `apps/cockpit/src/components/projects/project-summary.tsx` (nieuw)
- `apps/cockpit/src/components/projects/project-briefing.tsx` (nieuw)
- `apps/cockpit/src/components/projects/org-profile.tsx` (nieuw)
- `apps/cockpit/src/components/projects/action-items-list.tsx` (nieuw)
- `apps/cockpit/src/components/projects/decisions-list.tsx` (nieuw)
- `apps/cockpit/src/components/projects/needs-list.tsx` (nieuw)
- `apps/cockpit/src/components/projects/meetings-list.tsx` (nieuw)
- `apps/cockpit/src/components/projects/project-sections.tsx` (verwijderd — vervangen door losse componenten)
- `apps/cockpit/src/components/projects/project-card.tsx` (gewijzigd — deadline + eigenaar)
- `apps/cockpit/src/components/projects/edit-project.tsx` (gewijzigd — nieuwe velden)
- `apps/cockpit/src/actions/entities.ts` (gewijzigd — uitgebreide updateProjectAction)
- `packages/database/src/queries/projects.ts` (gewijzigd — extra joins + summaries)
