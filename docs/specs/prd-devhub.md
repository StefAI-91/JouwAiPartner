# PRD: DevHub — Centraal Development Portal

> **Status:** Draft
> **Datum:** 2026-04-09
> **Owner:** Stef Banninga
> **Versie:** 1.0
> **App:** `apps/devhub/`

---

## 1. Context & Probleem

### 1.1 De aanleiding

Bij klant **CAi Studio** zijn **600+ Userback-items** opgestapeld zonder centraal systeem om ze te verwerken. Feedback komt binnen via vier kanalen:

1. **Userback widget** in de applicatie (primaire bron, ~600 items)
2. **WhatsApp** berichten naar het team
3. **E-mail** naar individuele teamleden
4. **Meetings** waarin bugs mondeling gemeld worden

Er is geen enkel overzicht van: welke bugs er openstaan, wie eraan werkt, wat de prioriteit is, of wat al opgelost is. Outsource-developers (Kenji, Myrrh) krijgen bugs via losse berichten zonder context, en er is geen manier om voortgang te volgen.

### 1.2 Waarom dit nu urgent is

- CAi Studio is een actief klantproject met lopende development
- 600+ items zijn ongesorteerd — kritieke bugs zitten verstopt tussen duplicaten en vragen
- Het team werkt zonder traceerbaarheid: bugs raken kwijt, worden dubbel opgepakt, of vergeten
- Handmatige triage kost uren die beter aan development besteed worden

### 1.3 Waarom een apart systeem (niet in cockpit)

- **Cockpit** is het AI Project Management dashboard voor het interne JAIP-team (strategisch niveau)
- **DevHub** is een operationeel development portal gericht op bug tracking en developer workflow
- Verschillende gebruikersgroepen: cockpit is voor PM/leadership, DevHub is voor developers (inclusief externe)
- Guest access voor externe developers hoort niet in het cockpit
- Op termijn (fase 5) worden ze gekoppeld: cockpit als PM-laag bovenop DevHub-data

---

## 2. Visie

### 2.1 DevHub als AI Development Hub

DevHub is niet alleen een issue tracker — het is het **centrale development werkbord** van Jouw AI Partner waar menselijke developers en AI-agents naast elkaar werken. Het verschil met bestaande tools (Linear, Jira):

- **Linear/Jira:** passief — mens leest ticket, mens codeert, mens sluit ticket
- **DevHub:** actief — AI classificeert, AI genereert context, en op termijn: AI pakt werk uit de kanban op, mens reviewt

Dit is een **gefaseerde evolutie van passief naar actief:**

```
Fase 1-2: AI assisteert (classificatie, context, triage)
    ↓
Fase 3-4: AI bereidt voor (instructiesets, plannen, impact-analyses)
    ↓
Fase 5+:  AI executeert (waar het systeem het toelaat)
```

**Belangrijk:** AI-executie is niet universeel. Bij codebase-projecten (eigen apps) kan AI PRs maken en bugs fixen. Bij klantprojecten met externe tooling (N8N, Windmill, Railway) blijft DevHub het overzichtsbord — AI kan daar wel context genereren en handover verbeteren, maar niet direct code aanpassen.

### 2.2 Circulair ecosysteem

DevHub vormt het ontbrekende stuk in het ecosysteem:

```
Cockpit (PM & Strategie)
    ↓ plant features, stelt prioriteiten
DevHub (Development)
    ↓ developers + AI bouwen, fixen bugs
Client Apps (Delivery)
    ↓ gebruikers geven feedback
Feedback (Widget / Userback)
    ↓ bugs & feature requests komen binnen
DevHub (Triage)
    ↓ AI classificeert, team prioriteert
Status Page (Transparantie)
    ↓ client ziet voortgang real-time
Cockpit (Overzicht)
    → cirkel is rond
```

### 2.3 Kernprincipes

- **AI-first triage** — elk binnenkomend item wordt automatisch geclassificeerd door AI
- **Voorbereid op AI-executie** — datamodel en architectuur ondersteunen een toekomst waarin AI werk uit de kanban oppakt
- **Developer-centric** — de UI is gebouwd voor snelheid, geïnspireerd door Linear
- **Multi-project vanaf dag 1** — CAi Studio eerst, daarna interne projecten, daarna andere klanten
- **Gedeelde database** — zelfde Supabase-instance als cockpit, nieuwe tabellen voor issues
- **Herbruikbaar product** — elke toekomstige klant krijgt dezelfde DevHub + Status Page ervaring

---

## 3. Gebruikers & Rollen

### 3.1 Fase 1 gebruikers

| Gebruiker  | Rol                              | Toegang                                          |
| ---------- | -------------------------------- | ------------------------------------------------ |
| **Stef**   | Platform owner, triage lead      | Volledige toegang, alle projecten                |
| **Wouter** | Co-founder, commercieel          | Volledige toegang, alle projecten                |
| **Ege**    | Engineer, intern                 | Volledige toegang, alle projecten                |
| **Kenji**  | Outsource developer (CAi Studio) | Ziet issues voor CAi Studio, kan status wijzigen |
| **Myrrh**  | Outsource developer (CAi Studio) | Ziet issues voor CAi Studio, kan status wijzigen |

### 3.2 Rollen (Supabase Auth)

| Rol        | Rechten                                                                     | Scope                       |
| ---------- | --------------------------------------------------------------------------- | --------------------------- |
| **admin**  | Alles: CRUD issues, importeren, projecten beheren, gebruikers uitnodigen    | Alle projecten              |
| **member** | Issues bekijken, status wijzigen, comments plaatsen, aan zichzelf toewijzen | Alle projecten              |
| **guest**  | Issues bekijken en status wijzigen voor toegewezen projecten                | Alleen gekoppelde projecten |

**Fase 1 simplificatie:** admin en member zien alles. Guest role wordt voorbereid in het datamodel maar pas in fase 2 geactiveerd met fine-grained RLS.

---

## 4. Fases Overzicht

| Fase  | Naam                             | Focus                                                                                        | AI-rol                                                                      |
| ----- | -------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **1** | Bug Intake & Triage              | Issue list, AI classificatie, Userback import                                                | AI classificeert en genereert repro-stappen                                 |
| **2** | Developer Workflow + Status Page | Status page app, duplicate detection, status flow, Slack notificaties, guest access, filters | AI genereert handover-context per issue, duplicate detection via embeddings |
| **3** | Feature Requests & Roadmap       | Feature requests, roadmap view, milestones                                                   | AI schat impact en afhankelijkheden in                                      |
| **4** | Eigen Feedback Widget            | Vervangt Userback, feeds direct in DevHub                                                    | AI classificeert real-time bij binnenkomst                                  |
| **5** | Cockpit Integratie               | DevHub data zichtbaar in cockpit PM-laag, MCP tools                                          | AI Analyst combineert bugs + meetings + trends                              |
| **6** | AI Executie                      | AI pakt issues op uit kanban (waar mogelijk)                                                 | AI codeert, maakt PRs, mens reviewt                                         |

**Fase 6 — AI Executie (toekomst, niet in scope voor nu):**

- Alleen voor projecten met een codebase waar AI toegang toe heeft (eigen apps, niet N8N/Windmill)
- Issue krijgt `execution_type: 'ai_autonomous'` → AI agent pakt het op
- AI maakt een branch, implementeert fix/feature, opent PR
- Mens reviewt en merged — AI sluit het issue
- `ai_executable` flag per issue bepaalt of AI het kan oppakken (afhankelijk van projecttype)
- Datamodel is hier vanaf fase 1 op voorbereid via `execution_type`, `ai_context`, `ai_result` kolommen

---

## 5. Fase 1 — Bug Intake & Triage (Detail)

### 5.1 User Flows

#### Flow 1: Userback import (eenmalig + periodiek)

