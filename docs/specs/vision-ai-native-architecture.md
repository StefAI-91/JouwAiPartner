# Vision: AI-Native Architecture

> **Status:** Active — this is the north star for all platform development
> **Date:** 2026-04-10 (updated)
> **Owner:** Stef Banninga
> **Version:** 1.1

---

## 1. The Core Idea

Jouw AI Partner runs as an **AI-native company**. AI is not a feature we add — it is the backbone of how we operate. Every business process flows through a system where AI monitors, prepares, executes, and learns — with humans guiding, verifying, and steering.

This document defines the full-circle architecture that makes this possible.

---

## 2. The Four Quadrants

The platform consists of four interconnected quadrants. Each serves a distinct role, but they share one database, one AI brain, and one verification model.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                      CLIENT PORTAL                           │
│               (Transparency & Communication)                 │
│                                                              │
│   Client sees progress, asks questions, gives feedback       │
│   AI answers (human reviews before sending)                  │
│   AI asks clarifying questions when needed                   │
│                                                              │
└──────────┬──────────────────────────────────────┬────────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│                         │    │                              │
│    COCKPIT              │    │    DELIVERY                  │
│    (Strategy & PM)      │    │    (Shipped Products)        │
│                         │    │                              │
│  AI = Project Manager   │    │  Client applications live    │
│  Knowledge hub: all     │    │  here. Feedback comes back   │
│  meetings, decisions,   │    │  via widget, chatbot, or     │
│  insights flow in.      │    │  direct reporting.           │
│  AI organizes,          │    │                              │
│  prioritizes, alerts.   │    │  Support chatbot handles     │
│                         │    │  known issues, escalates     │
│                         │    │  unknowns to humans.         │
└────────────┬────────────┘    └───────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                        DEVHUB                                │
│                  (Build & Execute)                            │
│                                                              │
│   Internal tool for the team + AI agents                     │
│   Tickets from all sources: Userback, portal, meetings,      │
│   manual. AI triages, prepares context, and eventually       │
│   picks up work. Human reviews all AI output.                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Cockpit — Strategy & Project Management

**App:** `apps/cockpit/`
**Users:** Internal team (Stef, Wouter, Ege)
**AI role:** Project Manager

The cockpit is where all knowledge enters and gets organized. Multiple data sources feed in — meetings, emails, and phone calls — each processed through dedicated AI pipelines that classify, extract, and embed. Humans verify. The cockpit gives the team a single view of:

- All client relationships (meetings + emails + calls = CRM)
- All open work across projects
- AI-generated summaries, briefings, and weekly management reports
- Project and organization context with AI-powered health scoring
- Alerts on overdue items, knowledge drift, or emerging patterns

**Key principle:** The cockpit is the strategic layer. It answers "what should we do?" and "what do we know?"

### 2.2 DevHub — Build & Execute

**App:** `apps/devhub/`
**Users:** Internal team + outsource developers (Kenji, Myrrh)
**AI role:** Developer (evolving from assistant to autonomous)
**Product type:** Internal tool (not sold to clients)

The DevHub is the operational build engine. Work arrives here from multiple sources:

- Userback feedback synced from client apps
- Portal feedback submitted by clients
- Action items promoted from cockpit meetings
- Manual tickets created by the team

AI classifies, triages, and enriches every ticket. Over time, AI progresses from assistant to executor:

```
Phase 1-2:  AI assists     — classifies, suggests priority, generates context
Phase 3-4:  AI prepares    — writes implementation plans, impact analyses
Phase 5+:   AI executes    — picks up tickets, writes code, opens PRs, human reviews
```

**Key principle:** The DevHub is the operational layer. It answers "what are we building?" and "who (or what) is building it?"

### 2.3 Delivery — Shipped Products

**Not a separate app** — these are the client applications we build and maintain.
**AI role:** Support agent (via embedded widget)

Every delivered product generates feedback:

