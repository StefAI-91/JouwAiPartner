# Micro Sprint DH-013: Access control — DB fundering

> **Scope-afbakening.** Eerste sprint van de access-control tranche (DH-013 t/m DH-020). Alleen database-niveau werk: schema opschonen, rolverdeling formaliseren op `profiles`, en een harde minimum-één-admin garantie afdwingen in de DB. Geen applicatiecode, geen middleware.

## Doel

DevHub moet per project afgeschermd worden voor externe teamleden. De huidige situatie mengt rol-informatie op twee plekken: `profiles.role` (bestaand, `'member'` default) én `devhub_project_access.role` (uit migratie `20260409100002`). Dit is inconsistent en maakt nadere afscherming fragiel. In deze sprint wordt het datamodel de enige bron van waarheid voor rollen: rollen leven uitsluitend op `profiles`, en `devhub_project_access` wordt puur een koppeltabel (profile_id, project_id) zonder rol. Stef en Wouter worden via een idempotente seed op `role = 'admin'` gezet. Een DB-constraint garandeert dat er altijd minimaal één admin bestaat.

Na deze sprint is het datamodel klaar om in volgende sprints veilig app-layer checks (DH-014), RLS (DH-017) en invite flows (DH-019) op te bouwen.

## Requirements

> Bestaande `AUTH-101 / AUTH-102 / AUTH-103 / AUTH-104` uit `docs/specs/requirements-devhub.md` beschrijven een ander (3-rollen) model dat in deze tranche wordt ingetrokken. De nieuwe requirements hieronder vervangen dat model en horen toegevoegd te worden aan `docs/specs/requirements-devhub.md` in de sectie "Rollen en permissies".

| ID       | Beschrijving                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AUTH-150 | Het platform kent exact twee rollen: `admin` en `member`. Geen derde tier.                                                                                   |
| AUTH-151 | Rol leeft uitsluitend op `profiles.role`; `devhub_project_access` bevat géén `role` kolom meer.                                                              |
| AUTH-152 | Admins krijgen impliciet toegang tot alle DevHub-projecten zonder `devhub_project_access` rows.                                                              |
| AUTH-153 | Stef (stef@jouwaipartner.nl) en Wouter (wouter@jouwaipartner.nl) zijn op basis van email als `admin` geseed (idempotent, `ON CONFLICT DO UPDATE`).           |
| AUTH-154 | Alle andere bestaande profiles behouden hun bestaande rol-waarde; ontbrekende waardes krijgen `'member'`.                                                    |
| DATA-200 | Kolom `devhub_project_access.role` wordt via migratie gedropt.                                                                                               |
| DATA-201 | `profiles.role` heeft een CHECK constraint die alleen `'admin'` of `'member'` toelaat.                                                                       |
| DATA-202 | DB-trigger of constraint garandeert dat `profiles` altijd ≥ 1 rij bevat met `role = 'admin'`. Poging tot demotie of verwijdering van de laatste admin faalt. |
| RULE-150 | Het is onmogelijk de laatste admin te demoten, te deactiveren of te verwijderen zolang er geen andere admin bestaat.                                         |

## Bronverwijzingen

- Scope-afspraken: prompt "Maak micro-sprints voor het afschermen van DevHub per project" — scope-beslissingen 1, 2, 4, 13
- Bestaande schema: `supabase/migrations/20260329000003_profiles.sql` (profiles tabel + trigger)
- Bestaande schema: `supabase/migrations/20260409100002_devhub_project_access.sql` (tabel met `role` kolom die gedropt moet worden)
- Requirements doc waar de nieuwe IDs toegevoegd moeten worden: `docs/specs/requirements-devhub.md` → sectie "Rollen en permissies" (regels ~101-106)
- CLAUDE.md regels: "Seed data is idempotent" + "Data-driven: statussen en rollen in DB, geen enum in code"

## Context

### Huidig schema (relevant)

```sql
-- profiles (migratie 20260329000003)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',            -- geen CHECK constraint aanwezig
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- devhub_project_access (migratie 20260409100002)
CREATE TABLE devhub_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',    -- te DROPPEN
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, project_id)
);
```

### Doel-schema

```sql
-- profiles krijgt CHECK constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'member'));

-- devhub_project_access is puur koppeltabel
ALTER TABLE devhub_project_access DROP COLUMN role;

-- min-1-admin enforcement (trigger is voorkeur boven partial unique
-- omdat we niet willen voorkomen dat er meerdere admins zijn)
CREATE FUNCTION enforce_min_one_admin() RETURNS TRIGGER ...
```

### Min-1-admin strategie

Twee opties, agent kiest op basis van bestaande patronen in dit project:

1. **Trigger BEFORE UPDATE / DELETE op profiles**: als de row admin is en er na deze actie minder dan één admin overblijft, `RAISE EXCEPTION`.
2. **DEFERRABLE constraint trigger**: check aan einde van transactie.

