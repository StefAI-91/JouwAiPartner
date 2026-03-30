# Datamapping per integratie

**Datum:** 2026-03-30
**Doel:** Per integratie vastleggen welke data erdoorheen stroomt (Wouter punt 1)

---

## Overzicht

| Integratie         | Provider       | Richting      | Regio        | Gevoeligheid |
| ------------------ | -------------- | ------------- | ------------ | ------------ |
| Fireflies.ai       | Fireflies Inc. | Bron (IN)     | US           | Hoog         |
| Anthropic (Claude) | Anthropic PBC  | Verwerking    | US/EU        | Hoog         |
| Cohere             | Cohere Inc.    | Embedding     | US           | Midden-Hoog  |
| Supabase           | Supabase Inc.  | Opslag        | EU-Frankfurt | Kritiek      |
| MCP Server         | Eigen (Vercel) | Uitgang (OUT) | Vercel Edge  | Hoog         |

---

## 1. Fireflies.ai

**Doel:** Meeting-opnames ontvangen en transcripts ophalen.

### Data die wij ONTVANGEN

| Veld                | Gevoeligheid | Beschrijving                                           |
| ------------------- | ------------ | ------------------------------------------------------ |
| Meeting titel       | Midden       | Titel van de meeting                                   |
| Deelnemers          | Hoog         | Namen en e-mailadressen van alle deelnemers (PII)      |
| Volledig transcript | Hoog         | Alle gesproken tekst met spreker en timestamps per zin |
| Samenvatting        | Midden       | AI-samenvatting, actiepunten, keywords, topics         |
| Meeting metadata    | Laag         | Datum, duur, Fireflies meeting ID                      |

### Data die wij VERSTUREN

| Veld            | Gevoeligheid | Beschrijving                            |
| --------------- | ------------ | --------------------------------------- |
| API Key         | Hoog         | Bearer token voor Fireflies GraphQL API |
| Meeting ID      | Laag         | Om specifiek transcript op te halen     |
| Limit parameter | Laag         | Aantal transcripts bij polling (max 30) |

### Endpoints

- `/api/webhooks/fireflies` — POST, HMAC-SHA256 gevalideerd
- `/api/ingest/fireflies` — POST, Bearer token (CRON_SECRET)
- Fireflies GraphQL API: `https://api.fireflies.ai/graphql`

### Credentials

- `FIREFLIES_API_KEY` — Bearer token voor GraphQL
- `FIREFLIES_WEBHOOK_SECRET` — HMAC-SHA256 secret voor webhook validatie

### Codelocaties

- `src/lib/fireflies.ts` — GraphQL queries en fetch functies
- `src/app/api/webhooks/fireflies/route.ts` — Webhook ontvanger
- `src/app/api/ingest/fireflies/route.ts` — Polling endpoint

---

## 2. Anthropic (Claude)

**Doel:** AI-classificatie en extractie van meeting content. Antwoordsynthese bij zoekvragen.

### Data die wij VERSTUREN

| Veld                            | Gevoeligheid | Beschrijving                                                          |
| ------------------------------- | ------------ | --------------------------------------------------------------------- |
| Meeting samenvatting + metadata | Hoog         | Titel, deelnemers, topics, samenvatting naar Gatekeeper (Haiku)       |
| Volledig transcript + context   | Hoog         | Hele transcript naar Extractor (Sonnet) voor extractie                |
| Zoekvragen van gebruikers       | Midden       | Naar Haiku voor zoekdecompositie en antwoordsynthese                  |
| Zoekresultaten als context      | Hoog         | Top-10 resultaten (meetings + extracties) als context voor antwoorden |

### Data die wij ONTVANGEN

| Veld                     | Gevoeligheid | Beschrijving                                                        |
| ------------------------ | ------------ | ------------------------------------------------------------------- |
| Gatekeeper classificatie | Laag         | meeting_type, party_type, relevance_score, organization_name        |
| Extracties               | Midden       | Besluiten, actiepunten, inzichten met confidence en transcript-refs |
| Zoekantwoorden           | Midden       | Gegenereerde antwoorden op gebruikersvragen                         |

### Modellen in gebruik

| Agent            | Model             | Trigger          |
| ---------------- | ----------------- | ---------------- |
| Gatekeeper       | Claude Haiku 4.5  | Meeting ingest   |
| Extractor        | Claude Sonnet 4.5 | Meeting ingest   |
| Zoekdecompositie | Claude Haiku 4.5  | /api/ask request |
| Antwoordsynthese | Claude Haiku 4.5  | /api/ask request |

### Credentials

- `ANTHROPIC_API_KEY` — Automatisch beheerd door `@ai-sdk/anthropic` SDK

### Opmerkingen

- Prompt caching is ingeschakeld (ephemeral) — data tijdelijk in Anthropic cache
- Geen garantie op EU-only processing tenzij expliciet geconfigureerd

### Codelocaties

- `src/lib/agents/gatekeeper.ts` — Gatekeeper classificatie
- `src/lib/agents/extractor.ts` — Extractie agent
- `src/app/api/ask/route.ts` — Zoekdecompositie + antwoordsynthese

---

## 3. Cohere

**Doel:** Tekst omzetten naar 1024-dimensionale embeddings voor semantisch zoeken.

### Data die wij VERSTUREN

| Veld                   | Gevoeligheid | Beschrijving                                                       |
| ---------------------- | ------------ | ------------------------------------------------------------------ |
| Meeting samenvattingen | Hoog         | Titel + deelnemers + samenvatting + extracties als embedding-tekst |
| Extractie-inhoud       | Midden       | Individuele besluiten, actiepunten, inzichten, behoeften           |
| Persoonsnamen + rollen | Midden       | Naam, rol, team van personen                                       |
| Projectnamen           | Laag         | Projectnamen voor project-embedding                                |
| Zoekopdrachten         | Midden       | Gebruikersvragen voor query-embedding                              |

