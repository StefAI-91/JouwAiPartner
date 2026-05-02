# Micro Sprint CC-006: Vrije Messaging (cockpit ↔ portal)

## Doel

Bouw de vrije communicatie-laag bovenop de issue-gebonden flow uit CC-001 t/m CC-005. Vandaag kunnen klant en team alléén schrijven binnen de context van een bestaand issue (via `convertIssueToQuestion` of `replyToQuestion`). Voor algemene vragen, follow-ups, of proactieve outbound zonder feature/bug-haakje is er geen kanaal — die communicatie lekt nu naar e-mail buiten het portal om.

CC-006 verandert dit door:

1. Een **"Nieuw bericht"**-flow in zowel cockpit-inbox als portal-inbox: klant kan een vrij bericht aan team starten, team kan een vrij bericht aan klant starten.
2. **Threaded conversation-detail-pagina** (cockpit + portal): root + replies chronologisch, reply-form onderaan. Vervangt het impliciete "in-line in inbox-list"-model uit CC-001.
3. **AI-draft hergebruik** uit CC-004: team kan optioneel "✨ AI-draft" klikken bij compose; gebruikt dezelfde `outbound_drafts`-infra + Communicator-agent.
4. **RLS-update**: klant mag root-berichten starten op projecten waar zij portal-access op heeft (huidige PR-SEC-031 blokkeert dat).
5. **Notify-uitbreiding**: nieuwe templates voor "team start gesprek" en "klant start gesprek" (laatste alleen in-app counter, geen mail aan team).

DB-naam blijft `client_questions` (geen rename — te grote blast-radius). UI-naming verschuift naar **"Berichten"** zodat het onderwerp-neutraal voelt.

Dit is een vervolg-sprint na CC-001 t/m CC-005. Niet in de oorspronkelijke vision §12 sprint-volgorde, geboren uit review-feedback dat de feedback-flow vrije communicatie niet dekt.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§3** — Inbox-model: één DB, twee views. Tot nu toe alleen issue-gebonden + reply; CC-006 vult de "vrije berichten" in beide views.
- **§6** — Two-way messaging: "AI-draft button (vision §6 Phase 2)" werd in CC-001 expliciet uitgesloten. CC-006 implementeert die voor team-side compose, hergebruikend van CC-004's draft-infra.
- **§7** — Outbound: "all outbound passes the AI-draft → human-review → send pattern". CC-006 maakt dat patroon ook beschikbaar voor manual-initiated outbound (niet alleen automatic decline-trigger uit CC-004).
- **§9** — UX-principe "conversation threading": CC-006 levert de threaded view die §9 beschrijft.
- **§10 #5** (deferred): rich-edit + due-date + topic-link in conversation-composer blijven gedeferred. CC-006 levert minimaal: textarea-only compose. Rich-edit komt later.

## Afhankelijkheden

- **CC-001** — cockpit-inbox feature (`apps/cockpit/src/features/inbox/`), `cockpit-reply-form` component, en cross-project query `listInboxItemsForTeam`.
- **CC-002** — notify-infra (`@repo/notifications` package + `sendMail` + templates-dir).
- **CC-004** — `outbound_drafts` tabel, Communicator-agent (`packages/ai/src/agents/communicator.ts`), `waitUntil()`-pattern voor async draft-generatie.
- **PR-022** — `client_questions` schema + RLS (`supabase/migrations/20260430110000_client_questions.sql`). CC-006 muteert RLS-policy `Client questions: insert (root team / reply role-aware)`.
- **PR-023** — bestaande UI:
  - portal: `apps/portal/src/components/inbox/{client-reply-form,question-card,question-list}.tsx` + `apps/portal/src/actions/inbox.ts:replyAsClientAction`
  - devhub: `apps/devhub/src/actions/questions.ts:askQuestionAction` + `replyAsTeamAction` (volledig herbruikbaar voor cockpit — alleen verplaatsen + revalidatePaths anpassen)
