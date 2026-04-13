# Micro Sprint DH-019: Invite-only onboarding flow

## Doel

Users komen alleen het systeem in via een admin-invite. Deze sprint levert de server-side invite flow: een admin voert een e-mailadres in (en optioneel direct project-toewijzingen), het systeem maakt een `profiles` row met de juiste rol, koppelt eventuele `devhub_project_access` rows, en stuurt via Supabase `inviteUserByEmail` een magic-link-invitatie. Bij eerste login wordt de auth-user automatisch gekoppeld aan de bestaande profile op e-mailbasis (zodat `profiles.id = auth.users.id` klopt).

Deze sprint levert **geen** admin-UI op; die volgt in DH-020. Hier komt alleen de server-action + helpers zodat de UI in DH-020 er op kan aansluiten, én er een CLI/scripted pad is om de eerste member (Ege) vanuit Stef/Wouter toe te voegen.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FUNC-170 | Server Action `inviteUserAction({ email, role, projectIds[] })` die: (a) een `profiles` row aanmaakt of hergebruikt, (b) project-access rows aanmaakt voor members, (c) Supabase `admin.inviteUserByEmail` aanroept.                  |
| FUNC-171 | Server Action is uitsluitend uitvoerbaar door admins (`requireAdmin()`).                                                                                                                                                              |
| FUNC-172 | Bij eerste login (Supabase signup event via magic link) wordt bestaande `profiles` row gekoppeld aan de nieuwe `auth.users.id`. Profile wordt NIET opnieuw aangemaakt — bestaande rij wordt geüpdatet indien `id` nog placeholder is. |
| FUNC-173 | Server Action `deactivateUserAction(userId)`: zet Supabase auth user op banned + verwijdert alle `devhub_project_access` rows. `profiles` row blijft behouden voor attributie (comments, activity).                                   |
| FUNC-174 | Server Action `updateUserAccessAction(userId, { role?, projectIds? })`: pas rol en/of project-toegang aan; respecteert min-1-admin regel.                                                                                             |
| RULE-160 | Email is de natuurlijke sleutel tussen `profiles` en `auth.users`. Invite-flow gebruikt email als match. Trigger of migratie zorgt voor koppeling bij eerste login.                                                                   |
| RULE-161 | Role `admin` invites kunnen geen `projectIds` meekrijgen — admins hebben impliciet toegang tot alles. Als caller `role='admin'` + `projectIds.length>0` doorgeeft: negeer `projectIds` of retourneer validation-error.                |
| EDGE-180 | Als een e-mailadres al een `profiles` row + actieve `auth.users` heeft: invite is idempotent — rol + project-access worden geüpdatet, er wordt géén tweede invite-mail verstuurd (of caller kiest expliciet `resendInvite: true`).    |
| EDGE-181 | Supabase `inviteUserByEmail` faalt (SMTP down) → profile + access-rows blijven bestaan (niet transactioneel via Supabase Admin API), maar Server Action retourneert `{ error }` zodat admin kan retry'en.                             |
| SEC-185  | Invite flow roept Supabase Admin API (service role) aan — alleen server-side, nooit van client. Action staat onder `"use server"` en importeert `getAdminClient()`.                                                                   |
| SEC-186  | Min-1-admin guardrail: `deactivateUserAction` en `updateUserAccessAction` weigeren operaties die de laatste admin raken (consistent met DB-trigger uit DH-013).                                                                       |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 7, 8, 9, 13
- Bestaande trigger die profile aanmaakt bij nieuwe auth.user: `supabase/migrations/20260329000003_profiles.sql` → `handle_new_user()` (moet wellicht aangepast worden om dubbele profile te voorkomen bij invite)
- Supabase Admin API: `getAdminClient()` uit `packages/database/src/supabase/admin.ts`
- Auth helpers uit DH-014: `@repo/auth/access`
- DB-trigger min-1-admin uit DH-013

## Context

### `handle_new_user` trigger aanpassing

