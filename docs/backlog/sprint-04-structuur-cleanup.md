# Micro Sprint 04: Structuur & Cleanup

## Doel

Zes losse structuurproblemen oplossen die de codebase-conventie uit CLAUDE.md schenden: directe DB calls in services (moeten via queries/actions), actions op verkeerde plek, login route buiten (auth) group, `any` casts in MCP tools, hardcoded config values in dashboard components, en een te groot service bestand. Elk probleem is klein maar samen verbeteren ze de consistentie en type safety van de codebase significant.

## Fixes

| # | Beschrijving |
|---|---|
| F8 | Directe DB calls uit services halen naar queries/actions |
| F9 | Actions folder verplaatsen van `src/lib/actions/` naar `src/actions/` |
| F10 | Login route verplaatsen naar `(auth)` route group |
| F11 | MCP tools type safety: 12x `any` casts vervangen door typed interfaces |
| F12 | Hardcoded config values in dashboard components centraliseren |
| F13 | `entity-resolution.ts` splitsen in project- en organisatie-resolutie |

## Context

### F8: Directe DB calls in services

CLAUDE.md regel: "Centraliseer queries in lib/queries/. Een plek per domein." en "Data muteren via Server Actions."

Drie service files maken directe `.from()` calls:

**`src/lib/services/embed-pipeline.ts`** (88 regels):
- Regel 48-52: `getAdminClient().from("meetings").select("title, participants, summary").eq("id", meetingId).single()` -- moet naar `lib/queries/meetings.ts` als `getMeetingForEmbedding(meetingId)`
- Regel 71-73: `getAdminClient().from("extractions").select("id, content").eq("meeting_id", meetingId)` -- moet naar `lib/queries/extractions.ts` (nieuw) als `getExtractionsByMeetingId(meetingId)`

**`src/lib/services/gatekeeper-pipeline.ts`** (189 regels):
- Regel 146-149: `getAdminClient().from("meetings").update({ raw_fireflies }).eq("id", meetingId)` -- moet naar `lib/actions/meetings.ts` als `updateMeetingRawFireflies(meetingId, rawFireflies)`

**`src/lib/services/save-extractions.ts`** (91 regels):
- Regel 79: `getAdminClient().from("extractions").insert(rows)` -- moet naar `lib/actions/extractions.ts` (nieuw) als `insertExtractions(rows)`

### F9: Actions folder locatie

CLAUDE.md projectstructuur specificeert: `src/actions/ -- Server Actions, gegroepeerd per domein`. Huidige locatie: `src/lib/actions/`. Alle 6 action files + alle imports moeten verplaatst worden.

Bestanden om te verplaatsen:
- `src/lib/actions/action-items.ts` --> `src/actions/action-items.ts`
- `src/lib/actions/decisions.ts` --> `src/actions/decisions.ts`
- `src/lib/actions/embeddings.ts` --> `src/actions/embeddings.ts`
- `src/lib/actions/meeting-participants.ts` --> `src/actions/meeting-participants.ts`
- `src/lib/actions/meetings.ts` --> `src/actions/meetings.ts`
- `src/lib/actions/projects.ts` --> `src/actions/projects.ts`

Alle imports moeten worden bijgewerkt van `@/lib/actions/...` naar `@/actions/...`. Dit raakt meerdere service files en mogelijk andere importers.

Let op: `@/*` mapped naar `./src/*` (zie CLAUDE.md). Dus `@/actions/meetings` resolved naar `src/actions/meetings.ts`.

### F10: Login route locatie

CLAUDE.md structuur specificeert:
```
src/app/
  (auth)/          # Publieke routes (geen auth vereist)
    login/page.tsx
    reset-password/page.tsx
```

Huidige locatie: `src/app/login/page.tsx`. Er is geen `(auth)` route group.

Actie:
1. Maak `src/app/(auth)/` folder
2. Verplaats `src/app/login/` naar `src/app/(auth)/login/`
3. Check of er een layout in `(auth)` nodig is (waarschijnlijk niet voor nu)
4. Update eventuele hardcoded links naar `/login` (die hoeven NIET te wijzigen want (auth) is een route group, geen URL segment)

Belangrijk: route groups met `()` veranderen de URL niet. `/login` blijft `/login`. Alleen de bestandslocatie verandert.

### F11: MCP tools `any` casts

12 plekken in `src/lib/mcp/tools/` gebruiken `any` voor Supabase join responses:

