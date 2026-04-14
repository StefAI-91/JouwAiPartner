# Sprint 032: Administratie datamodel — `organizations.type` uitbreiding

> **Scope-afbakening.** Eerste sprint van de Administratie-tranche. Alleen database-niveau werk: de bestaande `organizations.type` CHECK constraint uitbreiden, de eigen bedrijfsrij op `internal` zetten, en een helper-query toevoegen. Geen route, geen UI, geen tabs. Geen tasks-integratie. Dit legt het fundament voor de latere `/administratie` sectie (vervolg-sprint).

## Doel

Externe adviseurs (boekhouder, fiscalist, jurist, notaris) en de eigen bedrijfsentiteit (Jouw AI Partner / Flowwijs) krijgen een eigen relatie-type in `organizations.type`. Zo kan er in een vervolg-sprint een UI-sectie `/administratie` gebouwd worden die financiële en juridische correspondentie groepeert zonder dat die onder klantprojecten valt.

De keuze is om de **bestaande `type` kolom uit te breiden** in plaats van een nieuwe `relationship_type` kolom toe te voegen — de bestaande kolom dekt exact dit concept (zie migratie `20260329000004_organizations_people_projects.sql`). Een nieuwe kolom zou dubbelop zijn en bestaande queries raken zonder toegevoegde waarde.

Taal-afspraak (vastgelegd in RULE-007): DB-waardes blijven Engels voor technische consistentie met bestaande `email_type`, `party_type`, `meeting_type` en voor gelijklopende classifier-output. UI-labels zijn consequent Nederlands ("Adviseur", "Intern", "Klant", "Partner", "Leverancier", "Overig").

## Requirements

> Nieuwe IDs. Toevoegen aan `docs/specs/requirements.md` in de bestaande secties (Datamodel / Functioneel / Business rules). Bestaande `DATA-005..010` over `organizations` blijven geldig — dit is een uitbreiding, geen vervanging.

| ID       | Beschrijving                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-054 | `organizations.type` CHECK constraint accepteert de waarde `'advisor'` voor externe adviseurs (boekhouder, fiscalist, jurist, notaris).                                                |
| DATA-055 | `organizations.type` CHECK constraint accepteert de waarde `'internal'` voor de eigen bedrijfsentiteit (Jouw AI Partner / Flowwijs).                                                   |
| DATA-056 | De seed-rij voor Flowwijs (`a0000000-0000-0000-0000-000000000001`) heeft `type = 'internal'` in plaats van `'other'`.                                                                  |
| DATA-057 | Toegestane waardes voor `organizations.type` zijn na deze sprint: `'client' \| 'partner' \| 'supplier' \| 'advisor' \| 'internal' \| 'other'`. Geen andere waardes toegestaan.         |
| FUNC-031 | Query-helper `listOrganizationsByType(types: string[])` in `packages/database/src/queries/organizations.ts` — retourneert organisaties gefilterd op één of meer types.                 |
| RULE-007 | Taalconventie: DB-kolomnamen en CHECK constraint waardes zijn Engels; alle gebruikersgerichte labels, routes en UI-teksten zijn Nederlands. Vastgelegd in `docs/specs/style-guide.md`. |

## Bronverwijzingen

- Bestaande schema: `supabase/migrations/20260329000004_organizations_people_projects.sql` (regels 6-18, `organizations_type_check`)
- Bestaande seed: `supabase/seed/seed.sql` (regels 8-20, Flowwijs-rij)
- Bestaande query-module: `packages/database/src/queries/organizations.ts` (referentie voor stijl en exports)
- Bestaande mutation-module: `packages/database/src/mutations/organizations.ts` (default `type = 'client'` blijft correct, geen wijziging nodig)
- Requirements-doc: `docs/specs/requirements.md` → sectie "Datamodel eisen" en "Functionele eisen"
- Style-guide: `docs/specs/style-guide.md` → sectie taal/conventies (aanvullen met RULE-007)
- CLAUDE.md regels: "Seed data is idempotent" + "Waardes die kunnen veranderen → database, niet code"

## Context

### Huidig schema (relevant)

```sql
-- organizations (migratie 20260329000004)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    aliases TEXT[] DEFAULT '{}',
    type TEXT NOT NULL DEFAULT 'other',
    contact_person TEXT,
    email TEXT,
    status TEXT DEFAULT 'prospect',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT organizations_type_check CHECK (type IN ('client', 'partner', 'supplier', 'other')),
    CONSTRAINT organizations_status_check CHECK (status IN ('prospect', 'active', 'inactive'))
);
```

### Doel-schema

