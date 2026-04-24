# Sprint 038: Follow-up Drafter agent (MCP-first)

## Doel

Na menselijke verificatie van een meeting genereert een nieuwe agent (**Follow-up Drafter**, Sonnet) per externe contactpersoon een drafted follow-up email. Deze drafts worden opgeslagen in een nieuwe tabel `meeting_followup_drafts` en zijn op te halen via een MCP-tool. In Claude Desktop bewerken Stef/Wouter de draft; de gecorrigeerde versie wordt via een tweede MCP-tool terug opgeslagen. Deze correcties zijn labeled data voor prompt-iteratie.

**Scope:** agent + DB + 2 MCP-tools. Geen UI in de cockpit. Geen automatisch verzenden. Alleen externe contactpersonen (geen interne follow-ups).

## Requirements

| ID       | Beschrijving                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-080   | Follow-up Drafter draait NA menselijke verificatie van een meeting (`status = verified`), niet direct na extractie                                    |
| AI-081   | Agent genereert **één draft per externe contactpersoon** die een actie of vervolgafspraak heeft; contacten zonder actie krijgen geen draft            |
| AI-082   | Context-bundel bevat: meeting-transcript, bestaande extracties, laatste 10 verified emails met contactpersoon, laatste 5 meetings zelfde org          |
| AI-083   | Context-window is begrensd op 6 maanden terug OF sinds start van gelinkt project (kortste)                                                            |
| AI-084   | Draft bevat: aanhef, besproken punten (kort), expliciete vervolgstappen/vragen gericht aan deze persoon, afsluiting                                   |
| AI-085   | Taal en toon van draft stemmen af op eerder emailverkeer met deze persoon; default is Nederlands                                                      |
| AI-086   | Meeting zonder externe deelnemers of zonder externe acties → agent slaat geen drafts op en logt reden                                                 |
| AI-087   | Agent vult `source_extraction_ids[]` met exact welke actie-extracties in de draft zijn verwerkt (audit trail)                                         |
| AI-088   | Agent vult `agent_version` (string) zodat prompt-iteraties herleidbaar zijn                                                                           |
| DATA-040 | Nieuwe tabel `meeting_followup_drafts` met RLS (authenticated-permissive, consistent met bestaande tabellen)                                          |
| DATA-041 | `body_draft` is immutable na creatie; correcties komen in apart veld `body_final`                                                                     |
| DATA-042 | `status`-enum: `draft`, `corrected`, `sent`, `dismissed`                                                                                              |
| FUNC-080 | MCP-tool `get_followup_drafts` leest drafts op basis van `meeting_id` of `organization_id` (scoped, verified meetings only)                           |
| FUNC-081 | MCP-tool `save_followup_correction` schrijft `body_final` + `corrected_by` + `corrected_at`, zet `status = corrected`                                 |
| FUNC-082 | Pipeline-stap voegt Follow-up Drafter toe aan de review-verification flow (trigger bij status-wijziging naar verified)                                |
| RULE-020 | Als meeting wordt un-verified (terug naar draft/rejected), blijven bestaande drafts staan met `status = dismissed` en worden niet opnieuw gegenereerd |
| RULE-021 | Bij opnieuw verifiëren van dezelfde meeting wordt NIET opnieuw gegenereerd als er al drafts bestaan voor die `meeting_id`                             |
| EDGE-020 | Externe contactpersoon zonder email-adres in de DB → draft wordt aangemaakt met `recipient_email = null` en `recipient_name` gevuld                   |
| EDGE-021 | Context-bundel die max-context van Sonnet overschrijdt → agent kapt emails/meetings af (oudste eerst) en logt hoeveel er zijn overgeslagen            |

## Bronverwijzingen