- **Embedded widget** (currently Userback, future: own widget) — chat, feedback forms, bug reports
- **Direct communication** — email, WhatsApp, meetings (all flow into cockpit)

#### Decision: Embeddable widget architecture (2026-04-10)

The delivery layer uses a single embeddable JavaScript snippet per project:

```html
<script
  src="https://widget.jouwaipartner.nl/v1/embed.js"
  data-project-key="cai-studio-abc123"
></script>
```

The widget has two modes:

1. **Chat mode** (default) — client types a question or reports a problem.
   - Support agent searches verified knowledge for that project
   - Answer found → responds immediately (sensitive answers flagged for human review)
   - Not found → creates DevHub issue, tells client "we've logged this"
   - Conversation stored and linked to project

2. **Structured feedback mode** — switchable form.
   - Title, description, type selector (bug / question / feature idea)
   - Built-in screenshot capture (browser API)
   - Automatic metadata: current URL, browser, viewport, timestamp
   - Submits directly as DevHub issue with AI classification

**Architecture:** `packages/widget/` builds to standalone JS file. Backend via API routes using same Supabase instance. `project_key` on projects table links widget to project. Uses Support agent (Haiku/Sonnet) + MCP search for chat answers.

**Timeline:** Phase D — after DevHub is solid and portal MVP exists. Currently using Userback with DH-007 sync as interim solution.

**Key principle:** Delivery is the feedback layer. It answers "what does the client experience?" and "what needs fixing?"

### 2.4 Portal — Transparency & Communication

**App:** `apps/portal/`
**Users:** Clients (scoped to their own projects)
**AI role:** Account manager (drafts answers, generates progress updates)

The portal is the client-facing window into their project. Clients see:

- Project progress (current phase, milestones, timeline)
- Meeting history (dates + summaries, not full transcripts)
- Open action items and decisions
- Status of reported bugs/feedback

Clients can:

- Ask questions (AI drafts answer from verified knowledge, human reviews before sending)
- Submit feedback (flows directly into DevHub as a ticket)
- View real-time status of their reported issues

AI can:

- Generate weekly status updates for human review
- Ask the client clarifying questions when a ticket or requirement is ambiguous
- Flag to the team when client sentiment signals concern

**Key principle:** The portal is the trust layer. It answers "what's happening with my project?" and "am I being heard?"

#### Decision: Single Supabase instance for portal (2026-04-10)

The portal uses the same Supabase project as cockpit and devhub. No separate database.

**Rationale:** A second database means double migrations, double types, data syncing complexity, and double operational overhead — all for a 3-person team. The portal reads the same data (projects, meetings, extractions, issues) that already exists. RLS is designed to scope access per user role.

**What this requires before portal launch:**

- Upgrade RLS from "permissive for authenticated" to role-based policies
- Internal users (admin/member) → full access (cockpit/devhub behavior unchanged)
- Client users → scoped to their organization's projects, verified content only, no transcripts
- `profiles.role` column already exists and is prepared for this

---

## 3. The Data Flow — Full Circle

This is how data flows through the four quadrants, creating a continuous feedback loop:

```
1. KNOWLEDGE IN (Cockpit)
   Data enters from multiple sources:
   ├── Meeting → Fireflies transcribes → Gatekeeper classifies → Summarizer + Extractor
   ├── Email   → Gmail syncs → Email Classifier → Email Extractor
   └── Call    → Rinkel webhook → ElevenLabs transcribes → Gatekeeper + Extractor (planned)
   → Human reviews → Verified knowledge enters the system

2. WORK CREATED (Cockpit → DevHub)
   Decision extracted → Action item identified → Task promoted
   → Issue created in DevHub (linked to source meeting/email)

3. WORK EXECUTED (DevHub)
   AI triages ticket → Developer (human or AI) picks it up
   → Code written → PR created → Human reviews → Merged

4. PRODUCT DELIVERED (DevHub → Delivery)
   Code deployed → Client uses the product
   → Feedback collected via widget/chatbot

5. FEEDBACK CAPTURED (Delivery → DevHub)
   Bug reported → AI classifies → Appears in DevHub triage
   → Prioritized alongside other work

6. CLIENT INFORMED (DevHub → Portal)
   Issue status changes → Portal updates in real-time
   → Client sees progress without asking

7. KNOWLEDGE GROWS (Portal → Cockpit)
   Client asks question → AI searches knowledge base
   → Answer reviewed → New knowledge captured
   → Patterns detected across projects

   → BACK TO STEP 1
```

