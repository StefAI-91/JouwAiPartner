# 6. Data Model

## Bestaande entiteiten (al in shared Supabase database)

- `issues` — DevHub issue-tabel met o.a. `id`, `title`, `description`, `status`, `type`, `priority`, `project_id`, `source`, `labels`, `created_at`, `updated_at`. Definities in `packages/database/src/constants/issues.ts`.
- `profiles` — User accounts met `role IN ('admin','member','client')` en optionele `organization_id` (FK → `organizations`). Migratie: `20260417100000_portal_client_role.sql`.
- `organizations` — Klantorganisaties.
- `projects` — Projecten gekoppeld aan organisaties.
- `portal_project_access` — Koppeltabel `profile_id ↔ project_id`. Migratie: `20260417100001_portal_project_access.sql`.

## Toe te voegen kolommen op `issues`

| Kolom              | Type | Nullable | Default | Toelichting                                                  |
| ------------------ | ---- | -------- | ------- | ------------------------------------------------------------ |
| client_title       | text | Ja       | null    | Klant-vriendelijke titel; fallback naar `title`              |
| client_description | text | Ja       | null    | Klant-vriendelijke beschrijving; fallback naar `description` |

> **Geschrapt na review 2026-04-27** (zie §4 Scope): `client_visible`, `client_visible_override`, `has_production_impact`, de `audit_log`-tabel en de Postgres-trigger voor auto-visibility. Reden: alle issues van een project zijn zichtbaar voor de klant; transparantie loopt via de source-switch in de UI, niet via per-issue verbergmechanisme.

## Toe te voegen constanten (geen schema-wijziging)

In `packages/database/src/constants/issues.ts` toe te voegen:

```typescript
export const PORTAL_SOURCE_GROUPS = [
  { key: "client", label: "Onze meldingen", sources: ["portal", "userback"] },
  { key: "jaip", label: "JAIP-meldingen", sources: ["manual", "ai"] },
] as const;
```

Onbekende `source`-waarden vallen default onder `jaip` (zie §5.2 edge cases).

## Relaties

- Een `organization` heeft meerdere `profiles` (1:N)
- Een `organization` heeft meerdere `projects` (1:N)
- Een `project` heeft meerdere `issues` (1:N)
- Een `profile` (rol `client`) heeft één `organization` (N:1)
- Een `profile` (rol `client`) heeft 0..N `portal_project_access`-rijen
- **Issues hebben geen directe `organization_id`** — scoping loopt via `issue.project_id → project.organization_id` en via `portal_project_access`

## RLS (Row Level Security)

**Geen wijzigingen nodig.** Bestaande policy in `20260418110000_issues_rls_client_hardening.sql` filtert clients correct op `has_portal_access(auth.uid(), project_id)` voor SELECT, en staat INSERT toe als `source = 'portal'` met status `triage` (feedback-flow). Dat dekt de hele scope van v1.

**Schrijfregels:**

- Clients schrijven via `submitFeedback`-action (`apps/portal/src/actions/feedback.ts`) — al opgeleverd in CP-005
- Admins/members schrijven via DevHub (bestaande logica). De DevHub issue-editor wordt uitgebreid met twee tekstvelden (`client_title`, `client_description`) — geen nieuwe mutation, bestaande `updateIssue` accepteert de velden zodra de migratie is gedraaid

## Audit trail

- Alle bestaande tabellen hebben `created_at`/`updated_at` (al aanwezig)
- Geen aparte `audit_log` voor de portal in v1 — er is geen visibility-mechanisme om te loggen, en aanpassingen aan `client_title`/`client_description` zijn editor-changes die de bestaande `updated_at` al dekt
