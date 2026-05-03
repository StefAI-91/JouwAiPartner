# Micro Sprint PR-026: Portal-inbox two-pane desktop layout (Linear-stijl)

## Doel

De huidige portal-inbox is mobile-first: een smalle gecentreerde kolom (`max-w-3xl`) met full-page-navigation per bericht. Op desktop voelt dat als een verspild scherm met een chat-bubble in het midden van een leeg canvas. De cockpit-inbox is sinds CC-001 wél Linear-stijl (lijst + detail in één view); de portal moet dat patroon overnemen zodat klanten op desktop een vergelijkbare ervaring krijgen.

Resultaat: één route `/projects/[id]/inbox` die op `md+` een two-pane layout rendert (lijst links, geopende thread rechts), op `<md` terugvalt op de bestaande lijst-of-detail-route. Geen nieuwe data-shape, geen RLS-wijzigingen.

## Vision-alignment

- `vision-customer-communication.md` **§3** "één DB, twee views" — de twee views (cockpit-team en portal-klant) horen UX-symmetrisch te zijn. Als de team-zijde Linear-stijl is en de klant-zijde een mobile-page-stack, breekt het mentale model voor stakeholders die beide kanten zien (interne members met portal-access, support-engineers tijdens een demo).
- **§9** UX-principles "first-class messaging UX" — de portal-inbox is voor klanten de primaire communication-surface; desktop-polish is geen luxe maar een vereiste om "portal als primary channel" waar te maken.
- `CLAUDE.md` § Components — "Splits bij ~150 regels" en hergebruik shared components. We hergebruiken zoveel mogelijk uit de cockpit (`InboxRow`-pattern, conversation-bubbles) of consolideren naar `@repo/ui`.

## Afhankelijkheden

- **CC-006** (vrije messaging) en **CC-007/008** moeten gemerged zijn — leveren de huidige portal-inbox + compose-modal die we herstructureren.
- **PR-024** (portal member-access) is gemerged — members met portal-access vallen onder dezelfde UI.
- Geen externe deps; geen migratie; geen schema-wijziging.

## Open vragen vóór start

1. **One route met `[[...messageId]]` catch-all of twee routes met shared layout?**
   Aanbeveling: **één route `/projects/[id]/inbox/[[...messageId]]`** met optional catch-all. Voordeel: één page-component beslist server-side wat de geselecteerde message is, geen state-sync tussen routes. Nadeel: route-matching is iets complexer. Alternatief is twee routes met een gedeelde `layout.tsx` die de lijst rendert; dat geeft schonere code-splitsing maar dubbele server-fetches voor de lijst per detail-navigation.

2. **Hergebruiken uit `apps/cockpit/src/features/inbox/components/`, of portal-eigen versie?**
   Aanbeveling: **portal-eigen, met shared building-blocks naar `@repo/ui`**. De cockpit-rij toont status-bullet, sender, project, hover-actions, source-indicator — de klant ziet alleen eigen-project + eigen-org dus heeft project-naam en source-indicator niet nodig (zou alleen ruis geven). De compositie is anders genoeg om een eigen `PortalInboxRow` te rechtvaardigen. Wel: bubble-render, time-divider en compose-form gaan naar `@repo/ui` zodat beide views ze delen.

3. **Wat doet `<md`-breakpoint?**
   Aanbeveling: **lijst-of-detail (huidige gedrag) onder `md`**. Two-pane op een 375px telefoon werkt niet. Boven `md` (768px) renderen we two-pane; eronder valt de page terug op een lijst-only view die naar `/[messageId]` navigeert. Alternative: drawer/sheet voor het detail-pane op mobiel, maar dat is een eigen UX-spike — uit scope.

4. **Standaard-selectie bij open van `/inbox` zonder `messageId`?**
   Aanbeveling: **eerste item uit de lijst auto-select op desktop (`md+`)**. Voorkomt het lege "kies een bericht"-pane dat onbeholpen oogt. Op mobiel: geen auto-redirect; gebruiker ziet de lijst en kiest expliciet.