Huidige trigger maakt altijd een nieuwe profile. Voor invite-flow moeten we dedupliceren op email:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Zoek bestaande profile op email (aangemaakt via invite flow met placeholder id)
  SELECT id INTO existing_id FROM public.profiles WHERE email = NEW.email LIMIT 1;

  IF existing_id IS NOT NULL AND existing_id != NEW.id THEN
    -- Bestaande profile had placeholder id; update naar echte auth id
    UPDATE public.profiles SET id = NEW.id, updated_at = NOW() WHERE id = existing_id;
  ELSIF existing_id IS NULL THEN
    -- Geen bestaande profile: maak nieuwe (bootstrap-pad)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''));
  END IF;
  RETURN NEW;
END;
$$;
```

Let op: `profiles.id` is een FK naar `auth.users.id` met ON DELETE CASCADE. UPDATE van de PK werkt zolang er nog geen `auth.users` row met conflicterende id bestaat. Agent verifieert bij implementatie of deze UPDATE veilig is, anders is een alternatief: profile aanmaken mét `auth.users.id` al bekend (invite API retourneert de nieuwe userId) en daarna `inviteUserByEmail` aanroepen in omgekeerde volgorde.

**Alternatief (simpeler)**: roep eerst `inviteUserByEmail` aan, krijg de nieuwe `auth.users.id` terug, en maak daarna `profiles` + `devhub_project_access` met de definitieve id. De `handle_new_user` trigger wordt dan idempotent (INSERT ... ON CONFLICT DO NOTHING). **Dit is het aanbevolen pad.**

### Action signatures

```typescript
// apps/cockpit/src/actions/team.ts (nieuw)
"use server";
import { z } from "zod";
import { requireAdmin, isAdmin, NotAuthorizedError } from "@repo/auth/access";
import { getAdminClient } from "@repo/database/supabase/admin";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
  projectIds: z.array(z.string().uuid()).default([]),
});

export async function inviteUserAction(input: z.input<typeof inviteSchema>) {
  await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  // 1. Roep Supabase Admin API aan
  const admin = getAdminClient();
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_DEVHUB_URL}/auth/callback`,
    },
  );
  if (inviteErr) return { error: `Invite mislukt: ${inviteErr.message}` };

  const userId = inviteData.user.id;

  // 2. Insert/upsert profile
  await admin.from("profiles").upsert(
    {
      id: userId,
      email: parsed.data.email,
      role: parsed.data.role,
    },
    { onConflict: "id" },
  );

  // 3. Access rows (alleen voor members)
  if (parsed.data.role === "member" && parsed.data.projectIds.length > 0) {
    await admin
      .from("devhub_project_access")
      .insert(parsed.data.projectIds.map((pid) => ({ profile_id: userId, project_id: pid })));
  }

  return { success: true, userId };
}

export async function updateUserAccessAction(input) {
  /* zie schema */
}
export async function deactivateUserAction(userId: string) {
  /* ban + strip access */
}
```

### `deactivateUserAction` details

```typescript
// Check min-1-admin (defense-in-depth; DB trigger geeft ook error)
const currentRole = await getRole(userId);
if (currentRole === "admin") {
  const adminCount = await countAdmins();
  if (adminCount <= 1) return { error: "Kan laatste admin niet deactiveren" };
}

// Ban via Supabase Admin API
await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" }); // ~100 jaar

// Strip access rows
await admin.from("devhub_project_access").delete().eq("profile_id", userId);

// Profile blijft staan voor attributie
return { success: true };
```

### Testen met Ege

Scripted pad voor de eerste echte invite (geen UI vereist):

```bash
# Via Node script in scripts/invite-user.ts of via Supabase Studio SQL:
# Of: roep inviteUserAction vanuit een temporaire dev-page aan.
```

Documenteer in README.

### Risico's

