# Business Model: Jouw AI Partner

> Status: Draft v1 — 2026-03-31
> Owner: Stef Banninga
> Purpose: Foundation document for all platform architecture decisions

---

## 1. Company Overview

**Jouw AI Partner** is an AI-native consultancy and software bureau. We build AI-integrated web applications for clients and operate our own internal knowledge platform.

### Core Offering

- **MVP validation** (weeks) — Validate a client's idea with a working prototype
- **Custom development** (months) — Full build following successful MVP, may involve outsource partners
- **Maintenance** — On-demand updates and platform evolution

### What Makes Us AI-Native

- We build **with** AI (Claude Code as development partner)
- We build **AI into** client products (AI-integrated applications)
- We run our business **on** AI (this knowledge platform as operational backbone)

---

## 2. Team & Roles

| Person                | Role                      | Scope                                                               | Language |
| --------------------- | ------------------------- | ------------------------------------------------------------------- | -------- |
| Stef Banninga         | Co-founder, Operations    | Proposals, building (via AI), delivery, maintenance, platform owner | NL/EN    |
| Wouter van den Heuvel | Co-founder, Commercial    | Leads, discovery, deal-making                                       | NL/EN    |
| Ege                   | Engineer (in-house)       | Engineering, client + internal work                                 | EN       |
| Kenji                 | Developer (outsource, US) | Client projects only                                                | EN       |
| Myrrh                 | Developer (outsource, US) | Client projects only                                                | EN       |
| Tibor                 | Strategic Partner         | Business consulting, brings clients, defines MVP scope              | NL/EN    |

**Platform language:** English (outsource team is American, all team members speak English).

### Role Boundaries

- **Tibor** advises clients on strategy → defines what to build → hands off to Jouw AI Partner
- **Wouter** runs the sales process → closes the deal → hands off to Stef
- **Stef** owns delivery → builds with AI assistance → manages outsource team for client work
- **Kenji & Myrrh** execute on client projects only — no platform work
- **Stef** is sole platform maintainer (non-coder, works through Claude Code)

---

## 3. Business Processes

### 3.1 Sales Pipeline

```
Tibor / Inbound / Network
        ↓
   ┌─────────┐    ┌───────────┐    ┌──────────┐
   │  LEAD   │───→│ DISCOVERY │───→│ PROPOSAL │
   │ (Wouter)│    │ (Wouter)  │    │  (Stef)  │
   └─────────┘    └───────────┘    └──────────┘
                   Google Meet          ↓
                   meetings        Written proposal
                                       ↓
                                  ┌──────────┐
                                  │   WON    │
                                  │  or LOST │
                                  └──────────┘
```

**Data generated:** Meeting transcripts, notes, client requirements, proposals.

### 3.2 Project Delivery

```
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌────────────┐
│ KICK-OFF │──→│  BUILD   │──→│  REVIEW   │──→│  DELIVERY  │──→│MAINTENANCE │
│          │   │ (sprints) │   │  (demo)   │   │            │   │ (on-demand)│
└──────────┘   └──────────┘   └───────────┘   └────────────┘   └────────────┘
  meeting       code +          client          handover         updates,
  with client   meetings        feedback        meeting          support
```

**Data generated:** Sprint plans, code, meeting transcripts, client feedback, action items, decisions, lessons learned.

### 3.3 Knowledge Loop (cross-project learning)

```
Project A completed
        ↓
Lessons stored: what worked, what didn't, sprint structure, approach
        ↓
New project B starts
        ↓
AI references Project A: "Similar feature was built in 3 sprints, here's the approach"
        ↓
Better proposals, faster delivery, fewer repeated mistakes
```

**Data generated:** Retrospective insights, reusable sprint templates, approach patterns.

---

## 4. Entity Model

These are the core entities the platform must support. Each entity has relationships to others, forming the knowledge graph.

### 4.1 Entity Overview

```
Organization (client/partner/supplier)
├── Projects (1:N)
│   ├── Sprints (1:N)
│   ├── Meetings (N:M via meeting_projects)
│   │   └── Extractions (1:N) — decisions, action_items, needs, insights
│   ├── Documents (1:N) — PRDs, proposals, specs
│   └── Messages (1:N) — email threads, Slack threads
├── People (N:M) — contacts at the organization
└── Invoices (future, 1:N)

Person (team member / external contact)
├── Meeting participations (N:M)
├── Action item assignments (1:N)
├── Project roles (N:M)
└── Messages sent/received (1:N)

Knowledge Item (cross-entity, AI-generated)
├── Source references (which meetings/docs/messages it came from)
├── Project context
├── Verification status
└── Embedding for semantic search
```

### 4.2 Entity Details

#### Organization

The client, partner, or supplier company.

