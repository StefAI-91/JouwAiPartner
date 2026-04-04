# Sprint 018: Organization Page + AI Summary (v3)

## Doel

De organisatie-pagina (`/clients/[id]`) uitbouwen met AI-gegenereerde bedrijfssummaries (context + briefing), gekoppelde projecten met status, contactpersonen, en meeting-historie. Dezelfde summary-pipeline uit sprint 016 wordt hier hergebruikt voor organisaties.

## Requirements

| ID       | Beschrijving                                                              |
| -------- | ------------------------------------------------------------------------- |
| UI-041   | Organization detail pagina: header met type, status, contactinfo          |
| UI-042   | Organization detail: AI Context summary (wie is dit bedrijf)              |
| UI-043   | Organization detail: AI Briefing (klant-status, aandachtspunten)          |
| UI-044   | Organization detail: gekoppelde projecten met status-pipeline             |
| UI-045   | Organization detail: contactpersonen (people gekoppeld aan org)           |
| UI-046   | Organization detail: meeting-historie per organisatie                     |
| UI-047   | Organization lijst: filtering op type (client/partner/supplier) en status |
| FUNC-043 | Server Action: update organization met uitgebreide velden                 |
| FUNC-044 | Summary pipeline triggert ook voor organization bij meeting verificatie   |

## Bronverwijzingen

- Platform spec: `docs/specs/platform-spec.md` -> sectie "10.1 Cockpit" (clients pagina)
- Huidige clients pagina: `apps/cockpit/src/app/(dashboard)/clients/`
- Summary pipeline: sprint-016

## Context

### Paginastructuur (van boven naar beneden)

```
1. Header: org naam, type badge (client/partner/supplier), status, contact email
2. Organization Context: AI-samenvatting, wie is dit bedrijf, relatie met ons
3. AI Briefing: klant-sentiment, lopende aandachtspunten, risico's
4. Projecten: cards van gekoppelde projecten met status pipeline + deadline
5. Contactpersonen: people met organization_id = deze org
6. Meetings: alle meetings gekoppeld aan deze org, chronologisch
```

### Relatie met sprint 016

De summary-pipeline uit sprint 016 genereert al summaries voor entity_type = 'organization'. Deze sprint bouwt alleen de UI die ze toont. Geen nieuwe AI-code nodig.

### People-Organization link

Sinds migratie `20260401000003` heeft de `people` tabel een `organization_id` FK. Externe contactpersonen zijn people met `organization_id` = deze org en `team IS NULL`. Interne teamleden hebben `team NOT NULL`.

## Prerequisites

- [ ] Sprint 015: Database extensions (summaries tabel)
- [ ] Sprint 016: AI Summary pipeline (org summaries worden gegenereerd)
- [ ] Sprint 017: Project page rebuild (projectcards hergebruiken)

## Taken

### Organization detail pagina

- [ ] Herbouw `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` — of maak als deze niet bestaat
- [ ] Component: `OrgHeader` — naam, type badge, status, email, contactpersoon
- [ ] Component: `OrgSummary` — toont Organization Context summary
- [ ] Component: `OrgBriefing` — toont Organization Briefing
- [ ] Component: `OrgProjects` — lijst van gekoppelde projecten met StatusPipeline + deadline
- [ ] Component: `OrgContacts` — people met organization_id = deze org
- [ ] Component: `OrgMeetings` — meetings met organization_id = deze org

### Organization lijst pagina

- [ ] Filter component: filter op type (client/partner/supplier) en status (prospect/active/inactive)

### Queries

- [ ] `getOrganizationById` aanmaken/uitbreiden: org + projects + people + meetings + latest summaries
- [ ] `listOrganizations` uitbreiden: project count, last meeting date

### Server Actions

- [ ] `updateOrganizationAction` uitbreiden met Zod validatie

## Acceptatiecriteria

- [ ] [UI-041] Header toont org naam, type, status, contactinfo
- [ ] [UI-042] Organization Context summary zichtbaar, of empty state
- [ ] [UI-043] Organization Briefing zichtbaar, of empty state
- [ ] [UI-044] Gekoppelde projecten tonen met status pipeline en deadline
- [ ] [UI-045] Contactpersonen van deze org zichtbaar
- [ ] [UI-046] Meetings van deze org chronologisch zichtbaar
- [ ] [UI-047] Organisatielijst filtert op type en status
- [ ] [FUNC-043] Server Action valideert en slaat org-wijzigingen op
- [ ] [FUNC-044] Meeting verificatie triggert org summary update (al gebouwd in sprint 016)

## Geraakt door deze sprint

- `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` (nieuw of gewijzigd — detail pagina)
- `apps/cockpit/src/app/(dashboard)/clients/page.tsx` (gewijzigd — filters)
- `apps/cockpit/src/components/organizations/org-header.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-summary.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-briefing.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-projects.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-contacts.tsx` (nieuw)
- `apps/cockpit/src/components/organizations/org-meetings.tsx` (nieuw)
- `packages/database/src/queries/organizations.ts` (gewijzigd — getOrganizationById + summaries)
- `apps/cockpit/src/actions/entities.ts` (gewijzigd — updateOrganizationAction)