```
Admin triggert Userback sync vanuit DevHub
    ↓
DevHub haalt items op via Userback API (GET /feedback)
    ↓
Filter: alleen items van CAi Studio project (op basis van Userback project ID)
    ↓
Per item: check of userback_id al bestaat in issues (dedup op bron)
    ↓
Nieuw item → AI classificatie (async):
  - type: bug | feature_request | question
  - component: frontend | backend | api | database | prompt_ai | unknown
  - severity: critical | high | medium | low
  - suggested_repro_steps: string (AI-gegenereerde reproductiestappen)
    ↓
Issue wordt aangemaakt met status 'triage' en AI-metadata
    ↓
Verschijnt in triage inbox, klaar voor beoordeling
(Duplicate detection via embeddings wordt in fase 2 toegevoegd)
```

#### Flow 2: Handmatig issue aanmaken

```
Teamlid opent DevHub → klikt "Nieuw Issue"
    ↓
Vult in: titel, beschrijving, type, priority
    ↓
Optioneel: component, assigned_to, labels
    ↓
Bij opslaan: AI classificatie draait op achtergrond
  → vult component, severity, en repro-stappen aan als ze leeg zijn
    ↓
Issue verschijnt in de lijst
```

#### Flow 3: Triage inbox verwerken

```
Stef/Ege opent DevHub → ziet triage inbox (apart van backlog)
    ↓
Triage toont: AI-classificatie, severity badge, confidence score
  → Items met lage confidence (<0.6) bovenaan (hebben meeste aandacht nodig)
  → Items met duplicate-markering tonen "Mogelijk duplicaat van #42"
    ↓
Per item, drie acties:
  ✅ Accepteren → status wordt 'backlog' (issue is echt, moet opgepakt worden)
  🔄 Accepteren + toewijzen → status wordt 'todo' + assigned_to ingevuld
  ❌ Afwijzen → status wordt 'cancelled' (spam, test, niet-actioneerbaar)
  🔗 Mergen → koppel aan bestaand issue als duplicaat, status wordt 'cancelled'
    ↓
Past AI-classificatie aan indien nodig: type, priority, component, labels
    ↓
Activity log registreert: action='triaged', old_value='triage', new_value='backlog'
```

#### Flow 4: Developer pakt issue op

```
Kenji opent DevHub → filtert op: assigned_to = mij, status = todo
    ↓
Opent issue → leest beschrijving + AI repro-stappen
    ↓
Zet status op 'in_progress'
    ↓
Lost bug op
    ↓
Plaatst comment: "Fixed in commit abc123"
    ↓
Zet status op 'done'
```

### 5.2 Data Model

#### Nieuwe tabel: `issues`

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'bug',           -- 'bug' | 'feature_request' | 'question'
  status TEXT NOT NULL DEFAULT 'triage',        -- 'triage' | 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority TEXT NOT NULL DEFAULT 'medium',     -- 'urgent' | 'high' | 'medium' | 'low'

  -- Classification
  component TEXT,                              -- 'frontend' | 'backend' | 'api' | 'database' | 'prompt_ai' | 'unknown'
  severity TEXT,                               -- 'critical' | 'high' | 'medium' | 'low'
  labels TEXT[] DEFAULT '{}',                  -- freeform labels: ['UI', 'performance', 'regression']

  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  reporter_name TEXT,                          -- naam van de melder (uit Userback of handmatig)
  reporter_email TEXT,                         -- email van de melder

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual',       -- 'userback' | 'widget' | 'manual' | 'email'
  userback_id TEXT UNIQUE,                     -- voor dedup bij Userback sync
  source_url TEXT,                             -- originele URL in Userback of pagina waar bug gemeld werd
  source_metadata JSONB DEFAULT '{}',          -- extra data van de bron (browser, OS, screenshot URL, etc.)

  -- AI classification
  ai_classification JSONB DEFAULT '{}',        -- { type, component, severity, repro_steps, model, classified_at }
  ai_classified_at TIMESTAMPTZ,                -- wanneer AI classificatie is gedaan

  -- Duplicate detection
  embedding vector(1024),                      -- Cohere embed-v4, zelfde dimensie als extractions
  duplicate_of_id UUID REFERENCES issues(id),  -- verwijst naar het originele issue als dit een duplicaat is
  similarity_score REAL,                       -- cosine similarity score bij duplicate match (0.0-1.0)

  -- AI execution (voorbereid, niet actief in fase 1)
  issue_number INTEGER NOT NULL,                 -- auto-increment per project (via issue_number_seq tabel met transaction lock)

  -- AI execution (voorbereid, niet actief in fase 1)
  execution_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'ai_assisted' | 'ai_autonomous'
  ai_context JSONB DEFAULT '{}',               -- AI-gegenereerde context voor handover: { summary, related_issues, suggested_approach, affected_files }
  ai_result JSONB DEFAULT '{}',                -- resultaat van AI-executie: { status, pr_url, commit_hash, output_log, completed_at }
  ai_executable BOOLEAN DEFAULT FALSE,         -- of dit issue door AI opgepakt kan worden (afhankelijk van project type)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ                        -- wanneer status naar 'done' of 'cancelled' gaat
);

-- Indexes
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assigned_to ON issues(assigned_to);
CREATE INDEX idx_issues_priority ON issues(priority);
CREATE INDEX idx_issues_type ON issues(type);
CREATE INDEX idx_issues_userback_id ON issues(userback_id);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
```

#### Nieuwe tabel: `issue_comments`

```sql
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_comments_issue_id ON issue_comments(issue_id);
```

#### Nieuwe tabel: `issue_activity`

```sql
CREATE TABLE issue_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),       -- NULL voor systeem/AI acties
  action TEXT NOT NULL,                         -- 'created' | 'status_changed' | 'assigned' | 'priority_changed' | 'classified' | 'commented' | 'label_added' | 'label_removed'
  field TEXT,                                   -- welk veld gewijzigd is (bijv. 'status', 'priority')
  old_value TEXT,                               -- vorige waarde
  new_value TEXT,                               -- nieuwe waarde
  metadata JSONB DEFAULT '{}',                  -- extra context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_activity_issue_id ON issue_activity(issue_id);
CREATE INDEX idx_issue_activity_created_at ON issue_activity(created_at DESC);
```

#### Nieuwe tabel: `devhub_project_access` (voorbereiding guest role)

```sql
CREATE TABLE devhub_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',          -- 'admin' | 'member' | 'guest'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, project_id)
);

CREATE INDEX idx_devhub_project_access_profile_id ON devhub_project_access(profile_id);
CREATE INDEX idx_devhub_project_access_project_id ON devhub_project_access(project_id);
```

#### RLS Policies (fase 1 — simpel)

```sql
-- Issues: alle authenticated users kunnen lezen en schrijven
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view issues"
  ON issues FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert issues"
  ON issues FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update issues"
  ON issues FOR UPDATE USING (auth.role() = 'authenticated');

-- Comments: zelfde model
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view comments"
  ON issue_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert comments"
  ON issue_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update own comments"
  ON issue_comments FOR UPDATE USING (auth.uid() = author_id);

-- Activity: alleen lezen
ALTER TABLE issue_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view activity"
  ON issue_activity FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert activity"
  ON issue_activity FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Project access: voorbereid maar nog niet actief gefilterd
ALTER TABLE devhub_project_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view project access"
  ON devhub_project_access FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage project access"
  ON devhub_project_access FOR ALL USING (auth.role() = 'authenticated');
```

### 5.3 AI Classificatie Spec

#### Patroon

Volgt exact het bewezen agent-patroon van de Gatekeeper (meetings) en Email Classifier (emails):

| Aspect         | Gatekeeper                       | Email Classifier          | **Issue Classifier**                                           |
| -------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------- |
| Model          | Haiku 4.5                        | Haiku 4.5                 | **Haiku 4.5**                                                  |
| SDK            | `generateObject` (Vercel AI SDK) | `generateObject`          | **`generateObject`**                                           |
| Output         | Zod schema → typed object        | Zod schema → typed object | **Zod schema → typed object**                                  |
| Opslag         | Kolommen op `meetings`           | Kolommen op `emails`      | **`ai_classification` JSONB + top-level kolommen op `issues`** |
| Trigger        | Bij Fireflies ingest             | Bij email sync            | **Bij Userback sync + handmatig aanmaken**                     |
| Prompt caching | `cacheControl: ephemeral`        | `cacheControl: ephemeral` | **`cacheControl: ephemeral`**                                  |

#### Bestanden

```
packages/ai/src/
├── validations/
│   └── issue-classifier.ts    # Zod schema (output contract)
└── agents/
    └── issue-classifier.ts    # Agent functie (system prompt + generateObject)