- **Race condition bij gelijktijdige invite**: twee admins inviteten tegelijk dezelfde email → dubbele profile. Mitigatie: `UNIQUE(email)` constraint op profiles (check of bestaat; zo niet: toevoegen in deze sprint).
- **Email bounces**: Supabase invite faalt silent bij bounce. Admin ziet success maar gebruiker ontvangt niks. Documenteer als bekende beperking.
- **Trigger backward compat**: als er reeds `auth.users` bestaan zonder `profiles` (drift), fallback-pad moet blijven werken.

## Prerequisites

- [x] DH-013: DB fundering (min-1-admin trigger, role CHECK)
- [x] DH-014: Auth helpers (`requireAdmin`, `isAdmin`)
- [x] DH-018: Magic link login (callback route die invites afhandelt)

## Taken

- [ ] Nieuwe migratie: voeg `UNIQUE(email)` constraint toe op `profiles` (check of al bestaat)
- [ ] Update `handle_new_user` trigger voor idempotente profile-koppeling (dedup op email)
- [ ] Nieuw bestand: `apps/cockpit/src/actions/team.ts` met `inviteUserAction`, `updateUserAccessAction`, `deactivateUserAction`
- [ ] Nieuwe queries in `packages/database/src/queries/team.ts`: `listTeamMembers`, `getUserWithAccess(userId)`, `countAdmins()`
- [ ] Zod-schemas in `packages/database/src/validations/team.ts`
- [ ] `scripts/invite-user.ts` of vergelijkbare CLI voor de eerste Ege-invite (optioneel maar handig)
- [ ] Update `docs/specs/requirements-devhub.md` met FUNC-170..174, RULE-160..161, EDGE-180..181, SEC-185..186
- [ ] Update env docs: `NEXT_PUBLIC_COCKPIT_URL` / `NEXT_PUBLIC_DEVHUB_URL` + redirect-whitelist in Supabase

## Acceptatiecriteria

- [ ] [FUNC-170] `inviteUserAction({ email: 'x@y.nl', role: 'member', projectIds: [p1, p2] })` vanuit admin user: (a) nieuwe `profiles` row, (b) 2 `devhub_project_access` rows, (c) Supabase-mail ontvangen
- [ ] [FUNC-171] `inviteUserAction` vanuit non-admin user → `{ error }` (via `requireAdmin` throw-to-error-mapper)
- [ ] [FUNC-172] Na klikken op magic link logt user in; `profiles.id = auth.users.id` (geen dubbele profile)
- [ ] [FUNC-173] `deactivateUserAction(egeId)` → Supabase auth toont banned-status, access-rows weg, profile behouden
- [ ] [FUNC-174] `updateUserAccessAction(userId, { projectIds: [p1] })` vervangt bestaande access rows atomair
- [ ] [RULE-160] Tweede invite met zelfde email → geen duplicate profile, geen crash
- [ ] [RULE-161] Invite met `role='admin'` + `projectIds=[p1]` → ofwel validation-error of projectIds genegeerd (en gedocumenteerd gedrag)
- [ ] [SEC-186] `deactivateUserAction` op laatste admin → error, geen ban toegepast
- [ ] [SEC-186] `updateUserAccessAction({ role: 'member' })` op laatste admin → error, geen demote toegepast
- [ ] [EDGE-181] Gesimuleerde Supabase-fail → action retourneert error; retry werkt zonder manual cleanup
- [ ] `npm run type-check` / `npm run lint` slagen
- [ ] Geteste end-to-end: Stef inviteert Ege → Ege ontvangt mail → klikt → logt in DevHub → ziet alleen zijn toegewezen projecten

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_invite_flow.sql` (nieuw — unique(email) + trigger-update)
- `apps/cockpit/src/actions/team.ts` (nieuw)
- `packages/database/src/queries/team.ts` (nieuw)
- `packages/database/src/validations/team.ts` (nieuw)
- `scripts/invite-user.ts` (nieuw — optioneel CLI)
- `docs/specs/requirements-devhub.md` (bijgewerkt)
