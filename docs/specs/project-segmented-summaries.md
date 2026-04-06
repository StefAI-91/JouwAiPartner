# Project-Segmented Summaries

> **Status:** Draft
> **Datum:** 2026-04-06
> **Owner:** Stef Banninga

---

## 1. Probleem

Meetings gaan vaak over meerdere projecten. De huidige Summarizer produceert één ondeelbare samenvatting per meeting. Dat leidt tot drie problemen:

1. **Ruis bij zoeken** — zoek je op "Project Beta", dan krijg je de hele samenvatting terug inclusief alles over Alpha en Gamma.
2. **Onnauwkeurige embeddings** — de embedding van de hele samenvatting bevat context van alle projecten, waardoor vector search minder precies is.
3. **Verkeerde project-koppelingen** — nu wordt alleen `primary_project` gelinkt. Extracties zonder expliciet project erven dat primary project, ook als ze eigenlijk over een ander project gaan of project-onafhankelijk zijn.

## 2. Gewenst resultaat

Een meeting-samenvatting is opsplitsbaar per project. Bij het zoeken op een project krijg je alleen de relevante kernpunten en vervolgstappen, niet het hele gesprek. Het systeem leert van menselijke correcties zodat matching steeds beter wordt.

## 3. Ontwerp

### 3.0 Gatekeeper: project-identificatie (nieuwe stap)

De Gatekeeper (Claude Haiku) draait als eerste stap in de pipeline en leest het hele transcript. Naast de bestaande classificatie (meeting_type, relevance_score, organization_name) identificeert hij nu ook welke **projecten, organisaties en mensen** in de meeting besproken worden.

**Gatekeeper is leidend voor project-identificatie.** De bestaande entity resolution in de pipeline draait alleen als fallback voor projecten waar de Gatekeeper `project_id: null` retourneert. Bij conflict wint de Gatekeeper.

**Database-context ophalen (vóór de Gatekeeper-call):**

De pipeline haalt vooraf bekende entiteiten op uit de database en injecteert deze als context in de Gatekeeper-prompt:

```
Bekende projecten:
- "Jansen Klantportaal" (organisatie: Jansen & Co, aliassen: "het portaal", "klantplatform")
- "IntraNext Migratie" (organisatie: IntraNext, aliassen: "de migratie")

Bekende organisaties:
- "Jansen & Co" (aliassen: "Jansen")
- "IntraNext BV" (aliassen: "IntraNext")

Bekende personen:
- "Pieter de Vries" (organisatie: Jansen & Co)
- "Anna Bakker" (organisatie: IntraNext)
```

**Filtering:** Alleen actieve projecten. Bij meetings met bekende deelnemers: prioriteit aan projecten van hun organisaties.

**Schema-uitbreiding Gatekeeper:**

```typescript
// Bestaand (ongewijzigd)
relevance_score: number
reason: string
meeting_type: MeetingType
organization_name: string | null

// Nieuw
identified_projects: {
  project_name: string,       // Naam zoals gematcht of uit transcript
  project_id: string | null,  // UUID als gematcht aan DB, null als onbekend
  confidence: number           // 0.0–1.0
}[]
```

**Anti-hallucinatie instructie in de prompt:**

> "Match alleen aan bekende projecten als je daar zeker van bent. Als een project wordt besproken dat niet in de lijst staat, geef dan de naam uit het transcript met `project_id: null`. Verzin geen match — liever `null` dan een foute koppeling."

**Voordeel:** Eén keer matchen, meerdere keer profiteren — zowel Tagger als Extractor ontvangen dezelfde project-context van de Gatekeeper.

### 3.1 Summarizer: ongewijzigd

De Summarizer (Claude Sonnet) blijft ongewijzigd. Hij produceert kernpunten en vervolgstappen als platte `string[]` arrays, zoals nu. De project-tagging wordt afgesplitst naar een aparte Tagger-stap (zie 3.1b). Dit houdt de Summarizer gefocust op één taak: kwalitatief samenvatten.

### 3.1b Tagger: project-tags per kernpunt (nieuwe agent)

De Tagger (Claude Haiku) is een aparte, lichtgewicht stap die na de Summarizer draait. Hij ontvangt de kernpunten en vervolgstappen van de Summarizer plus de `identified_projects` lijst van de Gatekeeper, en tagt elk item met een project (of `null` voor algemeen).

**Waarom apart van de Summarizer:**