```
people.ts:46       (p: any, i: number)
organizations.ts:54 (org: any, i: number)
actions.ts:90      (item: any, i: number)
projects.ts:78     (p: any, i: number)
search.ts:54       (r: any, i: number)
decisions.ts:89    (d: any, i: number)
list-meetings.ts:140 (m: any, i: number)
meetings.ts:79     (m: any)
meetings.ts:115    (item: any, i: number)
get-organization-overview.ts:76  (p: any, i: number)
get-organization-overview.ts:88  (m: any, i: number)
get-organization-overview.ts:123 (item: any, i: number)
```

Actie:
1. Maak `src/lib/types/mcp.ts` met interfaces voor elk response type (MeetingRow, ExtractionRow, PersonRow, ProjectRow, OrganizationRow, DecisionRow, ActionItemRow, SearchResult)
2. Baseer de interfaces op de Supabase `.select()` calls in elke tool -- de interface bevat exact de geselecteerde kolommen
3. Vervang `any` casts door de juiste interface

### F12: Hardcoded config in dashboard components

Drie dashboard components bevatten hardcoded waarden:

**`src/components/dashboard/action-items-card.tsx`**:
- Locale `"nl-NL"` in `toLocaleDateString` (regel 25)

**`src/components/dashboard/decisions-card.tsx`**:
- Locale `"nl-NL"` (regel 11)
- Truncate length `120` voor decision text (regel 45)
- Truncate length `40` voor meeting title (regel 59)

**`src/components/dashboard/meetings-card.tsx`**:
- Locale `"nl-NL"` (regel 12)
- Relevance thresholds `0.8` en `0.6` (regels 25-26)

Actie: Maak `src/lib/config/dashboard.ts` met:
```typescript
export const DASHBOARD = {
  locale: "nl-NL",
  truncate: { decision: 120, meetingTitle: 40 },
  relevance: { high: 0.8, medium: 0.6 },
} as const;
```

### F13: entity-resolution.ts splitsen

`src/lib/services/entity-resolution.ts` (146 regels) bevat twee onafhankelijke concerns:
- Regels 1-106: Project resolutie (`resolveProject`, `resolveProjectWithCache`, `resolveAllEntities`)
- Regels 108-146: Organisatie resolutie (`resolveOrganization`)

Splits in:
- `src/lib/services/entity-resolution-projects.ts` -- project resolutie functies
- `src/lib/services/entity-resolution-organizations.ts` -- organisatie resolutie functie

Callers:
- `src/lib/services/gatekeeper-pipeline.ts` importeert `resolveOrganization` (regel 5)
- `src/lib/services/save-extractions.ts` importeert `resolveAllEntities` (regel 2)

Update imports in beide callers.

## Prerequisites

- [ ] Sprint 01 moet afgerond zijn (F9 verplaatst de actions die in sprint 01 Zod validatie krijgen)
- [ ] Sprint 03 moet afgerond zijn (F8 raakt services die in sprint 03 worden geherschreven)

## Taken

- [ ] **Taak 1: [F8] Query/action functies voor directe DB calls** --
  - Voeg `getMeetingForEmbedding(meetingId)` toe aan `src/lib/queries/meetings.ts`
  - Maak `src/lib/queries/extractions.ts` met `getExtractionsByMeetingId(meetingId)`
  - Voeg `updateMeetingRawFireflies(meetingId, rawFireflies)` toe aan de meetings action
  - Maak `src/actions/extractions.ts` met `insertExtractions(rows)`
  - Vervang directe calls in de drie service files door de nieuwe functies

- [ ] **Taak 2: [F9] Actions verplaatsen** --
  - Maak `src/actions/` folder
  - Verplaats alle 6 bestanden uit `src/lib/actions/` naar `src/actions/`
  - Update alle imports in het project (`@/lib/actions/...` --> `@/actions/...`)
  - Verwijder lege `src/lib/actions/` folder

- [ ] **Taak 3: [F10] Login route verplaatsen** --
  - Maak `src/app/(auth)/` folder
  - Verplaats `src/app/login/` naar `src/app/(auth)/login/`
  - Controleer of middleware.ts login-pad referenties correct zijn (route groups wijzigen URL niet)

- [ ] **Taak 4: [F11] MCP types en any-vervanging** --
  - Maak `src/lib/types/mcp.ts` met interfaces voor alle response types
  - Vervang alle 12 `any` casts in `src/lib/mcp/tools/` door typed interfaces

