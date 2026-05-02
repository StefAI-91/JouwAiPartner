# Micro Sprint CC-005: Per-Project Inbox-Tab + Onboarding-Card

## Doel

Polish-sprint die de Customer-Communication-laag afmaakt voor productie. Twee dingen:

1. **Per-project tab in cockpit** — vandaag opent de cockpit-inbox uit CC-001 een globale lijst over alle projecten heen. Bij werken in context van één klant wil je dezelfde inbox maar gescoped naar dat project, geïntegreerd in het project-detail. Vereist nieuwe sub-route + tab-navigatie boven project-pages (die nu helemaal niet bestaat — `projects/[id]/page.tsx` is een losse pagina zonder tabs).
2. **Onboarding-card** — eerste-keer-bezoekers van zowel portal-inbox als cockpit-inbox krijgen een korte uitleg-kaart "wat is dit, hoe werkt het, wat kun je hier doen". Dismissable, opgeslagen per-user. Zonder dit valt de inbox in koud water voor een nieuwe klant ("Ik krijg een mail dat ik in mijn inbox moet kijken — wat is dit?").

Dit is sprint 5 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12. Pure UX-polish: geen schema-changes, geen nieuwe agents, geen pipelines. Eind-tot-eind klaar voor productie na deze sprint.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§3** — Inbox-model entry-points: "Cockpit `projects/[id]/inbox` tab — same items, scoped to one project, when working in client context". CC-001 leverde global view; CC-005 levert de per-project tab.
- **§9** — UX-principe: "No empty state without onboarding cue — first-time users see a short explainer card on what the inbox is for and how to get the most out of it."
- **§10 #8** — Decided: "Onboarding: short in-portal explainer of purpose + how-to. First five minutes determine whether client adopts portal as primary channel."
- **§12** — sprint-volgorde: "Sprint E — Per-project inbox tab + onboarding card. Polish layer on top of A-D."

Geen botsing met andere sprints; CC-001 t/m CC-004 leveren onderliggende functionaliteit.

## Afhankelijkheden

- **CC-001** — levert de Inbox-feature in cockpit (`apps/cockpit/src/features/inbox/`). CC-005 hergebruikt de componenten met een `projectId`-filter-prop.
- **CC-002** — levert klant-mail die linkt naar portal `/projects/[id]/inbox`. Zonder onboarding-card is die landing-page koud voor nieuwe klanten.
- Bestaande cockpit project-detail route: `apps/cockpit/src/app/(dashboard)/projects/[id]/page.tsx` (één bestand, geen sub-routes nog). CC-005 voegt sub-routes toe.
- Bestaande portal project-detail layout: `apps/portal/src/app/(app)/projects/[id]/layout.tsx` (geen tab-component, gebruikt sidebar voor sub-pages). CC-005 hoeft daar niet veel te wijzigen — onboarding-card is een component IN de inbox-page.
- Bestaande `profiles`-tabel — wordt uitgebreid met `preferences jsonb` kolom voor dismissed-state.
- Bestaande shared UI (`@repo/ui`) — gebruik bestaande Card, Button, Tabs componenten, niet nieuwe maken.

## Open vragen vóór start

1. **Onboarding-state opslaan: `localStorage` of DB?** Aanbeveling: **DB op `profiles.preferences` jsonb**. localStorage werkt niet cross-device, en klant kan portal openen op zowel laptop als telefoon. Schema:
   ```jsonb
   {
     "dismissed_onboarding": {
       "portal_inbox": "2026-05-15T14:30:00Z",
       "cockpit_inbox": "2026-05-12T09:00:00Z"
     }
   }
   ```
   Per-key dismissal datestamp — laat ons later analytics doen ("hoeveel users dismissen direct?") en geeft optie om onboarding te re-tonen na een UX-update.
