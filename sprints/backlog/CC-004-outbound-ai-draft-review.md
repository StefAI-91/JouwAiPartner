# Micro Sprint CC-004: Outbound met AI-Draft + Review-Gate

## Doel

Bouw de outbound-laag — team-naar-klant berichten die AI eerst drafted en mens reviewed vóór ze de klant bereiken. Dit voltooit de twee-richting-communicatie die in CC-001 begon: klant kan iets sturen, team kan iets sturen, maar wat we sturen moet altijd door menselijke hand zijn goedgekeurd.

V1 levert één concrete trigger eind-tot-eind: **PM declined feedback → AI maakt een tactvolle uitleg-mail-draft → PM reviewt en verstuurt** (of edit + verstuurt, of weggooit). De algemene draft+review-infra die hier ontstaat (tabel, agent, review-UI, send-flow) is generiek genoeg om in een follow-up sprint additionele triggers (`in_progress`-update, weekly proactive update, manual draft-button) bij te plakken zonder schema-wijziging.

Dit is sprint 4 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§7** — Outbound: "All outbound passes the AI-draft → human-review → send pattern. No team member sends raw — drafts are always reviewable, even if approved unchanged in two seconds."
- **§2** — Core principle "verification before truth applied to communication": outbound replies → human reviews AI-drafted answers before they are sent to the client.
- **§5 Decline UX** — "When PM declines, a short reason is required. The decline reason becomes a portal-message to the client so they always get an explanation, not silence." CC-001 levert de `decline_reason`-tekst. CC-004 maakt daar de daadwerkelijke klant-tactische uitleg-mail van.
- `vision-ai-native-architecture.md` §6 — verification model met "AI-drafted client answers (portal) → human reviewed". CC-004 implementeert dat patroon voor de eerste keer in de codebase (email-pipeline reviewt extracties, niet outbound-mails).

## Afhankelijkheden

- **CC-001** — levert `declineIssueAction` met `decline_reason` veld. CC-004 hookt daarin om een draft te genereren.
- **CC-002** — levert `notify*`-orchestrators + Resend-infra. CC-004 hergebruikt ze: na approve+send wordt CC-002's `notifyTeamReply` (of een nieuwe variant) getriggerd.
- Bestaande agent-registry-conventie in `packages/ai/src/agents/registry.ts` (regel 41-onwards). CC-004 voegt nieuwe "Communicator"-agent toe.
- Bestaande `sendQuestion`-mutation in `packages/database/src/mutations/client-questions.ts:41` (root team→klant message). CC-004 roept dit aan na approve.
- Bestaande MCP search-tool `search_knowledge` in `packages/mcp/src/tools/search.ts:10` — voor knowledge-grounding van de draft (zie task 3).
- Bestaande Anthropic-SDK setup in `packages/ai/` (`@ai-sdk/anthropic`, Vercel AI SDK).
- ENV: `ANTHROPIC_API_KEY` (bestaat), `PORTAL_BASE_URL` (uit CC-002).

## Open vragen vóór start

1. **Drafts in aparte tabel of kolom op `client_questions`?** Aanbeveling: **aparte tabel `outbound_drafts`**. Drafts hebben review-lifecycle die sent-messages niet hebben; mengen leidt tot RLS-complexiteit ("klant mag deze rij nog niet zien") en onhandige queries. Bij approve wordt de body **gekopieerd** naar `client_questions` via `sendQuestion`, draft krijgt `status='sent'` met `sent_message_id` link voor traceability.
2. **Welke trigger(s) in v1?** Aanbeveling: **alleen decline-reason → draft**. Eén volledige eind-tot-eind flow > drie half-werkende. Andere triggers (in_progress message, weekly proactive update, "draft a note"-button) komen in een follow-up. Concreet: schema en review-UI zijn generiek, alleen de **draft-trigger-laag** is nu één-doel.
3. **Sync of async draft-generatie?** Aanbeveling: **async via Vercel `waitUntil()`**. Bij `declineIssueAction`: insert draft-row met `status='generating'`, dan `waitUntil(generateAndComplete(draftId))` zodat Next.js de response al kan retourneren terwijl de LLM-call in een achtergrond-context blijft draaien (Vercel houdt de function-instance levend tot `waitUntil`-promise resolved is). Voorkomt dat PM 5-10 seconden wacht. Géén `Promise.then()`-fire-and-forget zonder `waitUntil` — die wordt op Vercel "frozen" zodra de response weg is. Geen queue-systeem in v1 (out of scope).
4. **AI-grounding: alleen issue-context of ook knowledge-search?** Aanbeveling: **issue-context + knowledge-search via MCP**. De Communicator-agent krijgt: (a) de issue (titel, beschrijving, decline_reason van PM, klant-context via project), (b) optionele context-snippets uit `search_knowledge` over dit project. **Haiku 4.5** als startmodel — review-gate maakt model-keuze omkeerbaar (PM ziet/edit alle drafts vóór verzending). Begin op het goedkope/snelle model; upgrade naar Sonnet als prompt-tuning + edit-rate aantonen dat reasoning-capacity het knelpunt is. Houd `review_action='approved_edited'`-stats bij voor die beslissing.
5. **Review-actions: approve / edit / reject — wat met "edit"?** Aanbeveling: **edit = inline tekstveld in review-UI**. Edit overschrijft `body`, klikt dan approve. Geen aparte "edit-and-save-as-draft"-status; PM bewerkt direct in approve-flow. Eenvoudiger UX, geen extra status.
6. **Wat als klant geen `profile.email` heeft (eindgebruiker via widget)?** Aanbeveling: **draft maken NIET, decline-flow returnt success zonder draft**. PM ziet in cockpit "kan geen klant-mail genereren — geen klant-PM gekoppeld". CC-005 is de plek voor eindgebruiker-feedback-aggregatie.