- Bestaande mutations `sendQuestion` + `replyToQuestion` in `packages/database/src/mutations/client-questions.ts` — CC-006 hoeft géén nieuwe mutations toe te voegen, alleen RLS-toegang verbreden voor `sendQuestion`.

## Open vragen vóór start

1. **RLS klant-root: project-access-gebonden of organisatie-gebonden?** Aanbeveling: **project-access-gebonden via `has_portal_access(uid, project_id)`** — consistent met bestaande SELECT-policy regel 51. Een klant mag root starten op elk project waar zij portal-access op heeft, beperkt tot eigen organisatie. Niet org-wide ("starten op willekeurig project van organisatie") — dat zou klant-PMs van klanten met meerdere projecten verwarrend toegang geven.
2. **Threading: single-level houden of upgraden naar multi-level?** Aanbeveling: **single-level houden**. Bestaande mutation `replyToQuestion` enforces `parent.parent_id !== null` blokkade (regel 131-136). Voor v1 vrije messaging is platte thread "root + chronologische replies" voldoende. Multi-level threading (Slack-stijl threads-in-threads) levert UX-complexiteit zonder duidelijke winst — defer naar latere sprint als gebruikers het missen.
3. **Status-model voor vrije messaging?** Aanbeveling: **bestaand `open`/`responded` hergebruiken**. Semantiek: `open` = wacht op respons van tegenpartij van laatste sender; `responded` = klant-reply heeft team's bericht beantwoord. Werkt voor beide richtingen. Edge case: team-only thread (team start, team reply, team reply) blijft `open` — acceptabel, want klant moet alsnog antwoorden.
4. **AI-draft toggle in compose-modal: default aan of uit?** Aanbeveling: **default uit, expliciete knop "✨ Schrijf met AI"**. Veel team-berichten zijn één-zinners ("Heb je tijd morgen 10u?") waar AI overkill is. Knop genereert dan een draft volgens CC-004's flow (status `pending_review` in `outbound_drafts`). PM kan vrij blijven typen of de draft accepteren/editen.
5. **Naming-shift "Vraag" → "Bericht" in UI: ook bestaande Q&A-flow herbenoemen?** Aanbeveling: **ja, alle UI-strings**. DB-naam blijft `client_questions` (geen schema-rename). UI-strings (`Q&A`, `Vraag`, `Stel een vraag`, etc.) worden `Berichten`, `Bericht`, `Stuur een bericht`. Coherent voor klant; verwijderingen in DB-laag zijn geen optie zonder grote refactor.
6. **Conversation-detail: aparte route of inline-expand in inbox-list?** Aanbeveling: **aparte route**. `/inbox/[id]` (cockpit) en `/projects/[id]/inbox/[messageId]` (portal). Voordelen: shareable URLs (klant kan deeplink uit mail terugklikken), browser-back-knop werkt logisch, threaded thread mag groeien zonder de inbox-lijst onhandig te maken. Inline-expand kan altijd later toegevoegd als "snel bekijken" — niet eerst.
7. **Hergebruik `askQuestionAction` uit `apps/devhub/src/actions/questions.ts`?** Aanbeveling: **verplaatsen naar cockpit, niet hergebruiken**. DevHub gebruikt het zelf nu nog (als entry-point voor team-vraag-vanuit-issue). Verplaatsen → naam-clash. Beter: kopieer naar `apps/cockpit/src/features/inbox/actions/compose.ts` met cockpit-paths in `revalidatePath`. DevHub-versie kan later worden geconsolideerd in een opruimsprint als duplicatie pijnlijk wordt.

## Taken

Bouwvolgorde **migratie → mutations (geen wijziging) → queries → cockpit compose-flow → portal compose-flow → conversation-detail-pages → notify-templates → naming-shift → tests → docs**.

### 1. RLS-migratie: klant-root toestaan