```sql
-- CHECK constraint vervangen (DROP + ADD) om 'advisor' en 'internal' toe te voegen
ALTER TABLE organizations DROP CONSTRAINT organizations_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_type_check
  CHECK (type IN ('client', 'partner', 'supplier', 'advisor', 'internal', 'other'));

-- Flowwijs (eigen bedrijf) van 'other' naar 'internal'
UPDATE organizations
  SET type = 'internal', updated_at = NOW()
  WHERE id = 'a0000000-0000-0000-0000-000000000001';
```

### Betekenis van elke type-waarde (voor de classifier- en UI-laag)

| DB-waarde  | NL-label    | Wie/wat                                                             |
| ---------- | ----------- | ------------------------------------------------------------------- |
| `client`   | Klant       | Organisaties die een project bij ons afnemen                        |
| `partner`  | Partner     | Samenwerkingspartners (bv. recruiters, co-development partners)     |
| `supplier` | Leverancier | Leveranciers van tools/hosting/SaaS voor het eigen bedrijf          |
| `advisor`  | Adviseur    | Externe adviseurs: boekhouder, fiscalist, jurist, notaris           |
| `internal` | Intern      | De eigen bedrijfsentiteit(en) — nu enkel Flowwijs / Jouw AI Partner |
| `other`    | Overig      | Fallback, niet-geclassificeerd                                      |

De NL-labels leven in code pas in de UI-laag (vervolg-sprint). In deze sprint geen label-map toevoegen — scope is datamodel.

### Seed bijwerken

In `supabase/seed/seed.sql` de Flowwijs-rij aanpassen:

```sql
-- vóór:
('a0000000-0000-0000-0000-000000000001', 'Flowwijs', ARRAY['JouwAiPartner', 'Jouw AI Partner', 'JAP'], 'other', 'Stef Banninga', NULL, 'active'),

-- ná:
('a0000000-0000-0000-0000-000000000001', 'Flowwijs', ARRAY['JouwAiPartner', 'Jouw AI Partner', 'JAP'], 'internal', 'Stef Banninga', NULL, 'active'),
```

De `ON CONFLICT DO UPDATE` werkt al — bij re-seed wordt `type` automatisch mee-geüpdatet (regels 13-20 in seed.sql). Geen extra logica nodig.

### Query helper (FUNC-031)

In `packages/database/src/queries/organizations.ts`:

```typescript
/**
 * List organizations filtered by one or more relationship types.
 * Example: listOrganizationsByType(['advisor', 'internal'])
 */
export async function listOrganizationsByType(
  types: string[],
  client?: SupabaseClient,
): Promise<OrganizationListItem[]> {
  // hergebruik van bestaande kolom-selectie en project-count / last-meeting logica
  // implementatie analoog aan listOrganizations, met extra .in('type', types) filter
}
```

Bestaande `OrganizationListItem` interface hergebruiken. Niet refactoren, niet breaking. Dit is puur een extra export naast `listOrganizations`.

### Mutation-module (organizations.ts)

Geen wijzigingen nodig. `createOrganization` heeft `data.type ?? "client"` als default — dat blijft correct. De nieuwe waardes `'advisor'` en `'internal'` kunnen expliciet meegegeven worden via de `type` parameter zodra een vervolg-sprint daar UI voor heeft.

### Geen nieuwe adviseur-rijen in seed

Boekhouder, fiscalist etc. worden **niet** in deze sprint geseed. Redenen:

1. Contactgegevens liggen bij Stef, niet in git — seed is publiek schema-voorbeeld.
2. Aanmaken gebeurt in een vervolg-sprint via de UI (`/clients` inline create, zodra type-selector `advisor` ondersteunt) of een losse seed-patch.

### Backward compatibility

- Bestaande rijen met `type IN ('client', 'partner', 'supplier', 'other')` blijven geldig — de nieuwe CHECK constraint is een superset.
- Flowwijs' `type` verandert van `'other'` naar `'internal'`. Check `packages/database/src/queries/` en `apps/cockpit/src/` op plekken die expliciet filteren op `type = 'other'` — als daar Flowwijs verwacht werd, moet die filter `type IN ('other', 'internal')` worden. Waarschijnlijk nul call sites, maar expliciet verifiëren en resultaat in PR-beschrijving loggen.
- TypeScript types (`database.ts`) worden geregenereerd; `type: string` blijft `string`, dus geen breaking change op callers.

### Risico's

- **CHECK-constraint DROP + ADD is niet atomair lock-wise** op grote tabellen. `organizations` is klein (< 100 rijen) dus geen probleem. Alsnog in één migratie laten staan voor atomiciteit binnen transactie.
- **Flowwijs-update raakt één rij**. Als er lokaal een dev met een andere naam/id bestaat, faalt de seed-update stil. Acceptabel — productie-seed is leidend.

## Prerequisites

Geen. Dit is de eerste sprint van de Administratie-tranche.

## Taken