### 3.1 The Bridges (connecting quadrants)

| Bridge                  | From → To         | Mechanism                                                              |
| ----------------------- | ----------------- | ---------------------------------------------------------------------- |
| **Meeting → Ticket**    | Cockpit → DevHub  | Manual "Send to DevHub" on promoted tasks (see decision below)         |
| **Feedback → Ticket**   | Delivery → DevHub | Userback/widget/chatbot creates issue with AI classification           |
| **Ticket → Status**     | DevHub → Portal   | Issue status changes reflect in client portal                          |
| **Question → Answer**   | Portal → Cockpit  | Client question triggers AI search of verified knowledge               |
| **Knowledge → Context** | Cockpit → DevHub  | AI enriches DevHub tickets with relevant meeting context and decisions |
| **Progress → Update**   | DevHub → Portal   | AI generates progress summaries for client review                      |

#### Decision: Meeting → Ticket bridge is manual-first (2026-04-10)

The cockpit↔devhub bridge evolves in three phases:

1. **Now (manual):** A "Send to DevHub" button on promoted tasks in cockpit. Human decides which action items become DevHub tickets. Linked via `source_task_id` / `source_extraction_id` on the issues table.
2. **Later (AI suggests):** After enough manual decisions accumulate as training data, AI analyzes patterns ("these types of action items always become tickets") and suggests — human approves or dismisses.
3. **Future (AI autonomous):** AI creates tickets automatically for high-confidence matches, flags uncertain ones for review.

The manual phase is not wasted — it produces the labeled dataset the AI needs to learn what "worth a ticket" means for this team.

### 3.2 Data Sources — Knowledge Ingestion Paths

The platform ingests knowledge from multiple sources. Each follows the same pattern: ingest → AI classifies → AI extracts → human reviews → verified knowledge. New sources can be added by following this pattern.

| Source          | Ingestion                                 | AI Pipeline                                 | Status                    |
| --------------- | ----------------------------------------- | ------------------------------------------- | ------------------------- |
| **Meetings**    | Fireflies API (automatic)                 | Gatekeeper → Summarizer → Extractor → Embed | Built                     |
| **Emails**      | Gmail API (manual sync)                   | Email Classifier → Email Extractor → Embed  | Built                     |
| **Phone calls** | Rinkel webhook → ElevenLabs transcription | Gatekeeper → Summarizer → Extractor → Embed | Planned (backlog R01-R04) |
| **Feedback**    | Userback API (manual sync)                | Issue Classifier → DevHub                   | Built                     |

**Future sources** (not yet planned): Slack messages, uploaded documents, WhatsApp. Each would follow the same classify → extract → verify → embed pattern.

**Design principle:** Every source produces the same output types — extractions (decisions, action items, needs, insights) and embeddings — so downstream consumers (MCP, portal, agents) don't need to know where knowledge came from.

---

## 4. The AI Brain — Agent System

All agents share the same principles:

- **Write to database, not to each other** — ensures audit trail + replay
- **Right-size the model** — cheap models for simple tasks, expensive for complex
- **Human-in-the-loop** — every AI output goes through verification before becoming truth
- **Database as communication bus** — agents coordinate via DB rows, not direct calls

### 4.1 Agent Roster

**Built agents (11):**

