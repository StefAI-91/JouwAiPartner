> **ARCHIVED** — Dit document is vervangen door `docs/specs/meeting-processing-review.md` (v2).
> Belangrijke verschillen: Cohere 1024-dim i.p.v. OpenAI 1536-dim, unified `extractions` tabel i.p.v. aparte tabellen, 2-staps AI pipeline (Haiku triage + Sonnet extractie).

# Knowledge Platform v1 — PRD

_Project: JouwAIPartner_
_Versie: 1.0_
_Aangemaakt: 2026-03-27_

---

## 1. Doel

Een werkend AI-first kennisplatform dat meeting-data automatisch inneemt, filtert, structureert en doorzoekbaar maakt via MCP. Na v1 kan elk teamlid via Claude vragen stellen als "wat kwam er uit de meeting met klant X?" en een bruikbaar antwoord krijgen op basis van eigen bedrijfsdata.

### Wat v1 wél is

- Eén bron (Fireflies) volledig werkend
- Automatische filtering en classificatie via Gatekeeper
- Gestructureerde extractie van besluiten, actiepunten, entiteiten
- Automatische koppeling aan bestaande projecten/klanten
- Signalering bij onbekende projecten of klanten
- Conflict-detectie tegen bestaande documentatie
- Doorzoekbaar via MCP vanuit elke LLM-client

### Wat v1 niet is

- Geen Gmail, Slack of Google Docs integratie
- Geen frontend dashboard
- Geen Curator agent (handmatige kwaliteitscontrole)
- Geen Analyst agent (proactieve insights)
- Geen Dispatcher agent (alerts en digests)
- Geen People & Entity graph met skills-tracking
- Geen role-based access control (iedereen ziet alles)

### Gebruikers

- Initieel: ~5 gebruikers (Stef, Wouter, kernteam)
- LLM-client: Claude via MCP

---

## 2. Architectuur

```
FIREFLIES (webhook)
       ↓
SUPABASE EDGE FUNCTION (ontvanger)
       ↓
PRE-FILTER (regels, geen AI)
       ↓
GATEKEEPER (Claude Haiku via Vercel AI SDK)
       ↓
ENTITY RESOLUTION (TypeScript code)
       ↓
SUPABASE (PostgreSQL + pgvector)
       ↓
IMPACT CHECK (embedding similarity)
       ↓
MCP SERVER (query-laag voor LLM-clients)
```

### Technologie

| Component       | Technologie                       | Reden                           |
| --------------- | --------------------------------- | ------------------------------- |
| Taal            | TypeScript (volledig)             | Eén taal voor alles             |
| Frontend        | Geen (v1)                         | Claude via MCP is de interface  |
| Backend         | Next.js API routes (Vercel)       | Agent triggers, MCP hosting     |
| Database        | Supabase (PostgreSQL + pgvector)  | Data + vector search in één     |
| Gatekeeper      | Vercel AI SDK + Claude Haiku      | Snelle gestructureerde output   |
| Embeddings      | OpenAI text-embedding-3-small     | Bewezen, betaalbaar (~$5-15/mo) |
| MCP Server      | TypeScript (Node.js)              | Native MCP SDK support          |
| Hosting         | Vercel + Supabase                 | Zero-config, auto-scaling       |
| Background jobs | Supabase Edge Functions + pg_cron | Re-embedding, scheduled taken   |

---

## 3. De flow in acht stappen

### Stap 1 — Bron: Fireflies

Fireflies stuurt een webhook bij elke afgeronde meeting. De payload bevat een `meeting_id`. Een Supabase Edge Function ontvangt de webhook en haalt via de Fireflies GraphQL API het volledige transcript, de samenvatting, deelnemers en action items op.

### Stap 2 — Pre-filter (regels, geen AI)

Voordat de AI wordt aangeroepen, filtert simpele code de rommel eruit:

- Test-calls korter dan 2 minuten → weg
- Meetings zonder deelnemers → weg
- Duplicaat meeting_id's → weg

Dit scheelt 60-70% API-kosten.

