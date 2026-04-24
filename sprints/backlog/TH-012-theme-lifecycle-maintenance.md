# Micro Sprint TH-012: Theme lifecycle maintenance — consolidation, saturation, reliability

## Doel

Theme-catalogus gezond houden na TH-011 aanzet. LLMs neigen naar over-segmentation — zonder onderhouds-laag groeit de catalogus rommelig, raken thema's redundant of drift-achter, en hebben we geen meetbaar signaal of de catalogus "compleet genoeg" is voor de platform-scope. Deze sprint levert drie onderhouds-bouwstenen, bewust losgekoppeld van de runtime-pipeline, zodat ze niet per meeting draaien maar periodiek.

1. **Wekelijkse consolidation cron** — embeddings-based similarity-scan over alle verified themes detecteert paren/clusters die semantisch te dicht bij elkaar liggen en stelt merges voor. Admin keurt goed via een dedicated admin-pagina `/dev/themes/consolidation`; één klik remapt `meeting_themes` + `extraction_themes` en archiveert de gemergede theme. Volgt de Braun & Clarke Phase 4 ("Reviewing Themes") die nu volledig ontbreekt.
2. **Saturation-metric dashboard** — tracked hoeveel nieuwe emerging themes er per tijdsvenster ontstaan en hoeveel er de review-gate halen. Dalende trend = catalogus rijpt; blijvende stijging = we missen nog thema's. Zichtbaar als widget op `/dev/themes/dashboard` (nieuw) en als entry in `/agents` observability.
3. **Reliability re-run delta** — draai Theme-Detector tweemaal op een steekproef van meetings, bereken Jaccard-overlap op identified_themes + cosine similarity op relevance quotes. Drift-score landt in hetzelfde dashboard als metric. Als drift stijgt weet je dat de prompt of het model instabiel is geworden.

Plus: **merge-mutation audit** (`theme_merges` tabel) voor reversibiliteit. Elke merge is een administratieve handeling die soms teruggedraaid moet kunnen worden; een audit-rij met `from_theme_id`, `into_theme_id`, `executed_by`, `rolled_back_at` geeft die grip.

**Waarom nu en niet met TH-011.** TH-011 fixt de extract-time scoping — de primaire kwaliteitshefboom. Zonder TH-011 is elke onderhoudslaag ruis op ruis. Maar zodra TH-011 landt bouwt de catalogus zich sneller op (de substantialiteitsregel + frequentere proposals in meeting-review), en krijg je binnen weken tot maanden zichtbare drift zonder deze laag. Eén sprint latentie is acceptabel; twee niet.

**Bewust niet in scope van deze sprint:** niveau 2/3 speaker-attributie, ThemeNarrator agent (cross-meeting synthese), chunking voor lange meetings. Elk van die zit in de backlog na TH-012.

