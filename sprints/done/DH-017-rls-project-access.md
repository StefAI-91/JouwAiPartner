# Micro Sprint DH-017: RLS policies voor project-access (defense-in-depth)

## Doel

De app-layer checks uit DH-016 zijn de primaire verdedigingslaag, maar de database moet óók weigeren wanneer iemand via een shortcut (directe Supabase call, misconfigured endpoint, toekomstige MCP tool, etc.) issues ziet of muteert waar hij geen toegang tot heeft. Deze sprint vervangt de huidige permissieve RLS policies (`USING (true)`) op `issues`, `issue_comments`, `issue_activity`, en `devhub_project_access` door policies die joinen met `devhub_project_access` of `profiles.role`.

Dit wordt bewust samen met DH-016 getest (scope-beslissing 14: defense-in-depth in dezelfde testronde), maar is een eigen sprint omdat RLS een andere testset en rollback-strategie heeft dan app-code.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-170  | RLS `issues` SELECT: toegestaan desda `profiles.role = 'admin'` voor `auth.uid()` OF er bestaat een `devhub_project_access` row voor `(auth.uid(), issues.project_id)`.                                                        |
| SEC-171  | RLS `issues` INSERT: toegestaan desda admin OF row in `devhub_project_access` voor `NEW.project_id`.                                                                                                                           |
| SEC-172  | RLS `issues` UPDATE: toegestaan desda admin OF access tot zowel `OLD.project_id` als `NEW.project_id` (voorkomt stiekem "verhuizen" naar een ander project).                                                                   |
| SEC-173  | RLS `issue_comments` SELECT: via issue-join → alleen comments op zichtbare issues.                                                                                                                                             |
| SEC-174  | RLS `issue_comments` INSERT/UPDATE: alleen op zichtbare issues; UPDATE blijft verder beperkt tot author (bestaande regel uit `20260409100003`).                                                                                |
| SEC-175  | RLS `issue_activity` SELECT/INSERT: via issue-join → alleen op zichtbare issues.                                                                                                                                               |
| SEC-176  | RLS `devhub_project_access` SELECT: admins lezen alles; members lezen alleen rijen met eigen `profile_id = auth.uid()`.                                                                                                        |
| SEC-177  | RLS `devhub_project_access` INSERT/UPDATE/DELETE: enkel admins (`profiles.role = 'admin'` voor `auth.uid()`).                                                                                                                  |
| PERF-150 | Policies zijn performant: nodige indexes op `(profile_id, project_id)` bestaan al (uit `20260409100002`). Admin-check via `profiles.role` wordt geëvalueerd via een helper-function met `SECURITY DEFINER` of inline subquery. |
| EDGE-160 | DEV bypass user (UUID `00000000-0000-0000-0000-000000000000`) ziet alles (via helper-functie die deze UUID als admin beschouwt).                                                                                               |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 14 (defense-in-depth samen opleveren), 11 (admin impliciet access)
- Bestaande permissieve RLS: `supabase/migrations/20260409100003_devhub_rls_policies.sql`
- Nieuwe rolverdeling: `docs/backlog/DH-013-access-control-db-foundation.md`
- Helpers die hetzelfde contract moeten volgen: `packages/auth/src/access.ts` (uit DH-014)
- Bestaande RLS-patroon voorbeeld in repo: zoek op `CREATE POLICY` in `supabase/migrations/` voor stijl

## Context

### Helper function voor admin-check

Direct inline subquery op `profiles` in elke policy is werkbaar maar verbose én triggert vaak een N-query probleem onder RLS. Creëer een `STABLE SECURITY DEFINER` helper:

```sql
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION has_project_access(user_id UUID, pid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin(user_id) OR EXISTS (
    SELECT 1 FROM devhub_project_access
    WHERE profile_id = user_id AND project_id = pid
  );
$$;
```

### Policies

