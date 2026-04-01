# Platform Specification: Jouw AI Partner

> **Status:** v1.0
> **Date:** 2026-03-31
> **Owner:** Stef Banninga
> **Replaces:** `meeting-processing-review.md` (PRD v2) + `business-model.md` (v1)

This is the **single source of truth** for the platform. All architectural, business, and data decisions are documented here. If something contradicts this document, this document wins.

---

## 1. Vision & Context

### 1.1 What We're Building

An AI-native knowledge platform that centralizes all company data — starting with meetings — and makes it queryable, actionable, and reusable. The platform serves as the operational backbone of Jouw AI Partner.

**Long-term vision:** A cockpit / flow control dashboard where AI executes tasks from centralized, verified knowledge. Data centralization is step 1, AI execution is step 2.

### 1.2 What Makes Us AI-Native

- We build **with** AI — Claude Code is the development partner, Stef is sole platform maintainer (non-coder)
- We build **AI into** client products — AI-integrated web applications
- We run our business **on** AI — this platform is the operational backbone

### 1.3 Why Meetings First

Meetings are the primary client interaction. The platform functions as our CRM — there is no external CRM system. We build one source completely — from ingestion to daily use — before adding next sources (email, Slack, docs).

### 1.4 Core Principles

| Principle                         | Meaning                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| **Verification before truth**     | All content is reviewed by a human before it becomes queryable truth    |
| **Meetings are the CRM**          | This system is the source of truth for client relationships             |
| **Err on keeping**                | Store everything, quarantine if uncertain, never silently discard       |
| **Database as communication bus** | Agents write to the DB, not to each other                               |
| **Right-size the model**          | Haiku for classification, Sonnet for extraction, Opus for deep analysis |
| **Modularity over completeness**  | Build one source/feature at a time, each module works independently     |

---

## 2. Company & Team

### 2.1 About Jouw AI Partner

AI-native consultancy and software bureau. Builds AI-integrated web applications for clients + operates this internal knowledge platform.

**Core offering:**

- **MVP validation** (weeks) — Validate a client's idea with a working prototype
- **Custom development** (months) — Full build following successful MVP, may involve outsource partners
- **Maintenance** — On-demand updates and platform evolution

### 2.2 Team & Roles

| Person                | Role                      | Scope                                                                    |
| --------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Stef Banninga         | Co-founder, Operations    | Proposals, building (via AI), delivery, maintenance, sole platform owner |
| Wouter van den Heuvel | Co-founder, Commercial    | Leads, discovery, deal-making                                            |
| Ege                   | Engineer (in-house)       | Engineering, client + internal work                                      |
| Kenji                 | Developer (outsource, US) | Client projects only                                                     |
| Myrrh                 | Developer (outsource, US) | Client projects only                                                     |
| Tibor                 | Strategic Partner         | Business consulting, brings clients, defines MVP scope                   |

**Platform language:** English (outsource team is American, all team members speak English).

### 2.3 Role Boundaries

- **Tibor** advises clients on strategy → defines what to build → hands off to Jouw AI Partner for implementation
- **Wouter** runs sales → closes the deal → hands off to Stef
- **Stef** owns delivery → builds with AI assistance → manages outsource team for client work
- **Kenji & Myrrh** execute on client projects only — no platform work
- **Stef** is sole platform maintainer (non-coder, works through Claude Code)

---

## 3. Business Processes

### 3.1 Sales Pipeline

```
Tibor / Inbound / Network
        |
   LEAD -----> DISCOVERY -----> PROPOSAL -----> WON / LOST
  (Wouter)     (Wouter)         (Stef)
               Google Meet       Written
               meetings          proposal
```

**Data generated:** Meeting transcripts, notes, client requirements, proposals.

### 3.2 Project Delivery

```
KICK-OFF --> BUILD -------> REVIEW -----> DELIVERY --> MAINTENANCE
             (sprints)      (demo)                     (on-demand)
 meeting     code +         client        handover     updates,
 w/ client   meetings       feedback      meeting      support
```

**Billing:** Per project, hourly, or retainer — all three forms used.
**Delivery:** Sprint-based with clear scope. Clients currently have no portal — progress shared via meetings and email only.

**Data generated:** Sprint plans, code, meeting transcripts, client feedback, action items, decisions, lessons learned.

### 3.3 Knowledge Loop (cross-project learning)