| Agent                  | Model     | Quadrant | Purpose                                                                                    |
| ---------------------- | --------- | -------- | ------------------------------------------------------------------------------------------ |
| **Gatekeeper**         | Haiku 4.5 | Cockpit  | Classify meetings: type, party type, relevance, organization, project matching             |
| **Summarizer**         | Sonnet    | Cockpit  | Generate structured meeting summaries: briefing, kernpunten, vervolgstappen                |
| **Extractor**          | Sonnet    | Cockpit  | Extract actionable items from meetings (wachten_op_extern, wachten_op_beslissing)          |
| **Needs Scanner**      | Sonnet    | Cockpit  | Identify unmet needs from verified meetings (tooling, kennis, capaciteit, proces, klant)   |
| **Email Classifier**   | Haiku 4.5 | Cockpit  | Classify emails: relevance, type, party, organization + project matching                   |
| **Email Extractor**    | Sonnet    | Cockpit  | Extract insights from emails (decisions, needs, project updates, requests)                 |
| **Project Summarizer** | Sonnet    | Cockpit  | Generate project/org summaries: context, briefing, timeline from all verified data         |
| **Weekly Summarizer**  | Sonnet    | Cockpit  | Management summaries: project health (groen/oranje/rood), cross-project risks, focus items |
| **Issue Classifier**   | Haiku 4.5 | DevHub   | Classify issues: type, component, severity, repro steps                                    |
| **Issue Executor**     | Sonnet    | DevHub   | Create execution plans: 3-6 concrete steps, complexity estimate, edge cases                |
| **Issue Reviewer**     | Sonnet    | DevHub   | Project health analysis: score (0-100), patterns, risks, recommendations                   |

**Planned agents (5):**

| Agent            | Model        | Quadrant | Purpose                                                                    |
| ---------------- | ------------ | -------- | -------------------------------------------------------------------------- |
| **Planner**      | Sonnet       | DevHub   | Turn decisions/needs into implementation plans and ticket specs            |
| **Curator**      | Sonnet       | Cockpit  | Nightly: dedupe, detect staleness, resolve contradictions across knowledge |
| **Analyst**      | Opus         | Cockpit  | Daily: cross-source patterns, trends, risk flags, sentiment tracking       |
| **Communicator** | Sonnet       | Portal   | Draft client-facing answers, progress updates, Q&A responses               |
| **Support**      | Haiku/Sonnet | Delivery | Chatbot: answer questions from verified knowledge, report bugs, escalate   |

**Planned infrastructure (1):**

| Agent          | Model       | Quadrant | Purpose                                               |
| -------------- | ----------- | -------- | ----------------------------------------------------- |
| **Dispatcher** | Haiku/rules | Cross    | Route alerts to Slack, email, or portal notifications |

**Future (not yet scoped):**

| Agent        | Model       | Quadrant | Purpose                                                                    |
| ------------ | ----------- | -------- | -------------------------------------------------------------------------- |
| **Executor** | Sonnet/Opus | DevHub   | Pick up `ai_autonomous` tickets, write code, create PRs (requires Phase C) |

### 4.2 Agent Evolution Roadmap

```
TODAY (Built — 11 agents)
├── Cockpit: Knowledge Ingestion
│   ├── Gatekeeper: classifies meetings (type, party, relevance, org, project)
│   ├── Summarizer: structured meeting summaries (briefing, kernpunten, vervolgstappen)
│   ├── Extractor: extracts actionable items from meetings
│   ├── Needs Scanner: identifies unmet needs across verified meetings
│   ├── Email Classifier: classifies incoming emails
│   ├── Email Extractor: extracts insights from emails
│   ├── Project Summarizer: generates project/org context + briefing + timeline
│   └── Weekly Summarizer: management reports with project health scoring
│
└── DevHub: Issue Processing
    ├── Issue Classifier: triages issues (type, component, severity, repro)
    ├── Issue Executor: creates implementation plans with steps
    └── Issue Reviewer: project health analysis with patterns + risks

NEXT (Near-term — Phase A/B)
├── Planner: turns decisions/needs into ticket specs
├── Curator: nightly knowledge hygiene (dedupe, staleness, contradictions)
└── Communicator: drafts client-facing answers for portal

FUTURE (Long-term — Phase C/D/E)
├── Executor: AI writes code and opens PRs
├── Support: embedded chatbot in client apps
├── Analyst: cross-project pattern detection
└── Dispatcher: automated routing and notifications
```