2. **Cockpit project-detail tabs: nieuwe `[id]/layout.tsx` met tabs of router-driven?** Aanbeveling: **nieuwe `layout.tsx`** met een `<ProjectTabs>` component bovenaan. Layout.tsx blijft bestaan over alle sub-routes; tabs renderen consistent zonder dat elke page-component de tabs zelf moet renderen. Volgt bestaande Next.js App Router-conventie.
3. **Welke tabs in cockpit project-detail?** Aanbeveling: **drie tabs in v1**: "Overzicht" (de bestaande page.tsx), "Inbox" (nieuw, CC-005), "Roadmap" (link naar bestaande themes-flow als die bestaat — verifieer; anders skip). Niet meteen alle dimensies (meetings, emails, decisions) als tabs — die zitten in andere features met eigen routes. **Test eerst** of "Roadmap" tab een bestaande feature is in cockpit — zo niet, alleen Overzicht + Inbox.
4. **Onboarding-card content**: hoeveel uitleg? Aanbeveling: **3 bullet points + 1 CTA**. Niet een doorklikbare wizard met 5 stappen — dat skipt iedereen. Eén kaart, scanbaar, dismissable. Per inbox (portal vs cockpit) eigen content.
5. **Dismissable hoe?** Aanbeveling: **kruisje rechtsboven + "Begrepen, dank"-knop linksonder** — twee dismissal-paden, beide schrijven naar `profiles.preferences`.

## Taken

Bouwvolgorde **schema → preferences-helpers → cockpit tabs → onboarding-card portal → onboarding-card cockpit → tests**. Schema eerst zodat elke laag tegen vaste data praat.

### 1. DB-migratie: `profiles.preferences` kolom

Pad: `supabase/migrations/<timestamp>_profiles_preferences.sql`.

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.preferences IS
  'Per-user UI-state: dismissed onboarding, theme, notification-prefs. Free-form jsonb om sprint-na-sprint nieuwe keys toe te voegen zonder migratie.';

-- Atomic dismiss-helper (zie taak 2). jsonb_set voorkomt read-modify-write
-- races wanneer gebruiker tegelijk twee onboarding-cards dismissed.
CREATE OR REPLACE FUNCTION dismiss_onboarding_key(
  p_profile_id uuid,
  p_key text,
  p_timestamp text
) RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE profiles
  SET preferences = jsonb_set(
    coalesce(preferences, '{}'::jsonb),
    ARRAY['dismissed_onboarding', p_key],
    to_jsonb(p_timestamp),
    true
  )
  WHERE id = p_profile_id
  RETURNING preferences;
$$;
```

Geen index nodig — kolom wordt alleen per-row gelezen via `id`-lookup.

Regenereer types via `npm run -w @repo/database supabase:types`. Voeg type-export `ProfilePreferences` toe (Zod-schema in `packages/database/src/validations/profiles.ts` voor type-safety bij read/write).

### 2. Preferences-helpers

Pad query: `packages/database/src/queries/profiles.ts` (bestand bestaat — uitbreiden).

```ts
export interface ProfilePreferences {
  dismissed_onboarding?: {
    portal_inbox?: string; // ISO timestamp
    cockpit_inbox?: string;
  };
  // toekomstige keys hier toevoegen
}

export async function getProfilePreferences(
  profileId: string,
  client?: SupabaseClient,
): Promise<ProfilePreferences> {
  const supabase = client ?? getAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", profileId)
    .single();
  return (data?.preferences ?? {}) as ProfilePreferences;
}
```

Pad mutation: `packages/database/src/mutations/profiles.ts` (bestand bestaat of maak aan).

```ts
export async function dismissOnboarding(
  profileId: string,
  key: "portal_inbox" | "cockpit_inbox",
  client?: SupabaseClient,
): Promise<MutationResult<ProfilePreferences>> {
  // Atomic update via jsonb_set — voorkomt read-modify-write race wanneer
  // gebruiker tegelijk twee tabs open heeft of meerdere onboarding-cards
  // dismissed binnen één render-cycle. Andere keys in `preferences` blijven
  // intact; jsonb_set met `create_missing=true` (default) maakt het pad aan
  // als het nog niet bestaat.
  const supabase = client ?? getAdminClient();
  const { data, error } = await supabase.rpc("dismiss_onboarding_key", {
    p_profile_id: profileId,
    p_key: key,
    p_timestamp: new Date().toISOString(),
  });
  // ...
}
```

Bijbehorende SQL-RPC in de profiles.preferences-migratie (zie taak 1):

```sql
CREATE OR REPLACE FUNCTION dismiss_onboarding_key(
  p_profile_id uuid,
  p_key text,
  p_timestamp text
) RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE profiles
  SET preferences = jsonb_set(
    coalesce(preferences, '{}'::jsonb),
    ARRAY['dismissed_onboarding', p_key],
    to_jsonb(p_timestamp),
    true
  )
  WHERE id = p_profile_id
  RETURNING preferences;