```

#### Zod Schema (`packages/ai/src/validations/issue-classifier.ts`)

```typescript
import { z } from "zod";

export const ISSUE_TYPES = ["bug", "feature_request", "question"] as const;
export const COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export const IssueClassifierSchema = z.object({
  type: z
    .enum(ISSUE_TYPES)
    .describe(
      "bug = iets werkt niet/is kapot, feature_request = iets nieuws gewenst/verbetering, question = vraag/onduidelijkheid/verwarring",
    ),
  component: z
    .enum(COMPONENTS)
    .describe(
      "Welk technisch onderdeel is betrokken. Gebruik pageUrl als hint (bijv. /dashboard = frontend)",
    ),
  severity: z
    .enum(SEVERITIES)
    .describe(
      "critical = app onbruikbaar/dataverlies, high = belangrijke functie broken, medium = bug met workaround, low = cosmetisch/nice-to-have",
    ),
  repro_steps: z
    .string()
    .describe(
      "Concrete reproductiestappen in het Nederlands. Als info ontbreekt, geef aan wat er mist",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Hoe zeker ben je van deze classificatie (0.0-1.0)"),
});

export type IssueClassifierOutput = z.infer<typeof IssueClassifierSchema>;
```

#### Agent (`packages/ai/src/agents/issue-classifier.ts`)

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { IssueClassifierSchema, IssueClassifierOutput } from "../validations/issue-classifier";

export type { IssueClassifierOutput };

const SYSTEM_PROMPT = `Je bent de Issue Classifier: je classificeert binnenkomende feedback en bugs.
ALLE output moet in het Nederlands zijn (behalve enum-waarden).

Je krijgt: titel, beschrijving, pagina-URL en het originele feedbacktype uit Userback.
De pageUrl geeft context over WAAR in de applicatie het probleem zit.

Je bepaalt:

1. TYPE: wat voor soort issue is dit?
   - bug: iets werkt niet, is kapot, crasht, toont verkeerde data, layout is broken
   - feature_request: gebruiker wil iets nieuws, een verbetering, of een aanpassing
   - question: gebruiker snapt iets niet, is verward, stelt een vraag

   LET OP: Userback "General" items kunnen bug, feature_request OF question zijn — bepaal op basis van de beschrijving.
   Userback "Bug" → meestal bug, maar check of het niet eigenlijk een feature_request is.
   Userback "Idea" → meestal feature_request.

2. COMPONENT: welk technisch onderdeel is betrokken?
   - frontend: UI problemen, layout, styling, knoppen, formulieren, visuele bugs
   - backend: server logica, business rules, data verwerking
   - api: API endpoints, integraties met externe diensten, timeouts
   - database: data opslag, queries, ontbrekende data, sync problemen
   - prompt_ai: AI/LLM gerelateerd, prompt kwaliteit, AI responses, chat functionaliteit
   - unknown: niet te bepalen uit de beschrijving

   HINT: gebruik de pageUrl als aanwijzing:
   - /dashboard/studios → frontend of prompt_ai
   - /dashboard/co-founder → prompt_ai
   - /admin → backend of frontend
   - /api → api

3. SEVERITY: hoe ernstig is dit?
   - critical: applicatie onbruikbaar, data verlies, security issue
   - high: belangrijke functie werkt niet, geen workaround
   - medium: bug maar er is een workaround, of matig belangrijke feature request
   - low: cosmetisch, typo, nice-to-have verbetering

4. REPRO_STEPS: genereer concrete reproductiestappen in het Nederlands.
   - Baseer op de beschrijving en pageUrl
   - Als er te weinig informatie is: beschrijf wat je WEL weet en geef aan welke info ontbreekt
   - Formaat: genummerde stappen (1. Ga naar... 2. Klik op... 3. Verwacht: ... Actueel: ...)

5. CONFIDENCE: hoe zeker ben je? (0.0-1.0)
   - 0.9+: duidelijke beschrijving, type en component zijn evident
   - 0.6-0.8: redelijk duidelijk maar enige ambiguïteit
   - <0.6: vage beschrijving, moeilijk te classificeren (bijv. "Test" of "dit moet beter")

BELANGRIJK: Classificeer ALTIJD, ook bij vage beschrijvingen. Geef dan een lage confidence.`;

/**
 * Run the Issue Classifier agent on a feedback item.
 * Uses Haiku 4.5 for fast, cost-effective classification.
 * Same pattern as runGatekeeper() and runEmailClassifier().
 */
export async function runIssueClassifier(issue: {
  title: string | null;
  description: string;
  page_url: string | null;
  original_type: string | null; // Userback feedbackType: Bug, Idea, General
}): Promise<IssueClassifierOutput> {
  const issueInfo = [
    issue.title ? `Titel: ${issue.title}` : null,
    issue.original_type ? `Origineel type (Userback): ${issue.original_type}` : null,
    issue.page_url ? `Pagina URL: ${issue.page_url}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxRetries: 3,
    schema: IssueClassifierSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      {
        role: "user",
        content: `${issueInfo}\n\n--- BESCHRIJVING ---\n${issue.description.slice(0, 4000)}`,
      },
    ],
  });

  return object;
}
```

#### Integratie in sync pipeline

```
Userback API → map naar issues → upsert in DB
                                      ↓
                              voor elk NIEUW item (niet update):
                              runIssueClassifier({ title, description, page_url, original_type })
                                      ↓
                              schrijf resultaat naar:
                              - ai_classification JSONB (volledig resultaat + model + timestamp)
                              - component kolom (AI suggestie)
                              - severity kolom (AI suggestie)
                              - ai_classified_at timestamp
                              - type kolom: alleen bij handmatig aanmaken (NIET bij Userback import)
                              - priority kolom: NOOIT overschreven door AI
                                      ↓
                              insert activity log: action = 'classified', metadata = { model, confidence }
```

#### Wanneer draait classificatie?

- **Bij Userback import:** voor elk nieuw geïmporteerd item (batch, sequentieel met 100ms delay)
- **Bij handmatig aanmaken:** als achtergrondtaak na opslaan (fire-and-forget)
- **Niet bij update:** classificatie draait alleen bij aanmaak
- **Re-classificatie:** handmatig triggerable vanuit issue detail (knop "Herclassificeer")

#### Prompt caching strategie

Bij batch import (615 items) wordt de system prompt gecached via `cacheControl: ephemeral`. Dit betekent:

- Eerste call: volledige prompt wordt verwerkt en gecached
- Volgende 614 calls: system prompt komt uit cache → ~90% sneller, ~90% goedkoper op input tokens
- Geschatte kosten eerste sync: **~$0.25-$0.50** (615 items × ~500 input + ~200 output tokens)

#### Opslag

Het resultaat wordt opgeslagen in `ai_classification` (JSONB) en `ai_classified_at`. Het gedrag verschilt per bron:

- **Handmatig aangemaakt issue:** AI schrijft `type`, `component` en `severity` naar de top-level kolommen (als ze leeg zijn). De gebruiker kan deze altijd overschrijven.
- **Userback import:** AI schrijft alleen `component` en `severity` naar top-level kolommen. `type` en `priority` worden NIET overschreven — die komen al correct uit de Userback field mapping (Bug→bug, Idea→feature_request, etc.).

In beide gevallen wordt het volledige AI-resultaat (inclusief `type`) opgeslagen in `ai_classification` JSONB als referentie. Activity log registreert de classificatie als `action: 'classified'`.

### 5.4 Userback API Integratie

#### Bekende data

- **615 bestaande feedback items** over 62 pagina's
- **Project:** caistudio.nl (Userback projectId: `127499`)
- **Feedback types in Userback:** Bug, Idea, General

#### API endpoint

```
GET https://rest.userback.io/1.0/feedback?page={n}&per_page=50
```

#### Authenticatie

- API token via `USERBACK_API_TOKEN` environment variable (server-side only)
- Header: `Authorization: Bearer <token>`

#### API Client

**File:** `packages/database/src/integrations/userback.ts`

```typescript
// Haal 1 pagina op van de Userback REST API
function fetchUserbackFeedbackPage(options: {
  page: number;
  perPage?: number; // default 50
  updatedAfter?: string; // ISO date, voor incremental sync
}): Promise<UserbackFeedbackPage>;

