# Requirements Register — DevHub Fase 1

Gegenereerd uit `docs/specs/prd-devhub.md` op 2026-04-09.
Scope: alleen Fase 1 (Bug Intake & Triage + Status Page).
Totaal: 119 requirements.

> **Last verified:** 2026-04-20 (Q4b, steekproef-strategie per Q4a-5).
> **Bekende drift:** laag-middel. DH-001..007 done, DH-010..012 + DH-017..020 done. Access-control tranche (DH-013..016) staat in `docs/backlog/` en bevat requirements die nog niet in dit register staan.

---

## Datamodel eisen

| ID       | Beschrijving                                                                                                                                                      | Bron                  | Sprint |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| DATA-101 | Tabel `issues`: kolom `id` (UUID, PK, default gen_random_uuid())                                                                                                  | prd-devhub.md:217     | DH-001 |
| DATA-102 | Tabel `issues`: kolom `project_id` (UUID, NOT NULL, FK naar projects, ON DELETE CASCADE)                                                                          | prd-devhub.md:218     | DH-001 |
| DATA-103 | Tabel `issues`: kolom `title` (TEXT, NOT NULL)                                                                                                                    | prd-devhub.md:221     | DH-001 |
| DATA-104 | Tabel `issues`: kolom `description` (TEXT, nullable)                                                                                                              | prd-devhub.md:222     | DH-001 |
| DATA-105 | Tabel `issues`: kolom `type` (TEXT, NOT NULL, default 'bug', waarden: bug/feature_request/question)                                                               | prd-devhub.md:223     | DH-001 |
| DATA-106 | Tabel `issues`: kolom `status` (TEXT, NOT NULL, default 'backlog', waarden: backlog/todo/in_progress/done/cancelled)                                              | prd-devhub.md:224     | DH-001 |
| DATA-107 | Tabel `issues`: kolom `priority` (TEXT, NOT NULL, default 'medium', waarden: urgent/high/medium/low)                                                              | prd-devhub.md:225     | DH-001 |
| DATA-108 | Tabel `issues`: kolom `component` (TEXT, nullable, waarden: frontend/backend/api/database/prompt_ai/unknown)                                                      | prd-devhub.md:228     | DH-001 |
| DATA-109 | Tabel `issues`: kolom `severity` (TEXT, nullable, waarden: critical/high/medium/low)                                                                              | prd-devhub.md:229     | DH-001 |
| DATA-110 | Tabel `issues`: kolom `labels` (TEXT[], default '{}')                                                                                                             | prd-devhub.md:230     | DH-001 |
| DATA-111 | Tabel `issues`: kolom `assigned_to` (UUID, FK naar people(id), nullable)                                                                                          | prd-devhub.md:233     | DH-001 |
| DATA-112 | Tabel `issues`: kolom `reporter_name` (TEXT, nullable)                                                                                                            | prd-devhub.md:234     | DH-001 |
| DATA-113 | Tabel `issues`: kolom `reporter_email` (TEXT, nullable)                                                                                                           | prd-devhub.md:235     | DH-001 |
| DATA-114 | Tabel `issues`: kolom `source` (TEXT, NOT NULL, default 'manual', waarden: userback/widget/manual/email)                                                          | prd-devhub.md:238     | DH-001 |
| DATA-115 | Tabel `issues`: kolom `userback_id` (TEXT, UNIQUE, nullable)                                                                                                      | prd-devhub.md:239     | DH-001 |
| DATA-116 | Tabel `issues`: kolom `source_url` (TEXT, nullable)                                                                                                               | prd-devhub.md:240     | DH-001 |
| DATA-117 | Tabel `issues`: kolom `source_metadata` (JSONB, default '{}')                                                                                                     | prd-devhub.md:241     | DH-001 |
| DATA-118 | Tabel `issues`: kolom `ai_classification` (JSONB, default '{}')                                                                                                   | prd-devhub.md:244     | DH-001 |
| DATA-119 | Tabel `issues`: kolom `ai_classified_at` (TIMESTAMPTZ, nullable)                                                                                                  | prd-devhub.md:245     | DH-001 |
| DATA-120 | Tabel `issues`: kolom `execution_type` (TEXT, NOT NULL, default 'manual', waarden: manual/ai_assisted/ai_autonomous)                                              | prd-devhub.md:248     | DH-001 |
| DATA-121 | Tabel `issues`: kolom `ai_context` (JSONB, default '{}')                                                                                                          | prd-devhub.md:249     | DH-001 |
| DATA-122 | Tabel `issues`: kolom `ai_result` (JSONB, default '{}')                                                                                                           | prd-devhub.md:250     | DH-001 |
| DATA-123 | Tabel `issues`: kolom `ai_executable` (BOOLEAN, default FALSE)                                                                                                    | prd-devhub.md:251     | DH-001 |
| DATA-124 | Tabel `issues`: kolom `created_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                                         | prd-devhub.md:254     | DH-001 |
| DATA-125 | Tabel `issues`: kolom `updated_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                                         | prd-devhub.md:255     | DH-001 |
| DATA-126 | Tabel `issues`: kolom `closed_at` (TIMESTAMPTZ, nullable)                                                                                                         | prd-devhub.md:256     | DH-001 |
| DATA-127 | Tabel `issues`: kolom `issue_number` (INTEGER, auto-increment per project via applicatielogica)                                                                   | prd-devhub.md:796-797 | DH-001 |
| DATA-128 | Index `idx_issues_project_id` op issues(project_id)                                                                                                               | prd-devhub.md:261     | DH-001 |
| DATA-129 | Index `idx_issues_status` op issues(status)                                                                                                                       | prd-devhub.md:262     | DH-001 |
| DATA-130 | Index `idx_issues_assigned_to` op issues(assigned_to)                                                                                                             | prd-devhub.md:263     | DH-001 |
| DATA-131 | Index `idx_issues_priority` op issues(priority)                                                                                                                   | prd-devhub.md:264     | DH-001 |
| DATA-132 | Index `idx_issues_type` op issues(type)                                                                                                                           | prd-devhub.md:265     | DH-001 |
| DATA-133 | Index `idx_issues_userback_id` op issues(userback_id)                                                                                                             | prd-devhub.md:266     | DH-001 |
| DATA-134 | Index `idx_issues_created_at` op issues(created_at DESC)                                                                                                          | prd-devhub.md:267     | DH-001 |
| DATA-135 | Tabel `issue_comments`: kolom `id` (UUID, PK, default gen_random_uuid())                                                                                          | prd-devhub.md:273     | DH-001 |
| DATA-136 | Tabel `issue_comments`: kolom `issue_id` (UUID, NOT NULL, FK naar issues, ON DELETE CASCADE)                                                                      | prd-devhub.md:274     | DH-001 |
| DATA-137 | Tabel `issue_comments`: kolom `author_id` (UUID, NOT NULL, FK naar profiles(id))                                                                                  | prd-devhub.md:275     | DH-001 |
| DATA-138 | Tabel `issue_comments`: kolom `body` (TEXT, NOT NULL)                                                                                                             | prd-devhub.md:276     | DH-001 |
| DATA-139 | Tabel `issue_comments`: kolom `created_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                                 | prd-devhub.md:277     | DH-001 |
| DATA-140 | Tabel `issue_comments`: kolom `updated_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                                 | prd-devhub.md:278     | DH-001 |
| DATA-141 | Index `idx_issue_comments_issue_id` op issue_comments(issue_id)                                                                                                   | prd-devhub.md:281     | DH-001 |
| DATA-142 | Tabel `issue_activity`: kolom `id` (UUID, PK, default gen_random_uuid())                                                                                          | prd-devhub.md:288     | DH-001 |
| DATA-143 | Tabel `issue_activity`: kolom `issue_id` (UUID, NOT NULL, FK naar issues, ON DELETE CASCADE)                                                                      | prd-devhub.md:289     | DH-001 |
| DATA-144 | Tabel `issue_activity`: kolom `actor_id` (UUID, FK naar profiles(id), nullable — NULL voor systeem/AI acties)                                                     | prd-devhub.md:290     | DH-001 |
| DATA-145 | Tabel `issue_activity`: kolom `action` (TEXT, NOT NULL, waarden: created/status_changed/assigned/priority_changed/classified/commented/label_added/label_removed) | prd-devhub.md:291     | DH-001 |
| DATA-146 | Tabel `issue_activity`: kolom `field` (TEXT, nullable)                                                                                                            | prd-devhub.md:292     | DH-001 |
| DATA-147 | Tabel `issue_activity`: kolom `old_value` (TEXT, nullable)                                                                                                        | prd-devhub.md:293     | DH-001 |
| DATA-148 | Tabel `issue_activity`: kolom `new_value` (TEXT, nullable)                                                                                                        | prd-devhub.md:294     | DH-001 |
| DATA-149 | Tabel `issue_activity`: kolom `metadata` (JSONB, default '{}')                                                                                                    | prd-devhub.md:295     | DH-001 |
| DATA-150 | Tabel `issue_activity`: kolom `created_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                                 | prd-devhub.md:296     | DH-001 |
| DATA-151 | Index `idx_issue_activity_issue_id` op issue_activity(issue_id)                                                                                                   | prd-devhub.md:300     | DH-001 |
| DATA-152 | Index `idx_issue_activity_created_at` op issue_activity(created_at DESC)                                                                                          | prd-devhub.md:301     | DH-001 |
| DATA-153 | Tabel `devhub_project_access`: kolom `id` (UUID, PK, default gen_random_uuid())                                                                                   | prd-devhub.md:307     | DH-001 |
| DATA-154 | Tabel `devhub_project_access`: kolom `profile_id` (UUID, NOT NULL, FK naar profiles, ON DELETE CASCADE)                                                           | prd-devhub.md:308     | DH-001 |
| DATA-155 | Tabel `devhub_project_access`: kolom `project_id` (UUID, NOT NULL, FK naar projects, ON DELETE CASCADE)                                                           | prd-devhub.md:309     | DH-001 |
| DATA-156 | Tabel `devhub_project_access`: kolom `role` (TEXT, NOT NULL, default 'member', waarden: admin/member/guest)                                                       | prd-devhub.md:310     | DH-001 |
| DATA-157 | Tabel `devhub_project_access`: kolom `created_at` (TIMESTAMPTZ, NOT NULL, default now())                                                                          | prd-devhub.md:311     | DH-001 |
| DATA-158 | Tabel `devhub_project_access`: UNIQUE constraint op (profile_id, project_id)                                                                                      | prd-devhub.md:312     | DH-001 |
| DATA-159 | Index `idx_devhub_project_access_profile_id` op devhub_project_access(profile_id)                                                                                 | prd-devhub.md:316     | DH-001 |
| DATA-160 | Index `idx_devhub_project_access_project_id` op devhub_project_access(project_id)                                                                                 | prd-devhub.md:317     | DH-001 |
| DATA-161 | Kolom `userback_project_id` (TEXT, nullable) toevoegen aan bestaande `projects` tabel                                                                             | prd-devhub.md:679-681 | DH-001 |
| DATA-162 | Kolom `project_key` (TEXT, UNIQUE, nullable) toevoegen aan bestaande `projects` tabel — voor status page URL routing                                              | prd-devhub.md:922     | DH-001 |

## Security eisen

| ID       | Beschrijving                                                                                                                                                                                           | Bron                  | Sprint |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------ |
| SEC-101  | RLS enabled op `issues` tabel                                                                                                                                                                          | prd-devhub.md:324     | DH-001 |
| SEC-102  | RLS policy: authenticated users can SELECT issues                                                                                                                                                      | prd-devhub.md:325-326 | DH-001 |
| SEC-103  | RLS policy: authenticated users can INSERT issues                                                                                                                                                      | prd-devhub.md:327-328 | DH-001 |
| SEC-104  | RLS policy: authenticated users can UPDATE issues                                                                                                                                                      | prd-devhub.md:329-330 | DH-001 |
| SEC-105  | RLS enabled op `issue_comments` tabel                                                                                                                                                                  | prd-devhub.md:333     | DH-001 |
| SEC-106  | RLS policy: authenticated users can SELECT comments                                                                                                                                                    | prd-devhub.md:334-335 | DH-001 |
| SEC-107  | RLS policy: authenticated users can INSERT comments                                                                                                                                                    | prd-devhub.md:336-337 | DH-001 |
| SEC-108  | RLS policy: users can UPDATE own comments only (auth.uid() = author_id)                                                                                                                                | prd-devhub.md:338-339 | DH-001 |
| SEC-109  | RLS enabled op `issue_activity` tabel                                                                                                                                                                  | prd-devhub.md:342     | DH-001 |
| SEC-110  | RLS policy: authenticated users can SELECT activity                                                                                                                                                    | prd-devhub.md:343-344 | DH-001 |
| SEC-111  | RLS policy: authenticated users can INSERT activity                                                                                                                                                    | prd-devhub.md:345-346 | DH-001 |
| SEC-112  | RLS enabled op `devhub_project_access` tabel                                                                                                                                                           | prd-devhub.md:349     | DH-001 |
| SEC-113  | RLS policy: authenticated users can SELECT project access                                                                                                                                              | prd-devhub.md:350-351 | DH-001 |
| SEC-114  | RLS policy: authenticated users can ALL project access                                                                                                                                                 | prd-devhub.md:352-353 | DH-001 |
| SEC-115  | Status page gebruikt admin client (service role) — issues tabel hoeft niet publiek leesbaar te zijn                                                                                                    | prd-devhub.md:937     | DH-008 |
| SEC-116  | Status page filtert server-side welke velden naar de client gaan (alleen titel, status, type, datum)                                                                                                   | prd-devhub.md:937     | DH-008 |
| SEC-150  | Access-check functies (`isAdmin`, `requireAdmin`, `assertProjectAccess`, `listAccessibleProjectIds`) zijn de enige plek waar rol-logica leeft; app-code doet nooit inline `profile.role === 'admin'`.  | DH-013-020 index      | DH-014 |
| SEC-151  | Helpers staan onder `packages/auth/src/` en zijn server-only (gebruiken `@repo/database/supabase/server` of admin client); nooit in Client Components geïmporteerd.                                    | DH-013-020 index      | DH-014 |
| SEC-152  | `assertProjectAccess` faalt default-deny bij ontbrekende user-sessie (null/undefined userId → throw, geen silent true).                                                                                | DH-013-020 index      | DH-014 |
| SEC-153  | Cockpit middleware-redirect gebeurt vóór data-ophalen; geen query-leak naar non-admins tijdens de redirect-flow.                                                                                       | DH-013-020 index      | DH-015 |
| SEC-154  | DevHub issue list toont alleen issues uit projecten beschikbaar via `listAccessibleProjectIds(userId)`.                                                                                                | DH-013-020 index      | DH-016 |
| SEC-155  | Issue detail page rendert `notFound()` (404) wanneer de user geen toegang heeft tot het project.                                                                                                       | DH-013-020 index      | DH-016 |
| SEC-156  | `createIssueAction` controleert access op `project_id` in payload vóór insert.                                                                                                                         | DH-013-020 index      | DH-016 |
| SEC-157  | `updateIssueAction` en `deleteIssueAction` controleren access op basis van bestaand `issue.project_id` (info-leak prevention via "niet gevonden").                                                     | DH-013-020 index      | DH-016 |
| SEC-158  | Comments CRUD controleren project-access via het gerelateerde issue.                                                                                                                                   | DH-013-020 index      | DH-016 |
| SEC-159  | `insertActivity` calls gebeuren pas na succesvolle access-assertie.                                                                                                                                    | DH-013-020 index      | DH-016 |
| SEC-160  | Triage/counts/classify/review-actions respecteren access-check per project.                                                                                                                            | DH-013-020 index      | DH-016 |
| SEC-170  | RLS `issues` SELECT: toegestaan desda `profiles.role = 'admin'` voor `auth.uid()` OF er bestaat een `devhub_project_access` row voor `(auth.uid(), issues.project_id)`.                                | DH-017                | DH-017 |
| SEC-171  | RLS `issues` INSERT: toegestaan desda admin OF row in `devhub_project_access` voor `NEW.project_id`.                                                                                                   | DH-017                | DH-017 |
| SEC-172  | RLS `issues` UPDATE: toegestaan desda admin OF access tot zowel `OLD.project_id` als `NEW.project_id` (voorkomt "verhuizen" naar een ander project).                                                   | DH-017                | DH-017 |
| SEC-173  | RLS `issue_comments` SELECT: via issue-join — alleen comments op zichtbare issues.                                                                                                                     | DH-017                | DH-017 |
| SEC-174  | RLS `issue_comments` INSERT/UPDATE: alleen op zichtbare issues; UPDATE blijft beperkt tot author.                                                                                                      | DH-017                | DH-017 |
| SEC-175  | RLS `issue_activity` SELECT/INSERT: via issue-join — alleen op zichtbare issues.                                                                                                                       | DH-017                | DH-017 |
| SEC-176  | RLS `devhub_project_access` SELECT: admins lezen alles; members lezen alleen rijen met eigen `profile_id = auth.uid()`.                                                                                | DH-017                | DH-017 |
| SEC-177  | RLS `devhub_project_access` INSERT/UPDATE/DELETE: enkel admins.                                                                                                                                        | DH-017                | DH-017 |
| PERF-150 | RLS helpers `is_admin(uuid)` en `has_project_access(uuid,uuid)` zijn `STABLE SECURITY DEFINER` zodat Postgres per-row kan cachen en geen RLS-recursie via `profiles`/`devhub_project_access` optreedt. | DH-017                | DH-017 |
| EDGE-160 | Dev-bypass user (UUID `00000000-0000-0000-0000-000000000000`) wordt door `is_admin()` als admin beschouwd, zodat lokale dev zonder Supabase-sessie blijft werken.                                      | DH-017                | DH-017 |

## Rollen en permissies

> **Vervangen in DH-013**: `AUTH-101 / AUTH-102 / AUTH-103 / AUTH-104` beschreven een 3-rollen model (`admin` / `member` / `guest`) met "iedereen ziet alles". Dit model is vervangen door `AUTH-150..158` (2 rollen, admin impliciet alles, members per-project access). De oude IDs blijven gearchiveerd voor traceability maar zijn niet meer actief.

| ID           | Beschrijving                                                                                                                                                                     | Bron                  | Sprint |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| ~~AUTH-101~~ | _Vervangen door AUTH-150..158 in DH-013_                                                                                                                                         | prd-devhub.md:110     | DH-003 |
| ~~AUTH-102~~ | _Vervangen door AUTH-150..158 in DH-013_                                                                                                                                         | prd-devhub.md:111     | DH-003 |
| ~~AUTH-103~~ | _Ingetrokken in DH-013 (geen `guest` rol meer)_                                                                                                                                  | prd-devhub.md:112     | DH-001 |
| ~~AUTH-104~~ | _Vervangen door AUTH-152 (admin impliciet alles) in DH-013_                                                                                                                      | prd-devhub.md:114     | DH-003 |
| AUTH-105     | Supabase Auth — zelfde instance als cockpit (login-methode herzien in DH-018 → magic link)                                                                                       | prd-devhub.md:802-803 | DH-003 |
| AUTH-106     | Middleware route guard op alle routes behalve `/login`                                                                                                                           | prd-devhub.md:804     | DH-003 |
| AUTH-150     | Het platform kent exact twee rollen: `admin` en `member`. Geen derde tier.                                                                                                       | DH-013-020 index      | DH-013 |
| AUTH-151     | Rol leeft uitsluitend op `profiles.role`; `devhub_project_access` bevat géén `role` kolom meer.                                                                                  | DH-013-020 index      | DH-013 |
| AUTH-152     | Admins krijgen impliciet toegang tot alle DevHub-projecten zonder `devhub_project_access` rows.                                                                                  | DH-013-020 index      | DH-013 |
| AUTH-153     | Stef (stef@jouwaipartner.nl) en Wouter (wouter@jouwaipartner.nl) zijn als `admin` geseed (idempotent).                                                                           | DH-013-020 index      | DH-013 |
| AUTH-154     | Alle andere bestaande profiles behouden hun rol; ontbrekende/ongeldige waarden worden `'member'`.                                                                                | DH-013-020 index      | DH-013 |
| DATA-200     | Kolom `devhub_project_access.role` wordt via migratie gedropt.                                                                                                                   | DH-013-020 index      | DH-013 |
| DATA-201     | `profiles.role` heeft CHECK constraint: alleen `'admin'` of `'member'`.                                                                                                          | DH-013-020 index      | DH-013 |
| DATA-202     | DB-trigger garandeert dat `profiles` altijd ≥ 1 rij met `role = 'admin'` bevat.                                                                                                  | DH-013-020 index      | DH-013 |
| RULE-150     | De laatste admin kan niet gedemoot, gedeactiveerd of verwijderd worden zonder dat er al een andere admin is.                                                                     | DH-013-020 index      | DH-013 |
| AUTH-155     | Helper `isAdmin(userId)` retourneert `true` desda `profiles.role = 'admin'` voor de gegeven userId.                                                                              | DH-013-020 index      | DH-014 |
| AUTH-156     | Helper `requireAdmin()` haalt de huidige user op en redirect naar `/login` bij geen sessie of geen admin-rol.                                                                    | DH-013-020 index      | DH-014 |
| AUTH-157     | `assertProjectAccess(userId, projectId)` slaagt zonder row-check voor admins; members vereisen bestaande row.                                                                    | DH-013-020 index      | DH-014 |
| AUTH-158     | `listAccessibleProjectIds(userId)` → admins: alle `projects.id`; members: alleen IDs in `devhub_project_access` (geen fallback).                                                 | DH-013-020 index      | DH-014 |
| AUTH-160     | Cockpit middleware staat toegang alleen toe voor `profiles.role = 'admin'`; members → 302 naar DevHub-URL.                                                                       | DH-013-020 index      | DH-015 |
| AUTH-161     | Members die Cockpit bezoeken krijgen een duidelijke redirect (geen 500 of lege pagina).                                                                                          | DH-013-020 index      | DH-015 |
| AUTH-162     | Cockpit Server Actions doen een `isAdmin()` check (defense-in-depth) en retourneren `{ error: "Geen toegang" }` voor non-admins.                                                 | DH-013-020 index      | DH-015 |
| AUTH-170     | DevHub en Cockpit login-pagina accepteren alleen een e-mailadres en versturen een magic link via `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })`. | DH-018                | DH-018 |
| AUTH-171     | Magic link opent `/auth/callback` die de sessie aanmaakt en doorverwijst: admin → cockpit, member → devhub.                                                                      | DH-018                | DH-018 |
| AUTH-172     | Ongeldige of verlopen magic links tonen `?error=invalid_link` op de login pagina met een banner en "Stuur opnieuw" actie.                                                        | DH-018                | DH-018 |
| AUTH-173     | DevHub login ondersteunt tijdelijk password-fallback (collapsible) voor users met bestaand wachtwoord. Cockpit login is magic-link-only.                                         | DH-018                | DH-018 |
| AUTH-174     | Geen self-signup route, geen "account aanmaken" link. Access begint altijd met invite (DH-019).                                                                                  | DH-018                | DH-018 |
| AUTH-175     | Sessieduur is 30 dagen refresh-token; instelling staat op Supabase project-niveau (handmatig in dashboard).                                                                      | DH-018                | DH-018 |
| UI-160       | Login-formulier bevat: e-mailveld, submit "Stuur magic link", success-state "Check je inbox", error-state. DevHub heeft daarnaast een "Inloggen met wachtwoord" toggle.          | DH-018                | DH-018 |
| EDGE-170     | Onbekende e-mail (geen profile / geen auth user) → geen error-leak. Zelfde success-melding; `shouldCreateUser: false` garandeert dat er geen user wordt aangemaakt.              | DH-018                | DH-018 |
| SEC-180      | `emailRedirectTo` wordt geconstrueerd vanuit `window.location.origin`; Supabase redirect-whitelist in project-settings bevat de productie-URL's van cockpit en devhub.           | DH-018                | DH-018 |
| FUNC-170     | Server Action `inviteUserAction({ email, role, projectIds[] })` roept Supabase `admin.inviteUserByEmail` aan, upsert `profiles` en sync `devhub_project_access` voor members.    | DH-019                | DH-019 |
| FUNC-171     | `inviteUserAction`, `updateUserAccessAction` en `deactivateUserAction` zijn uitsluitend uitvoerbaar door admins (`requireAdminInAction`).                                        | DH-019                | DH-019 |
| FUNC-172     | `handle_new_user` trigger is idempotent (ON CONFLICT DO NOTHING) zodat invite-flow (profile eerst, signup-event daarna) geen duplicate-error oplevert.                           | DH-019                | DH-019 |
| FUNC-173     | `deactivateUserAction(userId)` bant de auth.user (876000h) en verwijdert alle `devhub_project_access` rijen; profile blijft voor attributie.                                     | DH-019                | DH-019 |
| FUNC-174     | `updateUserAccessAction(userId, { role?, projectIds? })` past rol en/of project-toegang aan; respecteert min-1-admin en RULE-161.                                                | DH-019                | DH-019 |
| RULE-160     | Email is de natuurlijke sleutel tussen `profiles` en `auth.users`. Unique index op `lower(email)` in profiles garandeert geen duplicates.                                        | DH-019                | DH-019 |
| RULE-161     | Invite met `role='admin'` + `projectIds.length>0` → validation-error (Zod `superRefine`). Admins hebben impliciet toegang tot alles.                                             | DH-019                | DH-019 |
| EDGE-180     | Bestaande email bij invite → idempotent update (geen tweede mail tenzij `resendInvite: true`); rol en access worden gesyncd.                                                     | DH-019                | DH-019 |
| EDGE-181     | Supabase `inviteUserByEmail` fail → Server Action retourneert `{ error }` zonder wees-rijen in `profiles` of `devhub_project_access` (mutaties komen pas ná succesvolle invite). | DH-019                | DH-019 |
| SEC-185      | Invite-flow gebruikt uitsluitend server-side `getAdminClient()` (service role); actions staan onder `"use server"`, nooit importeerbaar in Client Components.                    | DH-019                | DH-019 |
| SEC-186      | `deactivateUserAction` en `updateUserAccessAction` weigeren operaties die de laatste admin raken (defense-in-depth naast DB-trigger uit DH-013).                                 | DH-019                | DH-019 |
| FUNC-180     | Pagina `/admin/team` in cockpit; laadt uitsluitend voor admins (middleware + `requireAdmin()` in `admin/layout.tsx`).                                                            | DH-020                | DH-020 |
| FUNC-181     | Team overzicht toont per user naam/email, rol-badge, laatste login uit `auth.users.last_sign_in_at`, status (actief/gedeactiveerd), aantal toegewezen projecten.                 | DH-020                | DH-020 |
| FUNC-182     | Invite dialog met email-input, rol-toggle en project-multi-select (alleen bij rol=member) die `inviteUserAction` aanroept.                                                       | DH-020                | DH-020 |
| FUNC-183     | Edit dialog: rol wijzigen + project-toegang bewerken + deactivate-actie via row-menu.                                                                                            | DH-020                | DH-020 |
| FUNC-184     | Users zonder `last_sign_in_at` krijgen een "Opnieuw uitnodigen"-menu-item dat `inviteUserAction({resendInvite: true})` aanroept.                                                 | DH-020                | DH-020 |
| UI-170       | "Team" item verschijnt in cockpit side-menu + desktop-sidebar onder een "Admin" sectie (cockpit is admin-only, dus geen extra conditional).                                      | DH-020                | DH-020 |
| UI-171       | Laatste admin: demote-optie in edit dialog en deactivate-knop in row-menu zijn disabled met tooltip-uitleg.                                                                      | DH-020                | DH-020 |
| UI-172       | Invite success: groene banner in de dialog ("Uitnodiging verstuurd naar X"); input en project-selectie worden gereset zodat admin direct volgende kan inviten.                   | DH-020                | DH-020 |
| UI-173       | Server action errors verschijnen als rode banner in de dialog/row; veld-specifieke errors (email-format) komen uit Zod.                                                          | DH-020                | DH-020 |
| SEC-190      | `admin/layout.tsx` doet `await requireAdmin()` als layer-defense naast middleware; directe URL-hit door member → redirect via middleware, anders door layout.                    | DH-020                | DH-020 |
| EDGE-190     | Profile zonder email → UI rendert "Geen email" placeholder in de user-row zonder crash.                                                                                          | DH-020                | DH-020 |
| EDGE-191     | Project CASCADE-verwijderd → access-row is al weg; team-UI toont alleen nog bestaande project-count zonder dode IDs.                                                             | DH-020                | DH-020 |

## Functionele eisen

| ID       | Beschrijving                                                                                                    | Bron                  | Sprint |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| FUNC-101 | Issue aanmaken: gebruiker vult titel, beschrijving, type, priority in                                           | prd-devhub.md:168-177 | DH-005 |
| FUNC-102 | Issue aanmaken: optioneel component, assigned_to, labels                                                        | prd-devhub.md:173     | DH-005 |
| FUNC-103 | Issue aanmaken: bij opslaan draait AI classificatie op achtergrond (fire-and-forget)                            | prd-devhub.md:174-175 | DH-006 |
| FUNC-104 | Issue aanmaken: AI vult component, severity, repro_steps aan als ze leeg zijn                                   | prd-devhub.md:175     | DH-006 |
| FUNC-105 | Issue bewerken: titel, beschrijving, type, status, priority, component, severity, assigned_to, labels wijzigen  | prd-devhub.md:835     | DH-005 |
| FUNC-106 | Issue verwijderen                                                                                               | prd-devhub.md:835     | DH-005 |
| FUNC-107 | Issue status wijzigen (backlog/todo/in_progress/done/cancelled)                                                 | prd-devhub.md:199-209 | DH-005 |
| FUNC-108 | Issue toewijzen aan developer                                                                                   | prd-devhub.md:191     | DH-005 |
| FUNC-109 | Wanneer status naar 'done' of 'cancelled' gaat: closed_at timestamp invullen                                    | prd-devhub.md:256     | DH-005 |
| FUNC-110 | Comment plaatsen op issue                                                                                       | prd-devhub.md:204-207 | DH-005 |
| FUNC-111 | Comment bewerken (eigen comments)                                                                               | prd-devhub.md:848     | DH-005 |
| FUNC-112 | Comment verwijderen                                                                                             | prd-devhub.md:837     | DH-005 |
| FUNC-113 | Activity log: elke statuswijziging, toewijzing, prioriteitswijziging, classificatie, comment wordt gelogd       | prd-devhub.md:291     | DH-005 |
| FUNC-114 | Issue nummering: auto-increment per project (#1, #2, #3) via applicatielogica bij insert                        | prd-devhub.md:791-797 | DH-005 |
| FUNC-115 | Userback sync: admin triggert sync vanuit DevHub                                                                | prd-devhub.md:146-162 | DH-007 |
| FUNC-116 | Userback sync: haalt items op via Userback API (GET /feedback) met paginering                                   | prd-devhub.md:148-149 | DH-007 |
| FUNC-117 | Userback sync: dedup op userback_id (ON CONFLICT DO UPDATE)                                                     | prd-devhub.md:152     | DH-007 |
| FUNC-118 | Userback sync: field mapping volgens specificatie (zie RULE sectie)                                             | prd-devhub.md:599-629 | DH-007 |
| FUNC-119 | Userback sync: incremental sync via cursor (MAX userback_modified_at)                                           | prd-devhub.md:589-593 | DH-007 |
| FUNC-120 | Userback sync: eerste sync haalt alle pagina's op, volgende syncs alleen gewijzigd na cursor                    | prd-devhub.md:593     | DH-007 |
| FUNC-121 | Userback sync: 200ms delay tussen pagina's (rate limit bescherming)                                             | prd-devhub.md:579     | DH-007 |
| FUNC-122 | Userback sync: return resultaat { imported, updated, skipped, total }                                           | prd-devhub.md:640     | DH-007 |
| FUNC-123 | AI classificatie: runIssueClassifier bepaalt type, component, severity, repro_steps, confidence                 | prd-devhub.md:390-403 | DH-006 |
| FUNC-124 | AI classificatie: resultaat naar ai_classification JSONB + top-level kolommen + ai_classified_at                | prd-devhub.md:516-523 | DH-006 |
| FUNC-125 | AI classificatie: activity log entry met action='classified', metadata={model, confidence}                      | prd-devhub.md:523     | DH-006 |
| FUNC-126 | AI classificatie bij Userback import: voor elk nieuw item, sequentieel met 100ms delay                          | prd-devhub.md:528     | DH-007 |
| FUNC-127 | AI classificatie bij handmatig aanmaken: als achtergrondtaak na opslaan (fire-and-forget)                       | prd-devhub.md:529     | DH-006 |
| FUNC-128 | AI herclassificatie: handmatig triggerable vanuit issue detail (knop "Herclassificeer")                         | prd-devhub.md:531     | DH-006 |
| FUNC-129 | AI classificatie draait alleen bij aanmaak, niet bij update                                                     | prd-devhub.md:530     | DH-006 |
| FUNC-130 | Userback sync: POST route (handmatig, auth via Supabase session)                                                | prd-devhub.md:647     | DH-007 |
| FUNC-131 | Userback sync: optioneel GET route voor Vercel Cron (auth via CRON_SECRET)                                      | prd-devhub.md:648     | DH-007 |
| FUNC-132 | Userback sync: maxDuration = 60 (Vercel timeout)                                                                | prd-devhub.md:649     | DH-007 |
| FUNC-133 | Status page: toont open issues per project (titel + status, geen interne details)                               | prd-devhub.md:881-882 | DH-008 |
| FUNC-134 | Status page: toont recent opgeloste items                                                                       | prd-devhub.md:882     | DH-008 |
| FUNC-135 | Status page: toont project naam + samenvatting (X open issues, Y opgelost deze maand)                           | prd-devhub.md:883     | DH-008 |
| FUNC-136 | Status page: geen login vereist, toegang via project_key in URL                                                 | prd-devhub.md:922     | DH-008 |
| FUNC-137 | Status page: read-only, geen interactie                                                                         | prd-devhub.md:923     | DH-008 |
| FUNC-138 | Status page: automatisch actueel, leest direct uit issues tabel                                                 | prd-devhub.md:925     | DH-008 |
| FUNC-139 | Server Action: createIssue met Zod validatie                                                                    | prd-devhub.md:989     | DH-005 |
| FUNC-140 | Server Action: updateIssue met Zod validatie                                                                    | prd-devhub.md:990     | DH-005 |
| FUNC-141 | Server Action: deleteIssue                                                                                      | prd-devhub.md:991     | DH-005 |
| FUNC-142 | Server Action: syncUserback                                                                                     | prd-devhub.md:995     | DH-007 |
| FUNC-143 | Server Action: classifyIssue                                                                                    | prd-devhub.md:998     | DH-006 |
| FUNC-144 | Query: listIssues met filters (projectId, status, priority, type, component, assignedTo, search, limit, offset) | prd-devhub.md:967-977 | DH-002 |
| FUNC-145 | Query: getIssueById                                                                                             | prd-devhub.md:979     | DH-002 |
| FUNC-146 | Query: getIssueCounts per project (backlog, todo, in_progress, done, cancelled)                                 | prd-devhub.md:980     | DH-002 |
| FUNC-147 | Query: listIssueComments                                                                                        | prd-devhub.md:981     | DH-002 |
| FUNC-148 | Query: listIssueActivity                                                                                        | prd-devhub.md:982     | DH-002 |
| FUNC-149 | Mutation: insertIssue                                                                                           | prd-devhub.md:953     | DH-002 |
| FUNC-150 | Mutation: updateIssue                                                                                           | prd-devhub.md:953     | DH-002 |
| FUNC-151 | Mutation: deleteIssue                                                                                           | prd-devhub.md:953     | DH-002 |
| FUNC-152 | Mutation: insertComment                                                                                         | prd-devhub.md:953     | DH-002 |
| FUNC-153 | Mutation: insertActivity                                                                                        | prd-devhub.md:953     | DH-002 |
| FUNC-154 | Query: getProjectByKey (status page)                                                                            | prd-devhub.md:932     | DH-002 |
| FUNC-155 | Query: listPublicIssues (alleen titel, status, type, created_at, closed_at)                                     | prd-devhub.md:933     | DH-002 |
| FUNC-156 | Query: getPublicIssueCounts (open, resolved_this_month)                                                         | prd-devhub.md:934     | DH-002 |
| FUNC-160 | Project-selector toont alleen projecten geretourneerd door `listAccessibleProjectIds(userId)` (admins: alle).   | DH-013-020 index      | DH-016 |

## UI/UX eisen

| ID     | Beschrijving                                                                                                                                  | Bron                  | Sprint |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| UI-101 | Issue list: tabel/list view (niet kaarten), compact, veel informatie per regel                                                                | prd-devhub.md:731     | DH-004 |
| UI-102 | Issue list kolommen: priority indicator, titel, type badge, component badge, assigned avatar, status, created date                            | prd-devhub.md:732     | DH-004 |
| UI-103 | Issue list sortering: standaard op priority (urgent eerst), secundair op created_at (nieuwst eerst)                                           | prd-devhub.md:733     | DH-004 |
| UI-104 | Issue list filters: status (multi-select), priority (multi-select), type (multi-select), component (multi-select), assigned_to (multi-select) | prd-devhub.md:734     | DH-004 |
| UI-105 | Issue list sidebar: snelle navigatie op status (Backlog, Todo, In Progress, Done) met counts                                                  | prd-devhub.md:735     | DH-004 |
| UI-106 | Project switcher: dropdown in top navigation bar                                                                                              | prd-devhub.md:784     | DH-004 |
| UI-107 | Project switcher: toont alle projecten waar gebruiker toegang toe heeft                                                                       | prd-devhub.md:785     | DH-004 |
| UI-108 | Project switcher: selectie opgeslagen in localStorage                                                                                         | prd-devhub.md:786     | DH-004 |
| UI-109 | Project switcher: URL bevat geen project, het is een app-level filter                                                                         | prd-devhub.md:787     | DH-004 |
| UI-110 | Issue detail: beschrijving, AI classificatie, comments, activity log                                                                          | prd-devhub.md:723     | DH-005 |
| UI-111 | Issue detail: sidebar met status, priority, type, component, severity, toegewezen aan, labels, bron, aangemaakt datum                         | prd-devhub.md:748-777 | DH-005 |
| UI-112 | Issue detail: status/priority/assigned_to wijzigbaar via dropdowns                                                                            | prd-devhub.md:751-765 | DH-005 |
| UI-113 | Issue detail: AI reproductiestappen sectie                                                                                                    | prd-devhub.md:760-763 | DH-005 |
| UI-114 | Issue detail: comments en activity samengevoegd in chronologische feed                                                                        | prd-devhub.md:780     | DH-005 |
| UI-115 | Issue detail: "Voeg comment toe" invoerveld onderaan                                                                                          | prd-devhub.md:776     | DH-005 |
| UI-116 | Nieuw issue formulier: pagina op /issues/new                                                                                                  | prd-devhub.md:724     | DH-005 |
| UI-117 | Sidebar navigatie: Backlog, Todo, In Progress, Done met counts                                                                                | prd-devhub.md:703-710 | DH-004 |
| UI-118 | Linear-inspired UI: minimalistisch, snel                                                                                                      | prd-devhub.md:695     | DH-004 |
| UI-119 | Layout: sidebar + main content area                                                                                                           | prd-devhub.md:697-714 | DH-003 |
| UI-120 | Top bar met JAIP DevHub logo, project switcher, "+ Issue" knop                                                                                | prd-devhub.md:699     | DH-003 |
| UI-121 | Login pagina op /login                                                                                                                        | prd-devhub.md:727     | DH-003 |
| UI-122 | Route `/` redirect naar `/issues`                                                                                                             | prd-devhub.md:722     | DH-003 |
| UI-123 | Settings pagina op /settings                                                                                                                  | prd-devhub.md:725     | DH-007 |
| UI-124 | Userback import pagina op /settings/import                                                                                                    | prd-devhub.md:726     | DH-007 |
| UI-125 | Sync UI toont: project naam, laatste sync tijd, items count, sync knop, laatste resultaat                                                     | prd-devhub.md:656-672 | DH-007 |
| UI-126 | Shared component: priority-badge.tsx                                                                                                          | prd-devhub.md:855     | DH-004 |
| UI-127 | Shared component: status-badge.tsx                                                                                                            | prd-devhub.md:856     | DH-004 |
| UI-128 | Shared component: type-badge.tsx                                                                                                              | prd-devhub.md:857     | DH-004 |
| UI-129 | Shared component: component-badge.tsx                                                                                                         | prd-devhub.md:858     | DH-004 |
| UI-130 | Status page layout: minimale layout, JAIP branding                                                                                            | prd-devhub.md:876     | DH-008 |
| UI-131 | Status page: open issues lijst (titel + status, geen interne details)                                                                         | prd-devhub.md:881     | DH-008 |
| UI-132 | Status page: resolved issues lijst                                                                                                            | prd-devhub.md:882     | DH-008 |
| UI-133 | Status page: status header met project naam + samenvatting                                                                                    | prd-devhub.md:883     | DH-008 |
| UI-134 | Status page: responsive (mobiel en desktop)                                                                                                   | prd-devhub.md:926     | DH-008 |
| UI-135 | Status page route: /[project_key]                                                                                                             | prd-devhub.md:879     | DH-008 |
| UI-136 | Status page fallback: / toont 404 of "Voer een project key in"                                                                                | prd-devhub.md:877     | DH-008 |
| UI-150 | Cockpit `forbiddenRedirect` is configureerbaar via env `NEXT_PUBLIC_DEVHUB_URL` (fallback `/`).                                               | DH-013-020 index      | DH-015 |

## Business rules

| ID       | Beschrijving                                                                                                    | Bron                  | Sprint |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------------------- | ------ |
| RULE-101 | Userback field mapping: id -> userback_id (TEXT, dedup)                                                         | prd-devhub.md:602     | DH-007 |
| RULE-102 | Userback field mapping: description (regel 1) -> title (of AI-gegenereerd als te lang)                          | prd-devhub.md:603     | DH-007 |
| RULE-103 | Userback field mapping: description (volledig) -> description                                                   | prd-devhub.md:604     | DH-007 |
| RULE-104 | Userback field mapping: feedback_type Bug -> 'bug', Idea -> 'feature_request', General -> 'question'            | prd-devhub.md:605-608 | DH-007 |
| RULE-105 | Userback field mapping: priority critical -> 'urgent', important -> 'high', neutral -> 'medium', minor -> 'low' | prd-devhub.md:609-613 | DH-007 |
| RULE-106 | Userback field mapping: status Open -> 'backlog', In Progress -> 'in_progress', Closed -> 'done'                | prd-devhub.md:614-617 | DH-007 |
| RULE-107 | Userback field mapping: email -> reporter_email, name -> reporter_name                                          | prd-devhub.md:618-619 | DH-007 |
| RULE-108 | Userback field mapping: page_url -> source_url                                                                  | prd-devhub.md:620     | DH-007 |
| RULE-109 | Userback field mapping: Screenshots[0]?.url -> source_metadata.screenshot_url                                   | prd-devhub.md:621     | DH-007 |
| RULE-110 | Userback field mapping: browser, os, resolution -> source_metadata.{ browser, os, screen }                      | prd-devhub.md:622     | DH-007 |
| RULE-111 | Userback field mapping: share_url -> source_metadata.share_url                                                  | prd-devhub.md:623     | DH-007 |
| RULE-112 | Userback field mapping: volledig response -> source_metadata.raw_userback (JSONB)                               | prd-devhub.md:628     | DH-007 |
| RULE-113 | Userback due date sentinel: 1970-01-01 betekent "geen due date" — filter weg                                    | prd-devhub.md:631     | DH-007 |
| RULE-114 | Userback source tracking: source = 'userback' voor alle geimporteerde items                                     | prd-devhub.md:238-239 | DH-007 |
| RULE-115 | AI classificatie overschrijft NIET de type/priority mapping van Userback bij import                             | prd-devhub.md:638     | DH-007 |
| RULE-116 | AI classificatie vult component, severity, repro_steps aan bij import                                           | prd-devhub.md:637     | DH-007 |
| RULE-117 | Koppeling project-Userback via projects.userback_project_id (CAi Studio = '127499')                             | prd-devhub.md:679-681 | DH-007 |
| RULE-118 | Prompt caching: system prompt gecached via cacheControl ephemeral bij batch import                              | prd-devhub.md:534-538 | DH-006 |

## Integratie eisen

| ID      | Beschrijving                                                                                 | Bron                  | Sprint |
| ------- | -------------------------------------------------------------------------------------------- | --------------------- | ------ |
| INT-101 | Userback API client: fetchUserbackFeedbackPage (1 pagina ophalen)                            | prd-devhub.md:569-572 | DH-007 |
| INT-102 | Userback API client: fetchAllUserbackFeedback (alle pagina's met paginering + rate limiting) | prd-devhub.md:576-582 | DH-007 |
| INT-103 | Userback API authenticatie: USERBACK_API_TOKEN env var, Authorization Bearer header          | prd-devhub.md:560-561 | DH-007 |
| INT-104 | Userback API endpoint: GET https://rest.userback.io/1.0/feedback                             | prd-devhub.md:555     | DH-007 |
| INT-105 | Userback API client bestand: packages/database/src/integrations/userback.ts                  | prd-devhub.md:565     | DH-007 |

## Edge cases

| ID       | Beschrijving                                                                                    | Bron              | Sprint |
| -------- | ----------------------------------------------------------------------------------------------- | ----------------- | ------ |
| EDGE-101 | Userback due date 1970-01-01 is sentinel voor "geen due date" — moet weggefilterd worden        | prd-devhub.md:631 | DH-007 |
| EDGE-102 | Userback description kan te lang zijn voor title — neem regel 1 of laat AI genereren            | prd-devhub.md:603 | DH-007 |
| EDGE-103 | AI classificatie bij vage beschrijving: classificeer altijd, geef lage confidence               | prd-devhub.md:462 | DH-006 |
| EDGE-104 | Status page: ongeldige project_key toont 404                                                    | prd-devhub.md:877 | DH-008 |
| EDGE-150 | Navigatie naar `/issues/[id]` buiten toegang rendert 404 (niet 403) — geen hint over bestaan.   | DH-013-020 index  | DH-016 |
| EDGE-151 | Member zonder toegang tot een enkel project krijgt een empty state met uitleg, geen lege lijst. | DH-013-020 index  | DH-016 |

## Performance eisen

| ID       | Beschrijving                                                             | Bron                  | Sprint |
| -------- | ------------------------------------------------------------------------ | --------------------- | ------ |
| PERF-101 | Userback sync: 200ms delay tussen pagina's (rate limit bescherming)      | prd-devhub.md:579     | DH-007 |
| PERF-102 | AI classificatie bij batch: 100ms delay tussen items (sequentieel)       | prd-devhub.md:528     | DH-007 |
| PERF-103 | Userback sync maxDuration = 60 seconden (Vercel timeout)                 | prd-devhub.md:649     | DH-007 |
| PERF-104 | AI prompt caching: ~90% sneller/goedkoper op input tokens na eerste call | prd-devhub.md:536-537 | DH-006 |

---

## Statistieken

- Totaal requirements: 119
- Gedekt door sprints: 119 (100%)
- Niet gedekt: 0

---

## Traceability Matrix

### Per sprint: welke requirements?

| Sprint | Titel                            | Requirements                                                                                                             |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| DH-001 | Database: issues tabellen + RLS  | DATA-101..162, SEC-101..114, AUTH-103                                                                                    |
| DH-002 | Queries en mutations             | FUNC-144..156                                                                                                            |
| DH-003 | DevHub app setup + auth + layout | AUTH-101..102, AUTH-104..106, UI-119..122                                                                                |
| DH-004 | Issue list + filters + badges    | UI-101..109, UI-117..118, UI-126..129                                                                                    |
| DH-005 | Issue CRUD + detail + comments   | FUNC-101..102, FUNC-105..114, FUNC-139..141, UI-110..116                                                                 |
| DH-006 | AI classificatie agent           | FUNC-103..104, FUNC-123..125, FUNC-127..129, FUNC-143, RULE-118, EDGE-103, PERF-104                                      |
| DH-007 | Userback API integratie + sync   | FUNC-115..122, FUNC-126, FUNC-130..132, FUNC-142, INT-101..105, RULE-101..117, UI-123..125, EDGE-101..102, PERF-101..103 |
| DH-008 | Status page app                  | FUNC-133..138, SEC-115..116, UI-130..136, EDGE-104                                                                       |

### Niet-gedekte requirements

Geen. Alle 119 requirements zijn gedekt.