### Data die wij ONTVANGEN

| Veld              | Gevoeligheid | Beschrijving                                                |
| ----------------- | ------------ | ----------------------------------------------------------- |
| Embedding vectors | Laag         | 1024-dim float arrays — geen leesbare data, alleen numeriek |

### Specificaties

- Model: `embed-v4.0` via Cohere v2 API
- Dimensies: 1024 (float)
- Max batch: 96 teksten per request
- Input types: `search_document` (opslag) / `search_query` (zoeken)

### Credentials

- `COHERE_API_KEY` — Constructor token in CohereClient

### Codelocaties

- `src/lib/embeddings.ts` — Embedding functies (single + batch)
- `src/lib/services/embed-pipeline.ts` — Pipeline voor meetings/extracties
- `src/lib/services/re-embed-worker.ts` — Worker voor stale embeddings
- `supabase/functions/re-embed-worker/index.ts` — Edge Function variant

---

## 4. Supabase (PostgreSQL)

**Doel:** Primaire database voor alle opgeslagen data.

### Regio

**EU-Frankfurt (aws-eu-central-1)**

### Opgeslagen data per tabel

| Tabel                  | PII-velden                                                         | Retentie  |
| ---------------------- | ------------------------------------------------------------------ | --------- |
| `meetings`             | participants (namen + e-mails), transcript, summary, raw_fireflies | Onbeperkt |
| `extractions`          | content, metadata (assignee, client), transcript_ref               | Onbeperkt |
| `people`               | name, email, team, role                                            | Onbeperkt |
| `organizations`        | name, contact_person, email                                        | Onbeperkt |
| `profiles`             | full_name, email, avatar_url                                       | Onbeperkt |
| `projects`             | name (kan klantnaam bevatten)                                      | Onbeperkt |
| `meeting_participants` | Koppeltabel (geen directe PII)                                     | Onbeperkt |
| `meeting_projects`     | Koppeltabel (geen directe PII)                                     | Onbeperkt |

### Toegang

| Client         | Key                                       | Gebruik                            |
| -------------- | ----------------------------------------- | ---------------------------------- |
| Browser client | `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | Ingelogde gebruikers (client-side) |
| Server client  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookies | Server Components                  |
| Admin client   | `SUPABASE_SERVICE_ROLE_KEY`               | Pipelines, ingest, MCP tools       |

### Codelocaties

- `src/lib/supabase/admin.ts` — Admin client (service role)
- `src/lib/supabase/server.ts` — Server client (cookie handling)
- `src/lib/supabase/client.ts` — Browser client
- `src/lib/queries/` — Alle database queries

---

## 5. MCP Server

**Doel:** AI-clients (Claude Desktop, etc.) toegang geven tot de kennisbank.

### Data die wij VERSTUREN (aan MCP clients)

| Veld                        | Gevoeligheid | Beschrijving                                                      |
| --------------------------- | ------------ | ----------------------------------------------------------------- |
| Zoekresultaten              | Hoog         | Meeting-samenvattingen, besluiten, actiepunten met bronvermelding |
| Organisatie- en projectdata | Midden       | Namen, statussen, contactpersonen                                 |
| Persoonsgegevens            | Hoog         | Namen, e-mailadressen, rollen, teams                              |

### Data die wij ONTVANGEN (van MCP clients)

| Veld       | Gevoeligheid | Beschrijving                                       |
| ---------- | ------------ | -------------------------------------------------- |
| Tool calls | Laag         | MCP protocol berichten met tool-naam en parameters |

### Beschikbare tools

1. `search_knowledge` — Semantisch zoeken over alle content
2. `get_meeting_summary` — Meeting detail met extracties
3. `get_decisions` — Besluiten met bronvermelding
4. `get_action_items` — Actiepunten met eigenaar en deadline
5. `get_organizations` — Organisaties opzoeken
6. `get_projects` — Projecten opzoeken
7. `get_people` — Mensen opzoeken

### Endpoint

- `/api/mcp` — POST (tool calls), GET (405), DELETE (no-op)
- **Geen authenticatie** (kritiek risico, zie SEC-001)

### Codelocaties

- `src/lib/mcp/server.ts` — Server definitie
- `src/lib/mcp/tools/` — Alle 7 tool implementaties
- `src/app/api/mcp/route.ts` — HTTP transport

---

## Dataflow diagram

```
Fireflies.ai (US)
    │
    ├── Webhook POST ──────────────────────┐
    └── GraphQL polling ───────────────────┤
                                           ▼
                                    ┌─────────────┐
                                    │  Gatekeeper  │──── Anthropic API (US/EU)
                                    │  (Haiku)     │     ↕ samenvatting + metadata
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Extractor   │──── Anthropic API (US/EU)
                                    │  (Sonnet)    │     ↕ transcript + context
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Embeddings  │──── Cohere API (US)
                                    │  (embed-v4)  │     ↕ tekst → vector
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Supabase    │  EU-Frankfurt
                                    │  PostgreSQL  │  8 tabellen + pgvector
                                    └──────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                         /api/search  /api/ask    /api/mcp
                         (zoeken)    (RAG Q&A)   (MCP tools)
                              │            │            │
                              ▼            ▼            ▼
                         Gebruikers   Gebruikers   AI clients
                                                  (Claude Desktop)
```