5. **Compose-modal of inline-compose-pane?**
   Aanbeveling: **inline-pane rechts** in plaats van modal. De rechter-pane wordt: ofwel geopende thread, ofwel compose-formulier. Toggle via "+ Nieuw bericht" bovenaan de lijst. Modaal voelt op two-pane onnodig (we hebben de ruimte al). Cockpit blijft modal — minder compose-volume daar.

6. **Auto-mark-as-read gedrag op desktop two-pane?**
   Aanbeveling: **mark-as-read bij selectie (klik op rij)**, niet bij hover/scroll-into-view. Eenvoudig, voorspelbaar, matcht het cockpit-gedrag dat al via `getConversationThread` markeert.

## Taken

Bouwvolgorde **routes → server-side data → layout-shell → list-pane → detail-pane → compose-pane → mobile-fallback → tests**. Routes eerst zodat we geen blind dual-write op state hebben tijdens UI-iteratie.

### 1. Route-restructurering

Pad: `apps/portal/src/app/(app)/projects/[id]/inbox/`

```
inbox/
  ├─ [[...messageId]]/
  │   ├─ page.tsx           ← composition-root (two-pane op md+, list/detail op <md)
  │   ├─ loading.tsx
  │   └─ error.tsx
  └─ ... (oude page.tsx + [messageId]/ verwijderen)
```

**Catch-all-segment** `[[...messageId]]`:

- `/projects/abc/inbox` → `params.messageId = undefined` → desktop: auto-select first; mobile: list only
- `/projects/abc/inbox/q-123` → `params.messageId = ["q-123"]` → desktop: open thread; mobile: detail-only
- `/projects/abc/inbox/new` → optional sentinel voor compose-pane (zie taak 5)

**Migration-stap**: oude routes (`page.tsx` + `[messageId]/page.tsx`) verwijderen; de catch-all dekt beide. Loading/error meeverhuizen.

### 2. Server-side data: één gecombineerde fetch

Pad: `apps/portal/src/app/(app)/projects/[id]/inbox/[[...messageId]]/page.tsx`

```ts
export default async function PortalInboxPage({ params }) {
  const { id: projectId, messageId } = await params;
  const selectedId = messageId?.[0]; // undefined of "q-123" of "new"

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) redirect("/login");

  const allowed = await hasPortalProjectAccess(profile.id, projectId, supabase);
  if (!allowed) notFound();

  const [questions, thread, project] = await Promise.all([
    listClientQuestionsForProject(projectId, profile.id, supabase),
    selectedId && selectedId !== "new"
      ? getConversationThread("question", selectedId, profile.id, supabase, { projectIds: [projectId] })
      : null,
    getProjectMeta(projectId, supabase),
  ]);

  return <PortalInboxLayout
    project={project}
    questions={questions}
    selectedId={selectedId}
    thread={thread}
  />;
}
```

**Hergebruik**: `getConversationThread` uit `@repo/database/queries/inbox` doet al het werk — accepteert `projectIds`-override (CC-006), markeert auto-as-read.

### 3. Layout-shell — `PortalInboxLayout`

Pad: `apps/portal/src/components/inbox/portal-inbox-layout.tsx` (nieuw).

```tsx
export function PortalInboxLayout({ project, questions, selectedId, thread }: Props) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Lijst-pane: full-width op mobile, vaste 360px op md+ */}
      <aside
        className={cn(
          "border-b md:w-[360px] md:shrink-0 md:border-b-0 md:border-r",
          // Op mobile: tonen als geen selectie; verbergen als detail open is
          selectedId ? "hidden md:block" : "block",
        )}
      >
        <PortalInboxList projectId={project.id} questions={questions} selectedId={selectedId} />
      </aside>

      {/* Detail/compose-pane */}
      <main
        className={cn(
          "flex-1 overflow-hidden",
          !selectedId && "hidden md:flex md:items-center md:justify-center",
        )}
      >
        {selectedId === "new" ? (
          <PortalComposePane projectId={project.id} />
        ) : selectedId && thread ? (
          <PortalThreadPane projectId={project.id} thread={thread} />
        ) : (
          <PortalEmptyPane />
        )}
      </main>
    </div>
  );
}
```

**Tailwind-breakpoint**: `md:` = 768px. Onder die breedte valt de layout terug op één pane tegelijk (lijst óf detail) — gestuurd door `selectedId`.

