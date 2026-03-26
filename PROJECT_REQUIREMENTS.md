# AI-First Company Knowledge Platform — Project Requirements

## 1. Project Overview

Build an AI-first knowledge platform that ingests company data from multiple sources, maintains quality through specialized agents, and makes the knowledge accessible to any LLM assistant (Claude, Gemini, etc.) via an MCP server.

### Goals

- Centralize company knowledge from scattered sources into one searchable database
- Ensure data quality through automated filtering and curation
- Surface insights proactively, not just on-demand
- Keep the system model-agnostic — any MCP-compatible LLM can query the knowledge base
- Break information silos — any team can query any other team's knowledge (marketing ↔ engineering ↔ sales)

### Users & Scale

- **Initial rollout:** ~5 users
- **Target scale:** 20–25 users
- **User roles:** Everyone — engineering, marketing, sales, leadership
- **LLM client:** Claude (for now, all users on the same client)
- **Usage frequency:** Multiple times per day

### Example Queries

These represent the actual questions employees will ask:

- "Do we have a PRD for customer X?"
- "What's the status of project Y?"
- "What came out of the meeting with [client]?"
- "Who in the company is capable of doing this project based on skill, expertise, or recent projects?"

### Alert Delivery

- **Primary channels:** Slack and email
- **Quarantine review:** Each team reviews their own quarantined content, assisted by an agent or custom skill

---

## 2. Architecture Overview

```
    SOURCES                PROCESSING              ACCESS

  Google Docs ---+                            Claude Code --+
  Slack ---------+      +------------+        Gemini -------+
  Fireflies -----+----> | Gatekeeper |        Other LLMs ---+
  Gmail ---------+      +-----+------+                      |
                               |                            |
                               v                            |
                       +--------------+         +-----------+---+
                       |              |<--------|  MCP Server   |
                       |   Supabase   |         |  (query layer)|
                       |              |         +---------------+
                       +------+-------+
                              |
                      +-------+--------+
                      v       v        v
                +--------++-------++----------+
                |Curator ||Analyst||Dispatcher|
                +--------++-------++----------+
                                      |
                                      v
                              Slack / Email /
                              Frontend alerts
```

---

## 3. Technology Stack

### 3.1 Core Stack

| Component            | Technology                        | Reason                                                  |
| -------------------- | --------------------------------- | ------------------------------------------------------- |
| Language             | TypeScript (entire stack)         | One language across frontend, backend, agents, MCP      |
| Frontend             | Next.js + Tailwind + shadcn/ui    | Full-stack framework, SSR, dashboard/data explorer      |
| Backend / API        | Next.js API routes                | Co-located with frontend, handles agent triggers        |
| Database             | Supabase (PostgreSQL + pgvector)  | Structured data + vector embeddings in one platform     |
| Auth & Access        | Supabase Auth + Row Level Security| Role-based access control out of the box                |
| Ingestion Endpoints  | Supabase Edge Functions           | Webhook receivers, close to the database                |
| Embeddings           | Voyage AI (voyage-3) or OpenAI    | Voyage pairs with Claude ecosystem; OpenAI is proven    |
| MCP Server           | TypeScript (Node.js)              | Matches stack, first-class MCP SDK support              |
| Hosting              | Vercel (frontend + API) + Supabase| Zero-config deploys, auto-scaling                       |
| Background Jobs      | Supabase Edge Functions + pg_cron | Re-embedding pipeline, scheduled agent runs             |

### 3.2 AI Agent Frameworks

Two frameworks, each used where it's strongest:

| Framework | Used For | Reason |
| --------- | -------- | ------ |
| **Vercel AI SDK** (`generateObject`) | Gatekeeper, Dispatcher, extraction (people/skills) | Single-pass structured output, typed schemas, high volume. No agent loop needed — prompt in, typed data out |
| **Claude Agent SDK** | Curator, Analyst | Multi-step agentic loops with tool use. These agents need to search, reason, decide, and act across multiple steps |
| **Vercel AI SDK** (`useChat`) | Frontend chat/query interface | Streaming responses, native React hooks |

