# PRD: Meeting Verwerking & Kennisbasis

> **Status:** Draft v2
> **Datum:** 2026-03-29
> **Scope:** Fireflies meeting-verwerking met organisatie-tracking, meeting-classificatie, 2-staps AI-extractie en bronvermelding via MCP

---

## 1. Visie & Context

### Visie: AI-first bedrijfsvoering

Het platform is de kennisbasis van het bedrijf. Alle bedrijfsdata — te beginnen met meetings — stroomt naar één centrale kennisbasis. AI-agents gebruiken die context om werk te doen:

- **Voorstellen en offertes** automatisch genereren op basis van klantgesprekken
- **PRDs en specs** opstellen vanuit discovery-meetings en requirements
- **HR en marketing** taken uitvoeren met organisatiekennis als input
- **Code schrijven** met projectcontext en besluithistorie
- **Emails sturen** op basis van afspraken en actiepunten

De mens is altijd **human-in-the-loop**: AI doet het werk, de mens verifieert in context — niet via een aparte review-queue, maar op het moment dat het antwoord wordt gebruikt.

### Waarom meetings eerst

Meetings zijn de **primaire klantinteractie** van het bedrijf. Het platform fungeert als CRM — er is geen extern CRM-systeem. We bouwen eerst één bron helemaal af — van ingestion tot dagelijks gebruik door het team — voordat we volgende bronnen (email, Slack, docs) toevoegen.

### Kernprincipe: vertrouw de bron, niet de extractie

Meeting transcripts zijn feiten — iemand heeft het gezegd. De onwaarheden ontstaan in de **interpretatie** door de AI, niet in de data. Daarom:

- **Geen review-gate** — extracties hoeven niet goedgekeurd te worden voordat ze doorzoekbaar zijn
- **Altijd bronvermelding** — elke extractie linkt terug naar het transcript, zodat de gebruiker in context kan verifiëren
- **Confidence als indicator** — AI geeft een confidence score mee, voor sortering en transparantie, niet als gate
- **Correctie als feedback loop** — als iemand een fout tegenkomt, corrigeren ze het ter plekke

### Wat er al werkt (pipeline code)

De pipeline-code verwerkt Fireflies-meetings end-to-end en wordt hergebruikt:

```
Fireflies webhook → pre-filter (< 2 min of < 1 deelnemer → skip)
    → Gatekeeper (Haiku): triage — type, score, org, party type
    → Extractor (Sonnet): decisions, action_items, needs, insights — met confidence + transcript ref
    → entity resolution (projecten + organisaties matchen)
    → opslag (meetings + extractions)
    → embedding genereren (alles direct)
    → doorzoekbaar via MCP (met bronvermelding)
```

**Bestaande code:** Gatekeeper agent, pipeline orchestratie, entity resolution, re-embed worker, Fireflies integratie, MCP server + tools, API routes.

### Datamodel: clean slate

Het bestaande datamodel wordt volledig opnieuw opgezet. De oude migraties worden vervangen door nieuwe migraties die het volledige schema beschrijven volgens dit plan.

### Wat dit plan toevoegt t.o.v. de oude situatie

| Onderdeel                                              | Actie                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Organisatie-tracking (klanten, partners, leveranciers) | Nieuw: `organizations` tabel                                                        |
| Meeting-type classificatie                             | Nieuw: `meeting_type` kolom op meetings                                             |
| Meetings aan meerdere projecten koppelen               | Nieuw: `meeting_projects` koppeltabel                                               |
| Deelnemers koppelen aan people-tabel                   | Nieuw: `meeting_participants` koppeltabel                                           |
| Uniforme extracties met confidence + bronvermelding    | Nieuw: `extractions` tabel (vervangt decisions + action_items + organization_needs) |
| 2-staps AI (triage + extractie)                        | Nieuw: Gatekeeper (Haiku) + Extractor (Sonnet)                                      |
| Gatekeeper reject-logica                               | Verwijderen: alles wordt opgeslagen                                                 |

---

## 2. Doelen