- [ ] **Taak 5: [F12 + F13] Config centraliseren + entity-resolution splitsen** --
  - Maak `src/lib/config/dashboard.ts` met gecentraliseerde constanten
  - Update de drie dashboard components om de config te gebruiken
  - Split `entity-resolution.ts` in twee bestanden en update callers

- [ ] **Taak 6: Verify** -- Run `npm run build` en `npm run lint`.

## Acceptatiecriteria

- [ ] [F8] Geen enkel bestand in `src/lib/services/` importeert `getAdminClient` of doet directe `.from()` calls (behalve voor reads die al in queries zitten)
- [ ] [F8] Alle DB reads gaan via `lib/queries/`, alle mutations via `actions/`
- [ ] [F9] Folder `src/lib/actions/` bestaat niet meer
- [ ] [F9] Alle actions staan in `src/actions/`
- [ ] [F9] Alle imports in het project verwijzen naar `@/actions/...`
- [ ] [F10] `src/app/login/` bestaat niet meer
- [ ] [F10] `src/app/(auth)/login/page.tsx` bestaat
- [ ] [F10] De URL `/login` werkt nog steeds (route group verandert URL niet)
- [ ] [F11] Geen `any` casts meer in `src/lib/mcp/tools/` (behalve met `// TODO: type this` commentaar als Supabase types het onmogelijk maken)
- [ ] [F11] `src/lib/types/mcp.ts` bevat typed interfaces voor alle MCP response types
- [ ] [F12] Geen hardcoded locale, thresholds of truncate lengths in dashboard components
- [ ] [F12] `src/lib/config/dashboard.ts` bevat alle gecentraliseerde waarden
- [ ] [F13] `src/lib/services/entity-resolution.ts` bestaat niet meer
- [ ] [F13] `entity-resolution-projects.ts` en `entity-resolution-organizations.ts` bestaan
- [ ] [F13] Callers zijn bijgewerkt naar de nieuwe imports
- [ ] `npm run build` slaagt zonder fouten
- [ ] `npm run lint` slaagt zonder fouten

## Geraakt door deze sprint

- `src/lib/queries/meetings.ts` (wijziging -- nieuwe query functie)
- `src/lib/queries/extractions.ts` (nieuw)
- `src/actions/meetings.ts` (wijziging -- nieuwe action functie; was `src/lib/actions/meetings.ts`)
- `src/actions/extractions.ts` (nieuw)
- `src/actions/action-items.ts` (verplaatst van `src/lib/actions/`)
- `src/actions/decisions.ts` (verplaatst)
- `src/actions/embeddings.ts` (verplaatst)
- `src/actions/meeting-participants.ts` (verplaatst)
- `src/actions/projects.ts` (verplaatst)
- `src/lib/services/embed-pipeline.ts` (wijziging -- directe calls vervangen)
- `src/lib/services/gatekeeper-pipeline.ts` (wijziging -- directe calls vervangen + imports)
- `src/lib/services/save-extractions.ts` (wijziging -- directe calls vervangen + imports)
- `src/lib/services/entity-resolution.ts` (verwijderd)
- `src/lib/services/entity-resolution-projects.ts` (nieuw)
- `src/lib/services/entity-resolution-organizations.ts` (nieuw)
- `src/app/(auth)/login/page.tsx` (verplaatst van `src/app/login/`)
- `src/lib/types/mcp.ts` (nieuw)
- `src/lib/mcp/tools/*.ts` (wijziging -- 8+ bestanden, any casts vervangen)
- `src/lib/config/dashboard.ts` (nieuw)
- `src/components/dashboard/action-items-card.tsx` (wijziging)
- `src/components/dashboard/decisions-card.tsx` (wijziging)
- `src/components/dashboard/meetings-card.tsx` (wijziging)
- Alle bestanden die `@/lib/actions/` importeren (wijziging -- import paden)

## Complexiteit

**Hoog** -- Dit is de grootste sprint met 6 onafhankelijke fixes die samen veel bestanden raken. De individuele wijzigingen zijn mechanisch, maar het volume is groot. Overweeg om deze sprint te splitsen als het te veel wordt in een sessie. Natuurlijke splitsing: F8+F9+F13 (services/actions) als een sprint, F10+F11+F12 (routes/types/config) als een tweede.