```
Architecture Overview:

Next.js (Vercel)
  ├── Dashboard / Data Explorer (React + shadcn/ui)
  ├── API routes (agent triggers, coordination)
  └── AI layer
        ├── Vercel AI SDK
        │     ├── Gatekeeper: claude-haiku → generateObject() → score + classify
        │     ├── Dispatcher: claude-haiku or pure rules → route alerts
        │     └── Extraction: claude-haiku → generateObject() → people/skills/entities
        └── Claude Agent SDK
              ├── Curator: claude-sonnet → multi-step DB hygiene loop
              └── Analyst: claude-opus → multi-step pattern detection

Supabase
  ├── PostgreSQL + pgvector (all tables)
  ├── Edge Functions (webhook receivers: Slack, Fireflies, Drive, Gmail)
  ├── Auth + RLS (access control)
  └── pg_cron (scheduled Curator/Analyst runs)

MCP Server (TypeScript, separate process)
  └── Connects Claude clients to Supabase knowledge base
```

---

## 4. Knowledge Sources & Ingestion

### 4.1 Sources

| Source          | API                              | Volume          | Priority | Ingestion Mode |
| --------------- | -------------------------------- | --------------- | -------- | -------------- |
| Fireflies       | Fireflies GraphQL API            | 40+ meetings/wk | 1 (highest value) | Webhook |
| Google Docs     | Google Drive API                 | Hundreds of docs | 2        | Push notifications (`changes.watch`) |
| Slack           | Slack Events API                 | 10 channels, 1000+ msgs/day | 3 | Events API (real-time) |
| Gmail           | Gmail API + Cloud Pub/Sub        | High             | 4 (most noisy) | Push via Pub/Sub |

### 4.2 Real-Time Ingestion (Webhooks & Push)

All sources use real-time ingestion — no batch polling. Each source pushes change signals, and our pipeline fetches the full content on notification.

```
Source Event --> Webhook/Push Notification --> Fetch Full Content --> Pre-Filter --> Gatekeeper --> Database
```

#### Source-Specific Setup

**Fireflies (Webhook)**
- Register webhook URL in Fireflies dashboard (Settings > Developer > Webhooks)
- Fires on `transcription_completed` — payload contains `meeting_id`
- Follow-up: call Fireflies GraphQL API to fetch full transcript, summary, action items
- Gotcha: dashboard-only config, limited retry on failed delivery — implement polling fallback via `transcripts` query

**Google Drive (Push Notifications)**
- Use `changes.watch` endpoint to subscribe to Drive changes
- Notifications are signals only — call `changes.list` to get actual file changes, then fetch doc content
- **Channel expires every 24 hours** — must implement automated renewal (renew at ~80% TTL)
- Requires: verified domain in Google Search Console, HTTPS endpoint, OAuth 2.0 or service account with domain-wide delegation

**Slack (Events API)**
- Subscribe to `message.channels` and `message.groups` events
- Slack POSTs full event payload to our endpoint — must respond within **3 seconds** (offload processing to queue)
- Bot must be invited to each channel it monitors
- Events are at-least-once delivery — implement idempotency via `event_id`
- Alternative: Socket Mode (WebSocket) for development/testing without a public URL

**Gmail (Pub/Sub Push)**
- Create Cloud Pub/Sub topic, grant `gmail-api-push@system.gserviceaccount.com` Publisher role
- Call `users.watch` with topic name and `labelIds` filter (e.g., INBOX only)
- Notification contains `historyId` — call `users.history.list` then `messages.get` for actual emails
- **Watch expires every 7 days** — renew daily via cron
- Requires: Google Cloud project with Gmail API + Pub/Sub enabled, domain verification

### 4.3 Ingestion Pipeline

All incoming content passes through a two-stage filter:

```
Raw Content --> Cheap Rule-Based Pre-Filter --> AI Gatekeeper --> Database
```

**Pre-filter rules (no LLM, rule-based):**

- Slack: skip bot messages, reactions, messages under 20 characters, exclude noisy channels
- Email: filter by sender/subject relevance, skip newsletters and spam
- Google Docs: skip empty docs, templates
- Fireflies: process all (low volume, high value)

**AI Gatekeeper scoring:**

- 0.0 - 0.3: REJECT (chit-chat, spam, irrelevant)
- 0.3 - 0.6: QUARANTINE (might be useful, human review)
- 0.6 - 1.0: PASS (clear business value)

