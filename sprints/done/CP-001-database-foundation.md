# Micro Sprint CP-001: Database Foundation

## Doel

Het database-fundament leggen voor het klantportaal. Na deze sprint bestaat de `client` role, de `portal_project_access` koppeltabel, en de RLS policies die ervoor zorgen dat client users alleen hun eigen organisatie's projecten en geverifieerde content zien. Bestaande cockpit/devhub functionaliteit blijft ongewijzigd.

## Requirements

| ID       | Beschrijving                                                                       |
| -------- | ---------------------------------------------------------------------------------- |
| AUTH-P01 | Client role toevoegen aan profiles.role constraint (admin/member/client)           |
| RLS-P01  | Client users zien alleen projecten van hun eigen organisatie                       |
| RLS-P02  | Client users zien alleen geverifieerde content (verified meetings/extractions)     |
| RLS-P03  | Client users zien geen transcripten, alleen samenvattingen                         |
| RLS-P04  | Client users zien alleen issues gekoppeld aan hun organisatie's projecten          |
| RLS-P05  | Bestaande cockpit/devhub RLS policies blijven ongewijzigd voor admin/member        |
| RLS-P06  | Koppeltabel portal_project_access (profile_id, project_id) voor fijnmazige toegang |

## Taken

### 1. Migratie: client role + organization_id op profiles

- Pas `profiles_role_check` constraint aan: `CHECK (role IN ('admin', 'member', 'client'))`
- Voeg `organization_id` kolom toe aan `profiles` (nullable FK → organizations, alleen relevant voor client users)
- Bestaande admin/member users worden niet geraakt

### 2. Migratie: portal_project_access tabel

- Maak `portal_project_access` tabel aan (analoog aan `devhub_project_access`):
  - `id` UUID PK
  - `profile_id` UUID FK → profiles(id) ON DELETE CASCADE
  - `project_id` UUID FK → projects(id) ON DELETE CASCADE
  - `created_at` TIMESTAMPTZ DEFAULT now()
  - UNIQUE(profile_id, project_id)

### 3. RLS policies voor portal

- `projects`: client users zien alleen projecten waar ze access hebben via `portal_project_access`
- `issues`: client users zien alleen issues van projecten in hun `portal_project_access`
- `summaries`: client users zien alleen summaries van hun projecten
- `meetings`: client users zien alleen verified meetings van hun projecten (geen transcript kolom)
- `extractions`: client users zien alleen approved extractions van hun projecten
- Alle policies: admin/member gedrag blijft ongewijzigd (permissive voor authenticated, zoals nu)

### 4. Helper functie

- SQL functie `has_portal_access(user_id UUID, project_id UUID)` die checkt of een client user toegang heeft tot een project via `portal_project_access`
- Herbruikbaar in RLS policies

### 5. TypeScript types regenereren

- Run type generation zodat de nieuwe tabel en kolommen beschikbaar zijn in `@repo/database`

### 6. Query functies voor portal access

- `packages/database/src/queries/portal-access.ts`:
  - `listPortalProjects(profileId, supabase)` — projecten waar de client toegang toe heeft
  - `hasPortalProjectAccess(profileId, projectId, supabase)` — boolean check

### 7. Mutation functies voor invite

- `packages/database/src/mutations/portal-access.ts`:
  - `grantPortalAccess(profileId, projectId, supabase)` — voeg access toe
  - `revokePortalAccess(profileId, projectId, supabase)` — verwijder access

## Bronverwijzingen

- PRD: `docs/archive/portal-mvp.md` sectie 3 (AUTH, RLS) en sectie 5 (Datamodel)
- Vision: `docs/specs/vision-ai-native-architecture.md` sectie 2.4 en beslissing "Single Supabase instance"
- Voorbeeld: `devhub_project_access` tabel in `supabase/migrations/20260409100002_devhub_project_access.sql`
- Bestaande role constraint: `supabase/migrations/20260413103037_access_control_foundation.sql`

## Verificatie

- [ ] `profiles.role` accepteert 'client' waarde
- [ ] `portal_project_access` tabel bestaat met juiste constraints
- [ ] Client user kan alleen projecten zien waartoe hij/zij toegang heeft
- [ ] Client user ziet geen unverified meetings of rejected extractions
- [ ] Admin/member users ervaren geen verandering in hun toegang
- [ ] TypeScript types zijn bijgewerkt
- [ ] Query en mutation functies werken correct