// Haal alle pagina's op (met paginering + rate limiting)
function fetchAllUserbackFeedback(
  updatedAfter?: string, // null = volledige sync, date = incremental
): Promise<UserbackFeedbackItem[]>;
// - 200ms delay tussen pagina's (rate limit bescherming)
// - Gebruikt _pagination.totalPages om te stoppen
// - Filtert op Userback projectId 127499 (caistudio.nl)
```

#### Sync strategie

```
1. Admin klikt "Sync Userback" in DevHub settings/import pagina
    ↓
2. Server Action haalt sync cursor op:
   MAX(source_metadata->>'userback_modified_at') uit issues WHERE source = 'userback'
    ↓
3. Eerste sync: cursor is NULL → haal ALLE pagina's op (62 pagina's, ~615 items)
   Volgende syncs: cursor bestaat → haal alleen items gewijzigd na cursor op
    ↓
4. Per pagina (50 items):
   200ms delay → fetch → map naar issues
    ↓
5. Per item — field mapping:
   ┌─────────────────────────┬──────────────────────────────────────────┐
   │ Userback veld           │ Issues veld                              │
   ├─────────────────────────┼──────────────────────────────────────────┤
   │ id                      │ userback_id (TEXT, voor dedup)           │
   │ description (regel 1)   │ title (of AI-gegenereerd als te lang)   │
   │ description (volledig)  │ description                              │
   │ feedback_type            │ type mapping:                           │
   │                         │   Bug → 'bug'                            │
   │                         │   Idea → 'feature_request'               │
   │                         │   General → 'question'                   │
   │ priority                │ priority mapping:                        │
   │                         │   critical → 'urgent'                    │
   │                         │   important → 'high'                     │
   │                         │   neutral → 'medium'                     │
   │                         │   minor → 'low'                          │
   │ status                  │ status mapping:                          │
   │                         │   Open → 'backlog'                       │
   │                         │   In Progress → 'in_progress'            │
   │                         │   Closed → 'done'                        │
   │ email                   │ reporter_email                           │
   │ name                    │ reporter_name                            │
   │ page_url                │ source_url                               │
   │ Screenshots[0]?.url     │ source_metadata.screenshot_url           │
   │ browser, os, resolution │ source_metadata.{ browser, os, screen }  │
   │ share_url               │ source_metadata.share_url                │
   │ rating, vote_count,     │ source_metadata (overige velden)         │
   │ is_pinned, assignee_id  │                                          │
   │ created_at              │ source_metadata.userback_created_at      │
   │ modified_at             │ source_metadata.userback_modified_at     │
   │ (volledig response)     │ source_metadata.raw_userback (JSONB)     │
   └─────────────────────────┴──────────────────────────────────────────┘

   ⚠ Due date: Userback gebruikt 1970-01-01 als sentinel voor "geen due date" → filter dit weg
    ↓
6. Upsert in batches van 50:
   ON CONFLICT (userback_id) DO UPDATE — idempotent, geen duplicaten
    ↓
7. Per nieuw item (niet update): trigger AI classificatie (async)
   AI vult aan: component, severity, repro_steps
   AI overschrijft NIET de type/priority mapping van Userback (die zijn al gemapped)
    ↓
8. Return resultaat: { imported: X, updated: Y, skipped: Z, total: N }
```

#### Sync API Route

**File:** `apps/devhub/src/app/api/ingest/userback/route.ts`

- **POST** (handmatig): auth via Supabase session, trigger vanuit settings/import UI
- **GET** (optioneel Vercel Cron): auth via `CRON_SECRET`, periodieke sync
- `maxDuration = 60` (Vercel timeout)
- Referentiepatroon: `apps/cockpit/src/app/api/ingest/fireflies/route.ts`

#### Sync UI

Op `/settings/import`:

```
┌──────────────────────────────────────────────────────┐
│  Userback Import                                      │
│                                                       │
│  Project: caistudio.nl (ID: 127499)                  │
│  Laatste sync: 9 apr 2026, 14:32                     │
│  Items in DevHub: 152 (van 615 totaal)               │
│                                                       │
│  [Sync nu]                                            │
│                                                       │
│  ┌─ Laatste sync resultaat ────────────────────┐     │
│  │ 12 nieuw geïmporteerd                       │     │
│  │ 3 bijgewerkt                                 │     │
│  │ 600 overgeslagen (duplicaat)                 │     │
│  │ AI classificatie: 12/12 afgerond             │     │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

#### Configuratie per project

De koppeling tussen een DevHub project en Userback wordt opgeslagen in de `projects` tabel:

```sql
ALTER TABLE projects ADD COLUMN userback_project_id TEXT;
-- CAi Studio: UPDATE projects SET userback_project_id = '127499' WHERE name = 'Cai Studio';
```

#### Verwachte resultaten eerste sync

