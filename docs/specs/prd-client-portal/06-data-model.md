# 6. Data Model

## Bestaande entiteiten (al in shared Supabase database)

- `issues` — DevHub issue-tabel met o.a. `id`, `title`, `description`, `status`, `type`, `priority`, `organization_id`, `project_id`, `created_at`, `updated_at`, `labels`
- `users` — Auth-gebruikers met `role` (`admin`, `client`)
- `organizations` — Klantorganisaties

## Toe te voegen kolommen op `issues`

| Kolom | Type | Nullable | Default | Toelichting |
| ----- | ---- | -------- | ------- | ----------- |

> _Sectie wordt aangevuld in volgende batch._