- [ ] Nieuwe migratie `supabase/migrations/YYYYMMDDHHMMSS_administratie_relationship_types.sql`:
  - `ALTER TABLE organizations DROP CONSTRAINT organizations_type_check;`
  - `ALTER TABLE organizations ADD CONSTRAINT organizations_type_check CHECK (type IN ('client','partner','supplier','advisor','internal','other'));`
  - `UPDATE organizations SET type = 'internal', updated_at = NOW() WHERE id = 'a0000000-0000-0000-0000-000000000001' AND type = 'other';` (idempotent — doet niets als al gemigreerd)
- [ ] Update `supabase/seed/seed.sql`: Flowwijs-rij `'other'` → `'internal'` zodat re-seed consistent blijft met migratie
- [ ] Regenereer types: `npx supabase gen types typescript` → overschrijf `packages/database/src/types/database.ts`
- [ ] Voeg helper toe: `listOrganizationsByType(types: string[])` in `packages/database/src/queries/organizations.ts`. Implementatie analoog aan `listOrganizations` met `.in('type', types)` filter. Hergebruik `OrganizationListItem` interface.
- [ ] Update `docs/specs/requirements.md`: voeg DATA-054, DATA-055, DATA-056, DATA-057, FUNC-031, RULE-007 toe in de juiste secties
- [ ] Update `docs/specs/style-guide.md`: korte sectie "Taal-conventie" met de RULE-007 regel (Engels in DB, Nederlands in UI). Als de sectie al bestaat, bestaande tekst hierop aanvullen.
- [ ] Grep-check: zoek in `packages/database/src/queries/`, `apps/cockpit/src/` en `apps/devhub/src/` naar `type === 'other'` en `type = 'other'` — documenteer call sites in PR-beschrijving; als geen enkele call site Flowwijs verwacht onder `'other'`, geen code-wijziging nodig
- [ ] Draai migratie lokaal; verifieer met `SELECT type, COUNT(*) FROM organizations GROUP BY type;` dat Flowwijs nu `internal` is en alle andere rijen onveranderd

## Acceptatiecriteria

- [ ] [DATA-054 / DATA-055] `INSERT INTO organizations (name, type) VALUES ('Test Adviseur', 'advisor');` slaagt; idem voor `'internal'`
- [ ] [DATA-057] `INSERT INTO organizations (name, type) VALUES ('Test', 'invalid_value');` faalt met CHECK constraint violation
- [ ] [DATA-056] `SELECT type FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001';` retourneert `'internal'`
- [ ] [DATA-054..057] Migratie is idempotent: twee keer draaien faalt niet; tweede run verandert geen rijen
- [ ] [FUNC-031] `listOrganizationsByType(['advisor'])` retourneert alleen organisaties met `type = 'advisor'`; `listOrganizationsByType(['advisor', 'internal'])` retourneert beide sets
- [ ] [FUNC-031] `listOrganizationsByType([])` retourneert leeg array (early return of filter-no-op, consistente keuze — documenteer in JSDoc)
- [ ] [RULE-007] `docs/specs/style-guide.md` bevat sectie over taal-conventie met expliciete regel: DB-waardes Engels, UI-labels Nederlands
- [ ] `docs/specs/requirements.md` bevat de zes nieuwe IDs op logische plek in bestaande secties
- [ ] TypeScript types (`database.ts`) zijn geregenereerd en committen `type: string` voor `organizations.type` (geen type-enum, want Supabase gen genereert geen literal unions uit CHECK constraints — accepteren)
- [ ] `npm run type-check` slaagt
- [ ] `npm run lint` slaagt op de gewijzigde bestanden
- [ ] Migratie-commit-message volgt conventie: `feat(db): uitbreiding organizations.type met advisor en internal (DATA-054..057)`

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_administratie_relationship_types.sql` (nieuw)
- `supabase/seed/seed.sql` (Flowwijs-rij bijgewerkt)
- `packages/database/src/types/database.ts` (geregenereerd)
- `packages/database/src/queries/organizations.ts` (nieuwe export `listOrganizationsByType`)
- `docs/specs/requirements.md` (zes nieuwe IDs toegevoegd)
- `docs/specs/style-guide.md` (RULE-007 taal-conventie)

## Vervolg-sprints (niet in scope, ter oriëntatie)

- **Sprint 033** — UI route `/administratie` met tabs "Financieel & juridisch" en "Intern". Leest via `listOrganizationsByType(['advisor', 'internal'])` en koppelt aan bestaande e-mailfilters (`email_type IN ('legal_finance', 'administrative')`, `party_type IN ('accountant', 'tax_advisor', 'lawyer')`).
- **Sprint 034** — Tasks-routering voor administratie-extracties: aparte weergave binnen `/administratie`, niet op het hoofddashboard (keuze uit eerder gesprek).
- **Sprint 035 en later** — HR en Vendors/Tools tabs binnen `/administratie`, zodra er data voor is.