## Taken

Bouwvolgorde **schema → agent → draft-mutation/action → review-UI → send-flow → tests → docs**. Schema eerst zodat alle later lagen tegen vaste types praten.

### 1. DB-schema: `outbound_drafts`-tabel

Pad migratie: `supabase/migrations/<timestamp>_outbound_drafts.sql`.

```sql
CREATE TABLE outbound_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Trigger context: één van deze foreign keys ingevuld, rest NULL
  source_issue_id uuid REFERENCES issues(id) ON DELETE SET NULL,
  source_status_change text,                         -- bv. "declined", later "in_progress", "weekly"
  source_metadata jsonb DEFAULT '{}'::jsonb,         -- agent-input, knowledge-snippets, ...

  -- Generated content
  subject text,                                       -- mag NULL zijn tot generating klaar is
  body text,                                          -- idem
  body_format text NOT NULL DEFAULT 'plain' CHECK (body_format IN ('plain', 'markdown')),

  -- Review-lifecycle
  status text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'pending_review', 'approved', 'sent', 'rejected', 'failed')),
  generation_error text,                              -- gevuld bij status='failed'
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_action text CHECK (review_action IN ('approved_unchanged', 'approved_edited', 'rejected')),

  -- Link naar de gestuurde message (na sent)
  sent_message_id uuid REFERENCES client_questions(id) ON DELETE SET NULL,
  sent_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbound_drafts_project_status ON outbound_drafts (project_id, status);
CREATE INDEX idx_outbound_drafts_pending_review ON outbound_drafts (status) WHERE status = 'pending_review';

-- RLS: alleen team (admin/member) ziet drafts; clients zien NOOIT iets in deze tabel.
ALTER TABLE outbound_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team-only" ON outbound_drafts FOR ALL TO authenticated
  USING (auth.role() = 'authenticated' AND
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member')));

-- Trigger: updated_at
CREATE TRIGGER outbound_drafts_updated_at BEFORE UPDATE ON outbound_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Regenereer types via `npm run -w @repo/database supabase:types` na migratie. Voeg `OutboundDraftRow` + `OutboundDraftStatus` exports in `packages/database/src/types/`.

### 2. Communicator-agent

Pad prompt: `packages/ai/prompts/communicator.md` (nieuw). Inhoud-schets (geen volledige prompt — schrijven tijdens implementatie):

```
Je bent de Communicator. Je schrijft korte, empathische, professionele klant-
berichten namens Jouw AI Partner. Je toon: warm maar zakelijk, direct maar nooit
bot. Je schrijft in het Nederlands tenzij anders gevraagd.

Input: een issue met decline_reason van de project manager. Je taak: schrijf
een mail-draft die (a) bevestigt dat we het verzoek serieus hebben overwogen,
(b) de reden tactvol uitlegt, (c) eventueel een alternatief noemt, (d) de
deur openhoudt voor vervolg.

Output: JSON met `subject` en `body` velden.