### Primaire doelen

1. **Organisaties als entiteit** — klanten, partners en leveranciers bijhouden over meetings heen
2. **Alles direct doorzoekbaar** — geen gate, wel transparantie over wat AI is
3. **Bronvermelding bij elk antwoord** — de gebruiker kan altijd terug naar het transcript
4. **Rijkere meeting-classificatie** — type gesprek bepaalt wat er geextraheerd wordt
5. **Alles bewaren** — Gatekeeper stopt met rejecten, score blijft voor ranking

### Ontwerpprincipes

- **Meetings zijn het CRM** — dit systeem is de bron van waarheid voor klantrelaties
- **Vertrouw de bron, niet de extractie** — transcripts zijn feiten, extracties zijn interpretaties
- **Err on keeping** — bewaar alles, filter later
- **Database als communicatiebus** — agents schrijven naar de DB, niet naar elkaar
- **Confidence, geen gate** — sorteer op betrouwbaarheid, blokkeer niet

---

## 3. Datamodel (clean slate)

> 8 tabellen. Alle oude migraties worden verwijderd en vervangen.

### 3.1 `profiles`

Gebruikersprofielen gekoppeld aan Supabase Auth.

```sql
profiles
├── id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE
├── full_name TEXT
├── email TEXT NOT NULL
├── avatar_url TEXT
├── role TEXT DEFAULT 'member'          -- voorbereid voor toekomstige autorisatie, nog niet actief gefilterd
├── created_at TIMESTAMPTZ DEFAULT now()
├── updated_at TIMESTAMPTZ DEFAULT now()
```

> **Auth-koppeling:** `id` verwijst direct naar `auth.users(id)`. Profiel wordt automatisch aangemaakt via database trigger bij registratie.

### 3.2 `organizations`

Klanten, partners en leveranciers als entiteit.

```sql
organizations
├── id UUID PK DEFAULT gen_random_uuid()
├── name TEXT NOT NULL UNIQUE
├── aliases TEXT[] DEFAULT '{}'
├── type TEXT NOT NULL              -- 'client' | 'partner' | 'supplier' | 'other'
├── contact_person TEXT
├── email TEXT
├── status TEXT DEFAULT 'prospect'  -- 'prospect' | 'active' | 'inactive'
├── created_at TIMESTAMPTZ DEFAULT now()
├── updated_at TIMESTAMPTZ DEFAULT now()
```

> **Embedding:** wordt later toegevoegd wanneer exact + alias matching onvoldoende blijkt.

### 3.3 `people`

Personen uit het team en externe contacten.

```sql
people
├── id UUID PK DEFAULT gen_random_uuid()
├── name TEXT NOT NULL
├── email TEXT UNIQUE
├── team TEXT
├── role TEXT
├── embedding VECTOR(1536)
├── embedding_stale BOOLEAN DEFAULT TRUE
├── created_at TIMESTAMPTZ DEFAULT now()
├── updated_at TIMESTAMPTZ DEFAULT now()
```

### 3.4 `projects`

Projecten met organisatie-koppeling.

```sql
projects
├── id UUID PK DEFAULT gen_random_uuid()
├── name TEXT NOT NULL UNIQUE
├── aliases TEXT[] DEFAULT '{}'
├── organization_id UUID FK → organizations
├── status TEXT DEFAULT 'lead'
│   -- Sales: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won'
│   -- Delivery: 'kickoff' | 'in_progress' | 'review' | 'completed'
│   -- Overig: 'on_hold' | 'lost' | 'maintenance'
├── embedding VECTOR(1536)
├── embedding_stale BOOLEAN DEFAULT TRUE
├── created_at TIMESTAMPTZ DEFAULT now()
├── updated_at TIMESTAMPTZ DEFAULT now()
```

### 3.5 `meetings`

Fireflies meeting transcripts met classificatie en organisatie-koppeling.