### 4.3 Content Categories

Every admitted piece of content is classified into one or more:

- `decision` — something was decided
- `context` — background information on a project/topic
- `action_item` — someone needs to do something
- `reference` — policy, process, how-to
- `insight` — analysis, opinion, recommendation

---

## 5. Database Schema

### 5.1 Content Tables

```sql
-- Google Docs content (chunked)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB,
    relevance_score FLOAT,
    status TEXT DEFAULT 'active',        -- 'active', 'quarantined', 'archived'
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fireflies meeting transcripts
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    date TIMESTAMP,
    participants TEXT[],
    summary TEXT,
    action_items JSONB,
    transcript TEXT,
    embedding VECTOR(1536),
    relevance_score FLOAT,
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Slack messages (important threads/decisions)
CREATE TABLE slack_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT,
    thread_id TEXT,
    author TEXT,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    relevance_score FLOAT,
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    timestamp TIMESTAMP
);

-- Email threads
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT,
    sender TEXT,
    recipients TEXT[],
    body TEXT NOT NULL,
    embedding VECTOR(1536),
    thread_id TEXT,
    relevance_score FLOAT,
    status TEXT DEFAULT 'active',
    category TEXT[],
    last_reviewed TIMESTAMP,
    source_exists BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    date TIMESTAMP
);
```

### 5.2 People & Entity Graph

```sql
-- People in the organization
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    team TEXT,
    role TEXT,
    embedding VECTOR(1536),          -- aggregated profile vector
    embedding_stale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Skills/expertise extracted from all sources
CREATE TABLE people_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id),
    skill TEXT NOT NULL,
    evidence_count INT DEFAULT 1,    -- how many sources mention this
    last_seen TIMESTAMP,
    source_ids JSONB                 -- [{source_type, source_id}]
);

-- Project involvement extracted from all sources
CREATE TABLE people_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id),
    project TEXT NOT NULL,
    role_in_project TEXT,            -- 'lead', 'contributor', 'reviewer'
    last_mentioned TIMESTAMP,
    source_ids JSONB
);

-- Projects and clients as first-class entities
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[],                  -- ["Project Alpha", "Alpha", "the alpha project"]
    client TEXT,
    status TEXT DEFAULT 'active',
    embedding VECTOR(1536),
    embedding_stale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Structured Extraction Tables

```sql
-- Extracted decisions from all sources
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision TEXT NOT NULL,
    context TEXT,
    source_type TEXT,          -- 'meeting', 'document', 'slack', 'email'
    source_id UUID,
    made_by TEXT,
    date TIMESTAMP,
    status TEXT DEFAULT 'active'
);

-- Extracted action items
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    assignee TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open',  -- 'open', 'in_progress', 'done'
    source_type TEXT,
    source_id UUID
);
```

### 5.4 System Tables

```sql
-- Audit trail for all agent actions
CREATE TABLE content_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID,
    content_table TEXT,
    agent_role TEXT,            -- 'gatekeeper', 'curator', 'analyst'
    action TEXT,                -- 'admitted', 'rejected', 'quarantined', 'merged', 'archived'
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insights generated by the Analyst agent
CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    supporting_sources JSONB,   -- [{source_type, source_id}]
    topic TEXT,
    dispatched BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Re-Embedding Pipeline

Content changes constantly — docs get edited, people gain new skills, projects evolve. Stale embeddings return wrong search results. Every table with an `embedding` column also has an `embedding_stale` flag.

### 6.1 Flow

```
Content changes (update/merge/new extraction)
       |
       v
Mark embedding_stale = true
       |
       v
Re-embedding worker (background, batched)
       |
       v
Fetch current content → generate new embedding → write back
       |
       v
Mark embedding_stale = false
```

### 6.2 Trigger Points

| Event | What needs re-embedding |
|---|---|
| Google Doc updated | Document chunks for that doc |
| New meeting ingested mentioning a person | That person's `people.embedding` (aggregated profile) |
| Curator merges two entries | The surviving merged entry |
| Action item status changes | The action item row (if embedded) |
| New skill extracted for a person | That person's profile vector |
| Project info changes | The `projects.embedding` vector |

### 6.3 Implementation