Pad: `supabase/migrations/<timestamp>_cc006_client_root_messages.sql`.

```sql
-- Vervang PR-SEC-031 INSERT-policy: root mag nu ook door klant met
-- portal-access + matching organisatie. Reply-pad blijft ongewijzigd.

DROP POLICY IF EXISTS "Client questions: insert (root team / reply role-aware)" ON client_questions;

CREATE POLICY "Client questions: insert (root + reply role-aware)"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN parent_id IS NULL THEN
        -- Root: team altijd, klant alleen op project waar zij portal-access
        -- op heeft + matching organization (multi-tenant guard).
        NOT is_client(auth.uid())
        OR (
          has_portal_access(auth.uid(), project_id)
          AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
      ELSE
        -- Reply: ongewijzigd t.o.v. PR-SEC-031.
        NOT is_client(auth.uid())
        OR EXISTS (
          SELECT 1 FROM client_questions p
          WHERE p.id = parent_id
            AND has_portal_access(auth.uid(), p.project_id)
            AND p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    END
  );
```

Geen schema-wijziging op `client_questions` zelf. Geen nieuwe kolommen.

### 2. Mutations — geen wijziging nodig

`sendQuestion` (`packages/database/src/mutations/client-questions.ts:41`) is al generiek genoeg: accepteert `project_id`, `body`, optionele `topic_id`/`issue_id`/`due_date`, en zet `sender_profile_id` uit caller-arg. Voor klant-root: server-action geeft `profile.id` van klant door, RLS staat het nu toe (taak 1). Geen nieuwe mutation, geen rename.

`replyToQuestion` blijft ongewijzigd (was al two-way).

### 3. Queries — conversation-thread

Pad: `packages/database/src/queries/client-questions.ts` (bestand bestaat — uitbreiden).

```ts
export interface ConversationThread {
  root: ClientQuestionRow;
  replies: ClientQuestionRow[]; // chronologisch oplopend
  participants: Array<{ profile_id: string; role: "team" | "client"; name: string }>;
}

/**
 * Haalt root + alle replies + participant-info op. Single-level threading
 * (parent → reply); reply-op-reply niet ondersteund — `replyToQuestion`
 * mutation enforces dat al.
 */
export async function getConversationThread(
  messageId: string,
  client?: SupabaseClient,
): Promise<ConversationThread | null>;
```

Implementatie: één query met `parent_id` embed (`replies:client_questions!parent_id(...)`) + één join op `profiles` voor namen. Filter parent op `id=$messageId AND parent_id IS NULL` — als de gebruiker per ongeluk een reply-id stuurt, returnt `null` (niet de thread van de parent — dat zou onverwachte navigatie geven).

`listInboxItemsForTeam` uit CC-001 hoeft geen wijziging — vrije messages zijn `client_questions` zonder `issue_id`/`topic_id`, vallen al in de `kind: "question"`-bucket. Wel UI-styling-wise onderscheiden (taak 5).

### 4. Cockpit: compose-flow team → klant

Pad: `apps/cockpit/src/features/inbox/components/compose-modal.tsx` (nieuw).

Modal-velden:

- **Project-selector** — dropdown met alle projecten van team (cross-project; één geselecteerd = bericht naar dat project).
- **Body-textarea** — min 10, max 5000 chars.
- **"✨ Schrijf met AI"-knop** — open vraag #4: default uit. Klik triggert CC-004's draft-flow:
  1. Insert `outbound_drafts`-row met `source_status_change='manual_compose'`, `source_metadata={projectId}`.
  2. `waitUntil(generateManualDraft({...}))` — Communicator-agent met free-form prompt (geen decline-context).
  3. Modal toont skeleton "AI schrijft...", polled status (3s interval, max 30s) of via Supabase realtime.
  4. Bij `pending_review`: textarea pre-vult met body, subject genegeerd (vrije messages hebben geen subject in client_questions schema).
  5. PM kan editen of direct submitten.