### Stap 3 — Gatekeeper (Claude Haiku)

Alles wat door de pre-filter komt, gaat naar Haiku via `generateObject` (Vercel AI SDK). Eén API-call die zowel filtert als structureert.

**Input:** het volledige transcript + metadata (deelnemers, titel, datum)

**Prompt-instructie per brontype — Fireflies meetings:**

De Gatekeeper krijgt een bronspecifieke extractie-opdracht. Voor meetings:

```
Je ontvangt een meeting transcript. Beoordeel en extraheer het volgende:

BEOORDELING:
- Relevantie-score (0.0 - 1.0)
- Actie: pass (≥0.6) of reject (<0.6)

EXTRACTIE:
1. BESLUITEN — wat is er concreet besloten? Door wie?
2. ACTIEPUNTEN — wie doet wat, voor wanneer?
   - Koppel aan een project als het projectgerelateerd is
   - Markeer als "persoonlijk" als het niet bij een project hoort
3. PROJECTUPDATES — welke projecten zijn besproken, wat is de status?
4. STRATEGIE & IDEEËN — nieuwe richtingen of brainstorms?
5. KLANTINFO — wat is er gezegd over of namens klanten?

ENTITEITEN:
- Personen die worden genoemd
- Projecten die worden besproken
- Klanten die ter sprake komen
- Onderwerpen/thema's
```

**Output-schema (TypeScript):**

```typescript
interface GatekeeperOutput {
  // Beoordeling
  relevance_score: number; // 0.0 - 1.0
  action: "pass" | "reject";
  reason: string; // één zin
  category: ("decision" | "context" | "action_item" | "reference" | "insight")[];

  // Entiteiten
  entities: {
    people: string[];
    projects: string[];
    clients: string[];
    topics: string[];
  };

  // Geëxtraheerde data
  decisions: {
    decision: string;
    made_by: string;
  }[];

  action_items: {
    description: string;
    assignee: string;
    deadline: string | null;
    scope: "project" | "personal";
    project: string | null;
  }[];

  project_updates: {
    project: string;
    status: string;
    blockers: string[];
  }[];

  strategy_ideas: string[];
  client_info: {
    client: string;
    note: string;
  }[];
}
```

**Novelty check:** voordat opslag plaatsvindt, wordt de embedding van het transcript vergeleken met bestaande embeddings. Cosine similarity > 0.92 → duplicaat → reject.

### Stap 4 — Extractie-output

De Gatekeeper levert in één call gestructureerde data op: besluiten, actiepunten, entiteiten en projectupdates. Dit is geen aparte stap in code — het is de output van stap 3, maar conceptueel belangrijk: uit één meeting komen meerdere types gestructureerde data.

### Stap 5 — Entity resolution (embedding-based)

De applicatiecode matcht geëxtraheerde namen tegen de database via embeddings.

**Matching-strategie (v1 — embedding similarity):**

```typescript
// 1. Exact match op naam of alias
SELECT * FROM projects
WHERE name ILIKE '%halalbox%'
   OR 'halalbox' = ANY(aliases);

// 2. Embedding match als exact niets oplevert
// Embed de geëxtraheerde naam en vergelijk met project-embeddings
const embedding = await embedText(extractedName);
const { data } = await supabase.rpc('match_projects', {
  query_embedding: embedding,
  match_threshold: 0.85,
  match_count: 3,
});
```

**Drie scenario's:**

| Scenario                                    | Actie                                              |
| ------------------------------------------- | -------------------------------------------------- |
| Exacte match op naam/alias                  | Koppel content aan project_id                      |
| Embedding match met hoge similarity (>0.85) | Koppel + voeg als alias toe                        |
| Geen match of lage similarity               | Sla op in `pending_matches` voor menselijke review |

**Bij geen match gaat de content niet verloren.** Het meeting-record wordt opgeslagen met `project_id: null`. Een entry in `pending_matches` wordt aangemaakt met de geëxtraheerde naam en eventuele beste embedding match.