### 4.3 AI Feedback Loop — Learning from Human Corrections

Every human review produces labeled data: approved extractions are "correct," rejected extractions are "wrong," and edited extractions show exactly how the AI was off. This correction data is already stored (`corrected_by`, `corrected_at`, `verification_status`) but not yet used for improvement.

**Current state:** Corrections stored, not analyzed.

**Planned evolution:**

1. **Measure** — Track approval/rejection rates per agent. Know which agent produces the most corrections and for which extraction types. This requires no new code — just a dashboard query against existing verification data.
2. **Analyze** — Identify patterns in corrections. Does the Extractor consistently misclassify a certain type of action item? Does the Gatekeeper underrate relevance for a specific client? The Analyst agent (Phase E) can do this, but basic metrics can start now.
3. **Adapt** — Use correction patterns to refine agent prompts. If the team consistently rejects a certain category of extractions, the Extractor's system prompt should be updated to match. This remains a manual process (prompt tuning), not automated fine-tuning.

**Rule:** We do not auto-tune agents. Prompt improvements are human-reviewed and deliberately deployed. The feedback loop informs decisions — it doesn't make them.

### 4.4 AI Operations & Cost Visibility

For an AI-native company, understanding AI operational cost is critical for pricing, scaling, and optimization.

**What to track:**

| Metric                                 | Purpose                                          | Location                  |
| -------------------------------------- | ------------------------------------------------ | ------------------------- |
| Token usage per pipeline run           | Cost allocation per meeting/email                | Pipeline telemetry        |
| Agent success/error rate               | Reliability monitoring                           | Pipeline logs             |
| Average review approval rate per agent | Quality signal — which agents need prompt tuning | Verification data         |
| Embedding staleness percentage         | Knowledge freshness                              | `embedding_stale` columns |
| Review queue depth                     | Bottleneck detection                             | Review queries            |
| Processing latency (ingest → verified) | End-to-end speed                                 | Timestamps                |

**Current state:** `mcp_queries` tracks MCP tool usage. No pipeline-level telemetry exists yet.

**Planned:** An AI operations view in the cockpit dashboard (or `/system` route) that shows agent health, queue depth, and cost trends. Not a separate quadrant — a system observability layer.

---

## 5. The Verification Model

The verification model is the foundation that makes AI-native operation trustworthy. Without it, AI output is noise. With it, AI output becomes organizational truth.

```
ANY data enters the system
    → AI processes (classify, extract, enrich, generate)
    → REVIEW QUEUE (status: draft)
    → Human reviews:
        ├── Approve → status: verified → becomes queryable truth
        ├── Edit + Approve → corrected, then verified
        └── Reject → status: rejected (with reason)
    → Verified content is:
        ├── Searchable via MCP
        ├── Visible in client portal
        ├── Usable by other AI agents as trusted input
        └── The basis for AI-generated insights (which also get reviewed)
```

**This applies to everything:**

- Meeting extractions (cockpit)
- AI-generated summaries (cockpit)
- AI-drafted client answers (portal)
- AI-generated implementation plans (devhub)
- AI-written code (devhub, via PR review)

**Rule:** No AI output reaches a client or becomes "truth" without human verification.

### 5.1 Scaling the Review Gate

With 3 reviewers (Stef, Wouter, Ege) and growing data sources (meetings + emails + calls + portal Q&A + ticket specs), verification can become a bottleneck. The review model must evolve:

**Current (Phase A-B):** Every extraction is manually reviewed. This works at current volume (~10-20 meetings/week) and is critical for building confidence in AI accuracy.