- **"Verstuur"-knop** — direct verzenden zonder draft (als textarea handmatig is ingevuld).

Server-action `composeMessageToClientAction(input: { projectId, body, draftId? })` in `apps/cockpit/src/features/inbox/actions/compose.ts` (nieuw):

1. Auth + profile-lookup.
2. Zod-validate (`composeMessageSchema`).
3. Als `draftId`: roep `markDraftSent` aan na `sendQuestion`-success (link draft → message).
4. `sendQuestion({ project_id, body, ... }, profile.id, supabase)`.
5. `notifyNewMessageFromTeam(message, projectId)` — nieuwe orchestrator (taak 7).
6. `revalidatePath('/inbox')` + return `{ success: true, messageId }`.

Wire de modal-knop in `apps/cockpit/src/features/inbox/components/inbox-view.tsx` (uit CC-001, header rechts: "+ Nieuw bericht").

### 5. Portal: compose-flow klant → team

Pad: `apps/portal/src/components/inbox/new-message-form.tsx` (nieuw).

Veel simpeler dan cockpit-compose: geen project-selector (project-context komt uit URL `/projects/[id]/inbox`), geen AI-draft (klant schrijft eigen woorden), geen subject.

Velden:

- **Body-textarea** — min 10, max 5000 chars.
- **"Verstuur"-knop**.

Server-action `sendMessageAsClientAction(projectId, input)` in `apps/portal/src/actions/inbox.ts` (uitbreiden — bestaand bestand):

1. Auth + profile.
2. `hasPortalProjectAccess(profile.id, projectId)` — defense-in-depth bovenop RLS.
3. Zod-validate.
4. `sendQuestion({ project_id, body }, profile.id, supabase)` — RLS uit taak 1 staat het nu toe via klant-cookie-client.
5. `notifyNewMessageFromClient(message, projectId)` — geen mail naar team (vision §8 in-app counter), wel sidebar-counter-bump in cockpit.
6. `revalidatePath(\`/projects/${projectId}/inbox\`)` + return.

Wire in `apps/portal/src/app/(app)/projects/[id]/inbox/page.tsx` als header-actie ("+ Nieuw bericht aan team").

### 6. Conversation-detail-pagina's

#### 6a. Cockpit

Pad: `apps/cockpit/src/app/(dashboard)/inbox/[id]/page.tsx` (nieuw) + `loading.tsx` + `error.tsx`.

```tsx
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getConversationThread(id);
  if (!thread) notFound();
  return <ConversationThreadView thread={thread} role="team" />;
}
```

Component `ConversationThreadView` (nieuw, in `features/inbox/components/`):

- **Header**: project-naam, deelnemer-namen, status-badge (`open`/`responded`).
- **Berichten-stream**: root + replies chronologisch, per bericht een card met sender-naam, role-badge ("Team"/"Klant"), timestamp, body.
- **Reply-form onderaan** — hergebruik `cockpit-reply-form` uit CC-001 (geen nieuw component nodig).
- Per-project tab uit CC-005: deze route blijft globaal `/inbox/[id]`, niet onder `projects/[id]/inbox/[id]` (single shareable URL voor het gesprek; project-context is afleidbaar uit thread).

#### 6b. Portal

Pad: `apps/portal/src/app/(app)/projects/[id]/inbox/[messageId]/page.tsx` (nieuw) + loading/error.

