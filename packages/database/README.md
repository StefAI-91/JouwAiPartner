# `@repo/database` — shared data-access laag

Alle Supabase-reads en -writes lopen via deze package. Apps importeren uit
`@repo/database/queries/*`, `@repo/database/mutations/*` of
`@repo/database/integrations/*`; directe `.from()`-calls in Server Actions of
API routes worden geblokkeerd door `scripts/check-no-direct-supabase.sh` (zie
onderaan).

## Structuur

| Folder          | Inhoud                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `queries/`      | Read-helpers (`get`/`list`-prefix). Een bestand per domein.            |
| `mutations/`    | Write-helpers (`create`/`update`/`upsert`/`delete`-prefix).            |
| `supabase/`     | Client factories: `admin.ts` (service-role), `server.ts`, `client.ts`. |
| `integrations/` | Externe-service helpers die DB + netwerk combineren (Slack, Userback). |
| `validations/`  | Zod-schemas gedeeld tussen apps.                                       |
| `constants/`    | Enums en waarden-lijsten die op meerdere plekken gebruikt worden.      |
| `types/`        | Generated + shared type-definities (`database.ts`).                    |

## Client-scope beleid

Alle queries en mutations accepteren een optionele laatste parameter
`client?: SupabaseClient`. Wanneer de caller geen client meegeeft valt de
helper terug op `getAdminClient()`.

| Caller                                      | Geef mee                      | Resultaat                               |
| ------------------------------------------- | ----------------------------- | --------------------------------------- |
| Server Component met user-context           | `await createClient()`        | Helper respecteert RLS van de user.     |
| Server Action / API route met admin-context | niets (of `getAdminClient()`) | Helper gebruikt service-role.           |
| Cron / pipeline / seed / agent              | niets                         | Helper gebruikt service-role (default). |

**Uitzondering:** helpers die inherent admin-privileges vereisen
(`auth.admin.*`, secrets-mutaties) accepteren géén `client`-parameter en
gebruiken altijd `getAdminClient()` intern. Documenteer dit met een JSDoc-
regel `@admin-only`.

**Waarom dit patroon?**

- Geen impliciete privilege-escalatie — de caller blijft verantwoordelijk
  voor de client-keuze.
- Eén helper kan zowel door Server Components (user-scoped, RLS actief) als
  door pipelines (admin) gebruikt worden zonder duplicatie.
- Type-checking via `SupabaseClient` uit `@supabase/supabase-js`.

### Signatuur-voorbeeld

```ts
// queries/team.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export async function getProfileRole(
  userId: string,
  client?: SupabaseClient,
): Promise<"admin" | "member" | "client" | null> {
  const db = client ?? getAdminClient();
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as "admin" | "member" | "client" | null) ?? null;
}
```

### Mutation-voorbeeld

```ts
// mutations/team.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export async function updateProfileRole(
  userId: string,
  role: "admin" | "member" | "client",
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  return { success: true };
}
```

## Conventies

- **Naming:** `getX` / `listX` voor queries, `createX` / `updateX` /
  `upsertX` / `deleteX` voor mutations. DB-kolommen blijven `snake_case`.
- **Return-contract mutations:** `{ success: true }` of
  `{ success: true; data }` bij succes, `{ error: string }` bij falen.
  Geen `throw` tenzij een programmeerfout (assert-like).
- **Geen `.select('*')`** — selecteer altijd de benodigde kolommen.
- **Geen queries in loops.** Gebruik `.in(...)` of join-syntax voor
  batch-ophalen.
- **Idempotentie:** `upsert` met expliciete `onConflict`, zodat de helper
  veilig hernieuwbaar is.

## Issues `source`-waarden (canoniek)

`issues.source` is een vrij `text`-veld zonder DB-CHECK. De canonieke waarden
en hun semantiek staan hier — nieuwe waarden alleen toevoegen na een
roadmap-discussie en update van `PORTAL_SOURCE_GROUPS` in
`src/constants/issues.ts`.

| Source        | Wie genereert                                  | Portal-bucket (`PORTAL_SOURCE_GROUPS`) |
| ------------- | ---------------------------------------------- | -------------------------------------- |
| `portal`      | Klant-PM via portal-formulier (CP-005, PR-020) | `portal_pm` ("Mijn meldingen")         |
| `userback`    | Userback-widget op cockpit/devhub of klant-app | `end_users` ("Van gebruikers")         |
| `jaip_widget` | JAIP-widget op klant-app (WG-001..004)         | `end_users` ("Van gebruikers")         |
| `manual`      | Team-member voegt issue toe in DevHub UI       | `jaip` ("JAIP-meldingen")              |
| `ai`          | AI-agent (toekomstig)                          | `jaip` ("JAIP-meldingen")              |

`source_metadata` is een `jsonb`-veld voor optionele context (browser, device,
steps_to_reproduce, on_behalf_of_user). Geen runtime-validatie — UI-laag
behandelt het als hint, geen blokkade.

RLS-conventie: client-INSERT is alleen toegestaan met `source='portal'` +
`status='triage'` op een project waar `has_portal_access` geldt — zie
`supabase/migrations/20260418110000_issues_rls_client_hardening.sql`.

## Blokkering directe `.from()`-calls

`scripts/check-no-direct-supabase.sh` scant `apps/*/src/actions/**` en
`apps/*/src/app/api/**` op `.from("tabel")`. Het script blokkeert commits via
`.husky/pre-commit` en draait ook als `npm run check:queries` in CI.

- Scope: Server Actions + API routes. Server Components (`page.tsx`,
  `layout.tsx`) en auth-callbacks volgen in sprint Q2c.
- Allowlist: `scripts/supabase-from-allowlist.txt` bevat bestanden die per
  Q2a-inventaris nog in scope van een latere sub-sprint migreren. Deze lijst
  wordt leeggemaakt door Q2b-B en Q2b-C; zodra hij leeg is kan de allowlist-
  branche uit het script verwijderd worden.

Nieuwe helpers ontbrekend? Voeg ze toe in `queries/` of `mutations/` met
bovenstaand client-scope-contract en pas de call-site aan zodat de helper
gebruikt wordt.