```sql
meetings
├── id UUID PK DEFAULT gen_random_uuid()
├── fireflies_id TEXT UNIQUE
├── title TEXT NOT NULL
├── date TIMESTAMPTZ
├── participants TEXT[]                 -- fallback voor onbekende deelnemers
├── summary TEXT
├── transcript TEXT
├── meeting_type TEXT                   -- 'sales' | 'discovery' | 'internal_sync' | 'review' | 'strategy' | 'partner' | 'general'
├── party_type TEXT                     -- 'client' | 'partner' | 'internal' | 'other'
├── organization_id UUID FK → organizations
├── unmatched_organization_name TEXT    -- als AI org niet kan koppelen
├── raw_fireflies JSONB                -- originele Fireflies response + Gatekeeper/Extractor output
├── relevance_score FLOAT              -- Gatekeeper score, voor ranking
├── embedding VECTOR(1536)
├── embedding_stale BOOLEAN DEFAULT TRUE
├── created_at TIMESTAMPTZ DEFAULT now()
├── updated_at TIMESTAMPTZ DEFAULT now()
```

> Projectkoppeling via `meeting_projects` (many-to-many). Deelnemers via `meeting_participants`. Deelnemers die niet gematcht kunnen worden blijven in `participants` text[] als fallback.

### 3.6 `meeting_projects`

Many-to-many: meetings kunnen over meerdere projecten gaan.

```sql
meeting_projects
├── meeting_id UUID FK → meetings ON DELETE CASCADE
├── project_id UUID FK → projects ON DELETE CASCADE
├── PRIMARY KEY (meeting_id, project_id)
```

### 3.7 `meeting_participants`

Many-to-many: koppelt bekende deelnemers aan de people-tabel.

```sql
meeting_participants
├── meeting_id UUID FK → meetings ON DELETE CASCADE
├── person_id UUID FK → people ON DELETE CASCADE
├── PRIMARY KEY (meeting_id, person_id)
```

### 3.8 `extractions`

Uniforme tabel voor alle AI-extracties. Vervangt de aparte `decisions`, `action_items` en `organization_needs` tabellen. Type-specifieke velden zitten in `metadata` JSONB.

```sql
extractions
├── id UUID PK DEFAULT gen_random_uuid()
├── meeting_id UUID FK → meetings ON DELETE CASCADE
├── type TEXT NOT NULL                  -- 'decision' | 'action_item' | 'need' | 'insight'
├── content TEXT NOT NULL               -- de extractie zelf
├── confidence FLOAT                    -- AI confidence score (0.0-1.0), voor sortering
├── metadata JSONB DEFAULT '{}'         -- type-specifiek: assignee, due_date, made_by, etc.
├── transcript_ref TEXT                 -- quote of positie uit transcript voor bronvermelding
├── organization_id UUID FK → organizations
├── project_id UUID FK → projects
├── corrected_by UUID FK → profiles    -- NULL = AI-extractie, gevuld = mens-geverifieerd
├── corrected_at TIMESTAMPTZ
├── embedding VECTOR(1536)             -- direct geembed, geen wachten
├── embedding_stale BOOLEAN DEFAULT TRUE
├── created_at TIMESTAMPTZ DEFAULT now()
```

**Correctie-tracking:** Als `corrected_by IS NULL` is het een AI-extractie. Als het gevuld is, is de content door een mens geverifieerd of gecorrigeerd. Bij correctie wordt content overschreven en `embedding_stale = true` gezet zodat de re-embed worker de nieuwe embedding genereert.

**Metadata per type:**

| Type          | Metadata velden                                               |
| ------------- | ------------------------------------------------------------- |
| `decision`    | `{ made_by, date, context }`                                  |
| `action_item` | `{ assignee, due_date, status, scope }`                       |
| `need`        | `{}` — content is de letterlijke uitspraak, geen extra velden |
| `insight`     | `{ category }` — project_updates, strategy_ideas, client_info |

> **Geen review_status.** Alles is direct doorzoekbaar. De confidence score en bronvermelding geven de gebruiker de informatie om zelf te beoordelen. Correcties worden bijgehouden via `corrected_by`/`corrected_at`.