```
Project A completed
    --> Lessons stored: what worked, what didn't, sprint structure, approach
    --> New project B starts
    --> AI references Project A: "Similar feature was built in 3 sprints, here's the approach"
    --> Better proposals, faster delivery, fewer repeated mistakes
```

Sprints and lessons from projects are stored so AI can reuse approaches, learn from mistakes, and generate better plans for new projects. Critical for scaling a small team.

---

## 4. Data Model

### 4.1 Current Schema (v1 — built, live)

8 tables. All operational with Fireflies pipeline.

#### `profiles`

User profiles linked to Supabase Auth.

```sql
profiles
  id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE
  full_name TEXT
  email TEXT NOT NULL
  avatar_url TEXT
  role TEXT DEFAULT 'member'          -- prepared for future RBAC, not active yet
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

Auto-created via database trigger on auth registration.

#### `organizations`

Clients, partners, and suppliers as entities.

```sql
organizations
  id UUID PK DEFAULT gen_random_uuid()
  name TEXT NOT NULL UNIQUE
  aliases TEXT[] DEFAULT '{}'
  type TEXT NOT NULL                   -- 'client' | 'partner' | 'supplier' | 'other'
  contact_person TEXT
  email TEXT
  status TEXT DEFAULT 'prospect'       -- 'prospect' | 'active' | 'inactive'
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

#### `people`

Team members and external contacts.

```sql
people
  id UUID PK DEFAULT gen_random_uuid()
  name TEXT NOT NULL
  email TEXT UNIQUE
  team TEXT
  role TEXT
  embedding VECTOR(1024)
  embedding_stale BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

#### `projects`

Projects linked to organizations.

```sql
projects
  id UUID PK DEFAULT gen_random_uuid()
  name TEXT NOT NULL UNIQUE
  aliases TEXT[] DEFAULT '{}'
  organization_id UUID FK -> organizations
  status TEXT DEFAULT 'lead'
    -- Sales: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won'
    -- Delivery: 'kickoff' | 'in_progress' | 'review' | 'completed'
    -- Other: 'on_hold' | 'lost' | 'maintenance'
  embedding VECTOR(1024)
  embedding_stale BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

#### `meetings`

Fireflies meeting transcripts with classification and organization link.

```sql
meetings
  id UUID PK DEFAULT gen_random_uuid()
  fireflies_id TEXT UNIQUE
  title TEXT NOT NULL
  date TIMESTAMPTZ
  participants TEXT[]                  -- fallback for unknown participants
  summary TEXT
  transcript TEXT
  meeting_type TEXT                    -- 'sales' | 'discovery' | 'internal_sync' | 'review' | 'strategy' | 'partner' | 'general'
  party_type TEXT                      -- 'client' | 'partner' | 'internal' | 'other'
  organization_id UUID FK -> organizations
  unmatched_organization_name TEXT     -- when AI can't match to known org
  raw_fireflies JSONB                 -- original Fireflies response + Gatekeeper/Extractor output
  relevance_score FLOAT               -- Gatekeeper score, for ranking
  search_vector TSVECTOR              -- full-text search, auto-update via trigger
  embedding VECTOR(1024)
  embedding_stale BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

#### `meeting_projects`

Many-to-many: meetings can be about multiple projects.

```sql
meeting_projects
  meeting_id UUID FK -> meetings ON DELETE CASCADE
  project_id UUID FK -> projects ON DELETE CASCADE
  PRIMARY KEY (meeting_id, project_id)
```

#### `meeting_participants`

Many-to-many: links known participants to people table.

```sql
meeting_participants
  meeting_id UUID FK -> meetings ON DELETE CASCADE
  person_id UUID FK -> people ON DELETE CASCADE
  PRIMARY KEY (meeting_id, person_id)
```

#### `extractions`

Unified table for all AI extractions. Replaces separate decisions, action_items, and needs tables.

```sql
extractions
  id UUID PK DEFAULT gen_random_uuid()
  meeting_id UUID FK -> meetings ON DELETE CASCADE
  type TEXT NOT NULL                    -- 'decision' | 'action_item' | 'need' | 'insight'
  content TEXT NOT NULL
  confidence FLOAT                     -- AI confidence score (0.0-1.0)
  metadata JSONB DEFAULT '{}'          -- type-specific: assignee, due_date, made_by, etc.
  transcript_ref TEXT                  -- quote from transcript for source attribution
  organization_id UUID FK -> organizations
  project_id UUID FK -> projects
  corrected_by UUID FK -> profiles     -- NULL = AI extraction, filled = human-verified
  corrected_at TIMESTAMPTZ
  search_vector TSVECTOR              -- full-text search, auto-update via trigger
  embedding VECTOR(1024)
  embedding_stale BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT now()
