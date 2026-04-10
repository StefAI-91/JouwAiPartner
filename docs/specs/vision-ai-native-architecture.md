# Vision: AI-Native Architecture

> **Status:** Active — this is the north star for all platform development
> **Date:** 2026-04-10
> **Owner:** Stef Banninga
> **Version:** 1.0

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

The cockpit is where all knowledge enters and gets organized. Meetings are transcribed, AI extracts decisions and action items, humans verify. The cockpit gives the team a single view of:

- All client relationships (meetings = CRM)
- All open work across projects
- AI-generated summaries and briefings
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
   Meeting happens → Fireflies transcribes → AI classifies + extracts
   → Human reviews → Verified knowledge enters the system

2. WORK CREATED (Cockpit → DevHub)
   Decision extracted → Action item identified → Task promoted
   → Issue created in DevHub (linked to source meeting)

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

---

## 4. The AI Brain — Agent System

All agents share the same principles:

- **Write to database, not to each other** — ensures audit trail + replay
- **Right-size the model** — cheap models for simple tasks, expensive for complex
- **Human-in-the-loop** — every AI output goes through verification before becoming truth
- **Database as communication bus** — agents coordinate via DB rows, not direct calls

### 4.1 Agent Roster

| Agent            | Model        | Status  | Quadrant | Purpose                                                         |
| ---------------- | ------------ | ------- | -------- | --------------------------------------------------------------- |
| **Gatekeeper**   | Haiku 4.5    | Built   | Cockpit  | Classify incoming data: meeting type, party type, relevance     |
| **Extractor**    | Sonnet       | Built   | Cockpit  | Extract decisions, action items, needs, insights from meetings  |
| **Classifier**   | Haiku 4.5    | Built   | DevHub   | Classify issues: type, component, severity, repro steps         |
| **Planner**      | Sonnet       | Planned | DevHub   | Turn decisions/needs into implementation plans and ticket specs |
| **Executor**     | Sonnet/Opus  | Planned | DevHub   | Pick up tickets, write code, create PRs                         |
| **Curator**      | Sonnet       | Planned | Cockpit  | Nightly: dedupe, detect staleness, resolve contradictions       |
| **Analyst**      | Opus         | Planned | Cockpit  | Daily: cross-source patterns, trends, risk flags                |
| **Communicator** | Sonnet       | Planned | Portal   | Draft client-facing answers, progress updates, Q&A              |
| **Support**      | Haiku/Sonnet | Planned | Delivery | Chatbot: answer questions, report bugs, escalate                |
| **Dispatcher**   | Haiku/rules  | Planned | Cross    | Route alerts to Slack, email, or portal notifications           |

### 4.2 Agent Evolution Roadmap

```
TODAY (Built)
├── Gatekeeper: classifies meetings
├── Extractor: extracts structured facts
└── Classifier: classifies DevHub issues

NEXT (Near-term)
├── Curator: keeps knowledge fresh and consistent
├── Planner: turns knowledge into actionable work
└── Communicator: drafts client-facing content

FUTURE (Long-term)
├── Executor: AI writes code and opens PRs
├── Support: embedded chatbot in client apps
├── Analyst: cross-project pattern detection
└── Dispatcher: automated routing and notifications
```

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

- Every meeting is automatically classified and extracted
- Every feedback item is automatically triaged
- Every piece of knowledge is embedded for semantic search
- The Curator agent runs nightly to detect drift, staleness, contradictions

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

---

## 8. Implementation Phases

### Phase A: Connect What Exists (current)

- Unblock DevHub (FND-003, FND-004)
- Complete DevHub AI classification + Userback import (DH-006, DH-007)
- Build the cockpit ↔ devhub bridge (meeting action items → devhub tickets)
- Clean up sprint numbering and backlog docs

### Phase B: Client Portal MVP

- Read-only project dashboard for clients
- AI-powered Q&A (AI drafts, human reviews, client sees answer)
- Feedback submission from portal → DevHub
- Fine-grained RLS for client scoping

### Phase C: AI Execution Foundation

- Planner agent: decisions/needs → implementation plans
- Executor agent: picks up `ai_autonomous` tickets, creates PRs
- Human review of all AI-generated code via PR workflow

### Phase D: Delivery Layer

- Support chatbot embedded in client apps
- Answers from verified knowledge, escalates unknowns
- Bug reports flow directly into DevHub
- Chatbot learns from resolved interactions

### Phase E: Intelligence Layer

- Curator agent: nightly knowledge hygiene
- Analyst agent: cross-project patterns and trends
- Dispatcher agent: automated alerts and routing
- Cross-project learning: "this was solved before in project X"

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

How we know this architecture is working:

| Metric                                  | Today                          | Target                   |
| --------------------------------------- | ------------------------------ | ------------------------ |
| Time from meeting to actionable tickets | Manual, hours/days             | Automated, minutes       |
| Time from bug report to triage          | Manual, days                   | AI-classified in seconds |
| Client visibility into project status   | Via meetings/email only        | Self-service portal      |
| Knowledge reuse across projects         | None (tribal knowledge)        | AI-powered, searchable   |
| Percentage of work AI can execute       | 0%                             | 30%+ of routine tickets  |
| Review bottleneck                       | N/A (no review yet for DevHub) | < 24h review turnaround  |

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