Regels: nooit excuses voor dingen die geen excuses verdienen ("sorry voor het
ongemak" als er geen ongemak was). Geen verkooppraatjes. Geen "we zullen het
overwegen voor versie 2.0" tenzij PM dat heeft genoteerd. Houd 't onder 150
woorden tenzij het probleem complex is.
```

Pad agent-code: `packages/ai/src/agents/communicator.ts` (nieuw):

```ts
export async function generateDeclineDraft(input: {
  issue: {
    title: string;
    description: string | null;
    client_title: string | null;
    client_description: string | null;
  };
  declineReason: string;
  projectName: string;
  knowledgeSnippets?: Array<{ title: string; excerpt: string }>;
}): Promise<{ subject: string; body: string }> {
  const prompt = await loadPrompt("communicator.md");
  const userMessage = buildUserMessage(input);
  const response = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: prompt,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 600,
  });
  return parseJsonResponse(response.text); // throws on bad JSON
}
```

Voeg toe aan `packages/ai/src/agents/registry.ts` AGENT_REGISTRY (zelfde pattern als bestaande entries):

```ts
{
  id: "communicator",
  name: "Communicator",
  role: "De diplomaat",
  description: "Schrijft tactvolle klant-berichten op basis van PM-context en knowledge-search.",
  mascot: "💌",
  model: "claude-haiku-4-5-20251001",
  modelLabel: "Haiku 4.5",
  quadrant: "cockpit",
  status: "live",
  promptFile: "communicator.md",
  entrypoint: "packages/ai/src/agents/communicator.ts",
}
```

### 3. Knowledge-grounding (MCP search)

Optionele knowledge-snippets vóór de draft-call. In `generateDeclineDraft`:

```ts
const snippets = await searchProjectKnowledge(input.projectName, input.issue.title, 3);
```

Helper `searchProjectKnowledge` (in `packages/ai/src/agents/communicator.ts`) wrapt de bestaande `search_knowledge` tool-implementatie uit `packages/mcp/src/tools/search.ts:10` — directe import van de pure functie, niet via MCP-server (sneller, geen network roundtrip in agent-context).

Als zoeken faalt of geen resultaten: skip snippets, draft genereert nog steeds. Snippets zijn extra context, geen vereiste.

### 4. Mutations: drafts maken + completen + status-flips

Pad: `packages/database/src/mutations/outbound-drafts.ts` (nieuw).

```ts
export async function createPendingDraft(
  input: {
    projectId: string;
    organizationId: string;
    sourceIssueId: string;
    sourceStatusChange: "declined" | string; // open voor latere triggers
    sourceMetadata?: Record<string, unknown>;
  },
  client?: SupabaseClient,
): Promise<MutationResult<OutboundDraftRow>>;

export async function completeGeneratedDraft(
  input: {
    draftId: string;
    subject: string;
    body: string;
  },
  client?: SupabaseClient,
): Promise<MutationResult<OutboundDraftRow>>;

export async function failGeneratedDraft(
  input: {
    draftId: string;
    error: string;
  },
  client?: SupabaseClient,
): Promise<MutationResult<OutboundDraftRow>>;

export async function reviewDraft(
  input: {
    draftId: string;
    action: "approved_unchanged" | "approved_edited" | "rejected";
    editedBody?: string; // alleen bij approved_edited
    editedSubject?: string;
  },
  reviewer: { profile_id: string },
  client?: SupabaseClient,
): Promise<MutationResult<OutboundDraftRow>>;

export async function markDraftSent(
  input: {
    draftId: string;
    sentMessageId: string;
  },
  client?: SupabaseClient,
): Promise<MutationResult<OutboundDraftRow>>;
```

Validations in `packages/database/src/validations/outbound-drafts.ts` (Zod-schemas voor elke action).

### 5. Trigger-wiring in CC-001 decline-flow

`packages/database/src/mutations/issues/pm-review.ts` (uit CC-001 — naam mag verschillen, locatie identiek):

```ts
export async function declineIssue(...) {
  // ... bestaande update naar status='declined' + decline_reason ...

  // NEW: schedule draft generatie async — fail mag mutation NIET stoppen
  scheduleDeclineDraft({
    projectId: issue.project_id,
    organizationId: project.organization_id,
    issueId: issue.id,
    declineReason: input.decline_reason,
  }).catch((e) => console.error("[outbound-drafts] schedule failed", e));

  return result;
}
```

`packages/ai/src/pipeline/outbound/schedule-decline-draft.ts` (nieuw):

```ts
import { waitUntil } from "@vercel/functions";

