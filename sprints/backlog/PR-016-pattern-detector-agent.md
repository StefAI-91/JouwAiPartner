# Micro Sprint PR-016: Pattern-Detector Agent

## Doel

De derde fase-5 agent: `pattern-detector` identificeert patronen in topic-data van afgelopen 30-60 dagen — terugkerende issues, lange-loop topics, klant-signalen die niet matchen met team-prio. Genereert een check-list van patterns met severity-tag; mens vinkt aan welke meegenomen worden in de rapport-patterns-sectie. Combineert rule-based features (heropens, lifecycle-time) met LLM-narrative.

## Requirements

| ID        | Beschrijving                                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-AI-040 | Agent `pattern-detector` in `packages/ai/src/agents/pattern-detector/` — register in registry                                                                                    |
| PR-AI-041 | Input: alle topics + events van afgelopen 30-60 dagen voor een project; statistical features (heropened topics, gemiddelde lifecycle-tijd, signal-counts)                        |
| PR-AI-042 | Output: array van patterns met `{ pattern: string ('Recurring'\|'Stale'\|'Mismatch'\|...), title, description, severity: 'low'\|'med'\|'high', supporting_topic_ids: string[] }` |
| PR-AI-043 | Model: Opus voor diepe pattern-analyse (max 1x/week per project — dure operatie)                                                                                                 |
| PR-AI-044 | Pipeline `packages/ai/src/pipeline/topics/detect-patterns.ts`: rule-based feature-extract → LLM narrative-write                                                                  |
| PR-AI-045 | DevHub editor (PR-012): knop "Detect patterns" → vult patterns-checklist                                                                                                         |
| PR-AI-046 | Patterns met `severity: high` zijn standaard aangevinkt; mens kan afvinken vóór publicatie                                                                                       |
| PR-AI-047 | Rule-based detectors (deterministisch): `RecurringPatternDetector`, `StalePatternDetector`, `SignalMismatchDetector`                                                             |
| PR-AI-048 | LLM krijgt rule-based features als input (niet raw topics) — voorkomt hallucinatie                                                                                               |

## Afhankelijkheden

- **PR-009** (events) — heropens-pattern detectie via `status_changed`-events
- **PR-011** + **PR-012** (rapport-editor met patterns-form)
- **PR-005** (signals) — voor mismatch-pattern (klant 🔥 + team niet prioritized)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Validatie-gate fase 4 → 5 — als rapporten weinig gelezen worden, prioriteer curator over pattern-detector

## Visuele referentie

- Geen aparte preview; integratie in patterns-form.tsx (PR-012)

## Taken

### 1. Rule-based detectors

- `packages/ai/src/agents/pattern-detector/detectors/`:

  ```typescript
  // recurring.ts
  export function detectRecurring(events: TopicEvent[]): PatternInput[] {
    // Topics waar status_changed van done → in_progress N keer in 30 dagen
    const reopens = groupByTopic(events).filter(
      (g) => countTransitions(g, "done", "in_progress") >= 2,
    );
    return reopens.map((g) => ({
      pattern: "Recurring",
      topicId: g.topicId,
      reopens_count: countTransitions(g, "done", "in_progress"),
      severity: g.reopens_count >= 3 ? "high" : "med",
    }));
  }

  // stale.ts — topics in awaiting_client_input >30 dagen zonder beweging
  // signal-mismatch.ts — topics met 🔥 must-have die >14 dagen niet prioritized zijn
  ```

### 2. LLM narrative-writer

- Agent ontvangt rule-based features → schrijft `title` + `description` voor elk pattern
- Voorbeeld: input `{ pattern: 'Recurring', topicId, reopens: 3 }` → output `{ title: "Publicatie-flow blijft regressies vertonen", description: "Topic 'Publicatie-flow' is 3x heropened in 6 weken — patroon wijst op onderliggende fragiliteit." }`

### 3. Pipeline

- `packages/ai/src/pipeline/topics/detect-patterns.ts`:

  ```typescript
  export async function detectPatterns(projectId: string, window: { from: string; to: string }) {
    const topics = await listTopics(projectId);
    const events = await getEventsForProject(projectId, window);
    const features = [
      ...detectRecurring(events),
      ...detectStale(topics, events),
      ...detectSignalMismatch(topics),
    ];
    const enriched = await enrichWithNarrative(features); // LLM call (Opus)
    return enriched;
  }
  ```

### 4. DevHub UI integratie

- Update `apps/devhub/src/components/reports/patterns-form.tsx` (PR-012):
  - Knop "Detect patterns" boven de form
  - Klik → Server Action `detectPatternsForReport(reportId)` → vult checklist met patterns
  - Per pattern: checkbox (default = true voor severity:high), titel (read-only), beschrijving (editable), "Verwijder"-knop
  - Op publish: alleen aangevinkte patterns gaan naar `patterns_section`

### 5. Server Action

- `apps/devhub/src/components/reports/actions/pattern-detector.ts`:

  ```typescript
  export async function detectPatternsForReport(reportId: string) {
    const report = await getReportById(reportId);
    if (!report) return { error: "Not found" };
    const patterns = await detectPatterns(report.project_id, {
      from: subtractDays(report.compiled_at, 60),
      to: report.compiled_at,
    });
    return { success: true, patterns };
  }
  ```

### 6. Throttle / cost-cap

- Max 1 detect-run per rapport (cache resultaat in client-side state of in `agent_suggestions`-tabel uit PR-018)
- Geen automatische triggers — alleen op aanvraag in editor

### 7. Tests

- Vitest unit-tests voor elke rule-based detector (8+ scenarios)
- Integration: 6 weken historische data van CAI → run pattern-detector → vergelijk met "Wat herhaalt zich"-sectie van Notion-doc (target: 80% overlap)

## Acceptatiecriteria

- [ ] PR-AI-040 t/m PR-AI-048: agent werkt end-to-end
- [ ] PR-AI-046: severity-high default-aangevinkt, mens kan afvinken
- [ ] PR-AI-047: rule-based detectors zijn deterministisch (geen LLM voor feature-extract)
- [ ] Accuracy ≥80%: severity:high-patterns matchen met handmatige bevindingen op test-set
- [ ] Token-cost binnen budget — Opus is duur, max 1x/week/project
- [ ] Type-check + lint slagen
- [ ] Vitest groen voor alle detectors

## Risico's

| Risico                                                    | Mitigatie                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Pattern-detector vindt false positives → klant verwarring | Severity-tag filtert; mens vinkt af; opt-in publicatie          |
| Opus-kosten lopen op                                      | Max 1 run per rapport; rule-based features doen het meeste werk |
| Detectors missen subtiele patronen die mens wel ziet      | Acceptabel — fase 5-doel is acceleratie, niet vervanging        |
| Rule-based detectors detecteren te veel triviale patronen | Severity-tier filtert "low" weg in v1; alleen med+high tonen    |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md` §10.3.3 (pattern-detector)
- PRD: §3.7 CAI's Notion-doc patterns als gold-standard
- CLAUDE.md: model-tier-policy (Opus voor diepe analyse)

## Vision-alignment

Vision §2.4 — pattern-detector vult de "AI als Account Manager"-rol verder in: identificeert wat een mens zou moeten zien, mens beslist wat gedeeld wordt.