- Background worker runs via Supabase Edge Function or pg_cron
- Queries all rows where `embedding_stale = true`, batched (e.g., 50 at a time)
- Calls embedding API (Voyage/OpenAI) and writes back
- For `people.embedding`: aggregates all skills, projects, and recent mentions into a text profile, then embeds that
- Frequency: every 5–10 minutes (near-real-time, not blocking ingestion)

---

## 7. Custom Agents

### 7.1 Gatekeeper Agent

- **Purpose:** Filter and score all incoming content before database insertion
- **Trigger:** Event-driven (on new content from ingestion pipeline)
- **Model:** Claude Haiku (fast, cheap — handles high volume)
- **Inputs:** Raw content + pre-filter metadata
- **Outputs:** Scored and categorized entry inserted into DB, quarantine, or rejection logged
- **Key logic:**
  - Relevance check (is this business-relevant?)
  - Novelty check (semantic similarity against existing embeddings, reject if > 0.92)
  - Signal vs. noise scoring (0.0 - 1.0)
  - Category classification

### 7.2 Curator Agent

- **Purpose:** Maintain database quality and hygiene over time
- **Trigger:** Scheduled (nightly cron)
- **Model:** Claude Sonnet (reasoning needed, not time-sensitive)
- **Tasks:**
  - Duplicate sweep (merge entries with embedding similarity > 0.90)
  - Staleness check (flag unreferenced content older than threshold)
  - Contradiction detection (find conflicting statements on same topic)
  - Source validation (verify source docs still exist)
  - Quarantine review (auto-promote or auto-reject based on patterns)
- **Output:** Health report, merged/archived entries logged in content_reviews

### 7.3 Analyst Agent

- **Purpose:** Generate proactive insights from accumulated knowledge
- **Trigger:** Daily scheduled run + triggered by Curator findings
- **Model:** Claude Opus (deep reasoning, highest-value output)
- **Tasks:**
  - Cross-source pattern detection
  - Trend identification over time
  - Risk/opportunity flagging
  - Contradiction alerts
- **Output:** Insight cards written to `insights` table
- **Examples:**
  - "3 meetings this week mentioned churn risk for Client X"
  - "Contradicting decisions about API redesign found across 2 docs"
  - "Action item from Feb 12 meeting still unresolved"

### 7.4 Dispatcher Agent

- **Purpose:** Route agent outputs (insights, alerts, digests) to the right people/channels
- **Trigger:** Event-driven (new entries in insights table, new alerts)
- **Model:** Claude Haiku or rule-based (simple routing logic)
- **Outputs:** Slack messages, email digests, frontend notifications
- **Routing logic:** Based on topic, urgency, and recipient role

---

## 8. MCP Server

### 8.1 Purpose

Thin query layer that connects any MCP-compatible LLM client (Claude Code, Gemini, etc.) to the Supabase knowledge base. No custom "responder" agent needed — the LLM itself is the responder.

### 8.2 Tools Exposed

| Tool                                    | Description                                      |
| --------------------------------------- | ------------------------------------------------ |
| `search_knowledge(query)`               | Semantic search across all content tables         |
| `get_decisions(topic, date_range)`      | Structured query for decisions                    |
| `get_action_items(assignee, status)`    | List action items, filterable                     |
| `get_meeting_summary(meeting_id)`       | Retrieve a specific meeting summary               |
| `get_document(doc_id)`                  | Retrieve a specific document                      |
| `get_insights(topic, timeframe)`        | Retrieve analyst-generated insights               |
| `find_people(query, skill, project)`    | Find people by skill, project involvement, or semantic match |
| `get_person_profile(person_id)`         | Full profile: skills, projects, recent activity   |
| `get_project_status(project_name)`      | All knowledge linked to a project: decisions, action items, meetings |

### 8.3 Query Flow

1. Employee asks a question via any LLM client
2. LLM decides which MCP tool(s) to call
3. MCP server embeds the query (via embedding API)
4. Runs vector similarity search + optional structured SQL in Supabase
5. Returns ranked results with source citations
6. LLM synthesizes the final answer

---

## 9. Agent Communication Model

Agents do not call each other directly. They communicate through the database and an event queue:

```
Agent produces output
       |
       v
Writes to DB (with type: 'insight', 'alert', 'digest')
       |
       v
Event triggers next agent
       |
       v
Dispatcher picks it up and routes it
```

**Benefits:**
- Every action is logged (audit trail)
- Agents can be restarted independently
- Events can be replayed if something fails
- No circular dependency risk

---

## 10. Frontend — Data Explorer & Dashboard

### 10.1 Purpose

Give all users visibility into what the knowledge base knows — without touching Supabase or the database directly. This is critical for trust: people need to see what the system captured, verify it's correct, and understand what they're querying against.

### 10.2 Key Views

| View | Description |
|---|---|
| **Knowledge Browser** | Browse and search all content (documents, meetings, Slack threads, emails) with filters by source, category, date, status |
| **People Directory** | View extracted people profiles: skills, project involvement, recent mentions |
| **Project Overview** | See all knowledge linked to a project — decisions, action items, related meetings and docs |
| **Quarantine Queue** | Team-specific view of quarantined content awaiting review. Approve/reject with one click, assisted by agent suggestion |
| **System Health** | Gatekeeper admit/reject rates, embedding staleness, Curator actions, agent run history |
| **Insights Feed** | Analyst-generated insights, filterable by topic and timeframe |

### 10.3 Technology

- Next.js + shadcn/ui (consistent with stack)
- Supabase client SDK for real-time subscriptions (live updates when new content is ingested)
- Role-based views via Supabase Auth + RLS

---

## 11. Model Selection & Cost Optimization

| Agent       | Model          | Rationale                                |
| ----------- | -------------- | ---------------------------------------- |
| Gatekeeper  | Claude Haiku   | High volume, simple classification       |
| Curator     | Claude Sonnet  | Needs reasoning, not time-sensitive      |
| Analyst     | Claude Opus    | Deep pattern recognition, highest value  |
| Dispatcher  | Haiku / rules  | Simple routing decisions                 |
| MCP queries | No agent LLM   | Vector search + SQL, LLM client handles reasoning |

---

## 12. Implementation Phases

### Phase 1 — Foundation (Weeks 1-4)

- [ ] Set up Supabase project with pgvector extension
- [ ] Create database schema (all tables above)
- [ ] Choose and configure embedding model (Voyage AI or OpenAI)
- [ ] Build ingestion pipeline for Fireflies (highest priority source)
- [ ] Build Gatekeeper agent (v1 — basic relevance scoring)
- [ ] Build MCP server with `search_knowledge` tool

### Phase 2 — Expand Sources & Agents (Weeks 5-8)

- [ ] Add Google Docs ingestion pipeline
- [ ] Add Slack ingestion pipeline (with pre-filters)
- [ ] Build Curator agent (nightly cron)
- [ ] Add remaining MCP tools (decisions, action items, etc.)
- [ ] Implement Row Level Security for role-based access
- [ ] Connect Claude Code and other LLM clients to MCP server

### Phase 3 — Insights & Delivery (Weeks 9-12)

- [ ] Build Analyst agent
- [ ] Build Dispatcher agent
- [ ] Add Gmail ingestion pipeline
- [ ] Build frontend dashboard for insights and alerts
- [ ] Set up scheduled triggers for recurring agent tasks

### Phase 4 — Scale & Optimize (Ongoing)

- [ ] Monitor agent performance and tune prompts
- [ ] Review quarantine patterns to improve Gatekeeper accuracy
- [ ] Add new knowledge sources as needed
- [ ] Track cost per agent and optimize model selection
- [ ] Gather employee feedback and iterate

---

## 13. Access Control

**Model: Open by default, restrict by exception.**

All content is queryable by all users unless explicitly tagged as sensitive. This preserves the cross-functional value of the platform (marketing can query engineering, engineering can query sales).

**Sensitivity tagging:**
- The Gatekeeper auto-tags content with a `sensitivity` level during ingestion
- `open` (default) — visible to all users
- `restricted` — visible only to the originating team or specified roles
- Examples of restricted: HR discussions, salary/compensation, client-confidential under NDA, legal matters

**Implementation:** Supabase Row Level Security policies based on `sensitivity` field + user role from Supabase Auth.

---

## 14. Success Metrics