- 615 items opgehaald uit Userback
- Na status-filtering (alleen Open/In Progress): ~150-200 relevante items
- Na AI classificatie: elk item heeft type, component, severity, repro_steps
- Geschatte sync-duur: ~2-3 minuten (62 pagina's × 200ms delay + processing)

### 5.5 UI Spec

#### Layout

De DevHub UI is geInspireerd door **Linear**: minimalistisch, snel, keyboard-friendly.

```
┌─────────────────────────────────────────────────────────────┐
│  [JAIP DevHub]   [Project: CAi Studio ▾]        [+ Issue]  │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  Issue List                                      │
│          │                                                  │
│ ▸ Backlog│  ┌─ Filter bar ────────────────────────────┐     │
│ ▸ Todo   │  │ Status ▾  Priority ▾  Type ▾  Assigned ▾│    │
│ ▸ In     │  └────────────────────────────────────────────┘  │
│   Progress│                                                 │
│ ▸ Done   │  ☐ ● Login page crash on Safari      urgent  P1 │
│          │  ☐ ● API timeout bij upload > 5MB     high    P2 │
│ ─────────│  ☐ ○ Dark mode toggle werkt niet      medium  P3 │
│ Filters  │  ☐ ○ Voeg export functie toe          low     FR │
│ Labels   │  ☐ ○ Hoe werkt de zoekfunctie?        low     Q  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

#### Pagina's

| Route              | Beschrijving                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `/`                | Redirect naar `/issues`                                              |
| `/issues`          | Issue list met filters, sortering, project switcher                  |
| `/issues/[id]`     | Issue detail: beschrijving, AI classificatie, comments, activity log |
| `/issues/new`      | Nieuw issue formulier                                                |
| `/settings`        | Project settings, Userback koppeling                                 |
| `/settings/import` | Userback sync pagina                                                 |
| `/login`           | Login pagina (Supabase Auth)                                         |

#### Issue List

- **Tabel/list view** (niet kaarten) — compact, veel informatie per regel
- **Kolommen:** priority indicator, titel, type badge, component badge, assigned avatar, status, created date
- **Sortering:** standaard op priority (urgent eerst), secundair op created_at (nieuwst eerst)
- **Filters:** status (multi-select), priority (multi-select), type (multi-select), component (multi-select), assigned_to (multi-select)
- **Sidebar:** snelle navigatie op status (Triage, Backlog, Todo, In Progress, Done) met counts. Triage bovenaan met oranje badge voor onverwerkte items
- **Project switcher:** dropdown in de top bar, persistent (opgeslagen in localStorage)

**Uitgesteld naar fase 2:**

- Keyboard shortcuts (`c` = nieuw issue, `1-4` = status wijzigen, `/` = zoeken)
- Bulk acties (checkbox selectie → status wijzigen, toewijzen, priority wijzigen)

#### Issue Detail

```
┌──────────────────────────────────────────────────────────┐
│  ← Terug   #42                                [Bewerken] │
├──────────────────────────────────────┬───────────────────┤
│                                      │                   │
│  Login page crash on Safari          │ Status            │
│  ─────────────────────────────       │ [In Progress ▾]   │
│                                      │                   │
│  Beschrijving                        │ Priority           │
│  ──────────────                      │ [Urgent ▾]        │
│  Als je op de login pagina komt in   │                   │
│  Safari 18.2 crashed de pagina met   │ Type              │
│  een wit scherm. Console toont:      │ Bug               │
│  "Uncaught TypeError: ..."           │                   │
│                                      │ Component         │
│  AI Reproductiestappen               │ Frontend          │
│  ──────────────────────              │                   │
│  1. Open Safari 18.2                 │ Severity          │
│  2. Navigeer naar /login             │ Critical          │
│  3. Pagina crashed met wit scherm    │                   │
│                                      │ Toegewezen aan    │
│  ═══════════════════════════════     │ [Kenji ▾]         │
│                                      │                   │
│  Comments & Activiteit               │ Labels            │
│  ─────────────────────               │ [Safari] [Login]  │
│  ↻ Status: backlog → in_progress    │                   │
│    Stef · 3 uur geleden             │ Bron              │
│                                      │ Userback          │
│  💬 Kenji · 2 uur geleden           │                   │
│  "Fixed in commit abc123, was een    │ Aangemaakt         │
│  polyfill issue"                     │ 7 apr 2026        │
│                                      │                   │
│  [Voeg comment toe...]              │                   │
└──────────────────────────────────────┴───────────────────┘
```

**Fase 1 vereenvoudiging:** Comments en activity worden samengevoegd in één chronologische feed onderaan het issue. Geen aparte activity log pagina.

#### Project Switcher

- Dropdown in de top navigation bar
- Toont alle projecten waar de gebruiker toegang toe heeft
- Selectie wordt opgeslagen in localStorage
- URL bevat geen project — het is een app-level filter (zoals Linear workspaces)

#### Issue Nummering

Issues krijgen een simpel auto-increment nummer per project: `#1`, `#2`, `#3`, etc. Opgeslagen als `issue_number` (integer). Om race conditions bij concurrent inserts te voorkomen, wordt een aparte sequence-tabel gebruikt met een transaction lock:

```sql
-- Sequence tabel voor issue nummering per project
CREATE TABLE issue_number_seq (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Bij insert: volgende nummer ophalen via transactie
-- UPDATE issue_number_seq SET last_number = last_number + 1
--   WHERE project_id = $1 RETURNING last_number;
-- (als rij niet bestaat, INSERT met last_number = 1)
```

Extra kolom in `issues`:

```sql
issue_number INTEGER NOT NULL,  -- auto-increment per project (via issue_number_seq tabel)
```

**Uitgesteld naar fase 2:** Configureerbare prefix per project (bijv. `CAI-001`, `JAIP-042`).

### 5.6 Auth & Permissions (Fase 1)

- **Supabase Auth** — zelfde instance als cockpit
- **Login:** email/password (zelfde accounts als cockpit)
- **Middleware:** route guard op alle routes behalve `/login`
- **Fase 1:** alle authenticated users zien alle projecten en issues (permissive RLS)
- **Voorbereiding fase 2:** `devhub_project_access` tabel is aanwezig maar wordt nog niet actief gebruikt voor filtering

### 5.7 Technische Architectuur

#### App structuur

```
apps/devhub/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 -- Root layout met sidebar, project switcher
│   │   ├── page.tsx                   -- Redirect naar /issues
│   │   ├── login/
│   │   │   └── page.tsx               -- Login pagina
│   │   ├── issues/
│   │   │   ├── page.tsx               -- Issue list met filters
│   │   │   ├── new/
│   │   │   │   └── page.tsx           -- Nieuw issue formulier
│   │   │   └── [id]/
│   │   │       └── page.tsx           -- Issue detail + comments
│   │   ├── settings/
│   │   │   ├── page.tsx               -- Project settings
│   │   │   └── import/
│   │   │       └── page.tsx           -- Userback sync
│   │   └── api/
│   │       └── classify/
│   │           └── route.ts           -- AI classificatie endpoint (intern)
│   ├── actions/
│   │   ├── issues.ts                  -- createIssue, updateIssue, deleteIssue, bulkUpdateIssues
│   │   ├── comments.ts                -- createComment, updateComment, deleteComment
│   │   ├── import.ts                  -- syncUserback
│   │   └── classify.ts                -- classifyIssue (calls AI)
│   ├── components/
│   │   ├── issues/
│   │   │   ├── issue-list.tsx         -- Tabel/list component
│   │   │   ├── issue-row.tsx          -- Enkele rij in de lijst
│   │   │   ├── issue-detail.tsx       -- Detail view
│   │   │   ├── issue-form.tsx         -- Create/edit formulier
│   │   │   ├── issue-filters.tsx      -- Filter bar
│   │   │   └── issue-sidebar.tsx      -- Status sidebar met counts
│   │   ├── comments/
│   │   │   ├── comment-list.tsx
│   │   │   └── comment-form.tsx
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx        -- Hoofd sidebar navigatie
│   │   │   ├── project-switcher.tsx   -- Project dropdown
│   │   │   └── top-bar.tsx
│   │   └── shared/
│   │       ├── priority-badge.tsx
│   │       ├── status-badge.tsx
│   │       ├── type-badge.tsx
│   │       └── component-badge.tsx
│   ├── lib/
│   │   └── utils.ts                   -- cn() helper
│   └── middleware.ts                  -- Auth route guard
├── next.config.ts
├── tailwind.css                       -- Tailwind v4 CSS-first config
├── tsconfig.json
└── package.json
```

#### Status Page app structuur (`apps/statuspage/`) — FASE 2

> **Verplaatst naar fase 2.** De status page wordt pas gebouwd nadat de core DevHub app stabiel is.

Aparte app: publieke, read-only status pagina per project. Geen login vereist — toegang via `project_key` in de URL.

```
apps/statuspage/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 -- Minimale layout, JAIP branding
│   │   ├── page.tsx                   -- 404 / "Voer een project key in"
│   │   └── [project_key]/
│   │       └── page.tsx               -- Status overzicht voor project
│   ├── components/
│   │   ├── open-issues-list.tsx       -- Lijst open bugs (titel + status, geen interne details)
│   │   ├── resolved-issues-list.tsx   -- Recent opgeloste items
│   │   └── status-header.tsx          -- Project naam + samenvatting
│   └── lib/
│       └── utils.ts
├── next.config.ts
├── tailwind.css
├── tsconfig.json
└── package.json
```

**Wat de client ziet:**

```
┌──────────────────────────────────────────────────────────┐
│  Jouw AI Partner — Project Status                        │
│  ════════════════════════════════                        │
│                                                          │
│  CAi Studio                                              │
│  12 open issues · 8 opgelost deze maand                 │
│                                                          │
│  Open                                                    │
│  ────                                                    │
│  ● Studio opslaan verliest content          In progress  │
│  ● Login crash op Safari 18.2               In progress  │
│  ● Co-founder slaat fases over              Todo         │
│  ● Upload timeout bij grote bestanden       Todo         │
│  ● ...                                                   │
│                                                          │
│  Recent opgelost                                         │
│  ───────────────                                         │
│  ✓ Chat response tijd verbeterd (40s → 4s)  7 apr 2026  │
│  ✓ Claude model integratie                  6 apr 2026  │
│  ✓ Image generation fix                     5 apr 2026  │
│  ✓ ...                                                   │
│                                                          │
│  Powered by Jouw AI Partner                              │
└──────────────────────────────────────────────────────────┘
```

**Kenmerken:**

- **Geen login** — URL met `project_key` is de toegang (bijv. `status.jouwaipartner.nl/proj_a1b2c3d4`)
- **Read-only** — geen interactie, puur informatie
- **Gefilterde data** — toont alleen titel en status, geen comments, activity, toewijzing of interne labels
- **Automatisch actueel** — leest direct uit `issues` tabel, geen handmatige sync
- **Responsive** — werkt op mobiel en desktop

**Queries (in `@repo/database`):**

```typescript
// packages/database/src/queries/status-page.ts
function getProjectByKey(projectKey: string): Promise<Project | null>;
function listPublicIssues(projectId: string): Promise<PublicIssue[]>; // alleen titel, status, type, created_at, closed_at
function getPublicIssueCounts(
  projectId: string,
): Promise<{ open: number; resolved_this_month: number }>;
```

**RLS:** De status page gebruikt de **admin client** (service role) om issues op te halen, niet de anon key. Dit voorkomt dat de `issues` tabel publiek leesbaar hoeft te zijn. De app filtert server-side welke velden naar de client gaan (alleen titel, status, type, datum).

#### Shared packages

DevHub gebruikt dezelfde shared packages als cockpit:

- **`@repo/database`** — Supabase clients, queries, mutations (uitgebreid met issue queries/mutations)
- **`@repo/ai`** — AI classificatie agent (nieuw: `agents/issue-classifier.ts`)
- **`@repo/mcp`** — niet in fase 1, later voor cockpit integratie

#### Nieuwe bestanden in shared packages

```
packages/database/src/
├── queries/
│   └── issues.ts              -- listIssues, getIssueById, getIssueCounts, listIssueComments, listIssueActivity
├── mutations/
│   └── issues.ts              -- insertIssue, updateIssue, deleteIssue, insertComment, insertActivity, bulkUpdateIssues

packages/ai/src/
├── agents/
│   └── issue-classifier.ts    -- AI classificatie agent (Haiku 4.5)
├── validations/
│   └── issue-classification.ts -- Zod schema voor classificatie output
```

#### Database queries (signatures)

```typescript
// packages/database/src/queries/issues.ts
function listIssues(params: {
  projectId: string;
  status?: string[];
  priority?: string[];
  type?: string[];
  component?: string[];
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Issue[]>;

function getIssueById(id: string): Promise<Issue | null>;
function getIssueCounts(
  projectId: string,
): Promise<{ backlog: number; todo: number; in_progress: number; done: number; cancelled: number }>;
function listIssueComments(issueId: string): Promise<IssueComment[]>;
function listIssueActivity(issueId: string): Promise<IssueActivity[]>;
```

#### Server Actions (signatures)

```typescript
// apps/devhub/src/actions/issues.ts
async function createIssue(
  data: CreateIssueInput,
): Promise<{ success: true; data: Issue } | { error: string }>;
async function updateIssue(
  id: string,
  data: UpdateIssueInput,
): Promise<{ success: true } | { error: string }>;
async function deleteIssue(id: string): Promise<{ success: true } | { error: string }>;
async function bulkUpdateIssues(
  ids: string[],
  data: Partial<UpdateIssueInput>,
): Promise<{ success: true; count: number } | { error: string }>;

// apps/devhub/src/actions/import.ts
async function syncUserback(
  projectId: string,
): Promise<{ success: true; imported: number; skipped: number } | { error: string }>;

// apps/devhub/src/actions/classify.ts
async function classifyIssue(issueId: string): Promise<{ success: true } | { error: string }>;
```

#### Zod schemas

```typescript
// createIssueSchema
const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(["bug", "feature_request", "question"]).default("bug"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  component: z.enum(["frontend", "backend", "api", "database", "prompt_ai", "unknown"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigned_to: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
});

// updateIssueSchema
const updateIssueSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(["bug", "feature_request", "question"]).optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  component: z.enum(["frontend", "backend", "api", "database", "prompt_ai", "unknown"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

// createCommentSchema
const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});
```

### 5.8 Triage Inbox

> **Let op:** Duplicate detection via embeddings is verplaatst naar **fase 2**. In fase 1 komen items in triage zonder automatische duplicaat-markering. De triage inbox functioneert als handmatige zeef.

#### Waarom triage als aparte status

Linear-geïnspireerd: items komen binnen in een **triage inbox** voordat ze de backlog betreden. Dit voorkomt dat 615 Userback items (waaronder tests, duplicaten, en niet-actioneerbare feedback) direct de backlog vervuilen. Triage is de zeef.

| Zonder triage                                        | Met triage                                    |
| ---------------------------------------------------- | --------------------------------------------- |
| 615 items in backlog, developer ziet chaos           | 615 items in triage, 150 relevante in backlog |
| "Test" en "Wallah deze tekst" staan naast echte bugs | Spam wordt in triage afgekeurd                |
| Duplicaten verspreid door de lijst                   | Duplicaten gemerged in triage                 |

#### Status flow

```
triage → backlog → todo → in_progress → done
  ↓                                       ↑
  cancelled ←─────────────────────────────┘
```

- **Userback import:** items komen binnen als `triage`
- **Handmatig aanmaken:** items komen binnen als `backlog` (handmatig = al getriaged)
- **Triage acties:** accepteer (→ backlog), accepteer + toewijzen (→ todo), afwijzen (→ cancelled), mergen (→ cancelled + duplicate_of_id)

#### Triage UI

```
┌──────────────────────────────────────────────────────────────┐
│  Triage Inbox                                    47 items    │
│                                                              │
│  Sorteer: [Confidence ↑]  [Severity ↓]  [Datum ↓]          │
│                                                              │
│  ⚠ Lage confidence (AI onzeker)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🟡 "Test"                          conf: 0.3  Gen   │   │
│  │    → AI: question, unknown, low                      │   │
│  │    [Accepteer] [Afwijzen] [Mergen]                   │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🟡 "Wallah deze tekst moet beter"  conf: 0.4  Gen   │   │
│  │    → AI: feature_request, frontend, low              │   │
│  │    ⚠ Mogelijk duplicaat van #12 "Tekst aanpassen"   │   │
│  │    [Accepteer] [Afwijzen] [Mergen met #12]           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Gesorteerd op severity                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔴 "Login crash op Safari"         conf: 0.95 Bug   │   │
│  │    → AI: bug, frontend, critical                     │   │
│  │    Repro: 1. Open Safari 2. Ga naar /login 3. Crash  │   │
│  │    [Accepteer → Backlog] [Accepteer → Toewijzen ▾]   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

#### Duplicate Detection (embedding-based) — FASE 2

> **Verplaatst naar fase 2.** De kolommen (`embedding`, `duplicate_of_id`, `similarity_score`) worden al aangemaakt in fase 1, maar de pipeline en UI worden pas in fase 2 gebouwd.

Gebruikt Cohere embed-v4 (1024 dimensies) — dezelfde embedding pipeline als extractions en meetings.

**Bestand:** `packages/ai/src/pipeline/issue-dedup.ts`

**Flow bij import:**

```
Nieuw issue binnenkomst (na classificatie)
    ↓
Genereer embedding van: title + description (via embedText uit @repo/ai/embeddings)
    ↓
Sla embedding op in issues.embedding kolom
    ↓
Zoek bestaande issues met cosine similarity > 0.85:
  SELECT id, title, 1 - (embedding <=> $1) AS similarity
  FROM issues
  WHERE project_id = $2
    AND status NOT IN ('cancelled')
    AND id != $3
  ORDER BY embedding <=> $1
  LIMIT 3
    ↓
Bij match (similarity > 0.85):
  → Sla duplicate_of_id en similarity_score op
  → Markeer in triage UI: "Mogelijk duplicaat van #42 (92% match)"
    ↓
Bij geen match:
  → Normaal triage item zonder duplicaat-markering
```

**Kosteninschatting eerste sync:**

- 615 items × Cohere embed-v4 → ~$0.06 (Cohere pricing: $0.10/M tokens)
- Cosine similarity queries via pgvector → gratis (lokale DB operatie)
- **Totaal: ~$0.06** voor alle embeddings

**Belangrijk:** Duplicate detection is een **suggestie**, geen automatische actie. De mens beslist in triage of items daadwerkelijk gemerged worden.

#### Nieuwe index voor duplicate detection

```sql
CREATE INDEX idx_issues_embedding ON issues
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);
```

`lists = 20` is voldoende voor <10.000 issues. Verhoog bij groei.

#### Nieuwe queries

```typescript
// packages/database/src/queries/issues.ts

