# Micro Sprint PR-024: Portal-toegang voor members (naast clients)

## Doel

Vandaag is het portaal exclusief voor `role='client'` (en admins als preview). Members worden door de middleware naar devhub geredirect. We willen members per-project portal-toegang kunnen geven — voor scenario's als interne PM's die met een klant meekijken in dezelfde portal-context als de klant zelf.

De `portal_project_access` tabel is al rol-agnostisch (pure `profile_id` ↔ `project_id` join, geen role-kolom). Deze sprint hoeft alleen de query- en UI-laag uit te breiden zodat members dezelfde access-checks doorlopen als clients. **Geen migratie, geen RLS-rewrite.**

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-220  | Portal middleware accepteert `member` als toegestane rol (naast `admin` en `client`).                                                                                                                                           |
| SEC-221  | `listPortalProjects` returnt voor members alleen projecten met een rij in `portal_project_access` (zelfde branch als clients). Member zonder rijen → lege lijst, niet redirect.                                                 |
| SEC-222  | `hasPortalProjectAccess` returnt voor members `true` desda een rij in `portal_project_access` voor `(profileId, projectId)` bestaat. Member zonder rij → `false`.                                                               |
| SEC-223  | Cockpit-UI: members met portal-toegang verschijnen in de "Portaltoegang" sectie op de project detail. Admin kan een member toevoegen of revoken zonder zijn `profiles.role` te wijzigen.                                        |
| SEC-224  | `inviteProjectClientAction` blokkeert members niet meer met "is een teamlid". Bij een bestaande member-email wordt portal-access idempotent gegrant (rol blijft `member`).                                                      |
| FUNC-220 | Empty state in portal: een member zonder access-rijen ziet de standaard "geen projecten" pagina (geen 403, geen redirect-loop).                                                                                                 |
| EDGE-220 | RLS-test: een member met `portal_project_access` voor project X kan portal-data van X opvragen (bestaande RLS dekt dit al via `NOT is_client OR has_portal_access`, maar test bevestigt dat dit blijft werken na de wijziging). |

## Bronverwijzingen