- **Kwaliteitsbehoud** — de Summarizer hoeft niet twee cognitieve taken tegelijk te doen (samenvatten + classificeren)
- **Testbaar in isolatie** — je kunt de Tagger los valideren zonder de hele pipeline
- **Goedkoper** — Haiku is ~10x goedkoper dan Sonnet; tagging is pattern matching, geen redenering
- **Vervangbaar** — later eventueel te vervangen door rule-based matching

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
  vervolgstappen: { content: string, project: string | null }[]
}
```

**Prompt-instructies voor wanneer wél/niet taggen:**

Tag WEL als:

- Er actief over het project wordt gewerkt of besluiten over worden genomen
- Er vervolgstappen of acties aan gekoppeld zijn
- Het een klant- of intern project is waar het team mee bezig is

Tag NIET als:

- Het een vergelijking is ("zoals Spotify doet met playlists")
- Het een terloopse vermelding is ("ik zag bij Coolblue een goede UX")
- Het een tool, platform of dienst is die je gebruikt (tenzij het project daarover gaat)
- Het een eenmalige namedrop is zonder inhoudelijke context

Confidence per tag:

- 1.0: project wordt expliciet als werkcontext benoemd
- 0.7-0.9: project is duidelijk afgeleid uit de context
- 0.4-0.6: project wordt genoemd maar relatie tot kernpunt is zwak
- Bij twijfel: niet taggen (`null`)

### 3.2 Pipeline: segmenten bouwen

Na de Tagger groepeert de pipeline kernpunten per project:

```
Meeting "Team Sync 3 april"
├── Volledige samenvatting     → meeting.summary (zoals nu)
├── Segment "Project Alpha"    → 4 kernpunten + 2 vervolgstappen
├── Segment "Project Beta"     → 2 kernpunten + 1 vervolgstap
└── Segment "Algemeen"         → 1 kernpunt (null-project)
```

**Confidence-drempel:** Tags met confidence < 0.7 worden automatisch naar "Algemeen" verplaatst. Alleen tags >= 0.7 worden als project-segment behandeld. De drempel is configureerbaar via een database-instelling zodat deze getuned kan worden na de eerste 50 meetings.

**Entity resolution:** Grotendeels al gedaan door de Gatekeeper (project_id meegeleverd). Voor projecten met `project_id: null` valt de pipeline terug op entity resolution (exact match → substring → alias → embedding similarity).

### 3.3 Opslag: `meeting_project_summaries`

Nieuwe tabel:

| Kolom              | Type              | Doel                                                                                                                                      |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | UUID              | PK                                                                                                                                        |
| `meeting_id`       | UUID              | FK → meetings                                                                                                                             |
| `project_id`       | UUID, nullable    | FK → projects (null = onbekend of algemeen)                                                                                               |
| `project_name_raw` | text              | Originele string van de AI (altijd bewaren)                                                                                               |
| `is_general`       | boolean GENERATED | `GENERATED ALWAYS AS (project_id IS NULL AND project_name_raw IS NULL) STORED` — voorkomt dat `is_general` en `project_id` uit sync raken |
| `kernpunten`       | text[]            | Array van kernpunt-strings voor dit project                                                                                               |
| `vervolgstappen`   | text[]            | Array van vervolgstap-strings voor dit project                                                                                            |
| `summary_text`     | text              | Geformateerde tekst van dit segment (voor embedding)                                                                                      |
| `embedding`        | vector(1024)      | Cohere embed-v4 embedding van summary_text                                                                                                |
| `embedding_stale`  | boolean           | `DEFAULT true` — wordt `false` na (her)berekening                                                                                         |
| `search_vector`    | tsvector          | Voor full-text search, via trigger op `summary_text`                                                                                      |
| `created_at`       | timestamptz       |                                                                                                                                           |

De **volledige samenvatting** (`meeting.summary`, `meeting.ai_briefing`) blijft ongewijzigd. De segmenten zijn een afgeleide voor precisie-zoeken en project-context.

**`meeting_projects` junction tabel:**

Alle geresolvde projecten worden gelinkt (niet alleen `primary_project` zoals nu).

| Kolom        | Type        | Doel                                                      |
| ------------ | ----------- | --------------------------------------------------------- |
| `meeting_id` | UUID        | FK → meetings, deel van composite PK                      |
| `project_id` | UUID        | FK → projects, deel van composite PK                      |
| `source`     | text        | Hoe de koppeling ontstond: `"ai"`, `"manual"`, `"review"` |
| `created_at` | timestamptz |                                                           |

**Constraints:** `PRIMARY KEY (meeting_id, project_id)`, `ON DELETE CASCADE` op beide FK's.

### 3.4 Embeddings: per segment (gebatcht)

Elk segment krijgt een eigen embedding via Cohere embed-v4. De meeting-brede embedding blijft ook bestaan. Bij vector search op een project-vraag worden de segment-embeddings doorzocht, niet de meeting-embedding.

**Alle segment-embeddings worden in één `embedBatch()` call verwerkt.** Dit is niet goedkoper (Cohere rekent per token), maar wel 3-4x sneller dan losse calls per segment. De bestaande `embedBatch()` functie ondersteunt max 96 teksten per request, ruim voldoende.

```typescript
const segmentTexts = segments.map((s) => s.summary_text);
const embeddings = await embedBatch(segmentTexts, "search_document");
```

### 3.5 Foutcorrectie: drie vangnetten

#### Vangnet 1: Prompt (voorkomt fouten)

Strikte instructies in de Tagger prompt over wanneer wél/niet taggen (zie 3.1b).

#### Vangnet 2: Pipeline (filtert fouten)

- Confidence < 0.7 (configureerbaar) → automatisch naar "Algemeen"
- Entity in `ignored_entities` lijst → tag verwijderd, naar "Algemeen"

#### Vangnet 3: Review gate (corrigeert fouten)

In de review UI ziet de reviewer per meeting de project-segmenten:

```
Segmenten:
✅ Project Alpha (4 kernpunten)          → automatisch gematcht
⚠️ "dat nieuwe platform" (2 kernpunten)  → niet gematcht
   → [Koppel aan project]  [Verwijder tag]