### 3.9 Relatiediagram

```
profiles → auth.users                    [id = auth.users.id]
profiles (1) ──< (many) extractions      [corrected_by]

organizations (1) ──< (many) meetings
organizations (1) ──< (many) extractions
organizations (1) ──< (many) projects

projects (1) ──< (many) extractions

meetings (1) ──< (many) extractions      [meeting_id]
meetings (many) >──< (many) projects     [via meeting_projects]
meetings (many) >──< (many) people       [via meeting_participants]
```

---

## 4. Meeting Types & Extractie

### 4.1 Vaste lijst (7 types)

De Gatekeeper kiest uit deze lijst. AI mag niet vrij classificeren.

| Type            | Wanneer                         | Voorbeelden                                  |
| --------------- | ------------------------------- | -------------------------------------------- |
| `sales`         | Verkoopgesprek met klant        | Pitch, offerte-bespreking, upsell            |
| `discovery`     | Intake, behoefteanalyse         | Eerste gesprek, requirements gathering, demo |
| `internal_sync` | Intern overleg                  | Standup, weekly, retro, planning             |
| `review`        | Beoordeling van werk            | Sprint review, code review, demo-feedback    |
| `strategy`      | Strategisch overleg             | Roadmap, visie, OKRs                         |
| `partner`       | Gesprek met partner/leverancier | Samenwerkingsoverleg, evaluatie              |
| `general`       | Niet te classificeren           | Overig                                       |

### 4.2 Extractie per type

Alle types leveren decisions en action_items. Extra extracties per type:

| Type            | Needs  | Insights (project_updates) | Insights (strategy_ideas) | Insights (client_info) |
| --------------- | ------ | -------------------------- | ------------------------- | ---------------------- |
| `sales`         | **ja** | -                          | -                         | **ja**                 |
| `discovery`     | **ja** | -                          | -                         | **ja**                 |
| `internal_sync` | -      | **ja**                     | -                         | -                      |
| `review`        | -      | **ja**                     | -                         | -                      |
| `strategy`      | -      | -                          | **ja**                    | -                      |
| `partner`       | **ja** | -                          | -                         | -                      |
| `general`       | -      | -                          | -                         | -                      |

### 4.3 Party type

Bepaald door de Gatekeeper op basis van deelnemers en context:

- `client` — externe klant aanwezig
- `partner` — partner of leverancier aanwezig
- `internal` — alleen teamleden
- `other` — niet te bepalen

---

## 5. Pre-filter

Voordat een meeting de AI-pipeline ingaat, wordt een pre-filter toegepast. Meetings die niet aan de minimale criteria voldoen worden overgeslagen:

- **Duur < 2 minuten** → skip (te kort voor zinvolle content)
- **Minder dan 1 deelnemer** → skip (geen gesprek)

Meetings die door de pre-filter komen worden altijd opgeslagen, ongeacht score.

---

## 6. 2-Staps AI Pipeline

### 6.1 Stap 1: Gatekeeper (Haiku) — Triage

De Gatekeeper doet alleen classificatie en scoring. Geen extracties.

**Output:**

- `meeting_type` — classificatie uit de vaste lijst van 7
- `party_type` — client/partner/internal/other
- `relevance_score` — 0.0-1.0 voor ranking
- `organization_name` — naam van de externe organisatie (nullable)

**Geen reject-logica.** Elke meeting die door de pre-filter komt wordt opgeslagen. De relevance_score blijft voor ranking in zoekresultaten.

**Novelty check blijft actief** — duplicaat-detectie via `fireflies_id` is nog steeds gewenst.

### 6.2 Stap 2: Extractor (Sonnet) — Extractie

Een apart AI-call (Sonnet) doet de inhoudelijke extractie. Sonnet is betrouwbaarder dan Haiku voor interpretatie.

**Input:** meeting transcript + Gatekeeper triage output (meeting_type, party_type)

**Output per extractie:**