- Bestaand fundament: `supabase/migrations/20260417100001_portal_project_access.sql` (tabel)
- Bestaande RLS: `supabase/migrations/20260417100002_portal_rls_policies.sql` (policies — **niet aanpassen**)
- Helpers: `packages/auth/src/access.ts` (`isAdmin`, `requireAdminInAction`)
- Te wijzigen queries: `packages/database/src/queries/portal/access.ts`
- Te wijzigen middleware: `apps/portal/src/middleware.ts`
- Te wijzigen actions: `apps/cockpit/src/features/projects/actions/clients.ts`
- Te wijzigen UI: `apps/cockpit/src/features/projects/components/project-clients-section.tsx`
- Memory-context: dit komt voort uit de behoefte van twee specifieke members (Stef's team) die met klanten meekijken in de portal.

## Context

### Waarom geen RLS-aanpassing nodig is

De huidige policies op `projects/meetings/extractions/summaries` zien er zo uit:

```sql
USING (
  NOT is_client(auth.uid())
  OR has_portal_access(auth.uid(), id)
)
```

Members vallen onder `NOT is_client = true` → ze krijgen op DB-niveau alle data te zien. Dat klopt voor cockpit/devhub (waar members horen te werken) en is niet wat we in de portal willen tonen — maar de portal-scoping is een **UI-laag** beslissing, niet een security-laag. Members zijn trusted insiders; we beschermen hier tegen "verkeerde portal-tab zien", niet tegen data-lekken.

De portal beperkt wat een member ziet via `listPortalProjects` (dat de access-tabel bevraagt). De RLS blijft strikt voor clients — dat is de daadwerkelijke security-grens.

### Wat verandert er in de queries

**`listPortalProjects`** (`packages/database/src/queries/portal/access.ts:23`)

Huidige logica:

- Admin → alle projecten
- Client → projecten via `portal_project_access`
- Member/anders → lege lijst

Nieuwe logica:

- Admin → alle projecten (ongewijzigd)
- Client of member → projecten via `portal_project_access`
- Anders → lege lijst

Concreet: drop de `isAdmin`-vroege return niet, maar laat de fallback-query door alle non-admin rollen heen lopen. Geen `role`-check meer nodig — de access-tabel-query is zelf-filterend.

**`hasPortalProjectAccess`** (`access.ts:134`)

Zelfde patroon: admin → true, anders rij in `portal_project_access` checken. Werkt al voor members na bovenstaande verandering omdat de query niet meer op rol filtert.

**`listPortalProjectClients`** (`access.ts:73`)

Filtert nu op `profiles.role === 'client'`. Vervangen door `listPortalProjectAssignees` die clients én members teruggeeft, met een `role`-veld. UI gebruikt dat om beide groepen visueel te onderscheiden (badge of aparte secties — implementatie-keuze).

> **Beslissing:** behoud `listPortalProjectClients` als alias-export tijdelijk, of refactor in één keer? **In één keer.** Er is maar één caller (`project-clients-section.tsx`); behouden = drift.

### Cockpit-UI (sectie hernoemen + member-flow)

**`project-clients-section.tsx`** — title wordt "Portaltoegang", gebruikt `listPortalProjectAssignees`. Toon `role` als kleine badge (`Klant` / `Team`). Empty state: "Nog niemand uitgenodigd. Nodig een klant uit of geef een teamlid toegang."

**`InviteClientDialog`** krijgt een tweede tab/optie: "Bestaand teamlid toevoegen" met een dropdown (gevoed door `listTeamMembers`). Submit → nieuwe action `grantMemberPortalAccessAction` die alleen de access-rij upsert, geen invite-mail stuurt. De bestaande "Klant uitnodigen via email" flow blijft onveranderd.

> Alternatief: één dialog met email-input die polymorf werkt (member detecteert door op email te zoeken). Werkt al via `inviteProjectClientAction` na de SEC-224 fix. **Voorkeur: aparte member-picker** want het use-case is "ik weet welk teamlid ik wil toevoegen" en een dropdown is dan sneller dan email typen. Maar als je het simpel wilt houden, lever alleen SEC-224 en sla de dropdown over.

**`inviteProjectClientAction`** (`clients.ts:68`) — drop de `member`-block. Pad wordt: bestaande member → grant access idempotent, geen rol-wijziging. Update copy: succesmelding zegt "teamlid toegevoegd aan portaltoegang" i.p.v. "client uitgenodigd".

### Middleware

**`apps/portal/src/middleware.ts:9`** — `requireRole: ["admin", "member", "client"]`. Members zonder access-rijen krijgen een lege project-lijst, geen 403. De `forbiddenRedirect` naar devhub blijft voor anonieme of onbekende rollen.

### Member-portal UX edge-cases

- **Member logt direct in op portal-URL**: middleware accepteert hem, `listPortalProjects` returnt zijn access-rijen. Geen rijen → empty state met copy "Je hebt nog geen portaaltoegang gekregen. Vraag een admin om je toe te wijzen."
- **Member klikt op een portal-project waar hij geen access voor heeft (URL guess)**: project-detail page doet al een `hasPortalProjectAccess`-check (verifieer in `apps/portal/src/app/(app)/projects/[id]/layout.tsx`). Na deze sprint werkt die check correct voor members → redirect of 404.
- **Member is óók in `devhub_project_access`**: de RLS op issues/comments/activity gebruikt `has_project_access` (devhub) voor members, niet `has_portal_access`. Dat blijft werken — een member ziet portal-issues van project X als hij óf in `portal_project_access` óf in `devhub_project_access` zit. Voor Stef's tech-team-use-case is dat prima: ze zitten typisch in beide.

### Wat NIET in scope zit

- Geen aparte "member-portal-access" rol (overkill — een access-rij is genoeg).
- Geen aanpassing aan RLS (zie boven — niet nodig).
- Geen invite-flow voor nieuwe externen die direct member moeten worden (loopt via `/admin/team`).
- Geen wijziging aan `inviteProjectClientAction` voor admins (admin-pad blijft idempotent).

## Prerequisites

- [x] CP-001: portal_project_access tabel bestaat
- [x] DH-013/014/017: rol-systeem en RLS-helpers bestaan
- [x] DH-019/020: invite-flow + admin team UI bestaan (member-dropdown leunt op `listTeamMembers`)

## Taken

- [ ] **Queries** (`packages/database/src/queries/portal/access.ts`):
  - [ ] `listPortalProjects`: drop de impliciete role-gate, laat alle non-admin rollen door de access-tabel-query lopen
  - [ ] `hasPortalProjectAccess`: idem (zou na bovenstaande automatisch werken — verifieer)
  - [ ] Vervang `listPortalProjectClients` door `listPortalProjectAssignees` die clients én members returnt met `role` veld
  - [ ] Update `apps/cockpit/src/features/projects/components/project-clients-section.tsx` om de nieuwe query te gebruiken
- [ ] **Middleware** (`apps/portal/src/middleware.ts`):
  - [ ] `requireRole: ["admin", "member", "client"]`
- [ ] **Actions** (`apps/cockpit/src/features/projects/actions/clients.ts`):
  - [ ] Drop de `member`-block in `inviteProjectClientAction` (regel ~68); existing member → grant access idempotent
  - [ ] Nieuwe `grantMemberPortalAccessAction({ profileId, projectId })` die alleen de access-rij upsert (geen invite-mail)
  - [ ] Bijbehorend Zod schema in `packages/database/src/validations/portal-access.ts`
- [ ] **UI** (`apps/cockpit/src/features/projects/components/`):
  - [ ] `project-clients-section.tsx`: titel naar "Portaltoegang", role-badge per regel, empty state copy
  - [ ] `invite-client-dialog.tsx`: tweede tab of dropdown voor "Teamlid toevoegen" met `listTeamMembers` als bron
- [ ] **Tests**:
  - [ ] Bestaande `packages/database/__tests__/rls-project-access.test.ts` uitbreiden: member met portal_project_access voor project X kan project X selecten via portal-helpers
  - [ ] Unit test voor `listPortalProjectAssignees`: returnt clients én members, sorteert op email
  - [ ] Unit test voor `grantMemberPortalAccessAction`: idempotent, alleen admin mag aanroepen
- [ ] **Docs**:
  - [ ] Update memory entry `project_team_roles.md`: "members kunnen per-project portal-toegang krijgen via portal_project_access"
  - [ ] Update `docs/specs/requirements-portal.md` met SEC-220..224, FUNC-220, EDGE-220
  - [ ] `docs/dependency-graph.md` regenereert automatisch via Husky

## Acceptatiecriteria

- [ ] [SEC-220] Member kan inloggen op portal-URL zonder redirect naar devhub
- [ ] [SEC-221] Member zonder access-rijen ziet lege project-lijst; member met access-rij voor project X ziet alleen X
- [ ] [SEC-222] `hasPortalProjectAccess(memberId, X)` returnt true als rij bestaat, false anders
- [ ] [SEC-223] Cockpit project-detail toont member naast client in de "Portaltoegang" sectie, met role-badge
- [ ] [SEC-224] Bestaande member-email invoeren in invite-dialog → success (geen "is een teamlid" error). Member's `profiles.role` blijft `member` (verifieer in DB)
- [ ] [FUNC-220] Member zonder access ziet copy "Je hebt nog geen portaaltoegang gekregen", niet 403/redirect
- [ ] [EDGE-220] Bestaande client-tests blijven groen — geen regressie op client-only paden
- [ ] `npm run type-check`, `npm run lint`, `npm run test` slagen

## Geraakt door deze sprint

- `packages/database/src/queries/portal/access.ts` (queries gegeneraliseerd naar member + client)
- `packages/database/src/validations/portal-access.ts` (nieuw Zod schema)
- `apps/portal/src/middleware.ts` (rol-lijst)
- `apps/cockpit/src/features/projects/actions/clients.ts` (member-block weg + nieuwe action)
- `apps/cockpit/src/features/projects/components/project-clients-section.tsx` (titel + role-badge)
- `apps/cockpit/src/features/projects/components/invite-client-dialog.tsx` (member-picker)
- `packages/database/__tests__/rls-project-access.test.ts` (nieuwe scenario's)
- `docs/specs/requirements-portal.md` (nieuwe SEC/FUNC/EDGE IDs)