### 4. List-pane — `PortalInboxList` + `PortalInboxRow`

Pad: `apps/portal/src/components/inbox/portal-inbox-list.tsx` + `portal-inbox-row.tsx`.

Vervangt de huidige `question-list.tsx` + `question-card.tsx`. Verschillen met de cockpit-rij:

- **Geen project-naam** (één project per portal-view).
- **Geen source-indicator** (klant ziet alleen eigen-org-items).
- **Geen status-bullet voor PM-gate** — klant ziet `open` / `responded` / `team-replied`.
- **Sender = "Jij" of "Team"** i.p.v. naam.
- **Active-state** wanneer `question.id === selectedId` (background-highlight).

Layout per rij:

```
┌────────────────────────────────────┐
│ ● Team       Hoi Stef, wat is...   │  ← unread-dot, sender, title
│   2u                                │  ← timestamp
└────────────────────────────────────┘
```

Klikken op rij: `<Link href={`/projects/${projectId}/inbox/${question.id}`}>`. Geen client-side state-sync nodig — Next.js handelt de transition af, server re-rendert pagina met nieuwe `selectedId`. Voor extra snappiness later: `useOptimistic` of `router.replace` met scroll-preservation, maar uit scope voor v1.

Plus bovenaan: **"+ Nieuw bericht aan team"-knop** die naar `/inbox/new` linkt.

### 5. Detail-pane — `PortalThreadPane`

Pad: `apps/portal/src/components/inbox/portal-thread-pane.tsx`.

Vervangt de huidige `portal-conversation-view.tsx`. Hergebruikt waar mogelijk:

- `portal-conversation-bubbles.tsx` (al bestaand) → eventueel naar `@repo/ui/conversation-bubbles` voor cockpit/portal-deling. Aanbeveling: **hier nog niet consolideren**, eerst zien of de cockpit-versie écht gelijk wil. Dat is een eigen mini-sprint.
- `client-reply-form.tsx` (al bestaand) — blijft staan als bottom-form.

Layout:

```
┌─────────────────────────────────────┐
│ Hoi Stef, wat is de status?    ↑   │  ← header met titel + back-knop op mobile
│ Wacht op antwoord                   │
├─────────────────────────────────────┤
│   [bubble: Team — Hoi, ...]         │  ← thread
│         [bubble: Jij — Hoi, ...]    │
├─────────────────────────────────────┤
│ [textarea: Schrijf je antwoord...]  │  ← reply-dock
│                       [Verstuur]    │
└─────────────────────────────────────┘
```

**Lichtere bubbles**: vervang het zwarte `bg-foreground` voor eigen-berichten door `bg-primary/15 text-primary-foreground` of `bg-muted`. Het huidige zwart is harsch op desktop. Ander bubble-color is een token-keuze; afstemmen op de cockpit-bubbles zodat ze visueel matchen.

### 6. Compose-pane — `PortalComposePane`

Pad: `apps/portal/src/components/inbox/portal-compose-pane.tsx`.

Wordt getoond bij `/inbox/new`. Inline-form i.p.v. modal. Layout matcht de detail-pane (zelfde header + form-area + submit-bar) zodat de transitie minder schokkerig is. Submit roept de bestaande `sendMessageAsClientAction` aan; bij success `router.replace(/inbox/${result.messageId})` — gebruiker landt direct in het verse gesprek met de detail-pane open.

Hergebruikt bestaande `messageBodySchema` uit CC-008.

### 7. Empty-state pane — `PortalEmptyPane`

Pad: `apps/portal/src/components/inbox/portal-empty-pane.tsx`.

Render alleen op desktop wanneer er items in de lijst zijn maar geen geselecteerd item (situatie kan optreden bij directe `/inbox`-navigatie als auto-select uitgeschakeld). Tekst: "Selecteer een bericht of start een nieuw gesprek". Op een lege lijst: bestaande `OnboardingCard` blijft (CC-005), getoond in de lijst-pane.

### 8. Auto-select bij `/inbox` zonder `messageId`

Pad: server-side in `page.tsx`. Als `messageId === undefined` én `questions.length > 0` én user-agent / breakpoint-hint zegt desktop:

```ts
// Server-side breakpoint-detection is fragile; alternatief: client-side
// useEffect(() => router.replace(...)) als de viewport >=md is. Pragmatisch:
// laat de eerste klik op een rij de selectie maken en accepteer dat de
// initiele "geen selectie"-pane voor één tik zichtbaar is. Of: server geeft
// `defaultSelectedId = questions[0]?.id` aan de layout, layout-shell rendert
// die op md+ via een `useEffect` + `router.replace`.
```

Aanbeveling: **client-side `useEffect` met `useMediaQuery("md")`**. Hoort bij UI-state, niet bij server-routing. Edge-case: als de gebruiker bewust naar `/inbox` zonder selectie navigeert (deeplink), is een redirect naar item 1 raar. Beter: **op `md+` toon `PortalEmptyPane` met "Selecteer een bericht"** en geen auto-redirect. Eenvoudiger, eerlijker UX.

### 9. Mobile-fallback verifiëren

Pad: handmatig + Playwright-snapshot (zie taak 11).

Onder `md` (375px / 768px) gedraagt de page zich als de oude:

- `/inbox` → toont alleen de lijst-pane (`hidden md:block` op de detail-pane).
- `/inbox/[id]` → toont alleen de detail-pane (`hidden md:block` op de lijst-pane).
- Back-knop in detail-header navigeert naar `/inbox`.

Geen JS-detection; CSS-only via `hidden md:block` / `md:hidden`.

### 10. Cockpit-inbox bubble-styling alignen (optioneel maar aanbevolen)

Pad: `apps/cockpit/src/features/inbox/components/conversation-bubbles.tsx`.

Als de portal-bubbles lichter worden (taak 5), maakt zwart in cockpit het asymmetrisch. Pas beide aan dezelfde token aan (`bg-primary/15` of `bg-muted`). 1 file, ~3 regels. **Of buiten scope laten** als de cockpit-PM's het zwart goed vinden — visuele drift is hier acceptabel zolang de **structuur** (Linear-stijl) symmetrisch is.

### 11. Tests

- **Route-test:** `apps/portal/__tests__/components/portal-inbox-layout.test.tsx` — rendert layout met `selectedId=undefined` toont empty-pane op md+; met `selectedId="q-1"` toont thread-pane; met `selectedId="new"` toont compose-pane. Mock `useMediaQuery` of CSS-class-presence.
- **List-row-test:** `portal-inbox-row.test.tsx` — renders title + sender + active-state; href is correct.
- **Server-page-test:** behavior-test op `page.tsx` is moeilijk in vitest (Next App Router conventies); **overslaan** voor v1, alleen smoke-test via type-check + handmatige check.
- **Mobile-CSS-snapshot:** Playwright (als reeds opgezet) of handmatig + screenshot in PR-beschrijving. Niet in scope een Playwright-setup als die niet bestaat.

### 12. Docs

- Update `apps/portal/src/components/inbox/`-niveau README (als die bestaat — anders aanmaken). Beschrijf de pane-structuur en breakpoint-fallback.
- Note in `docs/specs/vision-customer-communication.md` §9: portal-inbox is two-pane op md+, sluit aan op cockpit Linear-stijl.
- Verplaats sprint naar `sprints/done/` na merge en update `sprints/backlog/README.md`.

## Acceptatiecriteria

- [ ] `/projects/[id]/inbox/[[...messageId]]/page.tsx` is de enige inbox-route; oude `inbox/page.tsx` en `inbox/[messageId]/page.tsx` zijn verwijderd.
- [ ] Op `md+` (≥768px) toont `/inbox` een two-pane layout: vaste 360px lijst-pane links, flexibele detail-pane rechts.
- [ ] Onder `md` toont de page één pane tegelijk (lijst óf detail), back-knop in detail navigeert naar de lijst.
- [ ] `/inbox/new` toont een inline compose-pane (geen modal).
- [ ] Bij compose-success redirect naar `/inbox/[newMessageId]` — gebruiker landt direct in de nieuwe thread.
- [ ] Active-state op de geselecteerde rij in de lijst-pane is visueel zichtbaar (background-tint).
- [ ] Bubble-styling is zachter dan zwart (bv. `bg-primary/15` of `bg-muted`); cockpit eventueel mee gealigned.
- [ ] Geen extra DB-queries t.o.v. de huidige flow — `getConversationThread` doet al het werk en wordt eenmalig aangeroepen per page-render.
- [ ] `apps/portal/__tests__/components/portal-inbox-layout.test.tsx` (en `portal-inbox-row.test.tsx`) bestaan en zijn groen.
- [ ] `npm run type-check`, `npm run lint`, `npm test`, alle `check:*` scripts groen.
- [ ] Visuele check op desktop én mobile (Chrome DevTools 375px) gedaan en gedocumenteerd in de PR-omschrijving.
- [ ] PR-026 rij toegevoegd aan `sprints/backlog/README.md`; bestand verplaatst naar `sprints/done/` na merge.