```sql
-- ── Issues ──
DROP POLICY "Authenticated users can read all issues" ON issues;
CREATE POLICY "Members see accessible issues, admins see all" ON issues
  FOR SELECT TO authenticated
  USING (has_project_access(auth.uid(), project_id));

DROP POLICY "Authenticated users can insert issues" ON issues;
CREATE POLICY "Members insert in accessible projects, admins all" ON issues
  FOR INSERT TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));

DROP POLICY "Authenticated users can update issues" ON issues;
CREATE POLICY "Members update accessible issues, admins all" ON issues
  FOR UPDATE TO authenticated
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

-- ── Issue comments ──
DROP POLICY "Authenticated users can read all issue_comments" ON issue_comments;
CREATE POLICY "Comments visible via issue access" ON issue_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_comments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

DROP POLICY "Authenticated users can insert issue_comments" ON issue_comments;
CREATE POLICY "Insert comments on accessible issues" ON issue_comments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_comments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

-- Author-only UPDATE blijft; voeg access-check toe
DROP POLICY "Authors can update their own issue_comments" ON issue_comments;
CREATE POLICY "Authors update own comments on accessible issues" ON issue_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM issues i WHERE i.id = issue_comments.issue_id
        AND has_project_access(auth.uid(), i.project_id)))
  WITH CHECK (auth.uid() = author_id);

-- ── Issue activity — identiek patroon
-- ── devhub_project_access ──
DROP POLICY "Authenticated users can read all devhub_project_access" ON devhub_project_access;
CREATE POLICY "Members read own access, admins read all" ON devhub_project_access
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR profile_id = auth.uid());

DROP POLICY "Authenticated users can manage devhub_project_access" ON devhub_project_access;
CREATE POLICY "Only admins can write devhub_project_access" ON devhub_project_access
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

### Test matrix

Voor elke tabel × CRUD-operatie × rol-scenario:

| Tabel                 | Operatie | Admin          | Member met access  | Member zonder access |
| --------------------- | -------- | -------------- | ------------------ | -------------------- |
| issues                | SELECT   | zie alles      | zie eigen project  | zie niets            |
| issues                | INSERT   | ok             | ok (eigen project) | fail (RLS)           |
| issues                | UPDATE   | ok             | ok (eigen project) | fail                 |
| issue_comments        | SELECT   | alles          | eigen project      | niets                |
| issue_comments        | INSERT   | ok             | ok (own issue)     | fail                 |
| issue_comments        | UPDATE   | eigen comments | eigen comments     | fail                 |
| issue_activity        | SELECT   | alles          | eigen project      | niets                |
| issue_activity        | INSERT   | ok             | ok (eigen project) | fail                 |
| devhub_project_access | SELECT   | alles          | eigen rij          | eigen rij            |
| devhub_project_access | INSERT   | ok             | fail               | fail                 |

Elke cel moet getest worden met een pgTAP-test óf een Node integration test via Supabase client met anon + JWT voor role-simulatie.

### Backward compat / issue_number_seq

De `issue_number_seq` policy uit `20260409100003` is administratief (geen user-data). Laat deze permissief voor authenticated, of beperk tot admin — agent kiest. Documenteer.

### Risico's

- **Breakende policies** voor admin-tools die via service-role-client gaan: service role omzeilt RLS altijd, dus gatekeeper-pipeline/classifier-pipeline blijven werken. Verifieer.
- **Perf**: `has_project_access` wordt per rij in large selects aangeroepen. `STABLE` maakt dat Postgres kan cachen per-row. Monitor issue-list queries na deploy.
- **Helper function mutations**: als DH-013 nog geen CHECK constraint heeft, kunnen er `role = 'guest'` rijen bestaan die hier nooit admin worden — geen probleem, worden als member behandeld.

## Prerequisites

- [x] DH-013: DB fundering (`profiles.role` genormaliseerd, `devhub_project_access.role` gedropt)
- [x] DH-014: Auth helpers bestaan (app-laag contract identiek aan DB-laag)
- [x] DH-016: App-layer enforcement live (voorkomt dat test-traffic massaal RLS-fails oplevert voor legacy paths)

## Taken

- [ ] Nieuwe migratie `supabase/migrations/YYYYMMDDHHMMSS_rls_project_access.sql`:
  - helpers `is_admin(uuid)` en `has_project_access(uuid, uuid)`
  - DROP bestaande permissieve policies
  - CREATE nieuwe policies voor `issues`, `issue_comments`, `issue_activity`, `devhub_project_access`
- [ ] Schrijf pgTAP of integration tests voor de test matrix hierboven
- [ ] Handmatig test: log in als member in Supabase Studio → verifieer dat raw queries op issues alleen accessible rijen teruggeven
- [ ] Verifieer dat service-role pipelines (gatekeeper, classifier, Userback sync) blijven werken
- [ ] Update `docs/specs/requirements-devhub.md` met SEC-170..177, PERF-150, EDGE-160
- [ ] Update `docs/security/audit-report.md` (als bestaand) met "DevHub RLS nu fine-grained; cockpit RLS volgt in v3"

## Acceptatiecriteria

- [ ] [SEC-170..177] Test matrix: alle 10 rijen × scenario's slagen zoals verwacht
- [ ] [SEC-172] Member kan issue's `project_id` niet via UPDATE naar een ander project verplaatsen waar hij géén toegang toe heeft
- [ ] [PERF-150] `explain analyze select * from issues limit 50` onder member-JWT neemt niet >2× langer dan admin-JWT (ruwe check; documenteer metriek)
- [ ] [EDGE-160] Dev-bypass user (of gelijkwaardige seed) ziet alles — of er is bewust gedocumenteerd dat dev-bypass alleen via service-role client werkt
- [ ] Service-role pipelines (classifier background, Userback sync) blijven groen (smoke-test)
- [ ] Migratie is idempotent; opnieuw draaien faalt niet
- [ ] `npm run type-check` / `npm run lint` slagen (geen TS-impact verwacht)

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_rls_project_access.sql` (nieuw)
- `supabase/tests/rls-project-access.test.sql` (nieuw — pgTAP) OF `packages/database/__tests__/rls-project-access.test.ts`
- `docs/specs/requirements-devhub.md` (bijgewerkt)
- `docs/security/audit-report.md` (bijgewerkt — als bestaand)