| Field                 | Purpose                             |
| --------------------- | ----------------------------------- |
| name, aliases         | Matching from various sources       |
| type                  | client, partner, supplier, internal |
| status                | prospect, active, inactive          |
| contact_person, email | Primary contact                     |
| notes                 | Free-form context                   |

#### Project

A scoped engagement with an organization.

| Field                   | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| name, aliases           | Matching from various sources                           |
| organization_id         | Which client/org this belongs to                        |
| phase                   | lead, discovery, proposal, build, delivery, maintenance |
| status                  | active, paused, completed, cancelled                    |
| project_type            | mvp, custom_development, internal                       |
| start_date, target_date | Timeline tracking                                       |
| summary                 | AI-generated evolving summary                           |
| lessons                 | What we learned (for reuse)                             |

#### Sprint

A time-boxed unit of work within a project.

| Field                | Purpose                                    |
| -------------------- | ------------------------------------------ |
| project_id           | Parent project                             |
| name, goal           | What this sprint aims to achieve           |
| number               | Sprint sequence within project             |
| status               | planned, in_progress, completed, cancelled |
| start_date, end_date | Time box                                   |
| retrospective        | What went well, what didn't                |
| reusable             | Flag: can this sprint be used as template? |

#### Meeting (exists, needs extension)

Already in the system. Needs:

| New Field           | Purpose                    |
| ------------------- | -------------------------- |
| verification_status | draft, in_review, verified |
| verified_by         | Who approved it            |
| verified_at         | When it was approved       |

#### Extraction (exists, needs extension)

Already in the system. Needs:

| New Field                | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| verification_status      | draft, in_review, verified                           |
| verified_by, verified_at | Approval tracking                                    |
| assignee_id              | For action_items: who is responsible                 |
| due_date                 | For action_items: when is it due                     |
| action_status            | For action_items: open, in_progress, done, cancelled |

#### Document (new)

Files and documents linked to projects/organizations.

| Field                       | Purpose                            |
| --------------------------- | ---------------------------------- |
| title                       | Document name                      |
| source                      | google_docs, uploaded, generated   |
| source_url                  | Link to original                   |
| content                     | Extracted text content             |
| document_type               | prd, proposal, spec, report, other |
| project_id, organization_id | Context links                      |
| verification_status         | draft, verified                    |
| embedding                   | For semantic search                |

#### Message (future — Slack, Email)

Threaded communication linked to projects/people.

| Field                       | Purpose             |
| --------------------------- | ------------------- |
| source                      | slack, email        |
| thread_id                   | Grouping            |
| sender_id                   | Person who sent it  |
| content                     | Message text        |
| project_id, organization_id | Context links       |
| embedding                   | For semantic search |

---

## 5. Verification Model

**Principle:** Nothing becomes "truth" until a human has reviewed it.

### Flow

```
Source data arrives (webhook, import, sync)
        ↓
AI processes (classification, extraction, embedding)
        ↓
   ┌──────────────┐
   │ REVIEW QUEUE │  Status: draft
   │              │  Visible in: Cockpit review UI
   │              │  NOT visible in: Client portal, MCP queries (by default)
   └──────┬───────┘
          │
     Human reviews:
     ├── Approve as-is → status: verified
     ├── Edit & approve → content updated, status: verified
     └── Reject → status: rejected (with reason)
          │
   ┌──────┴───────┐
   │   VERIFIED   │  Status: verified
   │              │  Visible in: Everything (cockpit, portal, MCP)
   │              │  AI can build on this content
   └──────────────┘
          │
     AI generates new insights (cross-meeting summaries, trends)
          │
   ┌──────────────┐
   │ REVIEW QUEUE │  AI-generated insights also need review
   └──────────────┘
```

### Rules

1. MCP tools query **only verified content** by default (with option to include drafts)
2. Client portal shows **only verified content**
3. Cockpit shows **everything** with clear status indicators
4. AI-generated insights (summaries, trends) go through the same review pipeline
5. Review must be fast and intuitive — not a bottleneck

---

## 6. Three Interfaces

### 6.1 Cockpit (Internal — Stef, Wouter, Ege)

The operational command center. Everything in one place.

**Sections:**

- **Dashboard** — Overview of all projects, upcoming actions, pipeline health
- **Review Queue** — Meetings and extractions awaiting verification
- **Projects** — Per-project view with timeline, sprints, meetings, action items, documents
- **Clients** — Per-organization view (CRM-lite)
- **People** — Team + contacts
- **Pipeline** — Ingestion status, processing health, error logs
- **Insights** — AI-generated cross-project trends and patterns

**Key interactions:**

- Review and verify meeting extractions (approve/edit/reject)
- Update project phases and sprint statuses
- View action items across all projects
- Trigger AI tasks (generate summary, write email draft, create sprint plan)

### 6.2 Client Portal (External — per client)

