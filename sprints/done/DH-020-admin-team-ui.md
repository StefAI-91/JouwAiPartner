# Micro Sprint DH-020: Admin UI — /admin/team beheer

## Doel

Admins krijgen een UI in de Cockpit om het team te beheren zonder Supabase Studio of CLI te hoeven openen. Onder `/admin/team` komt een pagina met:

- **Team lijst**: alle `profiles` met rol, email, status (actief/banned), aantal toegewezen projecten
- **Invite knop**: opent dialog met email + rol + project-multi-select (members) → roept `inviteUserAction` (DH-019) aan
- **Detail / edit per user**: rol wijzigen (respecteert min-1-admin), project-toegang aanpassen, deactiveren
- **Visuele waarschuwing** bij min-1-admin scenario's (knop disabled + tooltip)

Dit rondt de access-control tranche af: na DH-020 kan Stef zonder engineering hulp nieuwe users toevoegen, rechten aanpassen, en exits afhandelen.

## Requirements

| ID       | Beschrijving                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FUNC-180 | Pagina `/admin/team` is in de Cockpit beschikbaar en vereist admin-rol.                                                                                            |
| FUNC-181 | Overzicht toont per user: naam, email, rol (badge), laatste login (uit `auth.users.last_sign_in_at`), status, aantal toegewezen projecten.                         |
| FUNC-182 | "Uitnodigen"-dialog: email-input, rol-radio (`admin` / `member`), project-multi-select (getoond wanneer rol=member).                                               |
| FUNC-183 | Detail-panel per user: rol wijzigen via select, project-toegang bewerken via multi-select, "Deactiveren" knop.                                                     |
| FUNC-184 | "Opnieuw uitnodigen"-knop op users die nog nooit ingelogd zijn (geen `last_sign_in_at`).                                                                           |
| UI-170   | Side-menu krijgt een "Team" ingang, alleen zichtbaar voor admins.                                                                                                  |
| UI-171   | Min-1-admin guardrails zijn zichtbaar: laatste admin kan niet worden gedemote of gedeactiveerd (knop disabled + tooltip "Er moet minimaal één admin overblijven"). |
| UI-172   | Invite success toont success-toast met tekst "Uitnodiging verstuurd naar X".                                                                                       |
| UI-173   | Server action errors worden als error-toast getoond (niet inline, tenzij veld-specifiek zoals email-format).                                                       |
| SEC-190  | Pagina is ook op route-niveau geguard via `requireAdmin()` in de Server Component (dubbele check naast middleware).                                                |
| EDGE-190 | User zonder email (zou niet moeten kunnen door `NOT NULL` op profiles.email) rendert "Geen email" placeholder, geen crash.                                         |
| EDGE-191 | Project dat is verwijderd terwijl user access had → access row is al via CASCADE weg; UI toont niets bijzonders, geen dode ID's.                                   |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 4, 9, 12, 13
- Server Actions uit DH-019: `inviteUserAction`, `updateUserAccessAction`, `deactivateUserAction`
- Queries uit DH-019: `listTeamMembers`, `getUserWithAccess`, `countAdmins`
- Helpers uit DH-014: `requireAdmin`, `isAdmin`
- Bestaande cockpit side-menu: `apps/cockpit/src/components/layout/side-menu.tsx` (zie git-status: momenteel met M-flag)
- Bestaande cockpit CRUD-patronen voor inline forms: `apps/cockpit/src/app/(dashboard)/clients/`, `.../people/`, `.../projects/`

## Context

### Page structuur

```
apps/cockpit/src/app/(dashboard)/admin/
├── layout.tsx               -- guard: requireAdmin()
├── team/
│   ├── page.tsx             -- Server Component, listTeamMembers
│   ├── loading.tsx
│   ├── error.tsx
│   ├── invite-dialog.tsx    -- Client Component: dialog + form
│   ├── team-list.tsx        -- Server Component: rijtabel
│   ├── user-row.tsx         -- Client Component: row met actions-menu
│   └── user-edit-dialog.tsx -- Client Component: rol + projecten + deactivate
```

### Data-flow

```tsx
// page.tsx
export default async function TeamPage() {
  await requireAdmin();
  const [members, projects] = await Promise.all([listTeamMembers(), listAllProjects()]);
  return (
    <div>
      <PageHeader title="Team" action={<InviteDialog projects={projects} />} />
      <TeamList members={members} projects={projects} />
    </div>
  );
}
```

### Min-1-admin UI-handling

Server-side: `countAdmins()` ophalen; als `count === 1` en de huidige user admin is → disable demote/deactivate knop in de betreffende row. Tooltip met uitleg.

```tsx
const isLastAdmin = user.role === "admin" && adminCount <= 1;
<Button
  disabled={isLastAdmin}
  title={isLastAdmin ? "Er moet minimaal één admin overblijven" : undefined}
>
  Deactiveren
</Button>;
```

