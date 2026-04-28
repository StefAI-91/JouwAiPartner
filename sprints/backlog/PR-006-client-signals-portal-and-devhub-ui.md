# Micro Sprint PR-006: Klant-signalen UI (Portal + DevHub)

## Doel

Op de PR-005 data-laag de fase-2 UI bouwen: in de Portal verschijnen drie pill-knoppen per topic in "Niet geprioritiseerd"-bucket (🔥 must-have / 👍 zou fijn zijn / 👎 niet relevant) en huidige signalen in andere buckets als read-only badge. In DevHub zien account managers het huidige signaal, signaal-historie, en kunnen ze de topic-list filteren op signaal-status. Geen sturing van prio: klant signaleert, team beslist.

## Requirements

| ID            | Beschrijving                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-060    | Drie signaal-pills (🔥 / 👍 / 👎) verschijnen op topic-cards in "Niet geprioritiseerd"-bucket; geselecteerde pill is visueel gemarkeerd                  |
| PR-REQ-061    | Klikken op een pill triggert Server Action `setSignal`; klikken op de actieve pill heft het op (clear)                                                   |
| PR-REQ-062    | Onder de pills een uitklapbaar zinnetje: "Het JAIP-team gebruikt jouw signaal samen met technische complexiteit..." — letterlijk uit §7.3.2              |
| PR-REQ-063    | 👎 (`not_relevant`) verbergt topic uit zicht na 5 sec animatie met "Ongedaan maken"-toast; status blijft `awaiting_client_input`, alleen UI-verberg-flag |
| PR-REQ-064    | Topics in andere buckets (`prioritized`, `scheduled`, `in_progress`, `done`) tonen huidig signaal als read-only badge — geen knoppen                     |
| PR-REQ-065    | DevHub topic-detail toont sectie "Klant-signalen" met huidig signaal + datum + actor + history-uitklapper                                                |
| PR-REQ-066    | DevHub topic-list heeft filter-toggle: "Met klant-signaal" / "🔥 Must-have" / "👎 Niet relevant" / "Geen filter"                                         |
| PR-REQ-067    | Filter werkt orthogonaal aan bestaande type/status-filters (URL-merging)                                                                                 |
| PR-REQ-068    | Geen N+1: signalen mee in initial query van topic-list (`listCurrentSignalsByOrg` uit PR-005)                                                            |
| PR-DESIGN-010 | Signal-pills volgen §14.4: emoji + label in één pill, single-select, active-state met inset ring en tinted background                                    |
| PR-DESIGN-011 | Undo-toast voor 👎 sluit aan bij sober-animatie-stijl (§14.9): geen confetti, simpele slide-in 200ms                                                     |

## Afhankelijkheden

- **PR-001** (topics) + **PR-002** (queries/mutations basis)
- **PR-004** (Portal roadmap-page) — pills landen op de bestaande topic-cards
- **PR-005** (signal-DB + queries + mutations)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **O-1** (welk model voor klant-prioritering): provisioneel C (signaleren). Bevestig in week 1 vóór sprint-start (gesprek met CAI). Sprint volgt C.
- **O-3** (multi-stakeholder): in v1 = laatste klikker wint. Bevestigen.

## Visuele referentie

- Live preview: `/design-preview/roadmap` § 03 (signal-buttons.tsx)
- Design-spec: [`docs/specs/prd-portal-roadmap/14-design-keuzes.md`](../../docs/specs/prd-portal-roadmap/14-design-keuzes.md) §14.4 "Signaal-knoppen (fase 2)" en §14.3 (kleurpalet bucket-rose voor "niet geprioritiseerd")

## Migreren vanuit preview