- `type` — decision / action_item / need / insight
- `content` — de extractie zelf
- `confidence` — 0.0-1.0 hoe zeker de AI is
- `transcript_ref` — quote uit het transcript als bewijs
- `metadata` — type-specifieke velden (assignee, due_date, made_by, etc.)

**Extractie wordt gestuurd door meeting_type** — zie sectie 4.2.

### 6.3 Organisatie-koppeling

Na triage probeert het systeem `organization_name` te matchen tegen de `organizations` tabel via 2-tier strategie:

1. **Exact match** — ILIKE op `organizations.name`
2. **Alias match** — match op `organizations.aliases` array

- **Match gevonden:** `meetings.organization_id` wordt gezet
- **Geen match:** `meetings.unmatched_organization_name` wordt gezet

### 6.4 Deelnemer-koppeling

Deelnemers worden gematcht op email tegen de `people` tabel:

1. Fireflies levert email-adressen per deelnemer
2. Match op `people.email`
3. Bij match: rij in `meeting_participants`
4. Geen match: deelnemer blijft in `meetings.participants` text[] als fallback

### 6.5 Project-koppeling

De Extractor herkent projectnamen. Entity resolution matcht deze via 3-tier strategie:

1. **Exact match** — ILIKE op `projects.name`
2. **Alias match** — match op `projects.aliases` array
3. **Embedding match** — cosine similarity via `match_projects()` RPC

- **Match:** rij in `meeting_projects` (many-to-many)
- **Geen match:** extractie bevat de projectnaam in content, kan later handmatig gekoppeld worden

### 6.6 Raw opslag

De volledige Fireflies API-response plus Gatekeeper- en Extractor-output worden opgeslagen in `meetings.raw_fireflies` (JSONB) als referentie.

---

## 7. Embedding Strategie

### 7.1 Alles direct embedden

Er is geen review-gate. Alles wordt direct geembed na verwerking:

- **Meetings** — titel, datum, samenvatting, deelnemers
- **Extracties** — content + transcript_ref + metadata

### 7.2 Meeting embedding verrijking

De meeting-embedding bevat naast de standaard velden ook de Extractor-output (insights: project_updates, strategy_ideas, client_info) uit `raw_fireflies`. Dit verbetert de zoekresultaten.

### 7.3 Re-embed worker

De re-embed worker verwerkt records met `embedding_stale = true`. Draait elke 5 minuten via pg_cron.

---

## 8. MCP Output met Bronvermelding

### 8.1 Principe

Elk MCP-antwoord bevat de bron zodat de gebruiker in context kan verifiëren. De gebruiker beslist zelf of het betrouwbaar genoeg is voor hun context.

### 8.2 Voorbeeld output

```
Besluit: "We kiezen leverancier X voor de cloud-migratie" (confidence: 0.87)
Bron: Meeting "Discovery call Acme Corp" — 15 maart 2026
> "...Jan zei dat we dan definitief voor leverancier X gaan, tenzij het budget..."
```

### 8.3 MCP tools

- `search_knowledge` — zoekt over meetings + extractions, retourneert altijd bronvermelding
- `get_decisions` — filtert extractions op type='decision', inclusief transcript_ref
- `get_action_items` — filtert extractions op type='action_item', inclusief metadata (assignee, due_date, status)
- `get_meeting_summary` — meeting detail met meeting_type, party_type, organization, extractions
- `correct_extraction` — corrigeer een extractie: overschrijf content/metadata, zet corrected_by/corrected_at, embedding_stale=true

---

## 9. Correctie-mechanisme

### 9.1 Principe

Correctie is een feedback loop, geen gate. Wanneer een gebruiker een foute extractie tegenkomt — via MCP of later via UI — kan die ter plekke gecorrigeerd worden.

### 9.2 Hoe het werkt

1. Gebruiker ziet een fout in een extractie (via MCP-antwoord of UI)
2. Gebruiker corrigeert via `correct_extraction` MCP tool of later via UI inline edit
3. `content` en/of `metadata` worden overschreven
4. `corrected_by` wordt gezet op de gebruiker's profile id
5. `corrected_at` wordt gezet op now()
6. `embedding_stale = true` — re-embed worker genereert nieuwe embedding