```

**Metadata per type:**

| Type          | Metadata fields                                               |
| ------------- | ------------------------------------------------------------- |
| `decision`    | `{ made_by, date, context }`                                  |
| `action_item` | `{ assignee, due_date, status, scope }`                       |
| `need`        | `{}` — content is the literal statement                       |
| `insight`     | `{ category }` — project_updates, strategy_ideas, client_info |

#### `mcp_queries` (usage tracking)

```sql
mcp_queries
  id UUID PK DEFAULT gen_random_uuid()
  tool_name TEXT NOT NULL
  parameters JSONB
  created_at TIMESTAMPTZ DEFAULT now()
```

### 4.2 Relationship Diagram

```
profiles -> auth.users                     [id = auth.users.id]
profiles (1) --< (many) extractions        [corrected_by]

organizations (1) --< (many) meetings
organizations (1) --< (many) extractions
organizations (1) --< (many) projects

projects (1) --< (many) extractions

meetings (1) --< (many) extractions        [meeting_id]
meetings (many) >--< (many) projects       [via meeting_projects]
meetings (many) >--< (many) people         [via meeting_participants]
```

### 4.3 Indexes

- **HNSW** on all embedding columns (1024-dim, cosine distance)
- **GIN** on search_vector columns (full-text search)
- **B-tree** on FK columns and common filters (organization_id, project_id, meeting_type, etc.)

### 4.4 Search Functions

| Function                               | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `search_all_content(query, limit)`     | Hybrid search (vector + full-text via RRF) across meetings + extractions |
| `match_people(embedding)`              | Vector similarity for entity resolution                                  |
| `match_projects(embedding)`            | Vector similarity for entity resolution                                  |
| `search_meetings_by_participant(name)` | Fuzzy match + vector similarity                                          |

### 4.5 Schema Extensions Needed (v2)

These fields need to be added to support the verification model:

**On `meetings`:**
| Field | Purpose |
|-------|---------|
| `verification_status` | `'draft'` \| `'verified'` — default `'draft'` |
| `verified_by` UUID FK -> profiles | Who approved it |
| `verified_at` TIMESTAMPTZ | When it was approved |

**On `extractions`:**
| Field | Purpose |
|-------|---------|
| `verification_status` | `'draft'` \| `'verified'` — default `'draft'` |
| `verified_by` UUID FK -> profiles | Who approved it (replaces corrected_by for new flow) |
| `verified_at` TIMESTAMPTZ | When it was approved |

> **Note:** The existing `corrected_by`/`corrected_at` fields on extractions handle post-verification corrections. The new `verification_status`/`verified_by`/`verified_at` fields handle the initial review gate. Both serve different purposes.

### 4.6 Future Entities (v3+)

These entities are part of the long-term vision but will NOT be built until needed:

- **Sprint** — Time-boxed unit of work within a project (for project management and knowledge reuse)
- **Document** — Files linked to projects/organizations (Google Docs, uploaded, generated)
- **Message** — Threaded communication (Slack, email) linked to projects/people

---

## 5. Meeting Types & Extraction

### 5.1 Meeting Types (7 fixed types)

The Gatekeeper chooses from this list. AI may not freely classify.

| Type            | When                           | Examples                                    |
| --------------- | ------------------------------ | ------------------------------------------- |
| `sales`         | Sales conversation with client | Pitch, quote discussion, upsell             |
| `discovery`     | Intake, needs analysis         | First meeting, requirements gathering, demo |
| `internal_sync` | Internal meeting               | Standup, weekly, retro, planning            |
| `review`        | Work review                    | Sprint review, code review, demo feedback   |
| `strategy`      | Strategic meeting              | Roadmap, vision, OKRs                       |
| `partner`       | Meeting with partner/supplier  | Collaboration, evaluation                   |
| `general`       | Cannot be classified           | Other                                       |

### 5.2 Extraction Matrix Per Type

All types produce decisions and action_items. Additional extractions per type:

| Type            | Needs | Insights (project_updates) | Insights (strategy_ideas) | Insights (client_info) |
| --------------- | ----- | -------------------------- | ------------------------- | ---------------------- |
| `sales`         | yes   | -                          | -                         | yes                    |
| `discovery`     | yes   | -                          | -                         | yes                    |
| `internal_sync` | -     | yes                        | -                         | -                      |
| `review`        | -     | yes                        | -                         | -                      |
| `strategy`      | -     | -                          | yes                       | -                      |
| `partner`       | yes   | -                          | -                         | -                      |
| `general`       | -     | -                          | -                         | -                      |

### 5.3 Party Type

Determined by the Gatekeeper based on participants and context:

- `client` — external client present
- `partner` — partner or supplier present
- `internal` — team members only
- `other` — cannot be determined

---

## 6. AI Pipeline

### 6.1 Overview

```
Fireflies webhook
    --> Pre-filter (< 2 min or < 2 participants -> skip)
    --> Gatekeeper (Haiku 4.5): classification only
    --> Extractor (Sonnet): decisions, action_items, needs, insights
    --> Entity resolution (org + project + participant matching)
    --> Storage (meetings + extractions)
    --> Embedding (Cohere embed-v4, direct)
    --> Review queue (verification_status = 'draft')
    --> After human verification: queryable via MCP
