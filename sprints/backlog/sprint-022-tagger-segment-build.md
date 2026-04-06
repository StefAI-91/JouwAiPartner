# Sprint 022: Tagger + Segment-bouw

## Doel

Een rule-based Tagger bouwen die kernpunten en vervolgstappen van de Summarizer matcht aan projecten die de Gatekeeper heeft geidentificeerd. Na matching worden segmenten gebouwd (gegroepeerd per project), geformateerd als summary_text, geembed via embedBatch(), en opgeslagen in de `meeting_project_summaries` tabel. De Tagger is deterministisch (geen LLM-call) en draait in <50ms. Bij fouten degradeert het systeem graceful: alles gaat naar een "Algemeen" segment en de rest van de pipeline gaat door.

## Requirements

| ID       | Beschrijving                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------- |
| AI-030   | Rule-based Tagger functie: matcht kernpunten/vervolgstappen aan projecten via string matching  |
| AI-031   | Tagger matching strategie 1: exact match op projectnaam of alias (case-insensitive)            |
| AI-032   | Tagger matching strategie 2: substring match (projectnaam is onderdeel van langere zin)        |
| AI-033   | Tagger matching strategie 3: keyword overlap (minimaal 2 van 3 woorden uit projectnaam)        |
| AI-034   | Tagger matching strategie 4: geen match -> null (naar "Algemeen")                              |
| AI-035   | Confidence-toekenning: 1.0 exact match naam, 0.9 exact match alias, 0.8 substring, 0.6 keyword |
| AI-036   | Confidence-drempel: tags met confidence < 0.7 gaan naar "Algemeen" (configureerbaar)           |
| FUNC-050 | Segment-bouw: groepeer getagde kernpunten/vervolgstappen per project                           |
| FUNC-051 | "Algemeen" segment voor null-project en lage confidence items                                  |
| FUNC-052 | summary_text formatter: geformateerde tekst per segment voor embedding                         |
| FUNC-053 | Opslag in meeting_project_summaries tabel (alle kolommen uit sprint 020)                       |
| FUNC-054 | embedBatch() aanroep voor alle segment-embeddings in een batch                                 |
| FUNC-055 | Pipeline integratie: Gatekeeper -> Summarizer (ongewijzigd) -> Tagger -> segment-bouw -> embed |
| RULE-015 | Graceful degradation: als Tagger faalt -> alles naar "Algemeen", pipeline gaat door            |
| RULE-016 | Skip Tagger als Gatekeeper 0 projecten identificeert (alles naar "Algemeen")                   |
| EDGE-006 | Meeting zonder projecten: 1 "Algemeen" segment met project_id=NULL, project_name_raw=NULL      |

## Bronverwijzingen

- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.1b Tagger: project-tags per kernpunt" (regels 78-142)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.2 Pipeline: segmenten bouwen" (regels 144-161)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.3 Opslag: meeting_project_summaries" (regels 162-194)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "3.4 Embeddings: per segment" (regels 196-205)
- Spec: `docs/specs/project-segmented-summaries.md` -> sectie "Pipeline flow" (regels 376-391)

## Context

### Relevante business rules

- **RULE-015**: "Graceful degradation: als de Tagger faalt, worden alle kernpunten in een 'Algemeen' segment geplaatst en gaat de rest van de pipeline gewoon door. Elke stap heeft een eigen error boundary -- een fout in segmentering mag de extractie niet blokkeren."
- **RULE-016**: "Als de Gatekeeper 0 projecten identificeert (bv. een interne team sync zonder projectcontext), slaat de Tagger-stap over en worden alle kernpunten en vervolgstappen in een 'Algemeen' segment geplaatst."
- **AI-036**: "Confidence < 0.7 (configureerbaar) -> automatisch naar 'Algemeen'. De drempel is configureerbaar via een database-instelling zodat deze getuned kan worden na de eerste 50 meetings."

### Tagger input/output

**Input:**

```typescript
{
  kernpunten: string[],              // Van de Summarizer
  vervolgstappen: string[],          // Van de Summarizer
  identified_projects: {             // Van de Gatekeeper
    project_name: string,
    project_id: string | null,
    confidence: number
  }[]
}
```

**Output:**

```typescript
{
  kernpunten: { content: string, project: string | null, confidence: number }[]
  vervolgstappen: { content: string, project: string | null, confidence: number }[]
}
```

### Matching-strategie (in volgorde van prioriteit)

1. **Exact match** -- projectnaam of alias komt letterlijk voor in het kernpunt (case-insensitive). Confidence: 1.0 (naam) of 0.9 (alias).
2. **Substring match** -- projectnaam is onderdeel van een langere zin in het kernpunt. Confidence: 0.8.
3. **Keyword overlap** -- woorden uit de projectnaam komen voor in het kernpunt (minimaal 2 van 3 woorden). Confidence: 0.6 (valt onder drempel -> naar "Algemeen").
4. **Geen match** -> `null` (naar "Algemeen").

### Tagging-regels (als code-logica)

Tag WEL als:

- Er actief over het project wordt gewerkt of besluiten over worden genomen
- Er vervolgstappen of acties aan gekoppeld zijn
- Het een klant- of intern project is waar het team mee bezig is

Tag NIET als:

- Het een vergelijking is ("zoals Spotify doet met playlists")
- Het een terloopse vermelding is ("ik zag bij Coolblue een goede UX")
- Het een tool, platform of dienst is die je gebruikt (tenzij het project daarover gaat)
- Het een eenmalige namedrop is zonder inhoudelijke context