// Triage inbox: alle items met status 'triage', gesorteerd op confidence ASC (onzeker eerst)
function listTriageItems(projectId: string): Promise<TriageItem[]>;

// Vind vergelijkbare issues op basis van embedding
function findSimilarIssues(
  embedding: number[],
  projectId: string,
  excludeId?: string,
): Promise<SimilarIssue[]>;
```

#### Nieuwe mutations

```typescript
// packages/database/src/mutations/issues.ts

// Accepteer item uit triage (→ backlog of todo)
function triageIssue(
  issueId: string,
  action: "accept" | "reject" | "merge",
  options?: {
    newStatus?: "backlog" | "todo";
    assignedTo?: string;
    mergeIntoId?: string; // bij merge: het originele issue
  },
): Promise<{ success: true } | { error: string }>;
```

---

## 6. Fase 2 — Developer Workflow + Status Page (High-level)

### Scope

- **Verplaatst uit fase 1:**
  - **Status Page app** (`apps/statuspage/`) — publieke, read-only status pagina per project (zie sectie 5.7)
  - **Duplicate detection** via embeddings — automatische duplicaat-suggesties in triage (zie sectie 5.8)
- **Uitgesteld uit fase 1:**
  - Keyboard shortcuts (`c` = nieuw issue, `1-4` = status, `/` = zoeken)
  - Bulk acties (multi-select → status/priority/toewijzing wijzigen)
  - Configureerbare issue nummering per project (bijv. `CAI-001`)
- **Status flow met transities** — definieer geldige overgangen (bijv. triage → backlog → todo → in_progress → done, niet triage → done)
- **Slack notificaties** — stuur meldingen naar Slack via Incoming Webhooks bij relevante events:
  - **Triggers:** status wijziging, toewijzing aan developer, nieuw critical/high issue
  - **Techniek:** Slack Incoming Webhook per project (webhook URL opgeslagen in `devhub_projects.slack_webhook_url`)
  - **Bericht format:** Slack Block Kit — issue nummer + titel, wat er veranderde, wie, severity, directe link naar issue
  - **Voorbeeld:**
    ```
    🐛 [CAI-042] Login crash op Safari
    Status: backlog → in_progress
    Toegewezen aan: Kenji
    Severity: critical · Project: CAi Studio
    → Bekijk issue
    ```
  - **Implementatie:** fire-and-forget POST vanuit Server Actions (na succesvolle DB mutatie). Mag falen zonder de gebruiker te blokkeren
  - **Configuratie:** per project in/uit te schakelen + keuze welke events een melding triggeren
  - **Setup:** Slack App met Incoming Webhooks (workspace bestaat al), webhook URL per kanaal/project
- **Geavanceerde filters** — opgeslagen filter views per gebruiker ("Mijn issues", "Urgent bugs", "CAi Studio backlog")
- **Views per project** — custom views configureerbaar per project
- **Guest role activatie** — fine-grained RLS op basis van `devhub_project_access`: guests zien alleen issues van gekoppelde projecten
- **AI-context per handover** — wanneer een issue wordt toegewezen, genereert AI een samenvatting met alle relevante context (beschrijving, comments, gerelateerde issues). Wordt opgeslagen in `ai_context` kolom
- **AI stelt `ai_executable` in** — bij classificatie bepaalt AI of het issue automatisch opgelost kan worden (op basis van `project_type` en issue complexiteit). Puur informatief in fase 2, geen executie

### Nieuwe database elementen

- `issue_views` tabel (opgeslagen filters per gebruiker)
- RLS policies bijwerken voor guest role filtering
- `devhub_projects.slack_webhook_url` kolom (TEXT, nullable) — Incoming Webhook URL per project
- `devhub_projects.slack_notify_events` kolom (TEXT[] DEFAULT '{status_change,assignment,critical_issue}') — configureerbare event types
- Utility functie `sendSlackNotification(webhookUrl, payload)` in `packages/database/src/mutations/slack.ts`

---

## 7. Fase 3 — Feature Requests & Roadmap (High-level)

### Scope

- **Feature requests** als volwaardig issue type naast bugs (al voorbereid in fase 1 datamodel met `type: 'feature_request'`)
- **Roadmap view** — visueel overzicht van geplande features per tijdsperiode (kanban of timeline)
- **Milestones** — groepeer issues onder milestones (bijv. "v2.0 release", "Q3 2026")
- **Linking** — koppel issues aan elkaar (blocks, blocked_by, related_to)
- **Sprint planning** — toewijzen van issues aan sprints/milestones met capacity planning

### Nieuwe database elementen

- `milestones` tabel (naam, deadline, project_id, status)
- `issue_links` tabel (issue_id, linked_issue_id, link_type)
- `milestone_id` kolom op `issues` tabel

---

## 8. Fase 4 — Eigen Feedback Widget (High-level)

### Scope

- **Eigen widget** vervangt Userback als primaire feedback-bron
- Widget vangt op: type (bug/idee), beschrijving, pagina URL, browser/OS, screenshot (optioneel)
- Feeds **direct in DevHub** via publiek API endpoint (niet via cockpit)
- Userback blijft als secundaire bron totdat migratie compleet is

### Relatie met bestaande Feedback Widget PRD

Er bestaat al een PRD voor de feedback widget: `docs/specs/prd-feedback-widget.md`. Die PRD focust op de **widget zelf** (UI, embed mechanisme, bundle size) en de cockpit-integratie. In deze fase wordt de widget **gekoppeld aan DevHub** in plaats van (of naast) cockpit:

- Widget POST endpoint verhuist naar DevHub of wordt dubbel beschikbaar
- Inkomende feedback wordt een `issue` in plaats van een `feedback` record
- AI classificatie draait automatisch bij binnenkomst
- De `feedback` tabel uit de widget PRD kan als tussenstap dienen of direct naar `issues` schrijven

### Technisch

- Hergebruik van de widget code uit `apps/widget/` (als die gebouwd is)
- Nieuw: `POST /api/issues/widget` endpoint in DevHub
- Publiek endpoint met rate limiting en CORS
- `project_key` op `projects` tabel (al gedefinieerd in widget PRD) voor routing

---

## 9. Fase 5 — Cockpit Integratie (High-level)

### Scope

- **DevHub data zichtbaar in cockpit** — PM-laag bovenop development data
- Cockpit toont per project: aantal open bugs, trend (meer/minder), kritieke issues
- **AI Analyst** (Opus) kan DevHub data meenemen in cross-source analyses
- **MCP tools** voor DevHub queries: `get_issues`, `get_issue_summary`, `search_issues`
- Dashboard widget in cockpit: "Development Health" per project

### Cirkel compleet

```
Cockpit ziet: "CAi Studio heeft 12 open bugs, 3 critical, trend stijgend"
    ↓