Eerste tastbare resultaat: op maandag-ochtend opent de admin `/dev/themes/consolidation` en ziet 2-4 merge-voorstellen uit het nacht-run: `MCP Capabilities` + `MCP Tooling` worden samen voorgesteld met side-by-side matching_guides, cosine-similarity score, en een aantal overlappende meeting-matches. Eén klik "Merge into MCP Capabilities" — `meeting_themes` en `extraction_themes` rijen worden geremapt, `MCP Tooling` krijgt `status='archived'`, audit-rij in `theme_merges`. Op `/dev/themes/dashboard` toont de saturation-curve dat er de afgelopen 30 dagen 5 nieuwe emerging themes waren waarvan 3 verified zijn, 1 rejected, 1 pending — trend-lijn zakt licht = catalogus rijpt.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-240 | Tabel `theme_merges(id uuid PK, from_theme_id uuid NOT NULL, into_theme_id uuid NOT NULL, executed_by uuid NOT NULL, executed_at timestamptz default now(), meeting_themes_remapped int default 0, extraction_themes_remapped int default 0, rolled_back_at timestamptz nullable, rollback_reason text nullable)` — audit van elke merge, ondersteunt rollback (soft) via timestamp                                                                                   |
| DATA-241 | Foreign keys op `theme_merges`: `from_theme_id → themes(id) ON DELETE SET NULL`, `into_theme_id → themes(id) ON DELETE SET NULL`, `executed_by → profiles(id) ON DELETE SET NULL`. Behoud ook bij theme-verwijdering                                                                                                                                                                                                                                                  |
| DATA-242 | Index `theme_merges_from_idx` op `from_theme_id`, `theme_merges_into_idx` op `into_theme_id`, `theme_merges_executed_at_idx` desc op `executed_at`                                                                                                                                                                                                                                                                                                                    |
| DATA-243 | RLS enabled + permissive policy (zelfde patroon als `meeting_themes`): alle authenticated users read, write enforced in server actions via admin-check                                                                                                                                                                                                                                                                                                                |
| DATA-244 | Kolom `themes.embedding vector(1024)` nullable — embedding van `name + description + matching_guide` concat voor similarity-scanning. Index `themes_embedding_idx USING ivfflat (embedding vector_cosine_ops) WITH (lists=10)` — lists laag (10) want we verwachten max ~200 themes in V1. Update-trigger bij theme-wijzigingen (of re-embed on-demand in de cron)                                                                                                    |
| DATA-245 | Tabel `theme_reliability_runs(id uuid PK, meeting_id uuid NOT NULL, run_a_output jsonb NOT NULL, run_b_output jsonb NOT NULL, jaccard_identified_themes numeric NOT NULL, cosine_relevance_quote numeric NOT NULL, model text NOT NULL, prompt_version text NOT NULL, executed_at timestamptz default now())` — opslag van reliability-metingen. FK `meeting_id → meetings(id) ON DELETE CASCADE`. Index op `executed_at` desc                                        |
| DATA-246 | Tabel `theme_saturation_snapshots(id uuid PK, snapshot_date date NOT NULL UNIQUE, new_emerging_count int, verified_count int, rejected_count int, archived_count int, total_verified_themes int, total_meetings_processed int, captured_at timestamptz default now())` — dagelijks/wekelijks historische snapshot voor trend-visualisatie. Index op `snapshot_date` desc                                                                                              |
| AI-240   | Embedding-helper `embedThemeForSimilarity(theme)` in `packages/ai/src/embeddings.ts` — reuse bestaande Cohere embed-v4 wrapper, `inputType: "search_document"`, concat `${emoji} ${name}\n${description}\n${matching_guide}`, cache op theme.id + updated_at key                                                                                                                                                                                                      |
| FUNC-290 | Weekly cron route `apps/cockpit/src/app/api/cron/theme-consolidation/route.ts` — GET handler met CRON_SECRET bearer-auth (zelfde patroon als `/api/cron/email-sync`), `maxDuration = 300`. Logica: (a) fetch alle verified themes, (b) ensure embeddings actueel (re-embed waar nodig), (c) pairwise cosine similarity, (d) paren boven `MERGE_PROPOSAL_THRESHOLD=0.85` opslaan als proposals in memory + writeback naar `theme_merge_proposals` working-tabel        |
| DATA-247 | Tabel `theme_merge_proposals(id uuid PK, from_theme_id uuid NOT NULL, into_theme_id uuid NOT NULL, similarity numeric NOT NULL, overlapping_meeting_count int default 0, proposed_at timestamptz default now(), status text default 'pending' CHECK (status IN ('pending','accepted','dismissed','superseded')), decided_by uuid nullable, decided_at timestamptz nullable)` — pending merge-suggesties uit de cron. FK's naar themes + profiles                      |
| FUNC-291 | Cron-logica schaal-veilig: `MAX_THEMES_PER_RUN = 500` (ruim boven verwachte catalogus-grootte), `MAX_PROPOSALS_PER_RUN = 20` (dump rest naar volgende week), skip paren die al als `accepted`/`dismissed` in `theme_merge_proposals` staan. Idempotent: dezelfde run op dezelfde input produceert dezelfde proposals                                                                                                                                                  |
| FUNC-292 | Vercel cron schedule in `apps/cockpit/vercel.json`: `{ "path": "/api/cron/theme-consolidation", "schedule": "0 3 * * 1" }` — maandagochtend 03:00 UTC (04:00/05:00 NL), zodat reviewers maandagochtend hun proposals klaar zien staan                                                                                                                                                                                                                                 |
| FUNC-293 | Mutation `mergeThemes({ fromThemeId, intoThemeId, executedBy })` in `packages/database/src/mutations/theme-merges.ts` — transactioneel: (a) update alle `meeting_themes.theme_id` van `from` → `into`, (b) update alle `extraction_themes.theme_id` van `from` → `into` (handle composite PK conflicts met ON CONFLICT DO NOTHING), (c) merge `theme_mention_count`, (d) set `themes.status='archived'` op from, (e) insert `theme_merges` audit-rij met remap-counts |
| FUNC-294 | Mutation `rollbackThemeMerge({ mergeId, rolledBackBy, reason })` — soft rollback: set `theme_merges.rolled_back_at` + `rollback_reason`, un-archive `from_theme`. **Geen** automatische data-remap terug (te risicovol); admin moet handmatig beslissen of `meeting_themes` ook teruggedraaid moet worden. V1: admin-only read via query + handmatige SQL. Auto-remap = V2                                                                                            |
| FUNC-295 | Server Action `acceptThemeMergeProposalAction({ proposalId })` — haalt proposal op, roept `mergeThemes` aan, zet proposal status `accepted`, revalidate `/dev/themes/consolidation` + `/themes`. Admin-only                                                                                                                                                                                                                                                           |
| FUNC-296 | Server Action `dismissThemeMergeProposalAction({ proposalId, reason? })` — zet proposal status `dismissed` + `decided_by` + `decided_at`. Geen merge, maar voorkomt dat dezelfde paar elke week opnieuw opduikt. De cron skipt `dismissed` proposals bij nieuwe runs (FUNC-291)                                                                                                                                                                                       |
| FUNC-297 | Query `listPendingMergeProposals()` in `packages/database/src/queries/theme-merges.ts` — retourneert pending proposals met beide theme-details (name, emoji, description, matching_guide, mention_count) + similarity + overlapping_meeting_count, gesorteerd op similarity desc                                                                                                                                                                                      |
| FUNC-298 | Query `getThemeMergeHistory(limit=50)` — retourneert uitgevoerde merges uit `theme_merges` met theme-names (via JOIN), executor-email, timestamps, remap-counts, rollback-status                                                                                                                                                                                                                                                                                      |
| UI-340   | Nieuwe route `apps/cockpit/src/app/(dashboard)/dev/themes/consolidation/page.tsx` — admin-only, toont pending proposals + history. Per proposal: side-by-side kaart met beide themes (emoji, name, description, matching_guide), similarity-score, overlapping-meetings-count, 2 knoppen "Accepteer merge" en "Negeer". Onder: tabel met history-rijen (uitvoerder, datum, counts, rollback-mogelijkheid)                                                             |
| UI-341   | Nieuwe route `apps/cockpit/src/app/(dashboard)/dev/themes/dashboard/page.tsx` — admin-only, toont saturation-trend (line-chart: new_emerging_count per week, laatste 12 weken) + reliability-drift (line-chart: gemiddelde jaccard-overlap per meeting over laatste 30 reliability runs) + snelle stats: totaal themes, % verified, laatste cron-run timestamp. Hergebruik bestaande chart-component (Tremor of shadcn) — niet zelf bouwen                            |
| FUNC-300 | Daily saturation-snapshot cron `/api/cron/theme-saturation-snapshot/route.ts` — dagelijks om 02:00 UTC: tel emerging/verified/rejected/archived counts over de afgelopen 24u, schrijf rij naar `theme_saturation_snapshots`. Idempotent via UNIQUE op `snapshot_date`. Schedule: `0 2 * * *`                                                                                                                                                                          |
| FUNC-301 | Reliability re-run batch-script `scripts/theme-reliability-check.ts` — CLI: `--sample-size=10 --meeting-source=recent                                                                                                                                                                                                                                                                                                                                                 | random`. Selecteer meetings, roept Theme-Detector 2× aan (zelfde input, verse run), bereken Jaccard over identified_theme_ids set + cosine op concat relevance_quotes. Schrijf rij naar `theme_reliability_runs`. Console-output: gemiddelde Jaccard + drift-indicatie |
| FUNC-302 | Wekelijkse cron `/api/cron/theme-reliability-weekly/route.ts` — draait elke zondagnacht 01:00 UTC, `--sample-size=5 --meeting-source=recent`. Bewust klein: reliability checks zijn duur (2× Sonnet 4.6 per meeting). Schedule: `0 1 * * 0`                                                                                                                                                                                                                           |
| UI-342   | Op bestaande `/agents` observability pagina: Theme-Detector entry krijgt een sub-metric "Reliability (Jaccard)" met de laatste 4 wekelijkse gemiddeldes. Klik → opent `/dev/themes/dashboard`. Kleine integratie, geen nieuwe page-structuur                                                                                                                                                                                                                          |
| SEC-240  | Alle nieuwe admin-pagina's (`/dev/themes/consolidation`, `/dev/themes/dashboard`) + alle nieuwe server actions: admin-whitelist check zoals TH-010 SEC-220. Non-admins 403 op route + `{error:'forbidden'}` op actions                                                                                                                                                                                                                                                |
| SEC-241  | Cron-endpoints (`theme-consolidation`, `theme-saturation-snapshot`, `theme-reliability-weekly`): CRON_SECRET bearer auth. Fail met 401 zonder juiste header, geen side effects                                                                                                                                                                                                                                                                                        |
| EDGE-240 | Cron-run op een catalogus van 0 of 1 verified themes: geen proposals mogelijk, return `{ success: true, proposals: 0, reason: 'insufficient_catalog' }`. Geen errors, geen lege rijen in `theme_merge_proposals`                                                                                                                                                                                                                                                      |
| EDGE-241 | Cron vindt een paar met similarity 0.95+ maar één van beide is al `status='archived'` van een eerdere merge: skip het paar, log info. Archived themes zijn read-only; merge naar een archived doel maakt geen zin                                                                                                                                                                                                                                                     |
| EDGE-242 | Merge-conflict: `meeting_themes` rij bestaat al voor de `into_theme_id` op dezelfde meeting. ON CONFLICT DO NOTHING respecteert deze; mention_count wordt dan gemerget maar rij niet gedupliceerd. Test expliciet                                                                                                                                                                                                                                                     |
| EDGE-243 | Reliability-script op een meeting die zojuist is verwijderd tussen sample en run: skip, log warning, ga door met de volgende. Nooit crashen op een sample-run                                                                                                                                                                                                                                                                                                         |
| EDGE-244 | Saturation-snapshot die botst met bestaande `snapshot_date`: UNIQUE constraint vangt dit. UPSERT-logica (ON CONFLICT UPDATE) zodat handmatige re-run gewoon werkt                                                                                                                                                                                                                                                                                                     |
| RULE-110 | `mergeThemes` mag nooit automatisch draaien, alleen via expliciete admin-actie. Cron mág proposals aanmaken maar nooit accepteren. Dit is een doelbewuste bottleneck: thema's mergen heeft semantische impact die een LLM niet autonoom moet maken                                                                                                                                                                                                                    |
| RULE-111 | Reliability-drift alerting: als `theme_reliability_runs` gemiddelde Jaccard onder 0.6 zakt over 4 weken, log een console-warning + zichtbare rode badge op `/dev/themes/dashboard`. Geen email/slack in V1 — observable maar niet alarmerend                                                                                                                                                                                                                          |