| Preview-bestand                                                 | Productie-doel                                                   | Wat doen                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/portal/src/components/roadmap-preview/signal-buttons.tsx` | `apps/portal/src/components/roadmap/signal-buttons.tsx` (Client) | Vervang `useState` met Server Action `setSignal`; toast-pattern voor 👎 undo blijft client-side |

## Taken

### 1. Portal — signal-pills component

- `apps/portal/src/components/roadmap/signal-buttons.tsx` (`"use client"`):
  - Props: `topicId: string`, `organizationId: string`, `currentSignal: 'must_have' | 'nice_to_have' | 'not_relevant' | null`
  - Drie `<button>`s als pills (zie preview-component); active-state via prop
  - `onClick`: bepaal target-signal, roep Server Action `setSignal({ topic_id, organization_id, signal })`
  - Klik op actieve pill = `clearSignal({ topic_id, organization_id })`
  - 👎-flow: zet local UI-state `hidden=true` en toon toast met "Ongedaan maken" → klik undo herstelt + roept `clearSignal`

### 2. Portal — Server Actions

- `apps/portal/src/actions/topic-signals.ts`:

  ```typescript
  "use server";
  import { setSignalSchema, clearSignalSchema } from "@repo/database/validations/signals";
  import { setClientSignal, clearClientSignal } from "@repo/database/mutations/topics/signals";
  import { getServerClient } from "@repo/database/supabase/server";
  import { revalidatePath } from "next/cache";

  export async function setSignal(input: unknown) {
    const parsed = setSignalSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.flatten() };
    const client = await getServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Unauthenticated" };
    await setClientSignal({ ...parsed.data, set_by_profile_id: user.id }, client);
    revalidatePath(`/projects/[id]/roadmap`, "page");
    return { success: true };
  }

  export async function clearSignal(input: unknown) {
    /* analoog */
  }
  ```

### 3. Portal — context-tooltip

- `apps/portal/src/components/roadmap/signal-context-tooltip.tsx`:
  - Server Component (statische tekst)
  - Detail-tag of expandable: "Het JAIP-team gebruikt jouw signaal samen met technische complexiteit om sprints in te plannen. Een 🔥 betekent niet dat het altijd direct wordt opgepakt — wel dat het meeweegt."

### 4. Portal — integratie in topic-card

- Update `apps/portal/src/components/roadmap/topic-card.tsx` (uit PR-004):
  - Bij bucket `awaiting_input`: render `<SignalButtons>` + `<SignalContextTooltip>`
  - Bij andere buckets: render read-only badge `<SignalBadge signal={currentSignal} />`
- Pas `RoadmapBoard` aan om `currentSignals` mee te krijgen uit Server-component (één query via `listCurrentSignalsByOrg`)

### 5. Portal — undo-toast pattern

- Hergebruik bestaande toast-library als die er is (sonner of shadcn toast); zo niet, simpele eigen: stateful `<Toast>` met 5-sec timer en "Ongedaan maken"-knop
- Tijdens 5-sec window: topic blijft in DB met `not_relevant`-signal; UI verbergt het visueel
- Na 5 sec zonder undo: niets extra's gebeurt — signal blijft `not_relevant` in DB; pas in fase 3 (PR-010) wordt dit `wont_do_proposed_by_client`

### 6. DevHub — klant-signalen panel

- `apps/devhub/src/features/topics/components/client-signals-panel.tsx`:
  - Server Component, props: `topicId`
  - Fetch: `getCurrentSignalForTopic(topicId, ?)` per organisatie OF `getSignalHistory(topicId)` voor volledige timeline
  - Render: huidig signaal + actor + datum, uitklapper "Vorige signalen" toont history met from→to per regel

### 7. DevHub — topic-list filter

- Update `apps/devhub/src/features/topics/components/topic-list.tsx`:
  - Voeg filter-control toe: dropdown of tabs voor "Geen filter" / "Met signaal" / "🔥" / "👎"
  - URL-param `?signal=must_have` etc.
  - In query: filter op `topic_client_signals.signal = ?` via JOIN — voeg toe aan PR-002 `listTopics` als optionele param of hergebruik `listCurrentSignalsByOrg` + JS-filter

### 8. CLAUDE.md update

- Geen feature-folder-update nodig — signalen zijn uitbreiding van bestaande `topics`-feature (PR-003) en compositiepagina (PR-004)

## Acceptatiecriteria

- [ ] PR-REQ-060: drie pills verschijnen alleen in `awaiting_input`-bucket
- [ ] PR-REQ-061: klikken zet/wist signaal, persisteert in DB
- [ ] PR-REQ-062: tooltip-tekst is letterlijk uit §7.3.2
- [ ] PR-REQ-063: 👎 verbergt topic 5 sec, undo werkt, na 5 sec blijft signaal staan
- [ ] PR-REQ-064: andere buckets tonen badge, geen knoppen
- [ ] PR-REQ-065: DevHub panel toont huidig signaal + history
- [ ] PR-REQ-066/067: filter werkt orthogonaal aan andere filters; URL-merging
- [ ] PR-REQ-068: één query voor lijst + signalen (geen N+1, controleer met log)
- [ ] PR-DESIGN-010/011: visuele check tegen preview en §14
- [ ] RLS-tests: org A kan geen signal zetten op topic van org B
- [ ] Race-condition test: 2 users klikken tegelijk, laatste wint, beide zien dezelfde state na refresh
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                     | Mitigatie                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| Klant klikt 👎 en denkt dat topic gedeleted is             | Undo-toast 5 sec; daarna in fase 3 zichtbaar in "Bekijk afgewezen wensen" |
| Optimistic update zonder confirm → race met server-state   | Server Action revalidate na success; UI toont laatste server-state        |
| `revalidatePath` met dynamic segment werkt niet            | Verifieer Next 16 syntax; eventueel `revalidateTag` met topic-tag         |
| 👎 in v1 doet niet wat klant denkt (`wont_do` komt pas v3) | Undo-tekst maakt duidelijk: "verberg" niet "afwijzen" — bewuste keuze     |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/07-fase-2-klant-signalen.md` (volledig)
- PRD: `docs/specs/prd-portal-roadmap/14-design-keuzes.md` §14.4
- PRD: `docs/specs/prd-portal-roadmap/13-validatie-en-open-vragen.md` §13.2 O-1, §13.3 I-2

## Vision-alignment

Vision §2.4 — feedbackloop tussen klant (Portal) en team (DevHub) is hier voor het eerst bidirectioneel. Klant-signalen sluiten de Portal → DevHub-richting van de quadranten-loop.