PM (Stef) escaleert in cockpit: "Priority verhogen voor CAi Studio development"
    ↓
DevHub: developers zien gewijzigde prioriteiten
    ↓
Bugs worden opgelost → feedback widget vangt nieuwe issues op
    ↓
Cockpit ziet: "CAi Studio bug count daalt, klant health verbetert"
```

### Nieuwe elementen

- MCP tools in `packages/mcp/src/tools/` voor issue queries
- Dashboard component in cockpit
- Cross-package queries die issues en meetings/extractions combineren

---

## 10. Fase 6 — AI Executie (High-level, toekomst)

### Scope

- **AI als developer** — voor projecten met `project_type: 'codebase'`, kan AI issues oppakken uit de kanban
- **Execution flow:** issue staat op `todo` met `execution_type: 'ai_autonomous'` → AI agent leest beschrijving + `ai_context` → maakt branch → implementeert → opent PR → schrijft resultaat naar `ai_result` → mens reviewt
- **Assisted mode:** `execution_type: 'ai_assisted'` — AI genereert een implementatieplan en instructieset, developer voert uit
- **Begrenzing:** alleen voor eigen codebase-projecten (cockpit, devhub, statuspage, klant-apps waar JAIP de codebase beheert). Niet voor N8N/Windmill/externe tooling
- **Mens blijft reviewer** — AI opent PR, mens merged. Geen directe deploy door AI

### Wat dit mogelijk maakt

```
Bug komt binnen: "Login crash op Safari"
    ↓