```

### 6.2 Step 1: Gatekeeper (Haiku 4.5) — Triage

Classification and scoring only. No extractions. Uses Claude Haiku 4.5 (`claude-haiku-4-5-20251001`).

**Output:**

- `meeting_type` — from the fixed list of 7
- `party_type` — client/partner/internal/other
- `relevance_score` — 0.0-1.0 for ranking
- `organization_name` — name of external organization (nullable)

**No reject logic.** Every meeting that passes the pre-filter is stored. The relevance_score is kept for ranking in search results.

**Novelty check active** — duplicate detection via `fireflies_id` UNIQUE constraint.

**Cost optimization:** Prompt caching on the Gatekeeper system prompt — identical per call, saves up to 90% on input tokens.

### 6.3 Step 2: Extractor (Sonnet) — Extraction

Separate AI call (Sonnet) for content extraction. More reliable than Haiku for interpretation.

**Input:** Meeting transcript + Gatekeeper triage output (meeting_type, party_type)

**Output per extraction:**

- `type` — decision / action_item / need / insight
- `content` — the extraction itself
- `confidence` — 0.0-1.0 how certain the AI is
- `transcript_ref` — quote from transcript as evidence
- `metadata` — type-specific fields (assignee, due_date, made_by, etc.)

**Transcript_ref validation:** After extraction, each `transcript_ref` is validated against the original transcript via string matching. If the quote is not found, confidence is set to 0.0. This catches hallucinations.

**Cost optimization:** Prompt caching on the Extractor system prompt (90% savings). Batch API (50% discount, 24h processing) deferred to v2+ for nightly Curator/Analyst runs.

### 6.4 Entity Resolution

**Organization matching (2-tier):**

1. Exact match — ILIKE on `organizations.name`
2. Alias match — match on `organizations.aliases` array

- Match found: `meetings.organization_id` is set
- No match: `meetings.unmatched_organization_name` is set

**Participant matching:**

1. Fireflies provides email addresses per participant
2. Match on `people.email`
3. Match: row in `meeting_participants`
4. No match: participant stays in `meetings.participants` text[] as fallback

**Project matching (3-tier):**

1. Exact match — ILIKE on `projects.name`
2. Alias match — match on `projects.aliases` array
3. Embedding match — cosine similarity via `match_projects()` RPC

- Match: row in `meeting_projects` (many-to-many)
- No match: project name remains in extraction content, can be manually linked later

### 6.5 Raw Storage

The complete Fireflies API response plus Gatekeeper and Extractor output are stored in `meetings.raw_fireflies` (JSONB) as reference and audit trail.

---

## 7. Verification Model

> **Decision (2026-03-31):** We implement a review gate. This overrides the PRD v2 "no review gate" approach. Reason: verified content is the single source of truth. AI must always have accurate data to work with.

### 7.1 Flow

```
Source data arrives (webhook, import, sync)
    --> AI processes (classification, extraction, embedding)
    --> REVIEW QUEUE (status: draft)
        |   Visible in: Cockpit review UI
        |   NOT visible in: Client portal, MCP queries (by default)
        |
    Human reviews:
        |-- Approve as-is --> status: verified
        |-- Edit & approve --> content updated, status: verified
        |-- Reject --> status: rejected (with reason)
        |
    --> VERIFIED (status: verified)
        |   Visible in: Everything (cockpit, portal, MCP)
        |   AI can build on this content
        |
    --> AI generates new insights (cross-meeting summaries, trends)
        |
    --> REVIEW QUEUE (AI-generated insights also need review)