export async function scheduleDeclineDraft(input: {...}): Promise<void> {
  const draft = await createPendingDraft({
    projectId: input.projectId,
    organizationId: input.organizationId,
    sourceIssueId: input.issueId,
    sourceStatusChange: 'declined',
    sourceMetadata: { declineReason: input.declineReason },
  });
  if ('error' in draft) return;

  // Vercel waitUntil houdt de function-instance levend tot deze promise
  // resolved is, óók na het retourneren van de server-action response.
  // Lokaal (zonder Vercel runtime) draait waitUntil als gewone await — fine.
  waitUntil(
    generateDeclineDraft({...})
      .then((output) => completeGeneratedDraft({ draftId: draft.data.id, ...output }))
      .catch((e) => failGeneratedDraft({ draftId: draft.data.id, error: e.message })),
  );
}
```

`@vercel/functions` package toevoegen aan `packages/ai/package.json`. In dev/test (geen Vercel runtime): `waitUntil` is een no-op-await polyfill — werkt transparant.

### 6. Cockpit Inbox UI: drafts-sectie

In de Inbox uit CC-001 (`apps/cockpit/src/features/inbox/components/`): voeg sectie/tab "Drafts" toe.

- **Lijst**: `listPendingDrafts(client?)` query (nieuw in `packages/database/src/queries/outbound-drafts.ts`) — sorteer op `created_at desc`, alleen `status='pending_review'`.
- **Card**: per draft toon source-issue (titel + decline_reason als context), gegenereerde subject + body, en drie actions:
  - **Goedkeuren & verzenden** → calls `approveAndSendDraftAction`
  - **Bewerken** → inline textarea opent (subject + body), na save calls `approveAndSendDraftAction` met edited content
  - **Afwijzen** → calls `rejectDraftAction`
- **Generating-status**: draft die nog `status='generating'` is toont skeleton + "AI schrijft..." (auto-refresh polling elke 3s, max 30s, of via Supabase realtime).
- **Failed-status**: toont error + "Probeer opnieuw"-knop (re-trigger generation).

### 7. Server-actions in cockpit

`apps/cockpit/src/features/inbox/actions/drafts.ts` (nieuw):

```ts
export async function approveAndSendDraftAction(
  draftId: string,
  edits?: { subject?: string; body?: string },
): Promise<ActionResult<{ messageId: string }>> {
  // 1. Auth check (admin/member)
  // 2. Reviewer profile lookup
  // 3. reviewDraft(action: edits ? 'approved_edited' : 'approved_unchanged', editedBody, editedSubject)
  // 4. sendQuestion({ project_id, body: finalBody, ... }) → returnt client_question id
  // 5. markDraftSent({ draftId, sentMessageId })
  // 6. Trigger CC-002 notification: notifyTeamReply OR new notifyOutboundSent
  // 7. revalidatePath('/inbox') + return { success: true, messageId }
}