**Dagelijkse digest:** een overzicht van ongematchte items wordt naar Slack gestuurd. "Er staan 3 items zonder projectkoppeling — wil je ze toewijzen?" Na toewijzing wordt de alias automatisch toegevoegd zodat toekomstige matches direct slagen.

### Stap 6 — Opslaan in Supabase

De brontabel wordt bepaald door de bron (niet door AI):

- Fireflies → `meetings` tabel
- Geëxtraheerde besluiten → `decisions` tabel
- Geëxtraheerde actiepunten → `action_items` tabel

Elke entry krijgt een `source_type` en `source_id` zodat je altijd kunt traceren waar iets vandaan kwam.

### Stap 7 — Embedding genereren

Na opslag wordt een embedding gegenereerd via OpenAI `text-embedding-3-small` (1536 dimensies). Dit maakt de content semantisch doorzoekbaar via de MCP server.

**Re-embedding pipeline:** een pg_cron job draait elke 10 minuten en pakt alle rows met `embedding_stale = true` op (batch van 50). Dit vangt updates en wijzigingen op zonder de ingestion te blokkeren.

### Stap 8 — Impact check (conflict-detectie)

Wanneer de Gatekeeper een _besluit_ extraheert, wordt de embedding van dat besluit vergeleken met bestaande documenten in de `decisions` tabel en `meetings` tabel.

**Hoe het werkt:**

```
Nieuw besluit: "Onboarding flow wordt 2 stappen"
        ↓
Embedding-search (vector similarity) tegen bestaande content
        ↓
Hit gevonden met hoge similarity (>0.8):
  "Onboarding flow bestaat uit 3 stappen" (PRD-HalalBox)
        ↓
Conflict gedetecteerd (hoge similarity + afwijkende inhoud)
        ↓
Entry in update_suggestions tabel:
  - target: PRD-HalalBox
  - trigger: meeting 27-03
  - huidige inhoud: "3 stappen"
  - suggestie: "2 stappen (besloten in meeting 27-03)"
        ↓
Notificatie naar Slack
```

**Belangrijk:** de AI past nooit zelf documentatie aan. Het systeem _signaleert_ en _suggereert_. Een mens beslist of de update doorgevoerd wordt.

---

## 4. Database schema

### Content-tabellen

```sql
-- Fireflies meeting transcripts
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fireflies_id TEXT UNIQUE,          -- Fireflies meeting_id (deduplicatie)
    title TEXT,
    date TIMESTAMP,
    participants TEXT[],
    summary TEXT,
    transcript TEXT,
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    relevance_score FLOAT,
    status TEXT DEFAULT 'active',       -- 'active', 'archived'
    category TEXT[],
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Gestructureerde extractie

```sql
-- Besluiten uit meetings
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision TEXT NOT NULL,
    context TEXT,
    made_by TEXT,
    source_type TEXT DEFAULT 'meeting',
    source_id UUID REFERENCES meetings(id),
    project_id UUID REFERENCES projects(id),
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    date TIMESTAMP,
    status TEXT DEFAULT 'active'
);

-- Actiepunten uit meetings
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    assignee TEXT,
    due_date DATE,
    scope TEXT DEFAULT 'project',       -- 'project' of 'personal'
    status TEXT DEFAULT 'open',         -- 'open', 'in_progress', 'done'
    source_type TEXT DEFAULT 'meeting',
    source_id UUID REFERENCES meetings(id),
    project_id UUID REFERENCES projects(id)
);
```

### Projecten en klanten

```sql
-- Projecten
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[],                     -- ["HalalBox", "halal-project", "ALFA_01"]
    client TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ongematchte content wachtend op koppeling
CREATE TABLE pending_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    content_table TEXT NOT NULL,         -- 'meetings', 'decisions', etc.
    extracted_name TEXT NOT NULL,        -- wat de AI eruit haalde
    suggested_match_id UUID,            -- beste fuzzy match (optioneel)
    similarity_score FLOAT,
    status TEXT DEFAULT 'pending',       -- 'pending', 'resolved', 'new_created'
    resolved_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Conflict-detectie