- Strategie: `docs/specs/use-cases-and-extractions.md` — use-case B2 (meeting net afgelopen → actie-mails draften)
- Vision: `docs/specs/vision-ai-native-architecture.md` — Communicator-agent rol, database-als-communicatiebus principe
- Extractor-output: `packages/ai/src/validations/extractor.ts` — input-schema voor drafter
- Pipeline: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` — hier hangt de nieuwe stap aan
- MCP pattern: `packages/mcp/src/tools/` — voorbeeld tool-implementaties

## Context

### Probleem

Na elke klantmeeting moet er een follow-up mail uit naar minimaal één externe contactpersoon: welke afspraken zijn gemaakt, welke acties liggen bij hen, welke vragen staan open. Nu gebeurt dat volledig handmatig. Reviewer leest meeting-extracties, opent gmail, typt samenvatting + acties. Dit kost ~10-15 minuten per meeting, is foutgevoelig (iets vergeten), en wordt bij drukte overgeslagen — waardoor acties blijven liggen en het vertrouwen bij de klant verslechtert.

De data om een goede draft te maken is er al: Extractor levert acties + eigenaren, Summarizer levert samenvatting, er zijn eerdere emails en meetings. Er ontbreekt alleen één agent die dit materiaal combineert tot een persoonlijke draft — en een plek om die drafts te bewaren en te bewerken.

### Oplossing

Draai de Follow-up Drafter als extra stap in de bestaande pipeline, direct na menselijke verificatie. Output landt in een nieuwe tabel. Claude Desktop leest via MCP, bewerking gaat via een tweede MCP-tool terug naar de DB. Geen UI in cockpit in deze sprint — dat komt pas als de kwaliteit bewezen is.

**Waarom MCP-first en niet UI-first:**

1. Prompt-kwaliteit onbekend — eerst itereren, dan pas UI
2. Elke bewerking in Claude Desktop is gratis labeled data
3. Als we later een UI bouwen, hangt hij aan dezelfde MCP-tools → geen migratie
4. Handmatige bewerking via Claude Desktop is voor Stef/Wouter al de natuurlijke flow

**Waarom na verification en niet direct:**

- Acties zijn pas betrouwbaar na menselijke review. Draft gebaseerd op foute extractie is waardeloos en creëert wantrouwen.
- Bij volume van ~10-20 meetings/week is de extra latency (uren tot review) geen probleem.

### Architectuur

```
┌────────────────────────────────────────────────┐
│ Reviewer klikt "Verify" op meeting             │
└───────────────┬────────────────────────────────┘
                │ status = verified
                ▼
┌────────────────────────────────────────────────┐
│ Trigger (pipeline-stap of DB trigger/hook)    │
│  - Check: heeft meeting externe deelnemers?    │
│  - Check: bestaan al drafts voor deze meeting? │
│  - Zo nee: Run Follow-up Drafter               │
└───────────────┬────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│ buildFollowupContext(meetingId)                │
│  - meeting + extractions                       │
│  - laatste 10 emails per externe contactpers.  │
│  - laatste 5 meetings zelfde org               │
│  - project-samenvatting (indien gelinkt)       │
└───────────────┬────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│ Follow-up Drafter agent (Sonnet)               │
│ Output: draft[] (één per externe contactpers.) │
└───────────────┬────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────┐
│ insertFollowupDrafts → meeting_followup_drafts │
│  - body_draft (immutable)                      │
│  - status = draft                              │
│  - source_extraction_ids[]                     │
│  - agent_version                               │
└────────────────────────────────────────────────┘

Later (gebruiker):

Claude Desktop → MCP get_followup_drafts → toon drafts
Claude Desktop (na bewerking) → MCP save_followup_correction
                                → body_final, status = corrected
```

### Schema

```sql
create table meeting_followup_drafts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  recipient_person_id uuid references people(id),
  recipient_name text not null,
  recipient_email text,
  subject text not null,
  body_draft text not null,
  body_final text,
  status text not null default 'draft'
    check (status in ('draft','corrected','sent','dismissed')),
  source_extraction_ids uuid[] not null default '{}',
  agent_version text not null,
  reasoning text,
  created_at timestamptz not null default now(),
  corrected_at timestamptz,
  corrected_by uuid references profiles(id),
  sent_at timestamptz
);