```

### 7.2 Rules

1. MCP tools query **only verified content** by default (with option to include drafts for internal use)
2. Client portal shows **only verified content**
3. Cockpit shows **everything** with clear status indicators (draft vs verified)
4. AI-generated insights (summaries, trends) go through the same review pipeline
5. Review must be fast and intuitive — not a bottleneck (small team, 3 reviewers max)

### 7.3 Why Review Gate (changed from PRD v2)

The PRD v2 argued against a review gate because "nobody reviews consistently, 80% of knowledge stays unfindable." This is valid for large organizations. But Jouw AI Partner has 3 reviewers (Stef, Wouter, Ege), clear ownership, and the explicit goal of building a verified knowledge base that AI can trust completely. The review gate ensures:

- AI always has accurate data to work with
- Client portal never shows unverified information
- Corrections are proactive (review) rather than reactive (stumble upon errors)
- The team builds a habit of validating AI output

---

## 8. Embedding Strategy

### 8.1 Model: Cohere embed-v4

| Property       | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Model          | `embed-v4.0` via `cohere-ai` SDK                                   |
| Dimensions     | **1024** (Matryoshka — smaller than max 1536, faster HNSW queries) |
| Context window | 128K tokens (full transcripts fit in one call)                     |
| Multilingual   | 100+ languages, strong on Dutch (35% better cross-lingual than v3) |
| Cost           | $0.12 per 1M tokens (~$0.06/month at expected volume)              |
| Batch support  | Up to 96 texts per API call                                        |

**Why Cohere over OpenAI text-embedding-3-small:**

- Better multilingual performance (crucial for Dutch meetings)
- 128K context window vs. 8K (no truncation of long transcripts)
- Higher MTEB score (65.2 vs ~62.3)
- Matryoshka support: 1024-dim is faster and smaller than 1536, with minimal quality loss

**Important:** Cohere requires an `inputType` parameter:

- `search_document` — when storing content (meetings, extractions)
- `search_query` — when searching (MCP queries, entity resolution)

**SDK:** `cohere-ai` npm package (not via Vercel AI SDK — it doesn't support Cohere embed-v4 yet).

### 8.2 Embedding Timing

Content is embedded immediately after AI processing, even before review. This ensures search works on draft content in the cockpit. The `verification_status` filter controls what's queryable, not the embedding.

### 8.3 Meeting Embedding Enrichment

The meeting embedding includes Extractor output (insights: project_updates, strategy_ideas, client_info) from `raw_fireflies` in addition to standard fields. This improves search results.

### 8.4 Hybrid Search (vector + full-text)

Combines vector search (semantic similarity) with PostgreSQL full-text search (`tsvector`):

- **Vector search** — finds semantically similar content ("Q3 finances" matches "third quarter budget")
- **Full-text search** — finds exact terms, names, and jargon ("churn", "Acme Corp")

Combined via **Reciprocal Rank Fusion (RRF)** in `search_all_content()`.

### 8.5 Re-embed Worker

Processes records with `embedding_stale = true`. Runs every 5 minutes via pg_cron.

---

## 9. MCP Interface

### 9.1 Current Tools (built)

**Search:**
| Tool | Purpose |
|------|---------|
| `search_knowledge` | Hybrid search (vector + full-text) over meetings + extractions with source attribution |
| `get_decisions` | Filter extractions type='decision' with transcript_ref |
| `get_action_items` | Filter extractions type='action_item' with metadata |

**Retrieve:**
| Tool | Purpose |
|------|---------|
| `get_meeting_summary` | Full meeting detail with meeting_type, party_type, organization, all extractions |
| `get_organization_overview` | Complete org picture: meetings, extractions, projects, people (SQL joins) |
| `list_meetings` | Filter on organization, project, date range, meeting_type, party_type + pagination |

**Entities:**
| Tool | Purpose |
|------|---------|
| `get_organizations` | List/search organizations |
| `get_people` | List/search team members and contacts |
| `get_projects` | List/search projects |

**Mutate:**
| Tool | Purpose |
|------|---------|
| `correct_extraction` | Edit extraction content/metadata, mark as corrected |

**System:**
| Tool | Purpose |
|------|---------|
| Usage tracking | Logs all MCP tool calls to `mcp_queries` table |

### 9.2 V2 Changes Needed

All search/retrieve tools must be updated to:

- Filter on `verification_status = 'verified'` by default
- Accept optional `include_drafts` parameter for cockpit use
- Show verification status in output ("AI (confidence: 0.87)" or "verified by [name]")

### 9.3 Future AI Actions (v3+)

- Draft client email based on meeting outcomes
- Create sprint plan based on PRD + lessons from similar projects
- Generate project summary update after new verified meeting
- Flag overdue action items
- Suggest next steps based on project phase

---

## 10. Three Interfaces

### 10.1 Cockpit (Internal — Stef, Wouter, Ege)

The operational command center. Everything in one place.

**Sections:**

- **Dashboard** — Overview of all projects, upcoming actions, pipeline health
- **Review Queue** — Meetings and extractions awaiting verification (approve/edit/reject)
- **Projects** — Per-project view with timeline, meetings, action items, decisions
- **Clients** — Per-organization view (CRM-lite)
- **People** — Team + contacts
- **Pipeline** — Ingestion status, processing health

**Key interactions:**

- Review and verify meeting extractions (approve/edit/reject)
- Update project statuses
- View action items across all projects
- Trigger AI tasks (future: generate summary, write email draft)

### 10.2 Client Portal (External — per client, v3+)

A read-only window into their project. Shows only verified, client-appropriate content.

**Per project:**

- Current phase (visual: lead → discovery → proposal → build → delivery → maintenance)
- Meeting history (dates, summaries — not full transcripts)
- Action items (open/completed, assigned to whom)
- Key decisions made
- Non-technical PRD / project description
- AI-generated evolving project summary

**Not shown:** Internal meetings, unverified content, internal action items, pricing, other clients' data.

**Authentication:** Separate client login, scoped to their organization's projects only.

### 10.3 MCP Interface (AI — Claude and other LLM clients)

Already partially built (see section 9). Queries verified knowledge base. Future: executes AI actions.

---

## 11. Data Sources & Integration Roadmap

Each source is a module. They connect independently to the knowledge base.

| #   | Source               | Status   | Priority | Ingestion Method                      |
| --- | -------------------- | -------- | -------- | ------------------------------------- |
| 1   | Fireflies (meetings) | **LIVE** | —        | Webhook (real-time)                   |
| 2   | Manual input (UI)    | PARTIAL  | HIGH     | Direct DB via Server Actions          |
| 3   | Google Docs          | NOT YET  | MEDIUM   | Google API sync                       |
| 4   | Email (Gmail)        | NOT YET  | MEDIUM   | Gmail API (personal + shared inboxes) |
| 5   | Slack                | NOT YET  | LOW      | Slack API (when adopted internally)   |
| 6   | File uploads         | NOT YET  | LOW      | Direct upload via UI                  |

**Integration pattern (same for all sources):**

```
Source --> Webhook/API/Upload --> Normalize --> AI Process --> Review Queue --> Verified
```

---

## 12. Design Constraints

| Constraint                             | Implication                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Solo non-coding maintainer (Stef + AI) | Simple, predictable code structure. No clever abstractions.                                                                                      |
| Small team (6 people, 3 reviewers)     | No complex RBAC. Review workflow can be simple.                                                                                                  |
| English platform language              | All UI, data, and documentation in English                                                                                                       |
| Modularity over completeness           | Build one source/feature at a time. Each module works independently.                                                                             |
| Verification before truth              | Every piece of content has a review status                                                                                                       |
| AI must know where to look             | Clear file structure, good CLAUDE.md, consistent patterns                                                                                        |
| Budget-conscious                       | Right-size AI models (Haiku for simple, Sonnet for reasoning)                                                                                    |
| Monorepo (Turborepo)                   | `apps/cockpit/`, `apps/portal/` (v3), `packages/database/`, `packages/ai/`, `packages/mcp/`. Shared code in packages, app-specific code in apps. |

---

## 13. Version Scope

### v1 — Meetings Pipeline (DONE)

Sprints 001-007. All completed.

**What's built:**

- 8-table database with vector indexes and search functions
- Fireflies webhook + pre-filter + Gatekeeper (Haiku) + Extractor (Sonnet)
- Cohere embed-v4 (1024-dim) + hybrid search (vector + full-text via RRF)
- 12 MCP tools with source attribution and confidence scoring
- Correction tool for extractions
- Basic auth + dashboard shell
- Entity resolution (2-tier org, 3-tier project, email-based participant)

**What v1 does NOT have:**

- No verification status / review gate (added in v2)
- No frontend for viewing meetings, projects, or extractions
- No client portal
- No additional data sources beyond Fireflies

### v2 — Review & Dashboard — COMPLETE (2026-04-01)

Make the platform visually usable and add the verification gate. Full PRD: `docs/specs/v2-review-dashboard.md`.

**Scope (5 sprints):**

- v2-001: Monorepo setup (Turborepo) — restructure into apps/ + packages/
- v2-002: DB migration (verification_status) + critical security fixes (SEC-001, SEC-003, SEC-004, SEC-005)
- v2-003: Review queue UI (quick approve, detailed review, reject)
- v2-004: Meeting detail page
- v2-005: Projects overview + detail
- v2-006: Dashboard + clients + people pages
- v2-007: MCP verification filter + cleanup

**Migration strategy:** Existing content migrated to `verified`. Only new content starts as `draft`. MCP filter change is last sprint to avoid breaking current usage.

**NOT in v2:** Client portal, Slack/Docs/Email integration, AI-generated insights, sprint entity, Curator agent.

### v3 — Client Portal & Second Source (FUTURE)

- Client-facing read-only portal per organization
- RLS policies on all tables (role-based access)
- Second data source (likely Google Docs or Email)
- AI-generated evolving project summaries
- Knowledge reuse system (lessons learned from completed projects)

### v4+ — Cockpit & AI Actions (VISION)

- Full cockpit with flow control
- AI action triggers (draft email, create task, start coding job)
- Sprint/project management built into the platform
- Cross-source insights (Curator + Analyst agents)
- Notification system (Slack, email alerts)

---

## 14. Pipeline Orchestration (Future)

### Current (v1-v2)

Pipeline runs synchronously in a Supabase Edge Function: webhook → Gatekeeper → Extractor → storage → embedding. At ~5 users and ~50 meetings/month this is sufficient. Edge Functions have 400s timeout on Pro; the full pipeline takes <30 seconds.

### When Orchestration Is Needed

- Multiple sources sending events simultaneously
- > 200 meetings/month
- Complex agent chains (Curator nightly, Analyst daily) running >5 minutes
- Need for pipeline observability ("why wasn't that meeting processed?")

### Migration Path

Replace synchronous Edge Function call with event queue (Inngest or Trigger.dev). Pipeline functions stay identical, only the invocation changes. Code is structured for this: loose functions, database logging, idempotent processing.

---

## 15. Agents

### Built (v1)

| Agent      | Model     | Purpose                                                                   |
| ---------- | --------- | ------------------------------------------------------------------------- |
| Gatekeeper | Haiku 4.5 | Classification + scoring only. No extraction.                             |
| Extractor  | Sonnet    | Decisions, action_items, needs, insights with confidence + transcript_ref |

### Planned (v3+)

| Agent      | Model       | Purpose                                                                                |
| ---------- | ----------- | -------------------------------------------------------------------------------------- |
| Curator    | Sonnet      | Nightly: deduplicate, detect staleness, find contradictions, knowledge drift detection |
| Analyst    | Opus        | Daily: cross-source patterns, trends, risk flagging                                    |
| Dispatcher | Haiku/rules | Route insights/alerts to Slack, email                                                  |

> **Note:** Curator, Analyst, and Dispatcher are NOT built and NOT in v2 scope. They require multiple data sources and verified knowledge base to be useful.

---

## 16. Knowledge Drift Detection

### 16.1 The Problem

Knowledge goes stale. Not just meeting extractions, but everything:

- Specs that no longer match reality after a decision
- Project statuses that exist in someone's head but not in the system
- Action items that are "done" but never marked as completed
- Documents that reference outdated information
- Contradictions between different knowledge sources

**Proven by real incident (2026-03-31):** 5 spec documents had drifted out of sync — verification model contradicted between PRD and business model, agents listed that don't exist, sprint statuses wrong. Manual audit took significant effort to detect and resolve.

### 16.2 Staleness Detection (v2)

Every verifiable piece of content gets a `verified_at` timestamp. The system can then surface:

- **Stale content:** Items not reviewed in X days (threshold configurable)
- **Orphaned references:** Extractions linking to projects/organizations that no longer exist or have changed status
- **Status mismatches:** e.g., meeting says "project X is in discovery" but project status is "build"

The review queue shows not only new items awaiting verification, but also items that have become stale and need re-verification.

### 16.3 Contradiction Detection (v3 — Curator Agent)

The Curator agent runs nightly and compares knowledge across sources:

- **Cross-meeting contradictions:** "Meeting A says we chose vendor X, meeting B says vendor Y"
- **Fact vs. status drift:** "Last 3 meetings discuss project X as active, but project status is 'completed'"
- **Temporal inconsistencies:** "Action item was due 2 weeks ago, still marked as 'open', no follow-up in recent meetings"
- **Source-to-source drift:** "Google Doc says budget is 50K, meeting extraction says 40K"

Detected contradictions enter the review queue as a special type for human resolution.

### 16.4 Self-referential Integrity

The platform must also monitor its own documentation and configuration:

- Does `platform-spec.md` still match the actual database schema?
- Are all MCP tools listed in the spec actually implemented?
- Do sprint statuses in `MILESTONES.md` match file locations in `sprints/done/` vs `sprints/backlog/`?

This is a future capability (v3+) but architecturally important: the system that detects knowledge drift for clients must also detect its own drift.

---

## 17. Security Notes

- **RLS policies:** Not active in v1-v2. Accepted risk for small team (everyone sees everything). Will be implemented in v3 when client portal requires role-based access.
- **Service role key:** Server-side only, never exposed to client.
- **Auth:** Supabase Auth (OAuth + email). Client portal will need separate auth scope.
- **API routes:** Need auth middleware (documented in security audit, `docs/security/audit-report.md`).

For full security assessment, see `docs/security/`.

---

## 18. Open Questions

| #   | Question              | Context                                                                                      |
| --- | --------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Client portal auth    | Separate Supabase project, or same project with role-based access?                           |
| 2   | Google Docs structure | How should docs be organized? Per client folder? Per project?                                |
| 3   | Email scope           | Which email addresses to connect? Just Stef + Wouter, or all team?                           |
| 4   | AI insight triggers   | When should the system generate new insights? After each verified meeting? Daily? On-demand? |
| 5   | Cockpit questions     | What are the top questions the cockpit should answer? (Brainstorm session planned)           |

---

## 19. Decision Log

| Date       | Decision                                  | Rationale                                                                                                                                             |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-27 | Cohere embed-v4 over OpenAI               | Better multilingual, 128K context, higher MTEB score                                                                                                  |
| 2026-03-27 | 1024-dim over 1536-dim                    | Matryoshka support, faster HNSW, minimal quality loss                                                                                                 |
| 2026-03-27 | Unified `extractions` table               | Simpler than 3 separate tables, easier to query and extend                                                                                            |
| 2026-03-27 | 2-step AI (Gatekeeper + Extractor)        | Single agent did too much. Specialized calls are more reliable.                                                                                       |
| 2026-03-27 | No reject logic                           | Keep everything, use relevance_score for ranking. Don't discard data.                                                                                 |
| 2026-03-29 | Haiku 4.5 over Haiku 3                    | 73.3% SWE-bench, within 5% of Sonnet at 1/3 cost. Worth it for classification.                                                                        |
| 2026-03-29 | Prompt caching, no Batch API (v1)         | Caching is free to activate. Batch API deferred — meetings need near-real-time processing.                                                            |
| 2026-03-29 | Transcript_ref validation                 | LLMs are systematically overconfident. Hard string matching catches hallucinations.                                                                   |
| 2026-03-31 | Review gate (overrides PRD v2 "no gate")  | Small team (3 reviewers), verified content = AI truth. Different from large org assumption in PRD v2.                                                 |
| 2026-03-31 | English as platform language              | Outsource team (US), all team members speak English                                                                                                   |
| 2026-03-31 | Build own project tool                    | No external tool needed, platform becomes the project management layer                                                                                |
| 2026-03-31 | Knowledge drift detection as core feature | Real incident: 5 docs out of sync. System must detect its own staleness, not just client data.                                                        |
| 2026-03-31 | Monorepo (Turborepo) for v2               | Prepare for client portal (v3). apps/cockpit + apps/portal share packages/database, packages/ai, packages/mcp. Set up early to avoid migration later. |