export async function rejectDraftAction(draftId: string, reason?: string): Promise<ActionResult>;
export async function regenerateDraftAction(draftId: string): Promise<ActionResult>;
```

### 8. CC-002 integratie + decline-mail-toggle

**8a. Nieuwe outbound-template** voor de draft-flow:

- Optie A: hergebruik bestaande `notifyTeamReply` (CC-002 task 5) — werkt als draft via `sendQuestion` als root-question landt.
- Optie B: nieuwe `notifyOutboundSent` orchestrator + `outbound-sent` template ("Je hebt een bericht van Jouw AI Partner ontvangen").

Aanbeveling **Optie B** — een outbound message uit CC-004 verschilt qua context van een reply-on-question (CC-002). Klant herkent "nieuwe boodschap" beter dan "antwoord op iets dat ik niet vroeg".

Voeg toe: `packages/notifications/src/templates/outbound-sent.ts` + `notify/outbound-sent.ts`. Wired in `approveAndSendDraftAction` na `markDraftSent`.

**8b. Schakel CC-002's automatische decline-mail UIT** zodra CC-004 live is — anders krijgt klant twee mails (sobere CC-002 + AI-draft uit CC-004). In `packages/notifications/src/notify/feedback-status.ts` (CC-002 taak 5):

```ts
// VOOR CC-004:
//   declined: declineTemplate,
// NA CC-004:
const TEMPLATE_FOR_STATUS: Record<string, Template | null> = {
  triage: endorsedTemplate,
  declined: null, // ← uitgeschakeld door CC-004; outbound-flow stuurt zelf via outbound-sent
  deferred: deferredTemplate,
  // ...
};
```

Deze wijziging zit IN CC-004's PR (niet in een latere sprint). Acceptatiecriterium hieronder bewaakt dat de toggle gemerged is.

### 9. Tests

- **Mutations** (`packages/database/__tests__/mutations/outbound-drafts.test.ts`): elke van de 5 mutations met describeWithDb. Test `completeGeneratedDraft` op `status='generating'` rij flipt naar `pending_review`; op andere status faalt netjes.
- **Communicator agent** (`packages/ai/__tests__/agents/communicator.test.ts`): mock `@ai-sdk/anthropic` `generateText`-grens. Capture system-prompt + user-message payload, verify decline_reason in payload, verify return JSON parsing.
- **Schedule-decline-draft** (`packages/ai/__tests__/pipeline/outbound/schedule-decline-draft.test.ts`): mock `createPendingDraft`-grens en `generateDeclineDraft`-grens. Verify success-pad → completeGeneratedDraft. Verify error-pad → failGeneratedDraft.
- **Cockpit action** (`apps/cockpit/__tests__/features/inbox/actions/drafts.test.ts`): integration met `describeWithDb`, end-to-end approve+send flow. Verify `client_questions` row aangemaakt, draft marked sent.
- **CC-001 integratie**: uitbreiding op `pm-review.test.ts` — `declineIssue` triggers `scheduleDeclineDraft` (capture-mock op pipeline-grens).
- **Review-UI**: snapshot-test op de draft-card (klein, want shape vast).

### 10. Docs

- Update `packages/ai/src/agents/registry.ts` (taak 2).
- Update `docs/specs/agents.md` (als bestaat) met Communicator-entry.
- Update `vision-customer-communication.md` §7 met "Decision: aparte `outbound_drafts` tabel — see CC-004 spec for rationale".
- Update `vision-customer-communication.md` §10 #X (geen specifiek punt, dit is meer §7-implementatie).
- Update `sprints/backlog/README.md` met CC-004.
- README in `packages/ai/src/pipeline/outbound/` (nieuwe submap) — beschrijf de async-flow + waarschuwing over Vercel-serverless completion.

## Acceptatiecriteria

- [ ] Migration `outbound_drafts` toegepast en types geregenereerd.
- [ ] RLS op `outbound_drafts`: clients (rol=client) krijgen 0 rijen ongeacht query.
- [ ] Communicator-agent met prompt + `generateDeclineDraft` levert valide `{subject, body}` JSON op test-input.
- [ ] Communicator-agent staat in AGENT_REGISTRY met `status='live'` en juiste entrypoint.
- [ ] Bij `declineIssue` (CC-001 action) wordt `scheduleDeclineDraft` aangeroepen; mutation faalt NIET als draft-generatie faalt.
- [ ] Draft die `generating` is verschijnt in cockpit-inbox drafts-sectie met skeleton; na ~5-15s geüpdatet naar `pending_review` met content.
- [ ] PM kan draft goedkeuren-onveranderd → row in `client_questions` aangemaakt, draft `status='sent'` met `sent_message_id` link, klant ontvangt mail (CC-002 wired).
- [ ] PM kan draft bewerken (subject + body inline edit) → goedkeuren → identical flow, action genoteerd als `approved_edited`.
- [ ] PM kan draft afwijzen → status `rejected`, geen `sendQuestion`-call, geen mail.
- [ ] Failed-draft toont error in UI met regenerate-knop.
- [ ] Eindgebruiker-issue (geen klant-PM aan project) → decline triggert WEL het draft-record met `status='failed'` en duidelijke `generation_error` ("geen ontvanger"), of trigger schakelt zichzelf vooraf uit. Beide acceptabel mits PM het ziet.
- [ ] CC-002 notificatie verstuurd na approve+send (Optie B template `outbound-sent`).
- [ ] CC-002's automatische `feedback-declined`-mail uitgeschakeld (`pickTemplateForStatus('declined') → null`) zodat klant niet twee mails krijgt bij decline. Test verifieert: `declineIssueAction` veroorzaakt geen Resend-call vanuit CC-002's feedback-status-notify.
- [ ] Tests groen voor mutations, agent, schedule, action, integratie.
- [ ] Async-completion getest op Vercel preview vóór merge (zie risico's).
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:queries`, `npm run check:features` allemaal groen.
- [ ] CC-004 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                                                   | Mitigatie                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel serverless completion na response**: ruwe `Promise.then` na een server-action returnt wordt "frozen" op Vercel. | **Opgelost in design** (taak 5): `scheduleDeclineDraft` gebruikt `waitUntil()` uit `@vercel/functions` als eerste-keuze, geen Promise.then-trick. Acceptatiecriterium "Async-completion getest op Vercel preview" valideert. Fallback bij volume-issues: cron-job die `status='generating'`-rijen ouder dan 1min oppikt — pas instellen als monitoring het aantoont. |
| LLM (Haiku 4.5) genereert ongepaste content (te formeel, te casual, taal-fout) → PM moet alles editen.                   | Iteratie op prompt op basis van eerste 10 echte drafts. Houd `review_action='approved_edited'`-rate bij; als die boven ~50% blijft hangen na prompt-tuning, upgrade naar Sonnet 4.6 (één-regel-wijziging in `communicator.ts` + registry-entry). Review-gate maakt model-zwakte zichtbaar zonder dat klant het ziet.                                                 |
| Klant krijgt mail "we wijzen je verzoek af" zonder dat PM zorgvuldig heeft gelezen (auto-approve-temptation).            | Geen "auto-approve binnen 24u" v1. Drafts blijven hangen tot PM expliciet actie neemt. Acceptabel risk: lange-tail drafts blokkeren tijd, maar dat is beter dan slechte mail eruit.                                                                                                                                                                                  |
| Race: PM klikt approve, klant klikt eerder een nieuwe vraag op hetzelfde issue → conflict.                               | `sendQuestion` is idempotent op `(project_id, body, sender_profile_id, created_at)`-uniqueness niet — gewoon nieuwe rij, geen conflict.                                                                                                                                                                                                                              |
| Klant verbaast over outbound zonder dat hij iets heeft gevraagd.                                                         | Mail-template begint met "Je hebt onlangs aangevraagd: [issue title]" zodat context glashelder is. Geen "out of nowhere"-mail.                                                                                                                                                                                                                                       |
| `outbound_drafts` tabel groeit groot bij volume.                                                                         | Niet nu mitigeren; bij >10k rijen overweeg archive-strategie. Index op `(status)` waar `status='pending_review'` houdt review-query snel.                                                                                                                                                                                                                            |
| Knowledge-search-call faalt → geen snippets → draft minder gefundeerd.                                                   | Geaccepteerd risico v1; fallback is "prompt zonder snippets". Logging voor stats.                                                                                                                                                                                                                                                                                    |
| Communicator-agent gebruikt verkeerde projectnaam of klant-aanspraak.                                                    | Prompt-tunings + agent-input-validatie (Zod).                                                                                                                                                                                                                                                                                                                        |