### Invite dialog

```tsx
function InviteDialog({ projects }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [projectIds, setProjectIds] = useState<string[]>([]);

  async function onSubmit() {
    const res = await inviteUserAction({ email, role, projectIds });
    if ("error" in res) toast.error(res.error);
    else toast.success(`Uitnodiging verstuurd naar ${email}`);
  }
  // ...form
}
```

### Edit / deactivate dialog

- Rol-select: `admin` | `member`
- Project-multi-select: `Project[]` → `projectIds` (disabled als rol=admin, want admins hebben impliciet toegang)
- Deactiveer-knop: confirm-modal ("Weet je zeker? User verliest toegang maar comments en activity blijven zichtbaar."), roept `deactivateUserAction`.

### Styling

Volg Cockpit style-guide (`docs/specs/style-guide.md`) + bestaande dashboard-componenten. Gebruik `@repo/ui/{button,badge,dialog,select,input,checkbox}`. Rol-badges: admin = primaire kleur, member = neutrale kleur.

### Side-menu integratie

Bestaande side-menu heeft git-status M. Voeg "Team" item toe onder een nieuw "Admin"-kopje of direct onder Settings. Conditioneel renderen: `{await isAdmin(user.id) ? <TeamLink /> : null}` — maar dit is de Cockpit, dus iedereen die de side-menu ziet is al admin na DH-015. Conditionele render dus optioneel.

### Risico's

- **Performance**: `listTeamMembers` joint `auth.users` + `profiles` + count van `devhub_project_access` + `last_sign_in_at`. Grote teams (>100) zouden paginering nodig hebben. Voor 6-25 users is dit triviaal — documenteer als "no pagination needed v1".
- **Stale state na mutation**: gebruik `revalidatePath('/admin/team')` in alle actions.

## Prerequisites

- [x] DH-013: DB fundering
- [x] DH-014: Auth helpers
- [x] DH-015: Cockpit admin-only
- [x] DH-019: Invite flow (server actions + queries bestaan)

## Taken

- [ ] Route group + guard: `apps/cockpit/src/app/(dashboard)/admin/layout.tsx` met `await requireAdmin()`
- [ ] Team pagina: `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx`
- [ ] Loading + error states: `loading.tsx`, `error.tsx`
- [ ] Components:
  - `team-list.tsx` (Server)
  - `user-row.tsx` (Client, actions menu)
  - `invite-dialog.tsx` (Client)
  - `user-edit-dialog.tsx` (Client)
- [ ] Side-menu update: voeg "Team" item toe in `apps/cockpit/src/components/layout/side-menu.tsx`
- [ ] Unit/integration test voor edge cases: disable last-admin demote + deactivate
- [ ] Update `docs/specs/requirements-devhub.md` met FUNC-180..184, UI-170..173, SEC-190, EDGE-190..191

## Acceptatiecriteria

- [ ] [FUNC-180] `/admin/team` laadt voor admin; member krijgt de cockpit-redirect uit DH-015 (geen toegang)
- [ ] [FUNC-181] Team lijst toont alle profiles met correcte rol-badges + last-login datum (of "Nog nooit ingelogd")
- [ ] [FUNC-182] Invite dialog werkt: email + rol + (bij member) project-selectie → success-toast + nieuwe row in lijst na revalidate
- [ ] [FUNC-183] Edit dialog past rol aan en update access atomair
- [ ] [FUNC-184] "Opnieuw uitnodigen" knop zichtbaar bij users zonder last_sign_in_at; click stuurt nieuwe magic link
- [ ] [UI-170] "Team" item zichtbaar in side-menu onder admin-context
- [ ] [UI-171] Laatste admin: demote + deactivate knoppen zijn disabled met tooltip
- [ ] [UI-172] Invite-success toont toast binnen 2 seconden na submit
- [ ] [UI-173] Invite-error (bijv. Supabase fail) toont error-toast, dialog blijft open
- [ ] [SEC-190] Directe URL-hit op `/admin/team` door member → redirect (middleware) + `requireAdmin()` in layout als backup
- [ ] [EDGE-190] Profile zonder email (synthetic test) rendert "Geen email" placeholder
- [ ] [EDGE-191] Project verwijderd: team-lijst toont geen dode project-refs
- [ ] `npm run build && npm run type-check && npm run lint` slagen

## Geraakt door deze sprint

- `apps/cockpit/src/app/(dashboard)/admin/layout.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/error.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/team-list.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/user-row.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/invite-dialog.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/admin/team/user-edit-dialog.tsx` (nieuw)
- `apps/cockpit/src/components/layout/side-menu.tsx` (bijgewerkt)
- `docs/specs/requirements-devhub.md` (bijgewerkt)