```sql
-- Suggesties voor documentatie-updates
CREATE TABLE update_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_content_id UUID,             -- welk document is mogelijk verouderd
    target_table TEXT,
    trigger_source_id UUID,             -- wat triggerde de suggestie
    trigger_source_type TEXT,
    current_content TEXT,               -- wat er nu staat
    new_content TEXT,                   -- wat het zou moeten zijn
    reason TEXT,
    status TEXT DEFAULT 'pending',       -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Systeem

```sql
-- Audit trail
CREATE TABLE content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID,
    content_table TEXT,
    agent_role TEXT DEFAULT 'gatekeeper',
    action TEXT,                        -- 'admitted', 'rejected', 'duplicate'
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. MCP Server

### Doel

Dunne query-laag die elke MCP-compatibele LLM-client verbindt met de Supabase knowledge base. De LLM zelf is de "responder" — er is geen aparte agent nodig.

### Tools (v1)

| Tool                                             | Beschrijving                            |
| ------------------------------------------------ | --------------------------------------- |
| `search_knowledge(query)`                        | Semantisch zoeken over alle content     |
| `get_meeting_summary(meeting_id)`                | Een specifieke meeting ophalen          |
| `get_action_items(assignee?, status?, project?)` | Actiepunten opvragen met filters        |
| `get_decisions(project?, date_range?)`           | Besluiten opvragen                      |
| `get_pending_matches()`                          | Ongematchte items bekijken en toewijzen |

### Query flow

1. Teamlid stelt vraag via Claude
2. Claude kiest welke MCP tool(s) aan te roepen
3. MCP server embed de query via OpenAI
4. Vector similarity search + optioneel SQL in Supabase
5. Resultaten terug naar Claude
6. Claude formuleert het antwoord

### System prompt voor MCP-context

De MCP server levert een system prompt mee die Claude vertelt hoe de kennisbasis te interpreteren:

```
Je hebt toegang tot de JouwAIPartner kennisbasis via MCP.
Deze bevat meeting transcripts, besluiten, en actiepunten.

Bij het beantwoorden van vragen:
- Verwijs altijd naar de bron (meeting datum, deelnemers)
- Als je meerdere relevante meetings vindt, geef de meest recente
- Bij actiepunten, vermeld altijd de eigenaar en deadline
- Bij besluiten, vermeld wie het besluit nam en wanneer
- Als je het antwoord niet vindt, zeg dat eerlijk
```

---

## 6. AVG & Privacy

### Gelaagde aanpak

| Laag             | Wat                                  | Hoe                         |
| ---------------- | ------------------------------------ | --------------------------- |
| 1. Alias mapping | Klanten krijgen alias bij onboarding | `.env` lokaal, nooit in git |
| 2. PII detectie  | Vangnet voor onbekende namen         | Mistral Small (EU, lokaal)  |
| 3. Verrijking    | Data naar Claude na anonimisering    | DPA + SCCs met Anthropic    |
| 4. Fireflies     | Meeting opnames                      | DPA tekenen, EU servers     |

### Alias-systeem

```env
ALFA_01=HalalBox BV
ALFA_01_CONTACT=Mohammed
ALFA_01_EMAIL=mohammed@halalbox.nl
```

Bedrijfsnamen (rechtspersonen) zijn geen persoonsgegevens onder AVG. Alleen contactpersoonsnamen worden gealiasd.

### Nog te regelen

- [ ] DPA + SCCs tekenen met Anthropic
- [ ] DPA tekenen met Fireflies
- [ ] EU servers inschakelen bij Fireflies
- [ ] Algemene voorwaarden updaten
- [ ] Uurtje met privacy jurist

---

## 7. Kosten (geschat)

| Component                 | Kosten/maand      |
| ------------------------- | ----------------- |
| Supabase (Pro)            | ~$25              |
| OpenAI embeddings         | ~$5-15            |
| Claude Haiku (Gatekeeper) | ~$10-30           |
| Vercel (Pro)              | ~$20              |
| **Totaal**                | **~$60-90/maand** |