### 9.3 Transparantie in MCP-output

MCP toont bij elke extractie de verificatie-status:

- `corrected_by IS NULL` → _(AI, confidence: 0.82)_
- `corrected_by IS NOT NULL` → _(geverifieerd door Jan de Vries)_

### 9.4 Kanalen

| Kanaal                         | Wanneer              | Sprint |
| ------------------------------ | -------------------- | ------ |
| MCP: `correct_extraction` tool | Fase 1               | 004    |
| UI: inline edit op extracties  | Later, buiten fase 1 | -      |

---

## 10. Fases & Milestones

Eén fase: fundering. Pipeline werkt end-to-end. Meetings verwerken via webhook, direct doorzoekbaar via MCP met bronvermelding.

### Sprint 001: Database — Alle tabellen, indexes, search functions, cron

**Wat:** Clean slate. Alle 8 tabellen, vector indexes, search functions en cron scheduling.

**Scope:**

- Verwijder alle bestaande migraties
- `profiles` met auth trigger
- `organizations`, `people`, `projects` als basis-entiteiten
- `meetings`, `meeting_projects`, `meeting_participants`
- `extractions` met confidence, transcript_ref, metadata JSONB, corrected_by/corrected_at
- HNSW vector indexes op alle embedding-kolommen
- B-tree indexes op FK-kolommen en veelgebruikte filters
- `search_all_content()` — zoekt over meetings + extractions
- `match_people()`, `match_projects()` — entity resolution
- `search_meetings_by_participant()`
- pg_cron + pg_net voor re-embed worker (elke 5 minuten)
- Supabase types regenereren (`supabase gen types`)
- Seed script: initiële data voor organizations, people en projects

**Testbaar:** Migraties draaien zonder fouten. Seed data staat in de tabellen. Handmatig een meeting + extractie inserten. `search_all_content()` retourneert resultaten inclusief extracties.

### Sprint 002: Gatekeeper Triage (Haiku)

**Wat:** Gatekeeper vereenvoudigen tot pure triage. Geen extracties meer, alleen classificatie.

**Scope:**

- `GatekeeperSchema` strippen tot: meeting_type, party_type, relevance_score, organization_name
- Gatekeeper prompt aanpassen: alleen classificatie, geen extractie-instructies
- Reject-logica verwijderen — alles wordt opgeslagen
- Novelty check (duplicaat-detectie) blijft actief
- Organisatie-koppeling: 2-tier (exact → alias)
- Deelnemer-matching: email → meeting_participants

**Testbaar:** Stuur een test-meeting via webhook. Meeting heeft meeting_type en party_type. Organization is gekoppeld of unmatched_organization_name staat gevuld. Geen decisions/action_items in de output (dat doet de Extractor).

### Sprint 003: Extractor (Sonnet) + Pipeline + Embedding

**Wat:** Nieuwe Extractor agent die inhoudelijke extracties doet met confidence scoring en bronvermelding. Pipeline opslag en embedding.

**Scope:**

- Nieuwe Extractor agent (Sonnet): decisions, action_items, needs, insights
- Per extractie: content, confidence (0.0-1.0), transcript_ref, metadata
- Extractie gestuurd door meeting_type (zie sectie 4.2)
- Pipeline opslag: meeting + extractions in één flow
- `raw_fireflies` JSONB vullen met Fireflies response + Gatekeeper + Extractor output
- Alles direct embedden — meetings en extractions
- Re-embed worker: verwerkt embedding_stale records, verrijkt meeting-embedding met insights
- Project-koppeling: 3-tier entity resolution (exact → alias → embedding)

**Testbaar:** Stuur een test-meeting. Extractions staan in de database met confidence scores en transcript_ref. Alles is geembed. Via `search_all_content()` vind je zowel de meeting als de extracties.

### Sprint 004: MCP Tools + Bronvermelding

