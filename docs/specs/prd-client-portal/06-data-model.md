# 6. Data Model

## Bestaande entiteiten (al in shared Supabase database)

- `issues` — DevHub issue-tabel met o.a. `id`, `title`, `description`, `status`, `type`, `priority`, `project_id`, `source`, `labels`, `created_at`, `updated_at`. Definities in `packages/database/src/constants/issues.ts`.
- `profiles` — User accounts met `role IN ('admin','member','client')` en optionele `organization_id` (FK → `organizations`). Migratie: `20260417100000_portal_client_role.sql`.
- `organizations` — Klantorganisaties.
- `projects` — Projecten gekoppeld aan organisaties.
- `portal_project_access` — Koppeltabel `profile_id ↔ project_id`. Migratie: `20260417100001_portal_project_access.sql`.

## Toe te voegen kolommen op `issues`

| Kolom                   | Type    | Nullable | Default | Toelichting                                                             |
| ----------------------- | ------- | -------- | ------- | ----------------------------------------------------------------------- |
| client_visible          | boolean | Nee      | false   | Of issue in portal getoond wordt                                        |
| client_visible_override | boolean | Nee      | false   | True als handmatig gezet (negeert auto-regel)                           |
| client_title            | text    | Ja       | null    | Klant-vriendelijke titel; fallback naar `title`                         |
| client_description      | text    | Ja       | null    | Klant-vriendelijke beschrijving; fallback naar `description`            |
| has_production_impact   | boolean | Nee      | false   | Computed door trigger: true als label `production` of `customer-impact` |

## Toe te voegen tabel: `audit_log` (light)

| Kolom       | Type      | Nullable | Toelichting                         |
| ----------- | --------- | -------- | ----------------------------------- |
| id          | uuid      | Nee      | Primary key                         |
| user_id     | uuid (FK) | Nee      | → profiles.id                       |
| action      | text      | Nee      | bijv. `issue_visibility_changed`    |
| entity_type | text      | Nee      | bijv. `issue`                       |
| entity_id   | uuid      | Nee      | ID van geraakte entiteit            |
| metadata    | jsonb     | Ja       | Extra context (oude/nieuwe waardes) |
| created_at  | timestamp | Nee      | Auto                                |

## Relaties

- Een `organization` heeft meerdere `profiles` (1:N)
- Een `organization` heeft meerdere `projects` (1:N)
- Een `project` heeft meerdere `issues` (1:N)
- Een `profile` (rol `client`) heeft één `organization` (N:1)
- Een `profile` (rol `client`) heeft 0..N `portal_project_access`-rijen
- **Issues hebben geen directe `organization_id`** — scoping loopt via `issue.project_id → project.organization_id` en via `portal_project_access`

## RLS (Row Level Security)

**Issues-tabel — leesregels (uit te breiden):**

Bestaande policy in `20260418110000_issues_rls_client_hardening.sql` filtert clients op `has_portal_access(auth.uid(), project_id)`, maar mist de `client_visible`-check. Nieuwe migratie moet de policy uitbreiden:

```sql
-- Client kan alleen client_visible issues zien in projecten waar hij toegang toe heeft
CREATE POLICY "client_can_read_visible_issues" ON issues
FOR SELECT USING (
  is_client(auth.uid())
  AND client_visible = true
  AND has_portal_access(auth.uid(), project_id)
);

-- Admin/member (JAIP) kunnen alles zien (bestaande policy ongewijzigd)
```

**Issues-tabel — schrijfregels:**

- Clients kunnen niet schrijven in v1 (feedback-formulier verschoven naar v2)
- Admins/members schrijven via DevHub (bestaande logica) — toggle voor `client_visible` / `client_visible_override` / `client_title` / `client_description` komt erbij in DevHub issue-editor

**Audit_log-tabel — RLS:**

- Clients lezen alleen audit-rijen waar `entity_id` een issue is dat zij mogen zien
- Admins/members lezen alles

## Audit trail

- Alle bestaande tabellen hebben `created_at`/`updated_at` (al aanwezig)
- Wijzigingen aan `client_visible` / `client_visible_override` worden via trigger gelogd in `audit_log`
- Trigger registreert: oude waarde, nieuwe waarde, `user_id` van actor (uit `auth.uid()`)