create index on meeting_followup_drafts (meeting_id);
create index on meeting_followup_drafts (recipient_person_id);
create index on meeting_followup_drafts (status);

alter table meeting_followup_drafts enable row level security;
create policy "authenticated read" on meeting_followup_drafts
  for select using (auth.role() = 'authenticated');
create policy "service role write" on meeting_followup_drafts
  for all using (auth.jwt() ->> 'role' = 'service_role');
```

### Files touched

| Bestand                                                         | Wijziging                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `supabase/migrations/NNNN_meeting_followup_drafts.sql`          | Nieuwe migratie met tabel + indexes + RLS                                                     |
| `packages/database/src/types/database.ts`                       | Regenereren na migratie                                                                       |
| `packages/database/src/queries/followup-drafts.ts`              | `getFollowupDraftsByMeeting`, `getFollowupDraftsByOrganization`                               |
| `packages/database/src/mutations/followup-drafts.ts`            | `insertFollowupDrafts`, `saveFollowupCorrection`, `markFollowupSent`, `dismissFollowupDrafts` |
| `packages/ai/src/agents/followup-drafter.ts`                    | Nieuwe agent (Sonnet) + system prompt + Zod schema                                            |
| `packages/ai/src/validations/followup-drafter.ts`               | `FollowupDrafterOutputSchema`                                                                 |
| `packages/ai/src/pipeline/build-followup-context.ts`            | Context-builder (meeting + emails + eerdere meetings + project)                               |
| `packages/ai/src/pipeline/run-followup-drafter.ts`              | Orchestrator: trigger + context + agent + insert                                              |
| `apps/cockpit/src/actions/review.ts`                            | Trigger naar `run-followup-drafter` bij `verify` action                                       |
| `packages/mcp/src/tools/get-followup-drafts.ts`                 | Nieuwe MCP-tool                                                                               |
| `packages/mcp/src/tools/save-followup-correction.ts`            | Nieuwe MCP-tool                                                                               |
| `packages/mcp/src/server.ts`                                    | Registratie van beide tools                                                                   |
| `packages/ai/__tests__/agents/followup-drafter.test.ts`         | Agent-payload + output-validatie tests                                                        |
| `packages/ai/__tests__/pipeline/build-followup-context.test.ts` | Context-builder tests (window, scoping, afknippen)                                            |
| `packages/mcp/__tests__/tools/followup.test.ts`                 | MCP-tool tests                                                                                |

**Niet geraakt:** Gatekeeper, Summarizer, Extractor zelf. Geen cockpit-UI in deze sprint.

## Taken

- [ ] Migratie `meeting_followup_drafts` schrijven + RLS
- [ ] `npx supabase db push` + `npm run types:db` (database-types regenereren)
- [ ] Queries in `packages/database/src/queries/followup-drafts.ts`
- [ ] Mutations in `packages/database/src/mutations/followup-drafts.ts`
- [ ] Zod-schema voor agent-output in `packages/ai/src/validations/followup-drafter.ts`
- [ ] `buildFollowupContext(meetingId)` in `packages/ai/src/pipeline/build-followup-context.ts` — haalt alle 4 bronnen op, begrensd op 6 maanden of project-start
- [ ] Follow-up Drafter agent in `packages/ai/src/agents/followup-drafter.ts` (Sonnet, `generateObject`, prompt-cache op system prompt)
- [ ] `runFollowupDrafter(meetingId)` orchestrator in `packages/ai/src/pipeline/run-followup-drafter.ts` — idempotent op basis van `meeting_id`
- [ ] Aanroep vanuit `verify`-actie in `apps/cockpit/src/actions/review.ts` (fire-and-await; volgt bestaande Slack-fix-pattern van commit `23d97b9`)
- [ ] MCP-tool `get_followup_drafts` (parameters: `meeting_id` of `organization_id`, optioneel `status`-filter)
- [ ] MCP-tool `save_followup_correction` (parameters: `draft_id`, `body_final`, optioneel `notes`)
- [ ] MCP-tool registratie in `packages/mcp/src/server.ts`
- [ ] Tests: agent-payload, context-builder window-cutoff, idempotency, MCP-tool input-validatie
- [ ] Backfill-script: run drafter op laatste 20 verified meetings om prompt te kalibreren
- [ ] Prompt-iteratie: 2-3 ronden na feedback van Stef + Wouter op backfill

## Acceptatiecriteria

- [ ] [AI-080] Drafter draait **alleen** na `status = verified`; hook in `verify`-actie getest met een draft-meeting die verified wordt
- [ ] [AI-081] Meeting met 2 externe deelnemers die beide een actie hebben levert 2 rows in `meeting_followup_drafts`
- [ ] [AI-082] Context-builder-test bevestigt: meeting + extractions + ≤10 emails + ≤5 meetings + project-summary zitten in de payload naar Sonnet
- [ ] [AI-083] Context-builder-test bevestigt: emails ouder dan 6 maanden OF ouder dan project-start worden weggelaten
- [ ] [AI-084] Drafter-output bevat aanhef, besproken punten, vervolgstappen, afsluiting (structurele assertie op output)
- [ ] [AI-085] Als eerder emailverkeer Engels was → draft in Engels (prompt-gedrag getoetst met fixture)
- [ ] [AI-086] Meeting zonder externe deelnemer → 0 drafts, log-regel met reden
- [ ] [AI-087] Elke draft-row heeft niet-lege `source_extraction_ids[]` die bestaande `extractions.id` waarden bevatten
- [ ] [AI-088] `agent_version` is niet-leeg string per draft-row
- [ ] [DATA-040] Migratie draait groen; tabel + indexes + RLS aanwezig; anon-role kan niet lezen, authenticated wel
- [ ] [DATA-041] Update van `body_draft` via MCP-tool is niet mogelijk (alleen `body_final` wordt gezet)
- [ ] [DATA-042] `status` accepteert alleen de 4 waarden; check-constraint aanwezig
- [ ] [FUNC-080] `get_followup_drafts` met `meeting_id` retourneert drafts; met onbekend id retourneert `[]`; alleen drafts van verified meetings zijn zichtbaar
- [ ] [FUNC-081] `save_followup_correction` zet `body_final`, `corrected_by`, `corrected_at` en `status = corrected`; heraanroep overschrijft `body_final` maar `body_draft` blijft intact
- [ ] [FUNC-082] Handmatige test: meeting verifiëren in cockpit → binnen 30s rows in `meeting_followup_drafts`
- [ ] [RULE-020] Meeting terug naar `rejected` → drafts krijgen `status = dismissed` (via trigger of actie-hook)
- [ ] [RULE-021] Drafter dubbel triggeren voor dezelfde `meeting_id` creëert geen tweede set rows (idempotent)
- [ ] [EDGE-020] Fixture met externe deelnemer zonder email → draft heeft `recipient_email = null` maar wel `recipient_name`
- [ ] [EDGE-021] Fixture met 50 eerdere emails → drafter-output succesvol, log bevestigt afgekapt op 10

## Risico's en aandachtspunten

- **Prompt-kwaliteit onbekend.** Daarom backfill + iteratie ingebouwd vóór productie-gebruik. Succescriterium: Stef/Wouter schatten "minder dan 3 min bewerking per draft" na 2 prompt-rondes.
- **Sonnet-kosten.** ~1 draft per externe persoon per meeting → bij 20 meetings/week en gemiddeld 2 contacten = 40 Sonnet-calls/week. Acceptabel; monitoren via `mcp_queries`-achtige telemetrie (kan later).
- **Context-overload bij drukke klanten.** 10 emails + 5 meetings kan voor actieve klanten >50k tokens zijn. Mitigatie: EDGE-021 kapt af, oudste eerst. Meten of de gekozen limieten werken.
- **Un-verify → dismissed.** Zorg dat de hook op status-wijziging getest is, anders blijven foute drafts onterecht bruikbaar.
- **Serverless termination.** Volgt het pattern van commit `23d97b9`: `await` de hele pipeline-aanroep in de verify-actie, niet fire-and-forget, anders stopt Vercel de functie vóór de drafter klaar is.
- **RLS is permissief voor authenticated** — dezelfde lijn als `tasks`. Fine-grained scoping hoort bij de portal-rollout en is uit scope hier.
- **Recipient-email privacy.** In deze sprint staan email-adressen plain-tekst in `recipient_email`. Bij portal-rollout moet dit scoped worden. Documenteren in spec, niet oplossen.

## Verificatie

### Unit

```bash
npm run test       # ai + mcp workspaces
npm run type-check
npm run lint
```

### End-to-end (handmatig, na merge)

1. Kies een recent geverifieerde meeting met 1-2 externe deelnemers en open acties.
2. Zet hem terug naar `draft`, dan weer naar `verified` via cockpit review.
3. Binnen 30s verschijnt een rij per externe deelnemer in `meeting_followup_drafts` (check via Supabase SQL editor).
4. Open Claude Desktop. Vraag: "Geef de follow-up drafts voor meeting \<id\>".
5. Bevestig dat MCP-tool de rows teruggeeft met volledige `body_draft`.
6. Bewerk één draft in Claude Desktop; roep `save_followup_correction` aan met de bewerkte tekst.
7. Verifieer in DB: `body_final` gevuld, `body_draft` onveranderd, `status = corrected`, `corrected_by` = ingelogde user.
8. Un-verify de meeting → alle drafts status = `dismissed`.
9. Re-verify dezelfde meeting → geen dubbele drafts; rij-telling gelijk.

### Goed-resultaat-signalen

- Na backfill op 20 meetings: ≥80% drafts door Stef/Wouter beoordeeld als "bruikbaar met < 3 min bewerking".
- Geen uncaught errors in pipeline-logs.
- `meeting_followup_drafts` vult zich op na elke nieuwe verificatie, zonder handmatige trigger.
- Taal van drafts volgt eerder emailverkeer (steekproef: 3 Engelse klanten → Engels, 3 Nederlandse → Nederlands).

## Geraakt door deze sprint

- `supabase/migrations/NNNN_meeting_followup_drafts.sql` (nieuw)
- `packages/database/src/types/database.ts` (regenereren)
- `packages/database/src/queries/followup-drafts.ts` (nieuw)
- `packages/database/src/mutations/followup-drafts.ts` (nieuw)
- `packages/ai/src/agents/followup-drafter.ts` (nieuw)
- `packages/ai/src/validations/followup-drafter.ts` (nieuw)
- `packages/ai/src/pipeline/build-followup-context.ts` (nieuw)
- `packages/ai/src/pipeline/run-followup-drafter.ts` (nieuw)
- `apps/cockpit/src/actions/review.ts` (hook toevoegen)
- `packages/mcp/src/tools/get-followup-drafts.ts` (nieuw)
- `packages/mcp/src/tools/save-followup-correction.ts` (nieuw)
- `packages/mcp/src/server.ts` (tool-registratie)
- `packages/ai/__tests__/agents/followup-drafter.test.ts` (nieuw)
- `packages/ai/__tests__/pipeline/build-followup-context.test.ts` (nieuw)
- `packages/mcp/__tests__/tools/followup.test.ts` (nieuw)
- `docs/specs/use-cases-and-extractions.md` (context)
- `sprints/backlog/sprint-038-followup-drafter-agent.md` (dit bestand)