## Niet in scope

- **Andere triggers** dan decline-reason: `in_progress`-update, `done`-celebration, weekly proactive update, manual "draft a note for project X"-button. Schema is generiek (`source_status_change` text-veld + `source_metadata` jsonb), follow-up sprint plakt nieuwe trigger-functies erbovenop zonder migration.
- **Edit met save-as-draft** (terugkomen later) — v1 = edit binnen approve-flow.
- **Verschillende AI-stijlen per klant** (casual vs formeel) — komt later met klant-profile-preferences.
- **Multi-language drafts** — v1 = NL only, prompt zegt expliciet "schrijf in Nederlands tenzij anders".
- **A/B-testing van draft-prompts** — geen analytics-infra v1.
- **AI-suggested decline_reason** zelf (CC-001 vraagt PM om reden zelf te typen) — out of scope; PM beslist scope, AI alleen formuleert tactvol.
- **Approve-and-schedule** ("verzend morgenochtend 9u") — geen scheduler v1.
- **Conversation-thread continuation** — outbound start altijd als nieuwe `client_questions`-root, niet als reply op iets bestaands. Klant kan wel daarna replyen → reguliere CC-001 + CC-002 flow.
- **Approve-multiple-batch** ("approve alle 5 drafts") — één-voor-één v1.

## Vision-alignment (samenvatting)

CC-004 is sprint 4/5 uit `vision-customer-communication.md` §12. Het sluit de feedback-loop: klant doet iets → PM beslist → AI verwoordt namens PM → PM controleert → klant krijgt antwoord. Combinatie met CC-001 (gate), CC-002 (notify) en CC-003 (badge) maakt dat klant-gerichte communicatie nu eind-tot-eind door één pipeline loopt — geen email-naast-portal-spaghetti.

Na CC-004 volgt CC-005 (per-project inbox-tab + onboarding-card) als afsluitende polish-sprint zonder nieuwe architectuur.