Keep it simple. Three metrics from day one:

| Metric | What It Tells You | How to Measure |
|---|---|---|
| **Query volume** | Is anyone using it? | Count MCP tool calls per day |
| **Gatekeeper admit rate** | Is the filter calibrated? | % admitted vs rejected vs quarantined |
| **Zero-match rate** | Are queries returning useful results? | % of searches that return 0 results |

Surface these in the System Health dashboard. Iterate based on what we see — don't build a metrics system for 12 months out.

---

## 15. Key Design Principles

1. **Garbage in, garbage out** — The Gatekeeper is the most critical component. Nothing else works without clean data.
2. **Err on the side of keeping** — Quarantine uncertain content rather than rejecting it. False negatives (lost knowledge) are worse than false positives.
3. **Model-agnostic access** — The MCP server ensures any LLM can query the knowledge base. No vendor lock-in.
4. **Right-size the model** — Use Haiku for simple tasks, Sonnet for reasoning, Opus only where deep analysis creates real value.
5. **Database as communication bus** — Agents write to the DB, not to each other. Everything is logged and auditable.
6. **Start narrow, expand later** — Begin with Fireflies + Gatekeeper + MCP, prove value, then add sources and agents.

---

## 16. Open Questions

### Resolved

- [x] ~~Quarantine review process~~ → Each team reviews their own, assisted by an agent or custom skill
- [x] ~~Slack channel selection~~ → Start with 10 relevant channels, expandable
- [x] ~~Ingestion mode~~ → Real-time via webhooks/push for all sources
- [x] ~~Primary users~~ → Everyone (cross-functional), starting with ~5 users, scaling to 20-25
- [x] ~~LLM client~~ → Claude for all users (for now)
- [x] ~~Alert delivery~~ → Slack and email
- [x] ~~Tech stack~~ → TypeScript everywhere: Next.js + Supabase + Vercel
- [x] ~~Agent framework~~ → Vercel AI SDK (structured output agents) + Claude Agent SDK (multi-step agents)
- [x] ~~Frontend technology~~ → Next.js + shadcn/ui, includes data explorer + dashboard
- [x] ~~People/skills tracking~~ → Dedicated people graph with structured tables + profile embeddings
- [x] ~~Embedding updates~~ → Re-embedding pipeline with `embedding_stale` flag, background worker every 5-10 min

- [x] ~~Embedding model~~ → OpenAI `text-embedding-3-small` (1536 dims, ~$5-15/mo). Revisit Voyage AI later with real data
- [x] ~~Access control~~ → Open by default, restrict by sensitivity level. Gatekeeper auto-tags sensitive content (HR, salary, client-confidential). Preserves cross-functional access
- [x] ~~Retention policy~~ → Active: forever. Archived: 12 months then drop embeddings. Rejected: 90 days metadata only. Quarantined: auto-reject after 30 days
- [x] ~~Cost budget~~ → ~$100-200/month to start, comfortable range
- [x] ~~Google domain verification~~ → Domain and Google Cloud project already exist, setup during implementation
- [x] ~~Slack channels~~ → On hold — Slack workspace needs to be set up first. Select channels during implementation
- [x] ~~Content chunking~~ → Semantic chunking: docs split by headings (~400 tokens, 50-token overlap), meetings by topic segments (~500-800 tokens), Slack by thread, email per message
- [x] ~~Slack thread aggregation~~ → Threads ingested as a unit. Thread replies trigger re-fetch + re-embed of full thread. 5-min hold on new top-level messages before ingesting
- [x] ~~Backfill~~ → No historical backfill needed. Starting from a blank project. Webhook ingestion captures everything going forward
- [x] ~~Entity resolution~~ → Aliases table + fuzzy matching at ingestion. Teams use consistent project names. Curator does nightly duplicate sweep on entity names
- [x] ~~Success metrics~~ → Keep it simple: query volume, Gatekeeper admit rate, and zero-match rate. Track from day one, iterate based on what we see. No over-engineering
- [x] ~~Frontend technology~~ → Next.js + shadcn/ui, includes data explorer + dashboard

### Still Open

- [ ] Analyst agent output design: what insights to generate (separate conversation)
- [ ] Slack workspace setup: create workspace and select channels for ingestion