## Bronverwijzingen

- Research: Braun & Clarke Phase 4 "Reviewing Themes" — zie thread-research naar LLM thematic analysis (arxiv 2511.14528, 2502.01620)
- Research: Initial Thematic Saturation (ITS) als validatie-metriek — Springer Q&Q 2024, `s11135-024-01950-6`
- Research: Multi-LLM Thematic Analysis with Dual Reliability Metrics — arxiv 2512.20352 (Cohen's Kappa + cosine similarity)
- Code: `apps/cockpit/vercel.json` — bestaande cron-configuratie + schedule-patroon
- Code: `apps/cockpit/src/app/api/cron/email-sync/route.ts` — bearer-auth patroon + maxDuration + structured response
- Code: `apps/cockpit/src/app/api/ingest/fireflies/route.ts` — idem, plus batch-loop patroon
- Code: `scripts/batch-detect-themes.ts` (uit TH-011) — CLI + concurrency patroon voor nieuwe `theme-reliability-check.ts`
- Code: `packages/ai/src/embeddings.ts` — Cohere wrapper hergebruiken voor `embedThemeForSimilarity`
- Code: `packages/database/src/mutations/meeting-themes.ts` + `extraction-themes.ts` — patroon voor nieuwe `theme-merges.ts` mutations
- Code: `apps/cockpit/src/app/(dashboard)/agents/` — bestaande observability-pagina voor UI-342 integratie
- Vision: `docs/specs/vision-ai-native-architecture.md` — Curator/Analyst agents; deze sprint bouwt de fundering zonder de agents zelf (die volgen later)
- Sprint TH-011 — context-afhankelijkheid, TH-012 gaat pas in nadat TH-011 is gemerged

## Context

### Waarom apart van TH-011

TH-011 verbetert de kwaliteit van het creëren van theme-matches. TH-012 verbetert de kwaliteit van de catalogus-zelf na verloop van tijd. Deze twee hebben verschillende snelheden: TH-011 is realtime (per-pipeline-run), TH-012 is periodiek (wekelijks/dagelijks). Ze mengen zou de sprint-scope verdubbelen en de testbaarheid verslechteren.

Belangrijker: TH-011 verandert hoe themes ontstaan, TH-012 optimaliseert hoe ze evolueren. Je kunt TH-011 zonder TH-012 draaien (catalogus groeit dan rommelig maar werkend); TH-012 zonder TH-011 is zinloos (merging van een rommelige extract-time pool is slechts oppervlakte-werk).

### Consolidation — waarom embeddings en niet LLM-voor-elke-paar

Naïef idee: LLM per thema-paar laten beoordelen of ze mergen. Kosten + tijd: ~N² LLM-calls, bij 50 themes zijn dat 1225 calls per run. Prohibitively duur. Embeddings-oplossing: one-shot 50 embeddings (~$0.001 totaal), daarna lokale cosine similarity matrix (instant). Alleen paren boven threshold komen als proposal door; LLM is optioneel voor een "second opinion" op de top-5, maar dat is V2.

Threshold `0.85` is een educated guess: onderstaand krijg je te veel noise, erboven mis je subtiele duplicaten. Bij eerste runs kalibreren op basis van hoeveel proposals de admin daadwerkelijk accepteert vs dismisst.

### Consolidation-algoritme — detail

```ts
// Per run:
1. Fetch alle themes met status='verified' — N themes
2. Voor elke theme zonder recente embedding: embed(name + description + matching_guide)
3. Bereken N×N cosine similarity matrix (excl. diagonaal)
4. Filter: pairs met sim > 0.85 én geen bestaande 'accepted'/'dismissed' proposal tussen hen
5. Voor elke candidate-pair: tel overlapping meetings (meeting_themes JOIN)
6. Sorteer op sim desc, top 20
7. Schrijf naar theme_merge_proposals (status='pending')
8. Als oude 'pending' proposal niet meer in top 20: status='superseded'
```

Pair-ordening (`from` vs `into`): de theme met meer meeting_themes-rijen is het "dominant" thema en wordt `into`. Bij gelijke count: oudste theme wins (lagere created_at). De admin kan de richting in de UI omdraaien alvorens te accepteren (optioneel, V2).

### Saturation-metric — interpretatie

De snapshots leveren een dagelijkse teller. De trend over weken/maanden vertelt het verhaal:

- **Stijgende `new_emerging_count` trend**: de catalogus vangt nog steeds nieuwe thema's — domein-verkenning is gaande. Niet rijp.
- **Dalende trend naar ~0**: saturation bereikt — catalogus dekt wat we bespreken. Rijping.
- **Plotselinge piek**: er is een nieuwe soort onderwerp toegetreden tot de conversaties (nieuwe klant-segment, nieuwe tech-trend). Mogelijke actie: handmatig review of de catalogus een expliciete sub-sectie nodig heeft.
- **Hoge `rejected_count`**: Theme-Detector produceert veel valse proposals. Signaal om prompt te tunen.

Het dashboard toont ruwe trends; interpretatie blijft menselijk. V2 kan automatische alerts toevoegen ("saturation gedetecteerd, catalogus lijkt rijp" of "spike in rejections, prompt-review aanbevolen"). V1: observable only.

### Reliability — welke metric en waarom Jaccard

Twee identieke runs van de Theme-Detector op dezelfde input zouden idealiter identieke output geven. In praktijk: LLMs hebben sampling-variatie. Hoeveel is acceptabel?

- **Jaccard-overlap op identified_theme_ids**: directe maat voor "kiest hij dezelfde thema's". 1.0 = identiek, 0.0 = totaal anders. Onze drempel: <0.6 gemiddeld over 4 weken = drift alert.
- **Cosine similarity op relevance_quote embedding**: zelfs als dezelfde themes gekozen worden, kan de ondersteunende quote anders zijn. Deze metric zegt "hoe consistent is de reasoning". Losser; informatie-only in V1.

Sample-size = 5 meetings per week is klein maar voldoende voor trend-detectie over tijd. Groter wordt duur (2× Sonnet 4.6 per meeting × N).

### UI-opzet `/dev/themes/consolidation`

```
┌─────────────────────────────────────────────────────────┐
│ Theme Consolidation                                      │
│ Laatste cron-run: ma 2026-05-04 03:12 UTC               │
│ 3 pending proposals · 12 history-rijen                  │
├─────────────────────────────────────────────────────────┤
│ PENDING PROPOSALS                                        │
│                                                          │
│ ┌─────────────────────┐   ┌─────────────────────┐       │
│ │ 🤖 MCP Tooling      │   │ 🤖 MCP Capabilities │       │
│ │ 3 meetings          │ ↔ │ 8 meetings          │       │
│ │ matching_guide: ... │   │ matching_guide: ... │       │
│ └─────────────────────┘   └─────────────────────┘       │
│ similarity: 0.91 · overlap: 2 meetings                  │
│ [Accepteer merge (→ Capabilities)]  [Negeer]            │
│                                                          │
│ ... meer pending proposals ...                           │
├─────────────────────────────────────────────────────────┤
│ HISTORY (laatste 12)                                     │
│ ma 04-05 · Stef · Tooling → Capabilities · 3 rijen     │
│ za 02-05 · Wouter · Pricing → Pricing Strategy · ...    │
└─────────────────────────────────────────────────────────┘
```

Sober UI, geen animaties, geen cosmetica. Dit is een dev-tool. Tailwind + shadcn voldoende, geen design-werk nodig.

### Merge-mutation — transactie-veiligheid

De merge is idempotent en atomair. Supabase Postgres ondersteunt transacties via RPC's. We schrijven de merge als een SQL RPC `merge_themes(from_id uuid, into_id uuid, executor uuid) RETURNS json`:

```sql
BEGIN;
  UPDATE meeting_themes SET theme_id = into_id WHERE theme_id = from_id;
  INSERT INTO extraction_themes (extraction_id, theme_id, confidence, created_at)
    SELECT extraction_id, into_id, confidence, created_at
    FROM extraction_themes WHERE theme_id = from_id
    ON CONFLICT (extraction_id, theme_id) DO NOTHING;
  DELETE FROM extraction_themes WHERE theme_id = from_id;
  UPDATE themes SET theme_mention_count = (
    SELECT COUNT(DISTINCT meeting_id) FROM meeting_themes WHERE theme_id = into_id
  ) WHERE id = into_id;
  UPDATE themes SET status = 'archived' WHERE id = from_id;
  INSERT INTO theme_merges (from_theme_id, into_theme_id, executed_by, ...)
    VALUES (from_id, into_id, executor, ...);
COMMIT;
```

De TS-mutation `mergeThemes` wraps deze RPC. Als een stap faalt rolt alles terug. Audit-rij pas aan het eind, zodat een failed merge geen half-audit achterlaat.

### Reliability-check — implementatie-detail

```ts
// scripts/theme-reliability-check.ts (pseudo):
for (const meeting of samples) {
  const input = await buildDetectorInput(meeting.id);
  const [runA, runB] = await Promise.all([
    runThemeDetector(input),
    runThemeDetector(input), // zelfde input, verse run — LLM sampling-variatie maakt ze anders
  ]);
  const jaccard = computeJaccard(
    new Set(runA.identified_themes.map((t) => t.themeId)),
    new Set(runB.identified_themes.map((t) => t.themeId)),
  );
  const cosine = await computeCosine(
    concat(runA.identified_themes.map((t) => t.relevance_quote)),
    concat(runB.identified_themes.map((t) => t.relevance_quote)),
  );
  await insertReliabilityRun({ meeting_id, runA, runB, jaccard, cosine, ... });
}
```

Parallel 2×-run is kostentechnisch onhandig maar pragmatisch — geen nieuwe infra, gewoon twee aanroepen. Als kosten een issue worden kan V2 dit serialiseren met een randomization-seed.

## Deliverables

- [ ] `supabase/migrations/YYYYMMDDHHMMSS_theme_merges.sql` — `theme_merges` tabel + indexes + RLS (DATA-240..243)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_themes_embedding.sql` — `themes.embedding vector(1024)` kolom + ivfflat index (DATA-244)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_theme_reliability_runs.sql` — tabel (DATA-245)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_theme_saturation_snapshots.sql` — tabel + UNIQUE constraint op snapshot_date (DATA-246)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_theme_merge_proposals.sql` — working-tabel (DATA-247)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_merge_themes_rpc.sql` — atomische `merge_themes(from_id, into_id, executor)` RPC
- [ ] `packages/database/src/types/database.ts` — regenereerd
- [ ] `packages/ai/src/embeddings.ts` — `embedThemeForSimilarity(theme)` helper (AI-240)
- [ ] `packages/database/src/mutations/theme-merges.ts` — `mergeThemes`, `rollbackThemeMerge` (FUNC-293, FUNC-294)
- [ ] `packages/database/src/queries/theme-merges.ts` — `listPendingMergeProposals`, `getThemeMergeHistory` (FUNC-297, FUNC-298)
- [ ] `packages/database/src/queries/theme-saturation.ts` — helpers om dashboard-data op te halen (laatste 12 weken snapshots, trend-berekening)
- [ ] `packages/database/src/queries/theme-reliability.ts` — helpers voor dashboard (laatste N runs, gemiddelde Jaccard)
- [ ] `packages/database/src/mutations/theme-reliability.ts` — `insertReliabilityRun`
- [ ] `packages/database/src/mutations/theme-saturation.ts` — `upsertSaturationSnapshot`
- [ ] `packages/database/src/mutations/theme-merge-proposals.ts` — `upsertMergeProposal`, `supersedeOldProposals`, `updateProposalStatus`
- [ ] `apps/cockpit/src/app/api/cron/theme-consolidation/route.ts` — weekly cron (FUNC-290, FUNC-291, FUNC-292)
- [ ] `apps/cockpit/src/app/api/cron/theme-saturation-snapshot/route.ts` — daily cron (FUNC-300)
- [ ] `apps/cockpit/src/app/api/cron/theme-reliability-weekly/route.ts` — weekly cron (FUNC-302)
- [ ] `apps/cockpit/vercel.json` — 3 nieuwe cron-entries (FUNC-292, FUNC-300, FUNC-302)
- [ ] `scripts/theme-reliability-check.ts` — CLI-script voor ad-hoc runs (FUNC-301)
- [ ] `package.json` — npm-script `theme-reliability-check`
- [ ] `apps/cockpit/src/actions/theme-merges.ts` — `acceptThemeMergeProposalAction`, `dismissThemeMergeProposalAction` (FUNC-295, FUNC-296)
- [ ] `apps/cockpit/src/app/(dashboard)/dev/themes/consolidation/page.tsx` — admin-guarded server component (UI-340)
- [ ] `apps/cockpit/src/app/(dashboard)/dev/themes/consolidation/client.tsx` — proposals list + history table + action handlers
- [ ] `apps/cockpit/src/app/(dashboard)/dev/themes/dashboard/page.tsx` — saturation + reliability dashboard (UI-341)
- [ ] `apps/cockpit/src/app/(dashboard)/dev/themes/dashboard/client.tsx` — chart-rendering
- [ ] `apps/cockpit/src/app/(dashboard)/agents/` — Theme-Detector entry krijgt Jaccard-sub-metric + link naar dashboard (UI-342)
- [ ] `apps/cockpit/src/components/themes/merge-proposal-card.tsx` — herbruikbare side-by-side proposal-kaart
- [ ] Documentatie:
  - [ ] `docs/dependency-graph.md` — auto-regeneratie
  - [ ] `CLAUDE.md` — Environment Variables sectie bijwerken als er nieuwe env-vars zijn (geen verwacht, CRON_SECRET bestaat al)
  - [ ] `sprints/done/TH-matrix.md` — TH-012 rij
- [ ] Tests (nieuwe + updates):
  - [ ] Nieuw: `packages/database/__tests__/mutations/theme-merges.test.ts` — `mergeThemes` remap-correctheid, ON CONFLICT path (EDGE-242), audit-rij, rollback soft-update
  - [ ] Nieuw: `packages/database/__tests__/queries/theme-merges.test.ts` — `listPendingMergeProposals` shape + sortering, history-query met JOIN
  - [ ] Nieuw: `packages/ai/__tests__/embeddings.test.ts` sectie — `embedThemeForSimilarity` contract, caching-gedrag
  - [ ] Nieuw: `apps/cockpit/__tests__/api/cron/theme-consolidation.test.ts` — auth, idempotence, top-20 cap, superseded-logic, EDGE-240/241
  - [ ] Nieuw: `apps/cockpit/__tests__/api/cron/theme-saturation-snapshot.test.ts` — tellingen kloppen, UPSERT op conflict (EDGE-244)
  - [ ] Nieuw: `apps/cockpit/__tests__/api/cron/theme-reliability-weekly.test.ts` — sample-selection, run-pair creatie (mock Theme-Detector), Jaccard berekening
  - [ ] Nieuw: `apps/cockpit/__tests__/actions/theme-merges.test.ts` — accept/dismiss admin-only, state-transitie, revalidatePath
  - [ ] Nieuw: `apps/cockpit/__tests__/app/dev-themes-consolidation.test.tsx` — rendert pending + history, empty-states, admin-gate
  - [ ] Nieuw: `apps/cockpit/__tests__/app/dev-themes-dashboard.test.tsx` — charts renderen met mock-data, rode badge onder drift-threshold

## Acceptance criteria

- Alle migrations draaien schoon op lokale Supabase (`supabase db reset`).
- `npm run type-check` + `npm run lint` groen.
- Alle nieuwe tests groen. Integratietests mét lokale Supabase draaien voor merge-mutation, skippen zonder DB.
- `themes.embedding` kolom zichtbaar via `\d themes`, ivfflat index aanwezig.
- Handmatige cron-trigger op `/api/cron/theme-consolidation` met geldige CRON_SECRET: response `{success: true, themes_scanned, proposals_created, ...}` binnen 5 minuten.
- Met 2 verified themes die overlappend matching_guide hebben (test-seed): cron schrijft proposal weg in `theme_merge_proposals` met similarity > 0.85.
- `/dev/themes/consolidation` toont proposal side-by-side, accepteer-knop werkt → `theme_merges` audit-rij + `from_theme.status='archived'` + alle `meeting_themes` rijen remapt.
- Saturation-snapshot cron + dashboard: dagelijkse rij komt binnen, line-chart toont trend over afgelopen 12 weken (ook met 1-2 rijen leesbaar).
- Reliability-run script: `npm run theme-reliability-check -- --sample-size=2` draait zonder errors op 2 recente meetings, Jaccard wordt berekend + opgeslagen.
- `/agents` pagina toont Theme-Detector entry met nieuwe Reliability sub-metric.
- Admin-gate: non-admin gets 403 op alle nieuwe `/dev/themes/*` routes + `{error:'forbidden'}` op alle nieuwe actions.
- Cron-gate: call zonder CRON_SECRET → 401, geen writes.
- Geen regressie: TH-011 pipeline draait nog identiek, theme detail page werkt, meeting review werkt.

## Handmatige test-stappen

1. `supabase db reset` → alle 6 TH-012 migrations draaien.
2. Via Supabase Studio: `\d theme_merges`, `\d theme_merge_proposals`, `\d theme_reliability_runs`, `\d theme_saturation_snapshots` → kolommen + indexes kloppen. `\d themes` → `embedding` kolom zichtbaar.
3. Seed 2 verified themes met bewust overlappende matching_guides (bv. "MCP Tooling" en "MCP Capabilities") + 1 clear-andere ("Hiring Strategy"). Genereer embeddings via helper.
4. Call `/api/cron/theme-consolidation` met geldige CRON_SECRET header. Response binnen 5 sec: `{ success: true, themes_scanned: 3, proposals_created: 1 }`.
5. Query `SELECT * FROM theme_merge_proposals;` → 1 pending rij tussen de MCP-themes, similarity > 0.85.
6. Open `/dev/themes/consolidation` als admin → side-by-side kaart zichtbaar met beide themes + matching_guides + similarity-score.
7. Klik **Accepteer merge** → succes-toast. Check DB: `SELECT status FROM themes WHERE id = '<from_id>';` → `archived`. `SELECT count(*) FROM meeting_themes WHERE theme_id = '<into_id>';` → verhoogd. `SELECT * FROM theme_merges ORDER BY executed_at DESC LIMIT 1;` → audit-rij met `meeting_themes_remapped` count.
8. Herhaal consolidation-cron: proposal verdwijnt uit pending (superseded of al accepted — check logica).
9. Dismiss-flow: seed nog een paar dicht-bij-elkaar themes, cron draait opnieuw, proposal verschijnt. Klik **Negeer** → `theme_merge_proposals.status='dismissed'`. Cron draait opnieuw → dit paar wordt overgeslagen (FUNC-291).
10. Saturation-snapshot: handmatige trigger `/api/cron/theme-saturation-snapshot` met CRON_SECRET → rij in `theme_saturation_snapshots` voor vandaag met actuele counts.
11. Tweede trigger diezelfde dag: UPSERT werkt, geen duplicaat.
12. Open `/dev/themes/dashboard` → line-chart met minstens 1 data-punt zichtbaar. Met meer seed-snapshots (handmatige insert voor verleden dagen): trend-lijn.
13. Reliability: `npm run theme-reliability-check -- --sample-size=2` op 2 recente verified meetings. Console-output toont Jaccard per meeting + gemiddelde. DB: `SELECT * FROM theme_reliability_runs;` → 2 rijen.
14. Open `/dev/themes/dashboard` → reliability-card toont de 2 runs, gemiddelde Jaccard berekend, geen rode drift-badge (als > 0.6).
15. Seed een extra reliability-run met artificieel lage Jaccard (~0.3) 4× — dashboard toont rode drift-badge (RULE-111).
16. `/agents` pagina: Theme-Detector entry heeft een "Reliability (Jaccard)" sub-metric met recent gemiddelde.
17. Non-admin log-in: `/dev/themes/consolidation` → 403. `/dev/themes/dashboard` → 403. `acceptThemeMergeProposalAction` direct aanroepen → `{error:'forbidden'}`.
18. Cron zonder auth: `curl /api/cron/theme-consolidation` (geen header) → 401, geen writes in DB na deze call.
19. Vercel cron schedule-check: deploy naar preview, bevestig dat Vercel dashboard de 3 nieuwe crons oppikt met de juiste schedules.

## Out of scope

- **Automatisch mergen zonder admin-klik** — bewust weggehouden (RULE-110). Zelfs bij similarity 0.99 blijft dit een mens-beslissing. Automatische merge kan in V3 als telemetry bewijst dat > 99% van accepted proposals ook door humans zouden zijn geaccepteerd.
- **ThemeNarrator agent** — per-theme cross-meeting synthese (analoog aan project-summarizer met timeline, context, briefing). Aparte sprint; TH-011's `themes.structured_content` kolom is al voorbereid.
- **Slack/email alerts bij drift of saturation** — V1 is observable-only via dashboard. Pas als de admin daadwerkelijk zegt "ik check dit niet vaak genoeg" toevoegen.
- **LLM-based "second opinion" bij merge-proposals** — embeddings alleen is voldoende voor V1. Als merge-accuracy onder 70% zakt (admin dismisst meer dan accepteert) → V2 met LLM-second-pass op top-N.
- **Auto-remap bij rollback van een merge** — soft-rollback (timestamp) volstaat. Automatisch terugdraaien van `meeting_themes` + `extraction_themes` is risicovol en vereist admin-begrip; handmatige SQL-aanpak is V1-pragmatisch.
- **Trend-voorspelling** — "over 6 weken is de catalogus saturated" of vergelijkbare statistische modellen zijn out of scope. Dashboard toont historische data, interpretatie is menselijk.
- **Chunking van lange meetings voor Theme-Detector** — research-blinde vlek, maar pragmatisch uitgesteld. Alleen oppakken als de praktijk aantoont dat lange strategy-sessies thema's missen.
- **Intra-speaker theme-attributie (niveau 2/3)** — per-extraction `source_voice`. Aparte toekomstige sprint.
- **Cross-source theme-coupling** — themes linken aan emails, documents, ondersteuning-tickets. Deels afhankelijk van email-extractions-theme-werk dat een eigen polymorphic datamodel vereist. Niet nu.
- **UI voor het handmatig swappen van `from`/`into` voor een merge-proposal** — V1 gebruikt mention-count heuristiek + oudste-wint. Admin kan voor nu een proposal dismissen en handmatig de gewenste merge via SQL doen. V2 kan directional-toggle toevoegen.