**Near-term (Phase C):** As agent accuracy data accumulates (see 4.3), introduce **tiered review**:

- High-confidence extractions from high-accuracy agents → auto-approve, spot-check weekly
- Medium-confidence → review queue (current behavior)
- Low-confidence → flagged for priority review

**Long-term (Phase E):** The Curator agent assists review by pre-screening for contradictions, duplicates, and staleness — reducing human review to exception handling.

**Guardrail:** Auto-approval thresholds are set conservatively and only enabled after an agent demonstrates >95% approval rate over 100+ reviews. The principle remains "verification before truth" — the mechanism evolves, the principle doesn't.

### 5.2 The Knowledge Graph

The data model implicitly creates a knowledge graph connecting all entities:

```
Organizations ──< Projects ──< Issues
      │                │              │
      │                ├── Meetings ──┤
      │                │              │
      │                └── Emails ────┘
      │                │
      └── People ──────┘
              │
              └── Extractions (decisions, actions, needs, insights)
                       │
                       └── Tasks (promoted action items)
```

Every entity is linked and embedded for semantic search. This enables:

- **"Show me everything about client X"** — one graph traversal across meetings, emails, extractions, issues, people
- **"What decisions in project A might affect project B?"** — cross-project extraction search
- **"Which people are involved across the most projects?"** — relationship density analysis
- **"This problem was solved before in project X"** — cross-project knowledge reuse (the Analyst agent's core job)

**Current state:** Graph exists implicitly via foreign keys and embeddings. Not yet exposed as a first-class query capability.

**Planned:** The Analyst agent (Phase E) traverses this graph to detect patterns and reuse opportunities.

---

## 6. Shared Infrastructure

All four quadrants share:

| Layer        | Technology                       | Location                                       |
| ------------ | -------------------------------- | ---------------------------------------------- |
| **Database** | Supabase (PostgreSQL + pgvector) | Single instance, EU-Frankfurt                  |
| **Auth**     | Supabase Auth                    | `packages/auth/` — shared middleware + helpers |
| **AI**       | Vercel AI SDK + Claude + Cohere  | `packages/ai/` — agents, embeddings, pipeline  |
| **UI**       | shadcn/ui components             | `packages/ui/` — shared design system          |
| **MCP**      | Model Context Protocol server    | `packages/mcp/` — 10+ tools for AI access      |
| **Queries**  | Centralized read/write           | `packages/database/` — queries + mutations     |

### 6.1 Monorepo Structure

```
/
├── apps/
│   ├── cockpit/          # Strategy & PM (built)
│   ├── devhub/           # Build & Execute (internal, partially built)
│   └── portal/           # Client transparency (planned)
│
├── packages/
│   ├── database/         # Shared data access
│   ├── ai/               # Shared AI agents + pipeline
│   ├── auth/             # Shared auth helpers
│   ├── ui/               # Shared UI components
│   └── mcp/              # MCP server + tools
│
├── supabase/             # Migrations, functions, seeds
└── docs/specs/           # All specifications (this doc lives here)
```

---

## 7. What "AI-Native" Means Concretely

It is easy to say "AI is the backbone." Here is what it means in database rows and agent code:

### 7.1 AI Monitors Everything

- Every meeting is automatically classified, summarized, and extracted (Gatekeeper → Summarizer → Extractor)
- Every email is automatically classified and insights extracted (Email Classifier → Email Extractor)
- Every phone call is transcribed and processed through the same pipeline (planned)
- Every feedback item is automatically triaged (Issue Classifier)
- Every piece of knowledge is embedded for semantic search (Cohere embed-v4, 1024-dim)
- Project and organization health are summarized weekly (Weekly Summarizer)
- The Curator agent runs nightly to detect drift, staleness, contradictions (planned)

### 7.2 AI Prepares Work

- Meetings produce action items → AI suggests tickets with context
- Feedback produces issues → AI classifies, adds repro steps, links related items
- The Planner agent turns strategic decisions into implementation-ready specs

### 7.3 AI Executes (Where Appropriate)

- For our own codebase: AI picks up tickets, writes code, creates PRs
- For client projects with external tooling (N8N, Windmill): AI generates context and handover docs, humans execute
- The `execution_type` field on issues (`manual` / `ai_assisted` / `ai_autonomous`) controls what AI can touch

### 7.4 AI Communicates

- Client portal answers are AI-drafted, human-reviewed
- Progress updates are AI-generated from real project data
- The support chatbot handles known issues without human intervention

### 7.5 Humans Steer

- All AI output goes through verification before becoming truth
- Humans set priorities, make strategic decisions, approve plans
- The review gate is fast and lightweight — designed for a 3-person review team
- Humans can override any AI decision at any point

### 7.6 Operational Resilience

The platform is maintained by Stef (non-coder, via Claude Code). This is a strength (AI-native development validates the vision) and a risk (single point of failure).

**Mitigations:**

- **Backup reviewer:** Ege can review AI output and approve/reject in cockpit and devhub
- **Documentation as resilience:** All architecture decisions, agent prompts, and pipeline logic are documented. A new person can understand the system by reading the specs.
- **Automated health monitoring (planned):** AI operations dashboard (see 4.4) will surface errors, queue depth, and agent failures — making issues visible before they require intervention
- **The AI itself is the safety net:** As agents become more reliable, the system becomes less dependent on any single person for day-to-day operations. Humans steer; the system runs.

---

## 8. Implementation Phases

### Phase A: Connect What Exists (current)

**Done:**

- Unblock DevHub (FND-003, FND-004)
- Complete DevHub AI classification + Userback import (DH-006, DH-007)
- Email pipeline: Gmail ingestion, classification, extraction, review
- Project & organization summaries with AI context/briefing
- Weekly management summaries with project health scoring
- 11 AI agents operational across cockpit and devhub
- Cockpit UI: project pages, organization pages (sprints 029-030 in backlog)

**Remaining:**

- Build the cockpit ↔ devhub bridge (meeting/email action items → devhub tickets)
- VoIP pipeline: Rinkel webhook + ElevenLabs transcription (sprints R01-R04)
- AI accuracy metrics: approval/rejection tracking per agent

**Exit criteria:** A promoted task in cockpit can become a DevHub issue with one click, linked to its source meeting/email.

### Phase B: Client Portal MVP

- Foundation: role-based RLS upgrade (admin/member → full, client → scoped)
- Foundation: Q&A data model (conversations, messages, review flow)
- Foundation: project milestone/timeline data model
- Read-only project dashboard for clients
- AI-powered Q&A (Communicator agent drafts, human reviews, client sees answer)
- Feedback submission from portal → DevHub
- Status page per project (public, read-only via project_key)

**Exit criteria:** A client can log in, see their project status, ask a question, and submit feedback — without needing a meeting or email.

### Phase C: AI Execution Foundation

- Planner agent: decisions/needs → implementation plans
- Executor agent: picks up `ai_autonomous` tickets, creates PRs
- Human review of all AI-generated code via PR workflow
- AI accuracy tracking informs which tickets are safe for autonomous execution

**Exit criteria:** At least one ticket per week is completed end-to-end by AI, with human review only at the PR stage.

### Phase D: Delivery Layer

- Support chatbot embedded in client apps (own widget, replaces Userback)
- Answers from verified knowledge, escalates unknowns
- Bug reports flow directly into DevHub with AI classification
- Chatbot learns from resolved interactions

**Exit criteria:** The support chatbot deflects >50% of client questions without human intervention.

### Phase E: Intelligence Layer

- Curator agent: nightly knowledge hygiene (dedupe, staleness, contradictions)
- Analyst agent: cross-project patterns and trends
- Dispatcher agent: automated alerts and routing (Slack, email, portal notifications)
- Cross-project learning: "this was solved before in project X"
- Tiered review: auto-approve high-confidence, high-accuracy extractions

**Exit criteria:** The system proactively surfaces insights and alerts that the team didn't know to ask for.

---

## 9. Decision: DevHub Is Internal

**Date:** 2026-04-10
**Decision:** DevHub is an internal tool, not a product we sell to clients.

**Implications:**

- Optimize for our workflow and our AI agents, not for external onboarding
- Tight integration with cockpit (shared knowledge, linked tickets)
- No multi-tenancy requirements beyond project-scoped access for outsource developers
- UI can prioritize speed and function over polish
- If it becomes good enough to productize later, that's a bonus — not a goal

**What clients see instead:** The portal (project progress, status of their reported issues) and the status page (public, read-only per project).

---

## 10. Success Metrics

### 10.1 End-State Metrics

How we know the full architecture is working:

| Metric                                  | Today                          | Target                   |
| --------------------------------------- | ------------------------------ | ------------------------ |
| Time from meeting to actionable tickets | Manual, hours/days             | Automated, minutes       |
| Time from bug report to triage          | Manual, days                   | AI-classified in seconds |
| Client visibility into project status   | Via meetings/email only        | Self-service portal      |
| Knowledge reuse across projects         | None (tribal knowledge)        | AI-powered, searchable   |
| Percentage of work AI can execute       | 0%                             | 30%+ of routine tickets  |
| Review bottleneck                       | N/A (no review yet for DevHub) | < 24h review turnaround  |

### 10.2 Per-Phase Metrics

Each phase has a measurable exit signal:

| Phase                | Key Metric                  | How to Measure                                                  |
| -------------------- | --------------------------- | --------------------------------------------------------------- |
| **A** (current)      | Meeting → Ticket conversion | % of promoted action items that become DevHub issues via bridge |
| **B** (portal)       | Client self-service ratio   | % of client questions answered via portal without meeting/email |
| **C** (AI exec)      | AI ticket completion rate   | % of `ai_autonomous` tickets successfully merged                |
| **D** (delivery)     | Support deflection rate     | % of widget interactions resolved without human escalation      |
| **E** (intelligence) | Proactive insight rate      | # of actionable insights surfaced that were not asked for       |

### 10.3 AI System Health Metrics

Ongoing metrics to monitor the AI brain itself:

| Metric                  | Purpose                                                | Source                               |
| ----------------------- | ------------------------------------------------------ | ------------------------------------ |
| Agent approval rate     | Quality signal — high approval = trustworthy agent     | `verification_status` on extractions |
| Agent error rate        | Reliability — pipeline failures per run                | Pipeline logs                        |
| Review queue depth      | Bottleneck detection — growing queue = scaling problem | Review queries                       |
| Embedding freshness     | Knowledge currency — % of stale embeddings             | `embedding_stale` columns            |
| Processing latency      | Speed — time from data ingest to review-ready          | Timestamp diffs                      |
| AI cost per data source | Economics — cost to process one meeting vs one email   | Token usage (planned)                |

---

## 11. Relationship to Other Docs

| Document                                               | Role                                | Relationship                                                                      |
| ------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------- |
| **This document** (`vision-ai-native-architecture.md`) | North star — the "why" and "what"   | Overrides all others on architectural direction                                   |
| `platform-spec.md`                                     | Technical specification — the "how" | Details the data model, AI pipeline, and current implementation                   |
| `prd-devhub.md`                                        | DevHub product requirements         | Specifies DevHub phases, UI, data model. Now scoped as internal tool per this doc |
| `requirements.md`                                      | Cockpit requirements register       | Tracks individual requirements with IDs                                           |
| `requirements-devhub.md`                               | DevHub requirements register        | Tracks DevHub requirements with IDs                                               |
| Sprint files (`sprints/`)                              | Execution units                     | Each sprint references requirements and builds toward this vision                 |