Ruim binnen het budget van $100-200/maand. Haiku is goedkoop genoeg om alle meetings door te verwerken zonder kosten-optimalisatie.

---

## 8. Implementatieplan

### Week 1-2: Fundament

- [ ] Supabase project opzetten met pgvector extensie
- [ ] Database schema aanmaken (alle tabellen hierboven)
- [ ] OpenAI embedding model configureren
- [ ] Fireflies webhook ontvanger bouwen (Edge Function)
- [ ] Fireflies GraphQL API integratie (transcript ophalen)

### Week 3-4: Gatekeeper & opslag

- [ ] Pre-filter implementeren (regels)
- [ ] Gatekeeper agent bouwen (Vercel AI SDK + Haiku)
- [ ] Extractie-schema per brontype (meetings)
- [ ] Entity resolution logica (fuzzy matching)
- [ ] Pending matches tabel en dagelijkse digest
- [ ] Re-embedding pipeline (pg_cron)

### Week 5-6: MCP & impact check

- [ ] MCP server bouwen met v1 tools
- [ ] System prompt voor kennisbasis-context
- [ ] Impact check implementeren (conflict-detectie)
- [ ] Update suggestions tabel en Slack-notificatie
- [ ] Claude-clients verbinden met MCP server
- [ ] End-to-end testing met echte meetings

---

## 9. Succes-criteria

Drie metrics vanaf dag één:

| Metric                | Wat het vertelt              | Hoe meten                   |
| --------------------- | ---------------------------- | --------------------------- |
| Query volume          | Wordt het gebruikt?          | MCP tool calls per dag      |
| Gatekeeper admit rate | Is de filter goed afgesteld? | % pass vs reject            |
| Zero-match rate       | Zijn queries bruikbaar?      | % searches zonder resultaat |

### De ultieme test

Een teamlid vraagt: "Wat kwam er uit de meeting met [klant] vorige week?" — en krijgt binnen 5 seconden een correct, bronvermeld antwoord. Als dat werkt, is v1 geslaagd.

---

## 10. Na v1 — wat komt erna

Bewust geparkeerd voor latere versies:

| Feature                 | Versie | Reden om te wachten                                     |
| ----------------------- | ------ | ------------------------------------------------------- |
| Gmail integratie        | v2     | Aparte webhook-setup, hoog noise-risico                 |
| Slack integratie        | v2     | Workspace moet nog opgezet worden                       |
| Google Docs integratie  | v2     | Push notifications vereisen domeinverificatie           |
| Frontend dashboard      | v2     | Claude/MCP is voldoende als interface voor v1           |
| Curator agent           | v2     | Handmatige kwaliteitscontrole volstaat bij laag volume  |
| People & Skills graph   | v2     | Complexe extractie, eerst basisfunctionaliteit bewijzen |
| Analyst agent           | v3     | Proactieve insights vereisen voldoende data             |
| Dispatcher agent        | v3     | Alerts/digests pas zinvol met meerdere bronnen          |
| Role-based access (RLS) | v3     | Niet nodig bij 5 gebruikers die alles mogen zien        |

---

## 11. Design principes

1. **Garbage in, garbage out** — De Gatekeeper is het kritiekste onderdeel. Niets werkt zonder schone data.
2. **AI voor begrip, code voor logica** — Haiku begrijpt tekst en herkent entiteiten. Database lookups, matching en opslag is gewone code.
3. **Niets gaat verloren** — Content zonder projectkoppeling wordt opgeslagen met een flag, niet weggegooid.
4. **Signaleren, niet wijzigen** — Het systeem suggereert documentatie-updates, maar past nooit zelf aan.
5. **Eén bron, goed** — Begin met Fireflies, maak het rotsvast, breid dan uit.
6. **Model-agnostisch** — De MCP server werkt met elke LLM-client. Geen vendor lock-in.

---

_Dit document is de bouwtekening voor v1. Alles wat hier niet in staat, is bewust geparkeerd._
