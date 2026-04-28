# 10. Fase 5 — AI-Acceleratie

## 10.1 Doel

AI-agents nemen het zware werk uit topic-curatie en rapport-schrijven, met **mens-in-de-loop** (gatekeeper-pattern uit vision-doc). Suggestie van clustering, narrative-noot en patterns-detectie. Mens reviewt en accepteert/wijzigt vóór publicatie.

**Ná deze fase weet de klant**: niets nieuws — de output ziet er hetzelfde uit als in fase 1-4.

**Ná deze fase weet het team**: "AI doet 70% van het werk, ik doe de resterende 30% review. Curatielast halveert."

## 10.2 Wat we lenen, van wie

| Bron                                                        | Wat we kopen                                             |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| **Eigen gatekeeper-pipeline** (`packages/ai/src/pipeline/`) | Mens reviewt AI-output, gestructureerde acceptance-flow  |
| **Productboard's insights-clustering**                      | Embedding-based grouping, maar beter geïmplementeerd     |
| **Linear's AI-features**                                    | Subtiele suggesties, niet aggressieve auto-actions       |
| **Eigen vision (verification before truth)**                | AI-output is voorstel, geen waarheid tot mens accepteert |

## 10.3 Drie AI-agents in deze fase

### 10.3.1 Agent: `topic-curator`

**Taak**: nieuwe issues clusteren onder bestaande topics of voorstellen om nieuw topic te maken.

**Input**:

- Een nieuw issue (title + description + labels)
- Lijst bestaande topics in hetzelfde project (title + description + linked issues)

**Output** (structured via `ai` SDK + Zod):

```typescript
{
  bestMatch: {
    topicId: string | null,        // null = geen match
    confidence: number,             // 0..1
    reasoning: string               // korte uitleg
  },
  alternativeMatches: Array<{
    topicId: string,
    confidence: number
  }>,
  newTopicSuggestion: {
    suggested: boolean,
    title: string,
    description: string,
    type: "bug" | "feature"
  } | null
}
```

**Trigger**:

- Direct na issue-creatie via Portal feedback
- Op aanvraag in DevHub Triage-queue
- In batch via cron (bv. dagelijks 7:00 voor nieuwe issues)

**Mens-review**:

- In Triage-queue: AI-suggestie met "78% match — accepteer / wijzig / nieuw topic"
- Mens kan altijd handmatig overschrijven
- Acceptance wordt gelogd in `topic_events` (event `agent_suggestion_accepted` of `_rejected`)

**Model-keuze**:

- **Sonnet** (uit CLAUDE.md model-tier-policy)
- Embeddings via Cohere embed-v4 voor semantic similarity
- Workflow: embed nieuwe issue → top-K nearest topics op embedding → Sonnet beoordeelt match-quality met context

### 10.3.2 Agent: `topic-narrator`

**Taak**: stelt narrative-noot voor in een wekelijks rapport, gebaseerd op topic-events van afgelopen week.

**Input**:

- Project-id
- Time-window (bv. afgelopen 7 dagen)
- Alle topic-events in dat venster
- Eerdere rapporten (laatste 2-3) als context

**Output**:

- Concept-tekst voor `narrative_note` (markdown, max 200 woorden)
- Drie alinea's: "Wat speelde", "Wat is opgelost", "Waar zit aandacht volgende week"

**Mens-review**:

- In rapport-editor: AI-concept verschijnt in tekstveld, mens past aan
- Acceptance-rate wordt gemeten (gewijzigd of as-is gepubliceerd?)

**Model-keuze**:

- **Sonnet** voor narrative writing
- **Haiku** voor scope-detection (welke events zijn belangrijk genoeg om te noemen)

### 10.3.3 Agent: `pattern-detector`

**Taak**: identificeert patronen in topic-data — terugkerende issues, lange-loop topics, klant-signalen die niet matchen met team-prio.

**Input**:

- Alle topics + events van afgelopen 30-60 dagen voor een project
- Statistical features (heropened topics, gemiddelde lifecycle-tijd, etc.)

**Output**:

```typescript
[
  {
    pattern: "Recurring",
    title: "Publicatie-flow blijft regressies vertonen",
    description: "Topic 'Publicatie-flow' is 3x heropened in 6 weken...",
    severity: "high"
  },
  ...
]
```

**Mens-review**:

- In rapport-editor: patterns verschijnen als check-list, mens vinkt aan welke meegenomen worden
- Patterns met `severity: high` zijn standaard aangevinkt

**Model-keuze**:

- **Opus** voor diepe pattern-analyse (incidenteel, max 1x/week per project)
- Combinatie van rule-based (heropens, lifecycle-time) en LLM voor narrative