✅ Algemeen (1 kernpunt)
```

Acties voor de reviewer (v1 — YAGNI):

- **Koppel aan project** — selecteer bestaand project uit dropdown
- **Verwijder tag** — kernpunten verplaatsen naar "Algemeen"

Uitgesteld naar later (pas bouwen als nodig blijkt):

- ~~Nieuw project aanmaken~~ — kan via de bestaande projects pagina
- ~~Corrigeer~~ — verplaats kernpunt naar ander segment
- ~~Samenvoegen~~ — als AI twee namen voor hetzelfde project gebruikte

#### Feedback-loop

- Goedgekeurde koppeling → project-naam wordt als **alias** toegevoegd aan het project
- Afgewezen koppeling → naam wordt toegevoegd aan **`ignored_entities`** (organisatie-breed)

Ignored entities tabel (of kolom op organizations):

| Kolom             | Type        | Doel                                                               |
| ----------------- | ----------- | ------------------------------------------------------------------ |
| `id`              | UUID        | PK                                                                 |
| `organization_id` | UUID        | FK → organizations — scope per organisatie                         |
| `entity_name`     | text        | De afgewezen naam (case-insensitive)                               |
| `entity_type`     | text        | `"project"` (later uitbreidbaar naar `"organization"`, `"person"`) |
| `created_at`      | timestamptz |                                                                    |

**Constraints:** `UNIQUE (organization_id, entity_name, entity_type)`, `ON DELETE CASCADE` op organization FK.

### 3.6 Achteraf corrigeren (verified meetings)

Op de meeting detail pagina een sectie "Project-segmenten" waar je dezelfde correctie-acties kunt doen als in de review gate. Niet alleen voor draft meetings, ook voor al-geverifieerde meetings.

## 4. Wat er verandert en wat niet

### Verandert: Extractor ontvangt project-constraint

De Extractor ontvangt de Gatekeeper's `identified_projects` als **constraint** (niet als hint). De Extractor kiest per extractie uit de aangeleverde projectlijst of `null`. De velden `entities.projects` en `primary_project` worden verwijderd uit de Extractor output — die verantwoordelijkheid ligt nu bij de Gatekeeper.

**Prompt-instructie voor de Extractor:**

> "De volgende projecten zijn geïdentificeerd in deze meeting: [lijst]. Gebruik ALLEEN deze projectnamen bij het toewijzen van een project aan extracties. Als een extractie niet bij een van deze projecten hoort, laat project dan null. Voeg GEEN nieuwe projectnamen toe."

### Verandert niet

- **Briefing** — blijft meeting-breed (30-seconden verhaal)
- **Deelnemers** — blijven meeting-breed
- **Volledige samenvatting** — `meeting.summary` en `meeting.ai_briefing` blijven bestaan
- **Bestaande review flow** — extractie-review (action items) blijft ongewijzigd

## 5. MCP/Zoeken

### 5.1 Routing-logica (expliciete parameter)

De `search_knowledge` tool krijgt een optionele `project_id` parameter. Geen impliciete query-analyse nodig — de caller (Claude) geeft expliciet aan of hij project-specifiek zoekt.

Bij een query **met `project_id`**:

- Zoek in `meeting_project_summaries` waar `project_id` matcht
- Return alleen dat segment, niet de hele meeting-samenvatting
- Vector search gaat over segment-embeddings → hogere precision

Bij een query **zonder `project_id`**:

- Zoek zoals nu over `meeting.summary` embedding (backwards compatible)

### 5.2 Aan te passen tools

**High priority (zoek-impact):**

| Tool                       | Bestand                              | Wijziging                                                                                                                     |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `search_knowledge`         | `packages/mcp/src/tools/search.ts`   | Segment-embeddings toevoegen aan hybrid search results. Nieuw source type `"project_summary"` met project-naam in output.     |
| `search_all_content()` RPC | `supabase/migrations/`               | `UNION ALL` clause voor `meeting_project_summaries` in zowel vector- als FTS-CTE's. Nieuw veld `project_id` in RETURNS TABLE. |
| `get_meeting_summary`      | `packages/mcp/src/tools/meetings.ts` | Per-project segmenten tonen als extra sectie na de volledige samenvatting.                                                    |

**Medium priority (discovery):**

| Tool                        | Bestand                                               | Wijziging                                               |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `list_meetings`             | `packages/mcp/src/tools/list-meetings.ts`             | Aantal project-segmenten per meeting tonen.             |
| `get_organization_overview` | `packages/mcp/src/tools/get-organization-overview.ts` | Sectie "Project-segmenten" toevoegen aan org-overzicht. |
| `get_projects`              | `packages/mcp/src/tools/projects.ts`                  | Aantal segmenten per project tonen.                     |

**Low priority (later):**

| Tool                 | Bestand                                        | Wijziging                                                                        |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `get_decisions`      | `packages/mcp/src/tools/decisions.ts`          | Optioneel: beslissingen uit project-segmenten doorzoekbaar maken.                |
| `get_action_items`   | `packages/mcp/src/tools/actions.ts`            | Optioneel: actiepunten uit segmenten doorzoekbaar maken.                         |
| `correct_extraction` | `packages/mcp/src/tools/correct-extraction.ts` | Correctie-support voor segmenten (of als aparte `correct_project_summary` tool). |

**Geen wijzigingen nodig:** `get_people`, `get_organizations`, task management tools, `log_client_update`.

## 6. Impact op bestaande data

Bestaande meetings hebben geen segmenten. Opties:

- **Lazy:** segmenten worden aangemaakt bij de eerstvolgende keer dat een meeting gereviewd wordt
- **Batch:** een eenmalige re-run van de Summarizer op alle verified meetings met het nieuwe schema

Aanbeveling: start met lazy voor nieuwe meetings, batch later als de prompt stabiel is.

## 7. Bouwvolgorde

### Fase 1: Segmentering (levert 80% van de waarde)

1. **Database** — migratie voor `meeting_project_summaries`, `meeting_projects.source` kolom, `ignored_entities`, RLS policies op alle nieuwe tabellen
2. **Gatekeeper** — schema uitbreiden + database-context ophalen + prompt aanpassen (project-identificatie)
3. **Tagger** — nieuwe agent (Haiku): ontvangt kernpunten + identified_projects, retourneert getagde kernpunten
4. **Extractor** — `entities.projects` en `primary_project` verwijderen uit output, project-constraint uit Gatekeeper-lijst ontvangen
5. **Pipeline** — orchestratie: Gatekeeper → Summarizer (ongewijzigd) → Tagger → segmenten bouwen → Extractor (met constraint) → `embedBatch()` voor segmenten → opslaan
6. **Review UI** — segment-weergave + twee acties: koppel aan project, verwijder tag
7. **MCP/Zoeken** — `project_id` parameter op `search_knowledge`, segment-level querying

### Fase 2: Feedback & verfijning (pas bouwen als fase 1 stabiel is)

8. **Feedback-loop** — alias-toevoeging bij goedkeuring, `ignored_entities` bij afwijzing
9. **Meeting detail UI** — segment-weergave + achteraf corrigeren
10. **Geavanceerde review-acties** — samenvoegen, corrigeren, nieuw project aanmaken (alleen als nodig blijkt)
11. **Batch migration** — optioneel: bestaande meetings opnieuw verwerken

### Pipeline flow (nieuw)

```
Gatekeeper (Haiku) — classificatie + project-identificatie
    ↓
Summarizer (Sonnet) — ongewijzigd, produceert kernpunten als string[]
    ↓
Tagger (Haiku) — tagt kernpunten met projecten uit Gatekeeper-lijst
    ↓
Pipeline — bouwt segmenten, confidence-filter (>= 0.7)
    ↓
Extractor (Sonnet) — extracties met project-constraint uit Gatekeeper
    ↓
embedBatch() — alle segment-embeddings in één Cohere call
```