## Risico's

| Risico                                                                                                       | Mitigatie                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catch-all-route `[[...messageId]]` matcht onverwachts ook `/inbox/new` als een uuid-vorm.                    | `selectedId === "new"` is een sentinel-string, geen uuid; type-discriminerende check vóór `getConversationThread`-call. Als een klant ooit een item-id "new" krijgt: niet, het is een uuid. Defense via reserved-string. |
| Server-side rendering kent geen viewport-breakpoint, dus de eerste paint kan kort de "verkeerde" pane tonen. | CSS-only fallback via Tailwind responsive classes — geen JS-flicker. De `hidden md:block`-pattern werkt vanaf de eerste paint correct.                                                                                   |
| Mobile-back-knop in de detail-header overlapt met de browser-back-knop / iOS-swipe.                          | Standaard Next.js `<Link href="/inbox">` triggert browser-history; iOS-swipe-back blijft werken. Geen manipulation van history-stack.                                                                                    |
| Bubble-style-wijziging breekt visuele consistentie met cockpit.                                              | Taak 10 expliciet meenemen of bewust uitsluiten. Niet half doen.                                                                                                                                                         |
| Hergebruik-impuls naar `@repo/ui` voor bubbles vroeg → premature abstraction.                                | Aanbeveling expliciet: **niet consolideren in deze sprint**. Eerst beide views stabiel, dan een eigen mini-sprint voor het uittrekken (zie "Niet in scope").                                                             |
| Auto-redirect-pad (taak 8) creëert een redirect-loop als de eerste lijst-fetch faalt.                        | Geen auto-redirect → `PortalEmptyPane` op `md+` zonder selectie. Eenvoudig, geen redirect-pad.                                                                                                                           |
| Onzichtbare drift met cockpit als de cockpit-inbox later aanpassingen krijgt.                                | Visuele check on PR-merge in beide apps; toekomstige sprints die de cockpit-inbox raken moeten in hun spec opnemen "check ook portal-versie" als vraag.                                                                  |
| `[[...messageId]]` typing in Next 16 met App Router — `messageId` is `string[] \| undefined`, niet `string`. | Eerste regel `const selectedId = messageId?.[0];` is genoeg. TypeScript-strict bevestigt dat. Cypress/Playwright dekt het end-to-end.                                                                                    |

## Niet in scope

- Inline-search door de lijst-pane (zoeken in eigen messages).
- Filter-chips in de lijst-pane (`open` / `responded`); klant heeft te weinig items om filters te rechtvaardigen in v1.
- Drag-to-resize tussen lijst en detail (vaste 360px is acceptabel voor v1).
- Real-time updates via Supabase realtime-subscription — komt eventueel in een eigen sprint zodra de basis stabiel is.
- Consolidatie van conversation-bubbles naar `@repo/ui` (eigen sprint, na visuele convergentie).
- Notification-badge verfijning (huidige `Vragen (1)`-counter blijft).
- Mobile drawer/sheet-variant van de detail-pane (buiten scope; CSS-only fallback volstaat).
- DevHub-equivalent (issues-detail-pagina) — DevHub is intern en gebruikt al een ander layout-patroon, geen reden voor symmetrie daar.
- Inbox-tab-navigation tussen meerdere projecten in de portal-inbox (klant heeft één project per view).
- Klant-side rate-limit-tuning (CC-007 minimal versie volstaat).