**Wat:** MCP tools updaten met bronvermelding, confidence en de nieuwe datastructuur.

**Scope:**

- `search_knowledge` — zoekt over meetings + extractions, retourneert bron + confidence + transcript_ref
- `get_decisions` — filter op type='decision', inclusief bronvermelding
- `get_action_items` — filter op type='action_item', inclusief assignee/due_date/status uit metadata
- `get_meeting_summary` — meeting detail met alle nieuwe velden
- `correct_extraction` — corrigeer content/metadata, zet corrected_by/corrected_at

**Testbaar:** Vraag via MCP "wat is er besloten over project X?" en krijg een antwoord met bronvermelding en confidence score. Corrigeer een extractie via `correct_extraction` en verifieer dat de correctie zichtbaar is bij de volgende query.

---

## 11. Open Vragen

| #   | Vraag                        | Context                                                                                                         |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **Confidence drempelwaarde** | Moet er een minimum confidence zijn voor MCP-resultaten, of alles tonen met indicator? Start met alles tonen    |
| 2   | **Organisatie-merge**        | Als er duplicaat-organizations ontstaan, is er geen merge-flow. Wordt later gebouwd als het een probleem blijkt |
| 3   | **Volgende bron**            | Na meetings: email, Slack of docs? Wordt bepaald op basis van welke bron het team het meest mist                |

---

## 12. Buiten Scope

- Review-queue UI (vervallen — geen review-gate)
- Gamification
- Mobile/PWA
- Reviewer-statistieken / rollen
- Sentiment tracking
- Cross-source linking
- Google Docs / Slack / Gmail ingestion (apart traject)
- Curator, Analyst, Dispatcher agents
- `people_skills`, `people_projects`
- RLS policies (apart traject)
- Slack-notificaties (apart traject, na bewezen adoptie)

---

## 13. Toekomstvisie: Levende Profielen

> Dit hoofdstuk beschrijft een toekomstige uitbreiding. Er wordt nu niks voor gebouwd, maar de architectuur is er op voorbereid.

### Het concept

Naarmate er meer data binnenkomt groeit de kennisbasis per entiteit. Een **levend profiel** is een AI-gesynthetiseerde samenvatting per organisatie, project of persoon die zichzelf verrijkt met elke nieuwe bron.

### Waarom dit werkt met de huidige architectuur

- `organizations`, `projects`, `people` zijn de ankerpunten voor profielen
- `extractions.meeting_id` zorgt dat we altijd terug kunnen naar de brondata
- Extracties met type='need' vormen al een groeiend profiel per organisatie
- Embedding op het profiel maakt het doorzoekbaar via MCP

---

## 14. Gedachtelog

### Waarom organizations i.p.v. clients?

Er zijn ook partners, leveranciers en andere externe partijen. Eén tabel met een `type`-veld is simpeler dan meerdere tabellen.

### Waarom de Gatekeeper niet meer rejectt

We willen kunnen zien waarom een score laag is en of die beoordeling juist is. Data weggooien voorkomt dat.

### Waarom geen review-gate

Een review-gate creëert een bottleneck: niemand reviewt consistent, waardoor 80% van de kennis onvindbaar blijft. In plaats daarvan: alles direct doorzoekbaar met bronvermelding. De gebruiker verifieert op het moment dat het ertoe doet — niet in een aparte queue. Correctie werkt als feedback loop, niet als gate.

### Waarom 2-staps AI

De Gatekeeper (Haiku) deed te veel in één call: classificeren + scoren + extraheren. Twee gespecialiseerde calls zijn betrouwbaarder. Haiku voor triage (goedkoop, snel), Sonnet voor extractie (nauwkeuriger). De kosten zijn verwaarloosbaar bij het verwachte volume.

### Waarom één extractions tabel

Aparte tabellen voor decisions, action_items en needs leidden tot 3x dezelfde kolommen (embedding, source_id, review_status, etc.). Eén tabel met een `type` kolom en `metadata` JSONB voor type-specifieke velden is simpeler, makkelijker te queryen en uit te breiden.
