# Extractie-paden: Summarizer vs. Extractor-agents

> Status: Fase 1 actief. Spec maakt de architectuur expliciet zodat toekomstige
> sprints weten wat het eindbeeld is.

## Probleem (aanleiding)

De Summarizer produceerde tot en met sprint 035 zowel een lopende samenvatting
als impliciete extracties: `**Besluit:** …`, `**Risico:** …`, `**Behoefte:** …`
inline in de `kernpunten`, plus een aparte `vervolgstappen`-lijst. Daarnaast
draait de `risk-specialist` als aparte agent die risks _ook al_ naar de
`extractions`-tabel schrijft.

Gevolg: **dubbele extractiepaden voor risico** (Summarizer-labels + Risk
Specialist) en een Summarizer die twee dingen tegelijk probeert te zijn
(verteller + classifier). De samenvatting leest stug en classificatie-kwaliteit
was afhankelijk van een prompt die primair op samenvatten geoptimaliseerd was.

## Architectuur-doel

**Eén verantwoordelijkheid per agent.**

- De **Summarizer** levert _alleen_ een goed leesbare samenvatting:
  briefing + thematische kernpunten (platte zinnen) + deelnemersprofielen.
  Geen labels, geen vervolgstappen, geen classificatie.
- Voor elk extractie-type draait een **gespecialiseerde extractor-agent** op
  hetzelfde transcript. Die agents schrijven hun output rechtstreeks naar
  de `extractions`-tabel (UI + review-flow) en eventueel een audit-tabel.

Waarom gespecialiseerd per type?

- Risico, besluit en behoefte vragen verschillende redeneer-stijlen en
  confidence-kalibraties. Eén agent die acht categorieën tegelijk probeert
  te vinden is zelden optimaal voor één ervan.
- Per-type modelkeuze (Haiku voor goedkope, lokale patronen; Sonnet/Opus
  voor cross-turn redeneren) werd al bewezen met `risk-specialist` op
  Sonnet 4.6 + high-effort.
- Losgekoppelde agents zijn onafhankelijk tunebaar en meetbaar via
  `agent_runs`, zonder een regressie op een andere categorie te riskeren.

## Status

### Fase 1 — Summarizer schoon (actief)

- Summarizer prompt + Zod-schema + `formatSummary()` verwijderen label-
  instructies en de vervolgstappen-sectie.
- Pipelines (`gatekeeper-pipeline`, cockpit `meeting-pipeline`, ingest-
  reprocess) geven een leeg vervolgstappen-array door aan de Tagger.
- `summary-markdown-parser.ts` is gemarkeerd als `@deprecated` en leeft
  verder alleen voor backcompat op historische meetings.
- UI-panels die kernpunten renderen (`segment-list`, `project-sections`)
  werken zonder aanpassing — ze renderen de bullets als tekst.

Breaking changes op DB-niveau: _geen_. Bestaande `meeting_project_summaries`
en `extractions` blijven intact. Nieuwe meetings krijgen segmenten met lege
`vervolgstappen`-arrays.

### Fase 2 — Extractor-agents per type (gepland)

Te bouwen naar analogie met `risk-specialist`:

| Agent                 | Type          | Model (voorstel)        |
| --------------------- | ------------- | ----------------------- |
| `risk-specialist`     | `risk`        | Sonnet 4.6 (live)       |
| `decision-extractor`  | `decision`    | Sonnet 4.5              |
| `need-extractor`      | `need`        | Sonnet 4.5              |
| `action-extractor`    | `action_item` | Haiku 4.5               |
| `agreement-extractor` | `agreement`   | Haiku 4.5               |
| `signal-extractor`    | `signal`      | Sonnet 4.5              |
| `vision-extractor`    | `vision`      | Opus (batch / low freq) |

Elke agent:

- krijgt transcript + identified_projects + entityContext
- schrijft naar `extractions` (type = categorie, meeting_id, project_id,
  confidence, transcript_ref)
- logt run naar `agent_runs` via `withAgentRun`
- is per-type idempotent (dezelfde meeting opnieuw draaien vervangt alleen
  rijen met dat type)

### Fase 3 — UI-migratie + cleanup (gepland)

- UI-panels die nu via `parseMarkdownExtractions` filteren (indien in gebruik)
  overzetten op queries tegen `extractions`.
- Batch her-extractie op historische meetings draaien zodat alle verified
  content via de nieuwe extractor-agents loopt.
- `summary-markdown-parser.ts` verwijderen (plus bijbehorende tests).
- Embeddings-fixture (`embed-text.test.ts`) updaten als Besluiten/Behoeften-
  sectie geen zin meer heeft.

## Dependency-overzicht (fase 1)

```
Transcript
  ├── Summarizer ──► briefing + kernpunten (platte zinnen) + deelnemers
  │                    └── Tagger ──► meeting_project_summaries (segmenten)
  │                                     └── embeddings voor semantische zoek
  └── Risk Specialist ──► extractions (type='risk')
                            └── review-flow + UI-panels
```

Elke nieuwe Fase 2-agent hangt parallel onder `Transcript` en schrijft naar
`extractions`. De Tagger blijft de kernpunten naar segmenten per project
hangen voor embeddings/zoek — dat pad heeft niets met extracties te maken.

## Beslissingen vastgelegd

- **Summarizer behoudt `### [Project] Thema` headers** — die zijn essentieel
  voor de Tagger om kernpunten aan projecten te koppelen. Alleen de inline-
  labels en de vervolgstappen-sectie zijn verwijderd.
- **`kernpunten` blijft een `string[]`** — geen structured schema met
  `{type, content}` omdat (a) de Summarizer niet meer classificeert en (b)
  de Tagger-pipeline op string-array rekent.
- **Vervolgstappen-kolom in `meeting_project_summaries` blijft bestaan** —
  historische data behouden. Nieuwe rijen hebben lege arrays totdat de
  `action-extractor` live is en er een aparte action-to-segment link komt
  (of we besluiten dat acties alleen in `extractions`/`tasks` leven).