Optie 1 is simpeler en consistent met `handle_new_user()` patroon in `profiles.sql`. Advies: optie 1, tenzij blijkt dat cascade-deletes (bv. `auth.users` ON DELETE CASCADE) problematisch samenwerken. Test expliciet dat verwijdering van een niet-admin nog steeds werkt.

### Seed voor Stef en Wouter

```sql
-- idempotent: doet niets als profile niet bestaat (dan is auth-trigger nog niet gerund)
UPDATE profiles SET role = 'admin'
WHERE email IN ('stef@jouwaipartner.nl', 'wouter@jouwaipartner.nl');
```

Zet dit in een migratie óf in `supabase/seed/` mits seed-flow migraties kan targeten. Agent kiest — migratie is expliciet, seed is conventioneler in dit project. Check `supabase/seed/` conventie vóór beslissing.

### Backward compat

- Eventuele bestaande queries die `devhub_project_access.role` lezen moeten gevonden worden. Zoek in `packages/database/src/queries/` en `packages/database/src/mutations/` naar `devhub_project_access` en meld alle lees/schrijf-locaties in de commit. Typerings-breaks worden in DH-014 opgelost.
- `docs/specs/requirements-devhub.md` moet bijgewerkt worden: `AUTH-101..104` markeren als "vervangen door AUTH-150..154, zie DH-013".

### Risico's

- **Data-loss**: DROP COLUMN is onomkeerbaar in productie. Check of kolom data bevat die ergens anders gelogd moet worden (zal waarschijnlijk niet, want tabel is recent). Als er écht waarde in zit: eerst SELECT dump in migratie-commentaar zetten.
- **Foute order met cascade**: auth.users DELETE → profiles DELETE → zou de trigger kunnen triggeren op een laatste admin. Test dit scenario.

## Prerequisites

Geen — dit is de eerste sprint in de tranche.

## Taken

- [ ] Nieuwe migratie `supabase/migrations/YYYYMMDDHHMMSS_access_control_foundation.sql`:
  - `ALTER TABLE devhub_project_access DROP COLUMN role;`
  - `ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','member'));` (voeg ontbrekende `UPDATE ... SET role='member' WHERE role NOT IN ('admin','member') OR role IS NULL;` toe vóór de CHECK)
  - Seed Stef + Wouter als admin op email-basis (idempotent via UPDATE)
  - `CREATE FUNCTION enforce_min_one_admin()` + `CREATE TRIGGER` BEFORE UPDATE/DELETE op `profiles`
- [ ] Regenereer types: `npx supabase gen types typescript` → update `packages/database/src/types/database.ts`
- [ ] Update `docs/specs/requirements-devhub.md`: markeer `AUTH-101..104` als vervangen; voeg sectie toe met `AUTH-150..154`, `DATA-200..202`, `RULE-150`
- [ ] Zoek + documenteer call sites die `devhub_project_access.role` lezen/schrijven; lijst in PR-beschrijving
- [ ] Draai migratie lokaal + in preview; verifieer dat bestaande functionaliteit niet breekt buiten de typerings-gaten die DH-014 opvangt

## Acceptatiecriteria

- [ ] [DATA-200] `devhub_project_access` heeft geen `role` kolom meer (verifieer met `\d devhub_project_access`)
- [ ] [DATA-201] `profiles.role` CHECK constraint weigert `INSERT ... role = 'guest'` met error
- [ ] [DATA-202 / RULE-150] Een UPDATE die de enige admin naar `member` probeert te zetten faalt met duidelijke SQL exception
- [ ] [DATA-202 / RULE-150] DELETE van de enige admin faalt met duidelijke SQL exception
- [ ] [DATA-202] DELETE van een member slaagt; DELETE van een admin als er ≥ 2 admins zijn slaagt
- [ ] [AUTH-153] Na migratie hebben Stef en Wouter `profiles.role = 'admin'` (SQL check)
- [ ] [AUTH-154] Alle andere profiles behouden bestaande role of hebben `'member'` (nooit NULL, nooit `'guest'`)
- [ ] [AUTH-151] TypeScript types (`database.ts`) bevatten geen `role` veld meer op `devhub_project_access`
- [ ] Migratie is idempotent: opnieuw draaien faalt niet (check `IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS` waar relevant)
- [ ] `npm run type-check` slaagt — óf er is een gedocumenteerde lijst van call sites die in DH-014 opgelost worden (dan: commit met skip-ci-note als nodig)

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_access_control_foundation.sql` (nieuw)
- `packages/database/src/types/database.ts` (regenereerd)
- `docs/specs/requirements-devhub.md` (bijgewerkt — AUTH-150..154, DATA-200..202, RULE-150)