> **Opmerking uit spec:** De "tag niet"-regels zijn moeilijker rule-based af te vangen. In v1 accepteren we dat sommige terloopse vermeldingen getagd worden -- de confidence-drempel (>=0.7) en de review gate vangen dit op.

### summary_text formaat

Per segment wordt een `summary_text` geformateerd die als basis dient voor de embedding:

```
Project: [projectnaam]
Kernpunten:
- [kernpunt 1]
- [kernpunt 2]
Vervolgstappen:
- [vervolgstap 1]
```

Voor het "Algemeen" segment:

```
Algemeen (niet project-specifiek):
Kernpunten:
- [kernpunt 1]
Vervolgstappen:
- [vervolgstap 1]
```

### Pipeline flow na deze sprint

```
Gatekeeper (Haiku) -- classificatie + project-identificatie
    |
Summarizer (Sonnet) -- ongewijzigd, produceert kernpunten als string[]
    |
Tagger (rule-based) -- matcht kernpunten aan projecten via string matching
    |                   Bij fout: alles naar "Algemeen", pipeline gaat door
Pipeline -- bouwt segmenten, confidence-filter (>= 0.7)
    |                   0 projecten: skip tagger, alles "Algemeen"
embedBatch() -- alle segment-embeddings in een Cohere call
    |
Opslaan in meeting_project_summaries
    |
Extractor (Sonnet) -- extracties (ongewijzigd in deze sprint)
```

### Bestaande code

- Pipeline: `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (hoofdpipeline)
- Summarizer stap: `packages/ai/src/pipeline/steps/summarize.ts`
- Embeddings: `packages/ai/src/embeddings.ts` (`embedBatch()`)
- Embed pipeline: `packages/ai/src/pipeline/embed-pipeline.ts`

### Edge cases en foutafhandeling

- **EDGE-006**: Meeting zonder projecten: Gatekeeper retourneert 0 projecten -> Tagger wordt overgeslagen -> 1 "Algemeen" segment met `project_id = NULL` en `project_name_raw = NULL`.
- **RULE-015**: Als de Tagger een exception gooit, wordt dit gecatcht en gaan alle kernpunten naar "Algemeen". De pipeline logt de error maar gaat door met de Extractor.
- Lege kernpunten array van Summarizer: geen segmenten aanmaken (geen lege rijen).
- Meerdere projecten matchen op hetzelfde kernpunt: eerste match wint (hoogste confidence).

## Prerequisites

- [ ] Sprint 020: Database migratie - Segmented Summaries moet afgerond zijn
- [ ] Sprint 021: Gatekeeper uitbreiding - Project-identificatie moet afgerond zijn

## Taken

- [ ] Tagger functie bouwen in `packages/ai/src/pipeline/tagger.ts`: rule-based matching met 4 strategieen en confidence-toekenning
- [ ] Segment-bouw functie bouwen in `packages/ai/src/pipeline/segment-builder.ts`: groepeer getagde items per project, maak "Algemeen" segment, formatteer summary_text
- [ ] Opslag-functie bouwen: schrijf segmenten naar `meeting_project_summaries` tabel, roep `embedBatch()` aan, update embedding + embedding_stale
- [ ] Pipeline integreren in `packages/ai/src/pipeline/gatekeeper-pipeline.ts`: Tagger stap invoegen na Summarizer, voor Extractor, met error boundary en 0-projecten check
- [ ] Mutation functie in `packages/database/src/mutations/meeting-project-summaries.ts`: insert segmenten met alle kolommen
- [ ] Tests: unit tests voor Tagger matching (alle 4 strategieen), confidence toekenning, segment-bouw, graceful degradation, 0-projecten scenario

## Acceptatiecriteria

- [ ] [AI-030] Tagger functie bestaat en matcht kernpunten aan projecten zonder LLM-call
- [ ] [AI-031] Exact match op projectnaam werkt case-insensitive en geeft confidence 1.0
- [ ] [AI-032] Substring match werkt en geeft confidence 0.8
- [ ] [AI-033] Keyword overlap (2 van 3 woorden) werkt en geeft confidence 0.6
- [ ] [AI-034] Kernpunten zonder match krijgen project = null
- [ ] [AI-035] Confidence-scores zijn correct per match-type
- [ ] [AI-036] Items met confidence < 0.7 worden naar "Algemeen" verplaatst
- [ ] [FUNC-050] Segmenten zijn correct gegroepeerd per project
- [ ] [FUNC-051] "Algemeen" segment bevat null-project en lage confidence items
- [ ] [FUNC-052] summary_text is correct geformateerd per segment
- [ ] [FUNC-053] Segmenten worden opgeslagen in meeting_project_summaries met alle kolommen
- [ ] [FUNC-054] embedBatch() wordt aangeroepen voor alle segmenten in een batch
- [ ] [FUNC-055] Pipeline draait: Gatekeeper -> Summarizer -> Tagger -> segment-bouw -> embed -> opslaan
- [ ] [RULE-015] Bij Tagger-fout gaan alle kernpunten naar "Algemeen" en gaat pipeline door
- [ ] [RULE-016] Bij 0 projecten van Gatekeeper wordt Tagger overgeslagen
- [ ] [EDGE-006] Meeting zonder projecten resulteert in 1 "Algemeen" segment

## Geraakt door deze sprint

- `packages/ai/src/pipeline/tagger.ts` (nieuw)
- `packages/ai/src/pipeline/segment-builder.ts` (nieuw)
- `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (gewijzigd -- Tagger stap + segment-bouw)
- `packages/ai/src/pipeline/embed-pipeline.ts` (gewijzigd -- segment embedding)
- `packages/database/src/mutations/meeting-project-summaries.ts` (nieuw)
