# Micro Sprint PR-015: Topic-Narrator Agent

## Doel

De tweede fase-5 agent: `topic-narrator` stelt automatisch een concept voor de `narrative_note` van een wekelijks rapport voor, gebaseerd op topic-events van de afgelopen 7 dagen. In de DevHub rapport-editor (PR-012) verschijnt een knop "Genereer concept" → AI-output verschijnt in het narrative-veld → mens past aan en publiceert. Acceptance-rate (gewijzigd vs as-is) wordt gemeten.

## Requirements

| ID          | Beschrijving                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PR-AI-020   | Agent `topic-narrator` in `packages/ai/src/agents/topic-narrator/` — register in registry                                               |
| PR-AI-021   | Input: project_id, time_window (default 7d), alle topic-events in venster, laatste 2-3 rapporten als few-shot context                   |
| PR-AI-022   | Output: markdown narrative-noot, max 200 woorden, drie alinea's: "Wat speelde", "Wat is opgelost", "Waar zit aandacht volgende week"    |
| PR-AI-023   | Model: Sonnet voor narrative; Haiku voor scope-detection (welke events zijn relevant genoeg om te noemen)                               |
| PR-AI-024   | Pipeline `packages/ai/src/pipeline/topics/generate-narrative.ts` — orchestreert event-fetch, scope-detect, narrative-write              |
| PR-AI-025   | DevHub editor (PR-012): knop "Genereer concept" → vult `narrative_note`-textarea met output                                             |
| PR-AI-026   | Bij gewijzigde tekst (vergelijk pre/post-edit): diff opgeslagen voor model-improvement (in `agent_suggestions.outcome` PR-018 metadata) |
| PR-AI-027   | Output gaat door Zod-validatie (markdown structuur, woord-cap)                                                                          |
| PR-AI-028   | Klein knop "Regenereer" voor opnieuw runnen met andere context (bv. force-include topic X)                                              |
| PR-RULE-060 | Hard-regel: geen auto-publicatie — agent vult alleen veld in, mens drukt op publish                                                     |

## Afhankelijkheden

- **PR-009** (events) — narrative bouwt op topic-events
- **PR-011** (rapporten DB) — narrative wordt in draft opgeslagen
- **PR-012** (DevHub editor) — UI-integratie

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Validatie-gate fase 4 → 5 (§5.4): "klant haalt rapport actief op ≥50%". Als rapporten weinig gelezen worden, dan is narrative-AI niet de prioriteit — fase 5 sprint herzien.

## Visuele referentie

- Geen aparte preview; integratie in bestaande `narrative-note-editor.tsx` (PR-012)

## Taken

### 1. Agent

- `packages/ai/src/agents/topic-narrator/`:

  ```
  ├── index.ts        # main runNarrator function
  ├── prompt.ts       # system prompt + few-shot
  ├── schema.ts       # Zod output (markdown, woord-cap)
  ├── scope-filter.ts # Haiku call voor relevante events
  └── README.md
  ```

- `index.ts`:

  ```typescript
  export async function runTopicNarrator(input: {
    project_id: string;
    time_window: { from: string; to: string };
    recentReports: ReportSummary[];
  }) {
    // 1. Fetch alle events in window
    const events = await getEventsForProject(input.project_id, input.time_window);
    // 2. Scope-filter via Haiku (welke events zijn klant-relevant)
    const scoped = await filterRelevantEvents(events);
    // 3. Generate narrative via Sonnet
    const narrative = await generateNarrative({
      events: scoped,
      recentReports: input.recentReports,
    });
    return narrative;
  }
  ```

### 2. Schema

- Markdown output, validate met Zod:
  - `z.string().min(50).max(2000)` (rough byte-cap voor 200 woorden + markdown overhead)
  - Optioneel: regex om drie `##` headings te verifiëren (voor structuur)

### 3. Pipeline

- `packages/ai/src/pipeline/topics/generate-narrative.ts`:
  - Orchestratie
  - Logging via `agent_suggestions` (PR-018) of fallback `topic_events`