$$;
```

Validatie: `dismissOnboardingSchema = z.object({ key: z.enum(["portal_inbox", "cockpit_inbox"]) })` — `key`-validatie blokkeert SQL-injection-pad door RPC-input. Geen vrije strings naar `jsonb_set`.

### 3. Cockpit project-detail tabs

Pad nieuwe layout: `apps/cockpit/src/app/(dashboard)/projects/[id]/layout.tsx` (nieuw).

```tsx
import { ProjectTabs } from "@/features/projects/components/project-tabs";
import { getProjectById } from "@repo/database/queries/projects";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  return (
    <div>
      <ProjectHeader project={project} />
      <ProjectTabs projectId={id} /> {/* nieuw component */}
      <main>{children}</main>
    </div>
  );
}
```

Pad nieuw component: `apps/cockpit/src/features/projects/components/project-tabs.tsx` (nieuw).

```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overzicht", href: (id: string) => `/projects/${id}` },
  { key: "inbox", label: "Inbox", href: (id: string) => `/projects/${id}/inbox` },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-border" role="tablist">
      {TABS.map((tab) => {
        const href = tab.href(projectId);
        const active = pathname === href;
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

Pad nieuwe inbox-route: `apps/cockpit/src/app/(dashboard)/projects/[id]/inbox/page.tsx` (nieuw).

```tsx
import { InboxView } from "@/features/inbox/components/inbox-view"; // uit CC-001

export default async function ProjectInboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InboxView projectId={id} />;
}
```

`InboxView` (uit CC-001) accepteert al een optionele `projectId?: string` prop voor scoping. Als CC-001 dat NIET doet: kleine refactor in CC-001 PR voor mergen, of CC-005 pakt het op.

Voeg `loading.tsx` en `error.tsx` in dezelfde folder volgens project-conventie.

### 4. Portal onboarding-card

Pad nieuw component: `apps/portal/src/components/inbox/onboarding-card.tsx` (nieuw).

```tsx
"use client";
import { useState } from "react";
import { dismissOnboardingAction } from "@/actions/preferences";
import { Card, CardContent, Button } from "@repo/ui";
import { X } from "lucide-react";

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true); // optimistic
    dismissOnboardingAction("portal_inbox").catch(() => setDismissed(false));
  }

  return (
    <Card className="relative bg-violet-50 border-violet-200">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        aria-label="Sluit onboarding"
      >
        <X className="size-4" />
      </button>
      <CardContent className="space-y-3 pr-10">
        <h3 className="font-semibold">Welkom in je inbox</h3>
        <ul className="text-sm space-y-1.5 list-disc pl-4">
          <li>Hier komen al je vragen en updates van het Jouw AI Partner team.</li>
          <li>Je krijgt een mail wanneer er iets nieuws is — je hoeft hier niet te wachten.</li>
          <li>Je kunt direct antwoorden in een bericht; we zien het meteen aan onze kant.</li>
        </ul>
        <Button onClick={handleDismiss} variant="ghost" size="sm">
          Begrepen, dank
        </Button>
      </CardContent>
    </Card>
  );
}
```

Wire in `apps/portal/src/app/(app)/projects/[id]/inbox/page.tsx`:

```tsx
const profile = await getCurrentProfile(supabase);
const prefs = await getProfilePreferences(profile.id, supabase);
const showOnboarding = !prefs.dismissed_onboarding?.portal_inbox;
// ...
return (
  <>
    {showOnboarding && <OnboardingCard />}
    <QuestionList projectId={id} questions={questions} />
  </>
);
```

Server-action `dismissOnboardingAction` in `apps/portal/src/actions/preferences.ts` (nieuw):

```ts
"use server";
export async function dismissOnboardingAction(key: "portal_inbox"): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };
  const result = await dismissOnboarding(profile.id, key, supabase);
  if ("error" in result) return result;
  revalidatePath("/projects", "layout");
  return { success: true };
}
```

### 5. Cockpit onboarding-card

Spiegel-implementatie van portal — zelfde mechanisme, andere content + andere key.

Pad: `apps/cockpit/src/features/inbox/components/onboarding-card.tsx`.

Content (3 bullets):

- "Hier komen alle klant-meldingen, vragen en feedback binnen die nog beoordeling vereisen."
- "Klant-feedback wacht op je endorsement vóór het in de DevHub-backlog landt."
- "Vragen kun je direct beantwoorden — AI helpt met drafts (CC-004) zodra die er is."

Action: `dismissOnboardingAction` in `apps/cockpit/src/features/inbox/actions/preferences.ts` met `key: "cockpit_inbox"`.

Wire in zowel global cockpit-inbox-page (`apps/cockpit/src/app/(dashboard)/inbox/page.tsx` uit CC-001) als de per-project inbox-page (taak 3) — beide tonen onboarding-card op basis van dezelfde `cockpit_inbox`-key. Dismissed = dismissed everywhere voor team-leden.

### 6. Tests

- **`packages/database/__tests__/queries/profile-preferences.test.ts`** (nieuw, describeWithDb): roundtrip read-write `dismissed_onboarding`, deep merge bewaart andere keys.
- **`packages/database/__tests__/mutations/dismiss-onboarding.test.ts`** (nieuw): bestaande andere preferences worden NIET overschreven; tweede dismissal updatet alleen z'n eigen key.
- **`apps/cockpit/__tests__/features/projects/components/project-tabs.test.tsx`** (nieuw): tabs renderen, active-state op basis van pathname werkt.
- **`apps/portal/__tests__/components/inbox/onboarding-card.test.tsx`** (nieuw): card rendert; klik op X of "Begrepen, dank" verbergt card; action wordt aangeroepen met juiste key. Mock action-grens.
- **`apps/cockpit/__tests__/features/inbox/components/onboarding-card.test.tsx`** (nieuw): zelfde patroon, andere key.
- **Integration**: `apps/portal/__tests__/app/projects-inbox-page.test.tsx` — als profile.preferences.dismissed_onboarding.portal_inbox bestaat, card NIET in DOM; als niet, wel.

### 7. Docs + registry

- Update `apps/cockpit/src/features/inbox/README.md` (uit CC-001) met sectie "Onboarding-card + per-project tab — see CC-005".
- Update `apps/cockpit/src/features/projects/README.md`: noem `ProjectTabs` als nieuw shared component.
- Update `vision-customer-communication.md` §12 met "CC-005 implements project-tab + onboarding".
- Voeg CC-005 rij toe aan `sprints/backlog/README.md`.

## Acceptatiecriteria

- [ ] Migration `profiles.preferences jsonb DEFAULT '{}'` toegepast en types geregenereerd.
- [ ] `getProfilePreferences()` en `dismissOnboarding()` mutations bestaan met Zod-validatie.
- [ ] Cockpit project-detail heeft tabs-navigatie (Overzicht + Inbox); active-state werkt op basis van pathname.
- [ ] `apps/cockpit/src/app/(dashboard)/projects/[id]/inbox/page.tsx` bestaat en hergebruikt CC-001's `<InboxView projectId={id} />`.
- [ ] Portal `/projects/[id]/inbox` toont onboarding-card als `dismissed_onboarding.portal_inbox` ontbreekt; kruisje en "Begrepen"-knop dismissen optimistisch + persisteren naar DB.
- [ ] Cockpit-inbox (zowel global als per-project) toont onboarding-card op basis van `dismissed_onboarding.cockpit_inbox`-key. Dismissal in één plek geldt voor beide views.
- [ ] Dismissed onboarding overleeft browser-refresh en cross-device login.
- [ ] Andere keys in `profiles.preferences` worden NIET overschreven door dismiss-mutation.
- [ ] Tests groen voor alle nieuwe queries, mutations, components, integration.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:queries`, `npm run check:features` allemaal groen.
- [ ] CC-005 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                                         | Mitigatie                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding-card per ongeluk getoond aan returning users (preferences-lookup faalt → default = niet-dismissed). | Defensieve fallback: bij DB-error in `getProfilePreferences` → log error + return `{}` (=onboarding tonen) maar NOOIT de pagina laten crashen. Acceptabele degradatie. |
| Dismissal-action faalt → klant ziet card volgende refresh weer = irritatie.                                    | Optimistic update + retry-on-failure-silent. Gebruiker ervaart dismissal als instant; als DB-write faalt, log + retry max 1x.                                          |
| Tabs-navigatie verbreekt bestaande deep-links naar `/projects/[id]?tab=meetings` (als die bestaan).            | Audit bestaande callsite/links naar `/projects/[id]` vóór merge — `grep -r "projects/\[id\]" apps/cockpit/src` om te checken of er query-string tabs verwacht worden.  |
| `profiles.preferences` jsonb schema-drift (verschillende code schrijft incompatibele shapes).                  | Centrale Zod-schema in `packages/database/src/validations/profiles.ts` — alle reads/writes lopen via gevalideerde helpers, niet via raw supabase-calls.                |
| Per-project inbox-tab toont andere content dan global view (door subtle filter-bug).                           | Integration-test: zelfde set seeds → global view bevat alle items → project-view bevat alleen items van dat project → set-difference klopt.                            |
| Onboarding-content veroudert bij feature-evolutie ("AI helpt met drafts" — wat als CC-004 niet gemerged is?).  | Content nu schrijven met aanname dat CC-001 t/m CC-004 alle gemerged zijn vóór CC-005 deploy. Als release-volgorde verschuift: pas tekst aan in CC-005 PR.             |

## Niet in scope

- **Eindgebruiker-feedback-aggregatie** — eerder tentatief in CC-005 genoemd (CC-004 sprint-spec verwees ernaar) maar valt buiten polish-scope. Apart sprint nodig (voorstel: CC-006). Dit vereist nieuwe agent + DB-velden (samenvatting-record per project per periode) en is geen polish meer.
- **Multi-step onboarding-wizard** — open vraag #4 conclusie: één kaart, geen wizard.
- **Onboarding-replay** ("toon me de onboarding nog eens") — schema ondersteunt 't (datestamp wissen) maar geen UI v1.
- **A/B-test van onboarding-content** — geen analytics-infra.
- **Onboarding voor cockpit-globale views** (dashboard, weekly, etc.) — alleen voor inbox in v1, want dat is het nieuwe oppervlak.
- **Cockpit `projects/[id]` extra tabs** (Meetings, Emails, Tasks als losse tabs) — alleen Overzicht + Inbox in v1. Eventueel Roadmap-tab als die bestaat in cockpit.
- **Portal-tabs** boven `projects/[id]` — portal gebruikt sidebar voor sub-navigatie, geen tabs. Geen verandering nodig.
- **Internationalisatie** — content alleen NL.
- **Toegankelijkheid-audit** van onboarding-card — basics (aria-label op X-knop) erin, maar geen volledige WCAG-audit.

## Vision-alignment (samenvatting)

CC-005 is de afsluitende sprint van de Customer-Communication-laag. Na merge:

- Klant heeft één inbox in portal met onboarding-card bij eerste bezoek (vision §10 #8 ✅)
- PM heeft globale + per-project inbox in cockpit (vision §3 ✅)
- Klant-feedback gaat door PM-gate vóór dev-backlog (CC-001)
- Klant krijgt mail bij elke status-update of nieuwe team-message (CC-002)
- DevHub-triage onderscheidt klant- vs interne tickets visueel (CC-003)
- PM kan via AI-draft + review tactvolle outbound mails versturen (CC-004)

De vijf sprints CC-001 t/m CC-005 implementeren `vision-customer-communication.md` v1.0 in z'n geheel. Open punten uit het vision-doc (audit-laag #4, email-excepties #5) blijven gedeferred zoals afgesproken.

Volgende stappen na CC-005:

- **CC-006** (toekomst): eindgebruiker-feedback-aggregatie — AI vat widget-feedback per periode samen, PM stuurt naar klant-PM
- **CC-007** (toekomst): aanvullende outbound-triggers (in_progress, weekly proactive) bovenop CC-004's generic draft-infra
- **CC-008** (toekomst): audit-laag (vision §10 #4) als eerste klant-dispute zich voordoet