AI classificeert: bug, frontend, critical
    ↓
AI genereert context: "Waarschijnlijk polyfill issue, vergelijkbaar met BUG-023"
    ↓
AI markeert: ai_executable = true (project is codebase)
    ↓
Issue gaat naar 'todo' met execution_type: 'ai_autonomous'
    ↓
AI agent maakt branch, implementeert fix, opent PR
    ↓
Developer reviewt, merged → issue gaat naar 'done'
    ↓
Status page update automatisch → client ziet fix
```

### Vereisten (niet in scope tot fase 6)

- GitHub/GitLab API integratie (`repo_url` op project)
- AI agent met code-toegang (Claude Code of vergelijkbaar)
- Veilige sandboxing voor AI-gegenereerde code
- Review workflow (PR approval vereist)

---

## 10b. Data Model — Volledig Overzicht

### Nieuwe tabellen

| Tabel                   | Fase                   | Beschrijving                          |
| ----------------------- | ---------------------- | ------------------------------------- |
| `issues`                | 1                      | Kern: bugs, feature requests, vragen  |
| `issue_comments`        | 1                      | Discussie threads per issue           |
| `issue_activity`        | 1                      | Audit trail: alle wijzigingen         |
| `devhub_project_access` | 1 (schema), 2 (actief) | Koppeling gebruiker ↔ project met rol |
| `issue_views`           | 2                      | Opgeslagen filter/sort configuraties  |
| `milestones`            | 3                      | Groepering van issues                 |
| `issue_links`           | 3                      | Relaties tussen issues                |

### Wijzigingen aan bestaande tabellen

| Tabel      | Wijziging                                                                                              | Fase                       |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| `projects` | + `userback_project_id TEXT`                                                                           | 1                          |
| `projects` | + `project_key TEXT UNIQUE`                                                                            | 1 (nodig voor status page) |
| `projects` | + `project_type TEXT DEFAULT 'external'` — `'codebase'` \| `'external'` (bepaalt of AI kan executeren) | 1 (voorbereid)             |
| `projects` | + `repo_url TEXT` (GitHub/GitLab repo voor codebase-projecten)                                         | 6                          |
| `issues`   | + `milestone_id UUID FK`                                                                               | 3                          |

### Relaties

```
organizations ─1:N─ projects ─1:N─ issues ─1:N─ issue_comments
                      │              │     ─1:N─ issue_activity
                      │              │
                      │         people (assigned_to)
                      │              │
                      │         profiles (author_id in comments, actor_id in activity)
                      │
                 project_type ──── bepaalt of ai_executable mogelijk is
                 project_key ───── toegang voor status page
```

---

## 11. Technische Architectuur — Monorepo Positie

```
/
├── apps/
│   ├── cockpit/          # PM dashboard (bestaand)
│   ├── portal/           # Client portal (placeholder, toekomst)
│   ├── devhub/           # Development portal (NIEUW fase 1 - intern)
│   └── statuspage/       # Client-facing status view (NIEUW fase 2 - publiek)
│
├── packages/
│   ├── database/         # Gedeeld: queries, mutations, types (uitgebreid)
│   ├── ai/               # Gedeeld: agents (+ issue-classifier)
│   └── mcp/              # Gedeeld: MCP tools (uitgebreid in fase 5)
│
├── supabase/
│   └── migrations/       # Nieuwe migraties voor issues tabellen
│
└── turbo.json            # DevHub toevoegen aan workspace config
```

### Turbo configuratie

DevHub wordt toegevoegd als workspace in de root `package.json` en `turbo.json`:

```json
// package.json workspaces
"workspaces": ["apps/*", "packages/*"]
```

DevHub deelt dezelfde build/dev/lint tasks als cockpit.

### Environment variables (DevHub-specifiek)

| Variable                        | Beschrijving                             | Server-only |
| ------------------------------- | ---------------------------------------- | ----------- |
| `USERBACK_API_TOKEN`            | Userback API token voor sync             | Ja          |
| `USERBACK_PROJECT_ID`           | Default Userback project ID (CAi Studio) | Ja          |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase URL (gedeeld)                   | Nee         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (gedeeld)              | Nee         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (gedeeld, voor import)  | Ja          |
| `ANTHROPIC_API_KEY`             | Voor AI classificatie (gedeeld)          | Ja          |

---

## 12. Succes Criteria — Fase 1

### Functioneel

- [ ] Issue list toont alle issues voor geselecteerd project met filtering op status, priority, type, component, assigned_to
- [ ] Issues zijn aanmaakbaar, bewerkbaar, en verwijderbaar via formulieren
- [ ] AI classificeert nieuwe issues automatisch (type, component, severity, repro steps)
- [ ] Userback sync importeert items zonder duplicaten (check op `userback_id`)
- [ ] Comments zijn toevoegbaar per issue
- [ ] Activity log wordt opgeslagen bij elke wijziging (simpele weergave onderaan issue detail)
- [ ] Project switcher werkt en onthoudt selectie

### Technisch

- [ ] App draait als apart Next.js 16 project in de monorepo (`apps/devhub/`)
- [ ] Deelt Supabase database met cockpit via `@repo/database`
- [ ] AI classificatie via `@repo/ai` met Haiku 4.5
- [ ] Alle Server Actions valideren input met Zod
- [ ] RLS policies actief op alle nieuwe tabellen
- [ ] Migraties zijn idempotent en backwards-compatible

### Status Page — VERPLAATST NAAR FASE 2

> Status page is verplaatst naar fase 2. De `project_key` kolom op `projects` wordt al in fase 1 aangemaakt als voorbereiding.

### Operationeel

- [ ] CAi Studio ~150 Userback items zijn geimporteerd en geclassificeerd
- [ ] Kenji en Myrrh kunnen inloggen en hun toegewezen issues zien
- [ ] Triage van binnenkomende bugs kost < 30 seconden per item (dankzij AI pre-classificatie)
- [ ] CAi Studio team (Joep, Chloë, Stefan) heeft een link naar hun status page en kan voortgang volgen

---

## 13. Risico's & Mitigatie

| Risico                                                     | Impact                              | Kans   | Mitigatie                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Userback API rate limits of onverwacht schema              | Import faalt                        | Medium | Bouw retry logica, log ruwe responses, test eerst met kleine batch                                                                 |
| AI classificatie geeft slechte resultaten                  | Handmatig werk niet verminderd      | Laag   | Haiku is goed in classificatie; confidence score toont onzekerheid; mens overschrijft altijd                                       |
| 600 Userback items bevatten veel duplicaten                | Onoverzichtelijke lijst             | Hoog   | Fase 1: geen auto-dedup, sorteer op AI severity zodat belangrijke items bovenaan staan. Fase 2: duplicate detection via embeddings |
| Externe developers (Kenji/Myrrh) krijgen te veel toegang   | Security risico                     | Laag   | Fase 1: alleen authenticated, geen admin rechten. Fase 2: guest role met project-scoped RLS                                        |
| Twee apps (cockpit + devhub) delen auth maar niet sessions | Verwarrende UX                      | Medium | Zelfde Supabase Auth instance, cookies per domein. Duidelijke navigatie tussen apps                                                |
| Scope creep in fase 1                                      | Vertraging terwijl CAi Studio wacht | Hoog   | Strakke scope: alleen issue list + import + classificatie. Alles anders is fase 2+                                                 |
| Userback wordt te vroeg uitgezet                           | Feedback gaat verloren              | Laag   | Userback blijft parallel actief tot eigen widget (fase 4) bewezen is                                                               |