### 10.3.4 Topic merge/split UI met AI-suggesties

Naast de drie agents komt een UI voor topic-merge en topic-split, met AI-input:

**Merge**:

- DevHub-page toont "Topics met overlap": agent stelt voor "Topic A en Topic B lijken 80% — mergen?"
- Mens accepteert → linked issues van Topic B verhuizen naar Topic A, Topic B wordt `wont_do` met reden "Gemerged in [Topic A]"

**Split**:

- Op topic-detail: knop "Split topic"
- Mens selecteert subset van linked issues → die verhuizen naar nieuw topic
- Origineel behoudt resterende issues
- Geen AI-betrokkenheid in split (te subjectief)

> Re-clustering is harder dan eerste clustering (sectie 3.9 noemt dit). Daarom merge/split bewust naar fase 5 — pas waardevol als topics genoeg geleefd hebben om te splitsen.

## 10.4 Out of scope (expliciet)

- ❌ Volledig autonome agent (auto-publiceren rapporten zonder review) — schendt verification-before-truth
- ❌ Agent die zelf signaal-knoppen interpreteert (bijv. "klant 👎 → wont_do automatisch")
- ❌ Cross-klant pattern-detection (welke topics komen bij meerdere klanten voor) → v2; vereist privacy-overweging
- ❌ Agent die klant-signaal voorspelt obv historie → niet doen, klant moet zelf signaleren
- ❌ Multi-language narrative (nederlands en engels parallel) → eerst zien of nodig
- ❌ Voice/audio input voor narrative-noot → later
- ❌ Agent voor sprint-planning → blijft mens-werk

## 10.5 Database-veranderingen

Beperkt — meeste werk zit in `packages/ai/`, niet in schema.

**Nieuwe kolom op `topic_events`**:

| Kolom       | Type                  | Toelichting                                               |
| ----------- | --------------------- | --------------------------------------------------------- |
| agent_id    | text NULL             | Welke agent heeft dit voorgesteld (`topic-curator`, etc.) |
| confidence  | real NULL             | 0..1                                                      |
| accepted_by | uuid FK profiles NULL | NULL = geen mens, zonder mens = niet doorgevoerd          |

**Nieuwe tabel `agent_suggestions`** (queue van pending suggesties):

| Kolom              | Type                                           |
| ------------------ | ---------------------------------------------- |
| id                 | uuid PK                                        |
| agent_id           | text                                           |
| target_type        | text (`topic`, `report_narrative`, `pattern`)  |
| target_id          | uuid                                           |
| suggestion_payload | jsonb                                          |
| confidence         | real                                           |
| created_at         | timestamptz                                    |
| reviewed_at        | timestamptz NULL                               |
| reviewed_by        | uuid FK profiles NULL                          |
| outcome            | text (`accepted`, `rejected`, `modified`) NULL |

> Maakt het mogelijk om agent-quality te meten over tijd (acceptance-rate per agent).

## 10.6 Code-organisatie

```
packages/ai/src/agents/
├── topic-curator/                  ← bestaande pattern uit `agents/registry.ts`
│   ├── index.ts
│   ├── prompt.ts
│   ├── schema.ts                   ← Zod output schema
│   └── README.md
├── topic-narrator/
│   ├── index.ts
│   └── ...
└── pattern-detector/
    ├── index.ts
    └── ...

packages/ai/src/pipeline/topics/    ← nieuwe submap
├── cluster-issue.ts                ← orchestratie: embedding + curator
├── generate-narrative.ts
└── detect-patterns.ts

packages/database/src/
├── queries/agent-suggestions.ts
└── mutations/agent-suggestions.ts

apps/devhub/src/features/topics/
└── components/
    ├── ai-suggestion-card.tsx      ← suggestie-banner
    ├── merge-suggestions-list.tsx
    └── pattern-checklist.tsx
```

## 10.7 Acceptatiecriteria

### topic-curator agent

- [ ] Bij nieuwe issue: agent suggereert binnen 30 sec een topic of "nieuw topic"
- [ ] Suggestie verschijnt in Triage-queue met confidence-score
- [ ] Mens kan suggestie accepteren met één klik, wijzigen met dropdown, of negeren
- [ ] Acceptance/rejection wordt gelogd in `agent_suggestions.outcome`
- [ ] Agent skipt issues met `topic_id` reeds gezet

### topic-narrator agent

- [ ] In rapport-editor: knop "Genereer concept" vult `narrative_note` met AI-output
- [ ] Mens kan tekst editen vóór publicatie
- [ ] Output is markdown, ≤200 woorden
- [ ] Bij gewijzigde tekst wordt diff opgeslagen voor model-improvement