### 4. Prompt

- System: "Je bent een Account Manager die schrijft voor klanten. Toon: rustig, transparant, niet over-positief. Schrijfstijl: editorial, korte alinea's. Drie secties verplicht: 'Wat speelde', 'Wat is opgelost', 'Waar zit aandacht volgende week'."
- Few-shot: 2-3 historische narrative-noten van CAI's Notion-doc als gold-standard
- Anti-AI-style guardrails: "Vermijd 'Ik ben een AI', 'In conclusie', 'In summary'. Schrijf alsof je een Manager was."

### 5. DevHub UI integratie

- Update `apps/devhub/src/components/reports/narrative-note-editor.tsx`:
  - Voeg knop "Genereer concept" boven de textarea
  - Klik → Server Action `generateNarrative(reportId)` → vult textarea met output
  - Knop "Regenereer" als alternatief
  - Diff-tracking: bij save/publish, vergelijk pre/post; log naar agent_suggestions.outcome

### 6. Server Action

- `apps/devhub/src/components/reports/actions/narrator.ts`:

  ```typescript
  "use server";
  export async function generateNarrative(reportId: string) {
    const client = await getServerClient();
    const report = await getReportById(reportId, client);
    if (!report) return { error: "Not found" };
    if (report.status !== "draft") return { error: "Only draft" };
    const recent = await listPublishedReports(report.project_id, { limit: 3 });
    const narrative = await runTopicNarrator({
      project_id: report.project_id,
      time_window: { from: subtractDays(report.compiled_at, 7), to: report.compiled_at },
      recentReports: recent,
    });
    return { success: true, narrative };
  }
  ```

### 7. Tests

- Vitest: agent-output validatie (mock LLM)
- Integration: maak rapport-draft, run generator, check narrative_note gevuld
- Acceptance-rate test: 5 historische rapporten (uit fase 4) → run agent → vergelijk met menselijke narrative manueel

## Acceptatiecriteria

- [ ] PR-AI-020/021: agent geregistreerd, input-schema correct
- [ ] PR-AI-022: output is markdown, ≤200 woorden, drie secties
- [ ] PR-AI-023: model-keuze klopt (Sonnet voor schrijven, Haiku voor scope)
- [ ] PR-AI-024: pipeline orchestreert events → narrative
- [ ] PR-AI-025/026: DevHub-knop werkt, diff-tracking opgeslagen
- [ ] PR-AI-027: Zod-validatie strict
- [ ] PR-AI-028: regenereer-knop produceert ander resultaat (verschillende sampling)
- [ ] PR-RULE-060: geen auto-publish
- [ ] Acceptance-rate ≥50% (gewijzigd of as-is) op test-set
- [ ] Lighthouse-impact + token-cost binnen budget
- [ ] Type-check + lint slagen

## Risico's

| Risico                                                      | Mitigatie                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Narrative klinkt te "AI-achtig"                             | Few-shot van menselijke voorbeelden; anti-AI-style guardrails in prompt                 |
| Mens-edit doet 90% van het werk → agent voegt weinig waarde | Track acceptance-rate; <30% as-is = prompt-rewrite of agent droppen                     |
| Agent verzint events die niet bestonden                     | Strict input: alleen events uit DB, geen "alsof"-context; Zod-validatie + factuur-check |
| Narrative is niet in juiste taal (Engels i.p.v. Nederlands) | System prompt expliciet "Schrijf in het Nederlands"; few-shot allemaal Nederlands       |
| Token-cost                                                  | Cache via prompt-caching (zie vision); Haiku voor scope-detect bespaart tokens          |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md` §10.3.2 (topic-narrator)
- PRD: §5.4 fase 4 → 5 gates (klant-engagement met rapporten)
- CAI's Notion-doc als few-shot bron

## Vision-alignment

Vision §2.4 — narrator is de letterlijke "AI als Account Manager"-interpretatie: helpt schrijven, mens reviewt, klant ziet eindproduct. Gatekeeper-pattern.
