# 6. Data Model

## Bestaande entiteiten (al in shared Supabase database)

- `issues` — DevHub issue-tabel met o.a. `id`, `title`, `description`, `status`, `type`, `priority`, `organization_id`, `project_id`, `created_at`, `updated_at`, `labels`
- `users` — Auth-gebruikers met `role` (`admin`, `client`)
- `organizations` — Klantorganisaties

## Toe te voegen kolommen op `issues`

| Kolom                   | Type    | Nullable | Default | Toelichting                                                  |
| ----------------------- | ------- | -------- | ------- | ------------------------------------------------------------ |
| client_visible          | boolean | Nee      | false   | Of issue in portal getoond wordt                             |
| client_visible_override | boolean | Nee      | false   | True als handmatig gezet (negeert auto-regel)                |
| client_title            | text    | Ja       | null    | Klant-vriendelijke titel; fallback naar `title`              |
| client_description      | text    | Ja       | null    | Klant-vriendelijke beschrijving; fallback naar `description` |
| has_production_impact   | boolean | Nee      | false   | Computed: true als label `production` of `customer-impact`   |

## Toe te voegen kolommen op `users`

| Kolom           | Type      | Nullable | Default  | Toelichting                                      |
| --------------- | --------- | -------- | -------- | ------------------------------------------------ |
| role            | enum      | Nee      | 'client' | `admin` (JAIP) / `client`                        |
| organization_id | uuid (FK) | Ja       | null     | → `organizations.id`, alleen voor `client`-users |

## Toe te voegen tabel: `audit_log` (light)

| Kolom       | Type      | Nullable | Toelichting                      |
| ----------- | --------- | -------- | -------------------------------- |
| id          | uuid      | Nee      | Primary key                      |
| user_id     | uuid (FK) | Nee      | → users.id                       |
| action      | text      | Nee      | bijv. `issue_visibility_changed` |
| entity_type | text      | Nee      | bijv. `issue`                    |
| entity_id   | uuid      | Nee      | ID van geraakte entiteit         |
| metadata    | jsonb     | Ja       | Extra context                    |
| created_at  | timestamp | Nee      | Auto                             |

## Relaties

- Een `organization` heeft meerdere `users` (1:N)
- Een `organization` heeft meerdere `issues` (via `organization_id`) (1:N)
- Een `user` heeft hoogstens één `organization` (N:1, alleen `client`-rol)
- Een `issue` heeft één `organization` (N:1)

## RLS (Row Level Security)

**Issues-tabel — leesregels:**

```sql
-- Client kan alleen client_visible issues van eigen org zien
CREATE POLICY "client_can_read_visible_issues" ON issues
FOR SELECT USING (
  client_visible = true
  AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'client'
);

-- Admin (JAIP) kan alles zien
CREATE POLICY "admin_can_read_all_issues" ON issues
FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
```

**Issues-tabel — schrijfregels:**

- Clients kunnen niet schrijven in v1
- Admins schrijven via Cockpit (bestaande logica)

## Audit trail

- Alle bestaande tabellen hebben `created_at`/`updated_at` (al aanwezig)
- Wijzigingen aan `client_visible` worden gelogd in `audit_log` (security-vereiste)