Hergebruik `ConversationThreadView` als shared component (zet 'm in `@repo/ui` óf dupliceer in portal — kies dupliceer voor v1, blast-radius is klein, eventuele divergentie is fine). Klant-side is `role="client"` zodat de reply-form wisselt naar `client-reply-form` (bestaand uit PR-023).

In portal's `question-list.tsx` (bestaand): elke item-titel wordt klikbare link naar `/projects/[id]/inbox/[messageId]`. Bestaande in-line reply-form vervalt — alleen de detail-page heeft een form.

### 7. Notify-templates uitbreiden

In `packages/notifications/src/templates/` (uit CC-002):

- **`new-team-message.ts`** — nieuw, voor team-initiated free message (taak 4-flow). Subject: "Je hebt een nieuw bericht van Jouw AI Partner". CTA: deeplink naar `/projects/${projectId}/inbox/${messageId}`. Body: preview eerste 200 chars + "Bekijk volledige bericht in portal".

In `packages/notifications/src/notify/`:

- **`new-team-message.ts`** — orchestrator. Mirror `notifyTeamReply` uit CC-002 met andere template + andere context-shape (geen parent-question, alleen nieuwe message).

CC-006 stuurt **GEEN** mail naar team bij klant-initiated message — vision §8 expliciet "in-app only voor team". Sidebar-counter uit CC-001 update via `revalidatePath` is voldoende.

### 8. Naming-shift "Vraag" → "Bericht"

Volledige replace-pass over UI-strings — DB-laag onveranderd. Concrete bestanden (grep voor "Vraag", "Vragen", "Stel", "Q&A"):

- `apps/portal/src/components/inbox/*` — buttons, labels, empty-states.
- `apps/portal/src/app/(app)/projects/[id]/inbox/page.tsx` — page title.
- `apps/cockpit/src/features/inbox/components/*` (uit CC-001) — secties, badges, modal-titles.
- `apps/cockpit/src/features/inbox/components/inbox-list.tsx` (uit CC-001) — sectie-headers.
- Translations / i18n-keys als die bestaan.

Mail-templates uit CC-002 ook synchroniseren: `feedback-converted` heet nu "We hebben een vraag" → blijft (issue-converted is nog wel een vraag-context). `new-team-reply` → blijft (is een reply, niet een nieuwe thread).

Test-scope: snapshot-tests die "Vraag"-strings asserten moeten geüpdatet worden.

### 9. Sidebar-counter — geen wijziging

Counter uit CC-001 (`countInboxItemsForTeam`) telt al alle `open`-status items inclusief vrije messages — geen aanpassing nodig. Verifieer alleen dat een vrije root-message van klant correct in `pmReview`/`openQuestions`-bucket valt; anders update.

### 10. Tests

- **RLS-migratie** (`packages/database/__tests__/migrations/cc006-client-root.test.ts`):
  - Klant met portal-access op project A kan root-message inserten op project A.
  - Klant ZONDER portal-access kan NIET inserten (RLS-fail).
  - Klant kan NIET root inserten op project van andere organisatie (multi-tenant guard).
  - Team kan blijven inserten zoals voorheen.

- **Conversation-query** (`packages/database/__tests__/queries/conversation-thread.test.ts`):
  - `getConversationThread(rootId)` returnt root + alle replies chronologisch + participants.
  - `getConversationThread(replyId)` (per ongeluk reply-id) returnt `null`.
  - Empty thread (root zonder replies) returnt root + `replies: []`.

- **Cockpit compose-action** (`apps/cockpit/__tests__/features/inbox/actions/compose.test.ts`):
  - Direct compose (geen `draftId`) → `sendQuestion` + `notifyNewMessageFromTeam`.
  - Met `draftId` → `markDraftSent` na success.
  - Validation faalt op te-korte body.

- **Portal compose-action** (`apps/portal/__tests__/actions/send-message.test.ts`):
  - Klant met portal-access → success.
  - Klant zonder access → `{ error }`.
  - Validation faalt op te-korte body.

- **Conversation-detail-page** (snapshot of integration):
  - Cockpit: drie berichten (root team + reply klant + reply team) renderen in correcte volgorde met juiste role-badges.
  - Portal: zelfde fixture, klant-side, reply-form is `client-reply-form`-variant.

- **AI-draft compose-flow** (`packages/ai/__tests__/agents/communicator-manual.test.ts`):
  - Communicator-agent ondersteunt `mode: 'manual_compose'` (geen decline-context, free-form prompt).
  - Capture-mock op LLM-call: prompt bevat project-naam + optionele user-hint, géén decline-reason.

### 11. Docs + registry

- Update `apps/cockpit/src/features/inbox/README.md` — sectie "Compose-flow (team → klant)" + "AI-draft hergebruikt CC-004 outbound_drafts".
- Update `docs/specs/vision-customer-communication.md` — markeer §6 Phase 2 (AI-draft button) als implemented in CC-006; markeer §10 #5 "conversation-composer" als partially-implemented (textarea-only).
- Voeg CC-006 rij toe aan `sprints/backlog/README.md` direct onder CC-005.
- Update `packages/database/README.md` — RLS-policy voor `client_questions.insert` is gewijzigd; documenteer.

## Acceptatiecriteria

- [ ] RLS-migratie toegepast: klant met portal-access op project kan root-message inserten; klant op ander project of andere org wordt geblokkeerd.
- [ ] `getConversationThread()` query bestaat en returnt single-level thread met participants.
- [ ] Cockpit `/inbox` heeft "+ Nieuw bericht"-knop in header die compose-modal opent.
- [ ] Cockpit-compose werkt zonder AI-draft (direct verzenden).
- [ ] Cockpit-compose met "✨ Schrijf met AI" triggert CC-004's draft-flow; PM kan editen of accepteren; bij submit gaat draft naar `sent` en wordt `client_questions`-row aangemaakt.
- [ ] Portal `/projects/[id]/inbox` heeft "+ Nieuw bericht aan team"-knop die compose-form opent.
- [ ] Portal-compose werkt: klant kan vrij bericht starten.
- [ ] Cockpit conversation-detail `/inbox/[id]` toont root + replies chronologisch + reply-form.
- [ ] Portal conversation-detail `/projects/[id]/inbox/[messageId]` toont thread + klant-reply-form.
- [ ] Klant ontvangt mail bij team-initiated message (`new-team-message` template) met deeplink.
- [ ] Team ontvangt GEEN mail bij klant-initiated message; sidebar-counter update binnen 10s.
- [ ] UI-strings: "Vraag" → "Bericht" in portal én cockpit (geen "Q&A" of "Vraag" achtergebleven in user-facing copy).
- [ ] DB-laag onveranderd qua schema (alleen RLS-policy gemuteerd).
- [ ] Bestaande issue-gebonden flow (CC-001 endorse/decline/defer/convert) blijft werken — geen regressie.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:queries`, `npm run check:features` allemaal groen.
- [ ] CC-006 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                                                         | Mitigatie                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS-update te permissief: klant kan root-inserten op project van andere klant binnen dezelfde organisatie.                     | Migratie test (taak 10) borgt org-match én portal-access. Geen `getAdminClient()`-shortcut in `sendMessageAsClientAction` — strict klant-cookie-client.                                                                    |
| Naming-mismatch DB (`client_questions`) vs UI ("Berichten") verwart developers bij nieuwe sprints.                             | JSDoc op `ClientQuestionRow` type: "Representeert zowel issue-gebonden vragen als vrije berichten — UI-naam is 'Bericht'." Refactor naar `client_messages` parkeren als losse cleanup-sprint als drift schade veroorzaakt. |
| AI-draft + handmatige compose-paden divergeren (twee codepaden in cockpit-compose-modal).                                      | Eén modal-component met conditionele rendering op `draftId !== null`. Niet twee aparte modals. Test-fixture covert beide takken.                                                                                           |
| Klant kan via vrije compose spam-message starten (low-effort, hoge volume).                                                    | Rate-limit op `sendQuestion` per klant (uit packages/auth bestaand utility?) — verifieer in CC-006 PR. Fallback: monitoring in Resend-dashboard, manueel ingrijpen.                                                        |
| Conversation-detail-route deeplink uit mail werkt niet als klant niet ingelogd is.                                             | Auth-middleware redirect naar login → callback URL → terug naar `/projects/[id]/inbox/[messageId]`. Bestaand pattern, alleen valideren dat het werkt voor diepe routes.                                                    |
| Free-message body kan rich content bevatten (URLs, mentions) die we niet escapen → XSS in conversation-detail.                 | Render body als plain text in v1 (`<p>{body}</p>`), nooit `dangerouslySetInnerHTML`. URL-detectie + linkify als follow-up sprint.                                                                                          |
| AI-draft genereert bericht dat klant raar vindt voor "out-of-the-blue" outbound (geen decline-context).                        | Communicator-prompt updaten met `mode: 'manual_compose'`-tak: "Schrijf een kort, vriendelijk team-bericht. Geen excuses zonder context. Vraag toestemming als 't om planning gaat." Iteratie op eerste 10 echte drafts.    |
| Twee endpoints om team-message te starten (CC-004 decline-trigger automatisch + CC-006 manual compose) → drafts-lijst overlapt | Beide vullen `outbound_drafts.source_status_change` — `'declined'` vs `'manual_compose'`. UI filter-tab in drafts-sectie kan op die kolom filteren als overlap pijn doet.                                                  |

## Niet in scope

- **Multi-level threading** — single-level blijft, mutation enforces.
- **Attachments** (files, images, voice notes) — apart sprint, vereist storage + virus-scan + UI.
- **Rich text / markdown** in body — plain text only v1.
- **Read-receipts / typing-indicators** — geen realtime channel v1.
- **Message-deletion / editing** — immutable. Correctie via nieuwe reply.
- **@-mentions** van team-leden binnen body — geen team-routing v1.
- **Search** across messages — geen full-text-search v1.
- **AI-draft voor klant-side compose** — klant schrijft eigen woorden; AI helpt alleen team-side.
- **Multi-recipient** (1 message → meerdere klant-PMs) — automatisch via notify-orchestrator, geen UI om expliciet te kiezen.
- **Bulk-message** ("stuur dit naar 5 projecten") — één-voor-één v1.
- **Scheduled send** ("stuur morgenochtend") — geen scheduler.
- **Auto-archive** van oude threads — alle threads blijven indefinitely.
- **DB-rename `client_questions` → `client_messages`** — te grote blast-radius, defer naar opruimsprint als naming-mismatch developer-schade veroorzaakt.
- **DevHub `askQuestionAction` consolidatie** — kopiëren naar cockpit, latere opruimsprint kan dedupliceren.

## Vision-alignment (samenvatting)

CC-006 sluit het gat in de Customer-Communication-laag: vóór deze sprint kon team alléén via issue-trigger (CC-001 convert, CC-004 decline-draft) communiceren; klant kon alleen reageren op door team gestarte threads. Na CC-006 is communicatie volledig vrij in beide richtingen, mét AI-assistentie aan team-zijde en zonder dat issue-koppeling verplicht is.

Combinatie met CC-001 t/m CC-005:

- Klant ziet één inbox in portal met issue-feedback, vrije team-berichten, en eigen verzonden berichten (vision §3 ✅)
- Klant kan vrije berichten starten naar team (vision §6 — nieuw)
- Team ziet dezelfde inbox cross-project + per-project (CC-001 + CC-005 + nu compose-flow)
- AI-draft beschikbaar voor zowel automatische decline-mail (CC-004) als manuele compose (CC-006) — review-gate identiek (vision §7 ✅)
- Notify-laag dekt alle nieuwe bericht-events (CC-002 + uitbreidingen in CC-006)

Volgende stappen na CC-006:

- **CC-007** (toekomst): aanvullende outbound-triggers (`in_progress`-update, weekly proactive, done-celebration) bovenop CC-004 + CC-006 generic draft-infra.
- **CC-008** (toekomst): conversation-rich-features — attachments, markdown, mentions, search.