### pattern-detector agent

- [ ] In rapport-editor: knop "Detect patterns" vult patterns-checklist
- [ ] Patterns met `severity: high` zijn standaard aangevinkt
- [ ] Mens kan patterns afvinken voordat publicatie

### Merge/split UI

- [ ] DevHub topic-list toont "Mogelijke merges (3)" als badge
- [ ] Klikken toont AI-suggesties voor merges met overlap-score
- [ ] Accept-actie verhuist linked issues, archiveert oud topic
- [ ] Split-actie kan een topic in 2+ delen, met issue-selectie per deel

### Cross-cutting

- [ ] Acceptance-rate ≥70% voor topic-curator
- [ ] Acceptance-rate ≥50% voor topic-narrator (lager omdat schrijfstijl persoonlijker is)
- [ ] Geen incident: AI clusterde verkeerd → klant zag rare topic
- [ ] AI-output past binnen prompt-cache-budget (zie [`docs/specs/vision-ai-native-architecture.md`](../vision-ai-native-architecture.md))

## 10.8 Verificatie-momenten in deze fase

### Tijdens implementatie

- Test scenario: 20 historische issues, agent suggereert clustering → vergelijk met handmatige versie van fase 1-3
- Test scenario: rapport-narrative gegenereerd → leesbaarheid-check door account manager
- Pattern-detection op CAI's data van afgelopen 6 weken — vergelijk met "Wat herhaalt zich"-sectie van Notion-doc

### Acht weken na go-live (acceptance-rate-meting)

| Metric                                                         | Drempel                                     |
| -------------------------------------------------------------- | ------------------------------------------- |
| topic-curator suggestie-acceptance                             | ≥70%                                        |
| topic-narrator narrative gepubliceerd as-is of klein gewijzigd | ≥50%                                        |
| pattern-detector severity:high accuracy                        | ≥80% (mens vindt het ook belangrijk)        |
| Curatielast tov fase 3                                         | gehalveerd (was ≤2u/klant/week, target ≤1u) |

**Als acceptance laag**: agent-prompt verbeteren of model-tier verhogen, niet model droppen.

## 10.9 Geschatte sprint-omvang

**2-3 sprints** (12-18 werkdagen). Verdeling:

- topic-curator: ~3-4 dagen (prompt + schema + integratie)
- topic-narrator: ~2-3 dagen
- pattern-detector: ~2-3 dagen
- Merge/split UI: ~3 dagen
- Triage-queue uitbreiding met AI-banner: ~1 dag
- `agent_suggestions` tabel + queries: ~1 dag
- Integration tests + acceptance metric tracking: ~2 dagen

> Grootste risico op uitloop: prompt-engineering voor consistente output. Begin met de meest gestructureerde agent (curator → schema-driven) voor minste prompt-iteratie.

## 10.10 Risico's in fase 5

| Risico                                                                | Mitigatie                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Agent geeft slechte clusteringen → team negeert                       | Track acceptance-rate; <50% = pause agent + prompt-rewrite                                    |
| Agent kost te veel tokens → onhoudbare costs                          | Prompt-caching toevoegen; Haiku voor goedkope passes                                          |
| Mens-review wordt rubber-stamp ("ja" zonder kijken)                   | UI dwingt te clicken op confidence; <60% confidence vereist tekst-input                       |
| Pattern-detector vindt false positives                                | Severity-tag filtert; mens vinkt af, opt-in publicatie                                        |
| Narrative klinkt te "AI-achtig"                                       | Voorbeeld-rapporten van vorige fases als few-shot context                                     |
| Privacy: agent ziet data van meerdere klanten in één run              | Nooit cross-klant; één run per project, geen batching over klanten                            |
| Topic-curator stelt mergebare topics voor die team al heeft afgewezen | Track rejections; agent leert "dit is afgewezen, niet opnieuw voorstellen"                    |
| Productie-incident: agent registreert verkeerd topic-event            | Audit-events met `agent_id` + `accepted_by` — onduidelijke events kunnen worden teruggedraaid |

## 10.11 Wat na fase 5

Als alle gates groen zijn:

- v2: multi-stakeholder voting (per-user signalen)
- v2: comments per topic
- v2: cross-klant pattern-detection (met privacy-controle)
- v2: notificaties (email digest, in-app)
- v2: SLA-tracking per topic
- v2: rapport-templates (sprint-einde, maand, ad-hoc)

> Volledige v2-scope is nu out-of-scope; pas defineren als fase 1-5 hebben gewerkt.