A read-only window into their project. Shows only verified, client-appropriate content.

**Per project:**

- Current phase (visual pipeline: lead → discovery → proposal → build → delivery → maintenance)
- Meeting history (dates, summaries — not full transcripts)
- Action items (open/completed, assigned to whom)
- Key decisions made
- Non-technical PRD / project description
- AI-generated evolving project summary
- Documents shared with client

**Not shown:**

- Internal meetings
- Unverified content
- Internal action items
- Pricing/billing
- Other clients' data

**Authentication:** Separate client login, scoped to their organization's projects only.

### 6.3 MCP Interface (AI — Claude and other LLM clients)

The query layer for AI assistants. Already partially built.

**Queries verified knowledge base:**

- Search across all verified content
- Project status and summaries
- Action items and decisions
- People and organization info
- Cross-project patterns and insights

**Future — AI actions:**

- Draft client email based on meeting outcomes
- Create sprint plan based on PRD + lessons from similar projects
- Generate project summary update after new verified meeting
- Flag overdue action items
- Suggest next steps based on project phase

---

## 7. Data Sources & Integration Roadmap

Each source is a module. They connect independently to the knowledge base.

| #   | Source               | Status  | Priority | Ingestion Method                     |
| --- | -------------------- | ------- | -------- | ------------------------------------ |
| 1   | Fireflies (meetings) | LIVE    | —        | Webhook (real-time)                  |
| 2   | Manual input (UI)    | PARTIAL | HIGH     | Direct DB via Server Actions         |
| 3   | Google Docs          | NOT YET | MEDIUM   | Google API sync (polling or webhook) |
| 4   | Email (Gmail)        | NOT YET | MEDIUM   | Gmail API (per user inbox + shared)  |
| 5   | Slack                | NOT YET | LOW      | Slack API (when adopted internally)  |
| 6   | File uploads         | NOT YET | LOW      | Direct upload via UI                 |

**Integration pattern (same for all sources):**

```
Source → Webhook/API/Upload → Normalize → AI Process → Review Queue → Verified
```

Each new source follows the same pipeline: ingest, normalize to common format, AI-process, review, verify.

---

## 8. Design Constraints

These constraints shape every architectural decision:

| Constraint                             | Implication                                                   |
| -------------------------------------- | ------------------------------------------------------------- |
| Solo non-coding maintainer (Stef + AI) | Simple, predictable code structure. No clever abstractions.   |
| Small team (6 people)                  | No complex RBAC needed yet. Review workflow can be simple.    |
| English platform language              | All UI, data, and documentation in English                    |
| Modularity over completeness           | Build one source at a time. Each module works independently.  |
| Verification before truth              | Every piece of content has a review status                    |
| AI must know where to look             | Clear file structure, good CLAUDE.md, consistent patterns     |
| Client portal is read-only             | No complex client-side auth flows or permissions (yet)        |
| Budget-conscious                       | Right-size AI models (Haiku for simple, Sonnet for reasoning) |

---

## 9. What Exists vs. What's Needed

### Already Built (Sprint 001-007)

- [x] Database: organizations, projects, people, meetings, extractions, meeting_projects, meeting_participants
- [x] Fireflies webhook + full AI pipeline (Gatekeeper + Extractor)
- [x] Cohere embeddings (1024-dim) + hybrid search
- [x] 12 MCP tools with source attribution
- [x] Correction tool for extractions
- [x] Basic auth + dashboard shell

### Needs Extension

- [ ] Verification status on meetings and extractions (draft → verified)
- [ ] Review queue UI in cockpit
- [ ] Project phases (currently only status, no phase tracking)
- [ ] Sprint entity (does not exist yet)
- [ ] Action item tracking with assignee/due date/status
- [ ] Evolving project summaries (AI-generated, reviewed)

### Needs Building

- [ ] Project dashboard (overview of all projects with phase + health)
- [ ] Client portal (separate auth, read-only per-org view)
- [ ] Document entity + Google Docs integration
- [ ] Email integration (Gmail API)
- [ ] Knowledge reuse system (lessons learned, sprint templates)
- [ ] AI action triggers from cockpit

---

## 10. Open Questions

These need answers before or during implementation:

1. **Client portal auth:** Separate Supabase project, or same project with role-based access?
2. **Document structure:** How should Google Docs be organized? Per client folder? Per project?
3. **Email scope:** Which email addresses to connect? Just Stef + Wouter, or all team?
4. **Sprint templates:** What does a reusable sprint look like? What metadata makes it useful?
5. **AI insight triggers:** When should the system generate new insights? After each verified meeting? Daily batch? On-demand?
6. **Notification preferences:** How should the team be alerted about new items in review queue?
7. **Cockpit questions brainstorm:** What are the top questions the cockpit should answer? (Separate session planned)
