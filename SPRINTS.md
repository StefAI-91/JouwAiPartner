# Micro-Sprints

Each sprint is scoped to 3–4 tasks to preserve context window. One sprint = one focused session. Sprints are sequential — each builds on the previous.

**Status legend:** `TODO` | `IN PROGRESS` | `DONE`

---

## Phase 1 — Foundation

### Sprint 1: Project Scaffolding
> Get the monorepo structure, Supabase connection, and basic Next.js app running.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Initialize Next.js project with TypeScript, Tailwind, shadcn/ui | REQ-100, REQ-102, REQ-1408 | TODO |
| 2 | Set up Supabase project, enable pgvector extension | REQ-101 | TODO |
| 3 | Configure Supabase client SDK + environment variables | REQ-101 | TODO |

**Done when:** `npm run dev` works, Supabase connection verified, pgvector enabled.

---

### Sprint 2: Core Database Schema
> Create all content tables and system tables in Supabase.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Create content tables: `documents`, `meetings`, `slack_messages`, `emails` | REQ-1000, REQ-1001, REQ-1002, REQ-1003 | TODO |
| 2 | Create people & entity tables: `people`, `people_skills`, `people_projects`, `projects` | REQ-1004, REQ-1005, REQ-1006, REQ-1007 | TODO |
| 3 | Create structured extraction tables: `decisions`, `action_items` | REQ-1008, REQ-1009 | TODO |
| 4 | Create system tables: `content_reviews`, `insights` + add `embedding_stale` flags to all embedded tables | REQ-1010, REQ-1011, REQ-1012 | TODO |

**Done when:** All tables exist in Supabase with correct columns, types, and defaults. SQL migration files saved.

---

### Sprint 3: Embedding Service
> Build the shared embedding utility and the re-embedding background worker.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build embedding utility: function that takes text → returns OpenAI `text-embedding-3-small` vector | REQ-104 | TODO |
| 2 | Build re-embedding worker: queries `embedding_stale = true`, re-embeds in batches of 50 | REQ-1100, REQ-1101, REQ-1102 | TODO |
| 3 | Set up pg_cron or Edge Function to run re-embedding worker every 5-10 minutes | REQ-1103, REQ-106 | TODO |

**Done when:** Can embed text via utility function. Worker picks up stale rows and re-embeds them automatically.

---

### Sprint 4: Fireflies Webhook Ingestion
> Receive meeting transcripts from Fireflies in real-time.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Create Supabase Edge Function endpoint to receive Fireflies webhook | REQ-103, REQ-200 | TODO |
| 2 | On webhook: fetch full transcript, summary, action items via Fireflies GraphQL API | REQ-201 | TODO |
| 3 | Chunk transcript by topic segments (~500-800 tokens), embed, and insert into `meetings` table | REQ-204, REQ-1001 | TODO |

**Done when:** Fireflies webhook triggers ingestion, meeting appears in `meetings` table with embedding.

---

### Sprint 5: Gatekeeper Agent (v1)
> Build the AI filter that scores and classifies all incoming content.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build Gatekeeper using Vercel AI SDK `generateObject()` with Claude Haiku — score relevance (0.0-1.0) and classify categories | REQ-107, REQ-600, REQ-601, REQ-602, REQ-604 | TODO |
| 2 | Implement routing logic: REJECT / QUARANTINE / PASS based on score thresholds | REQ-603 | TODO |
| 3 | Log all Gatekeeper decisions to `content_reviews` table with reason | REQ-607 | TODO |

**Done when:** Content passes through Gatekeeper before DB insert. Decisions logged. Scores and categories assigned.

---

### Sprint 6: Gatekeeper — Novelty Check + Extraction
> Add duplicate detection and people/entity extraction to the ingestion pipeline.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Add novelty check to Gatekeeper: compare embedding similarity against existing entries, reject if > 0.92 | REQ-605 | TODO |
| 2 | Build extraction step: extract people mentions, skills, and project involvement from ingested content using `generateObject()` | REQ-1600, REQ-1601, REQ-1602, REQ-1607 | TODO |
| 3 | Build extraction step: extract decisions and action items from ingested content | REQ-1603, REQ-1604 | TODO |

**Done when:** Duplicates are caught. People, skills, decisions, and action items are extracted and written to their respective tables.

---

### Sprint 7: Fireflies Polling Fallback
> Ensure no meetings are lost if webhook delivery fails.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build polling function: query Fireflies `transcripts` endpoint with date filter, detect unprocessed meetings | REQ-202 | TODO |
| 2 | Schedule polling via pg_cron as fallback (e.g., every 30 minutes) | REQ-202, REQ-106 | TODO |
| 3 | Implement idempotency: skip meetings already in `meetings` table | REQ-202 | TODO |

**Done when:** Missed webhooks are caught by polling. No duplicate meetings inserted.

---

### Sprint 8: MCP Server (Core)
> Build the MCP server with basic search capability.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Scaffold MCP server in TypeScript (Node.js, separate process) | REQ-105 | TODO |
| 2 | Implement `search_knowledge(query)`: embed query → vector similarity search across all content tables → return ranked results with source citations | REQ-1200, REQ-1209, REQ-1210 | TODO |
| 3 | Implement `get_meeting_summary(meeting_id)`: retrieve specific meeting from `meetings` table | REQ-1203 | TODO |

**Done when:** MCP server runs, Claude Code can call `search_knowledge` and `get_meeting_summary` and get results.

---

### Sprint 9: Metrics (Basic) + End-to-End Test
> Add basic tracking and verify the full Phase 1 pipeline works end-to-end.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Track query volume: log MCP tool calls per day | REQ-1800 | TODO |
| 2 | Track Gatekeeper admit rate: count admitted/rejected/quarantined per day | REQ-1801 | TODO |
| 3 | Track zero-match rate: log searches that return 0 results | REQ-1802 | TODO |
| 4 | End-to-end test: Fireflies webhook → Gatekeeper → DB → MCP query via Claude | All Phase 1 | TODO |

**Done when:** Metrics are being logged. Full pipeline works: meeting comes in via Fireflies, gets scored, stored, and is queryable via Claude.

---

## Phase 2 — Expand Sources & Agents

### Sprint 10: Google Drive Ingestion Setup
> Connect to Google Drive and receive push notifications for doc changes.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Configure OAuth 2.0 / service account with domain-wide delegation for Google Drive API | REQ-307 | TODO |
| 2 | Set up Google domain verification in Search Console | REQ-306 | TODO |
| 3 | Build Edge Function endpoint to receive Drive push notifications | REQ-300 | TODO |

**Done when:** Google credentials configured, domain verified, endpoint receives Drive notifications.

---

### Sprint 11: Google Drive Ingestion Pipeline
> Fetch, chunk, and ingest Google Docs content.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | On push notification: call `changes.list` to get changed files, fetch doc content | REQ-302 | TODO |
| 2 | Chunk documents by headings/sections (~400 tokens, 50-token overlap) | REQ-304 | TODO |
| 3 | Handle doc updates: detect existing doc in DB, re-chunk and re-embed (not duplicate) | REQ-305 | TODO |
| 4 | Pre-filter: skip empty docs and templates | REQ-303 | TODO |

**Done when:** Doc changes flow through the pipeline. Updated docs get re-chunked, not duplicated.

---

### Sprint 12: Google Drive Watch Renewal
> Ensure Drive push notifications don't silently expire.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Implement auto-renewal of Drive watch channel before 24-hour expiry (~80% TTL) | REQ-301 | TODO |
| 2 | Schedule renewal via pg_cron (run every 18 hours) | REQ-301, REQ-106 | TODO |
| 3 | Add error handling: re-subscribe if channel is found expired | REQ-301 | TODO |

**Done when:** Watch channel auto-renews. No silent expiry gaps.

---

### Sprint 13: Slack Ingestion Setup
> Connect to Slack Events API and receive messages from channels.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Create Slack App, enable Event Subscriptions, add OAuth scopes (`channels:history`, `groups:history`, `channels:read`) | REQ-400, REQ-408 | TODO |
| 2 | Build Edge Function endpoint for Slack Events API (respond within 3 seconds, offload to queue) | REQ-401 | TODO |
| 3 | Implement idempotent event processing using `event_id` | REQ-402 | TODO |

**Done when:** Slack app installed, events flow to our endpoint, idempotency works.

---

### Sprint 14: Slack Thread Aggregation
> Ingest Slack threads as coherent knowledge units.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | On thread reply: fetch full thread via `conversations.replies`, replace previous version in DB | REQ-403, REQ-404 | TODO |
| 2 | Hold new top-level messages for ~5 minutes before ingesting (wait for thread to develop) | REQ-405 | TODO |
| 3 | Apply pre-filters: skip bot messages, reactions, messages under 20 chars, exclude noisy channels | REQ-406, REQ-407 | TODO |

**Done when:** Threads are stored as single coherent entries. Pre-filters working. Updated threads re-embed.

---

### Sprint 15: Curator Agent
> Build the nightly database hygiene agent.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Set up Curator using Claude Agent SDK with Claude Sonnet, triggered via pg_cron nightly | REQ-108, REQ-700, REQ-701 | TODO |
| 2 | Implement duplicate sweep (merge entries with embedding similarity > 0.90) + entity dedup sweep | REQ-702, REQ-707 | TODO |
| 3 | Implement staleness check + source validation (verify source docs still exist) | REQ-703, REQ-705 | TODO |
| 4 | Log all Curator actions to `content_reviews`, generate health report | REQ-708, REQ-709 | TODO |

**Done when:** Curator runs nightly, merges duplicates, flags stale content, logs everything.

---

### Sprint 16: Curator — Advanced Checks
> Add contradiction detection and quarantine auto-review.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Implement contradiction detection: find conflicting statements on the same topic | REQ-704 | TODO |
| 2 | Implement quarantine auto-review: auto-promote or auto-reject based on learned patterns | REQ-706 | TODO |
| 3 | Implement auto-reject quarantined content after 30 days if unreviewed | REQ-1703 | TODO |

**Done when:** Curator catches contradictions, handles quarantine queue automatically.

---

### Sprint 17: MCP Server — Expanded Tools
> Add people, project, and structured query tools to the MCP server.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Implement `get_decisions(topic, date_range)` and `get_action_items(assignee, status)` | REQ-1201, REQ-1202 | TODO |
| 2 | Implement `find_people(query, skill, project)` and `get_person_profile(person_id)` | REQ-1206, REQ-1207 | TODO |
| 3 | Implement `get_project_status(project_name)` and `get_document(doc_id)` | REQ-1208, REQ-1204 | TODO |

**Done when:** All 9 MCP tools are functional. Claude can answer people, project, and decision queries.

---

### Sprint 18: Access Control & Security
> Implement sensitivity-based access control.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Add `sensitivity` field to all content tables, Gatekeeper auto-tags during ingestion | REQ-606, REQ-1301 | TODO |
| 2 | Set up Supabase Auth for user authentication | REQ-1304, REQ-1305 | TODO |
| 3 | Implement Row Level Security policies: open content visible to all, restricted content visible to originating team/role | REQ-1300, REQ-1302, REQ-1303 | TODO |

**Done when:** Users authenticate via Supabase Auth. RLS enforces sensitivity-based access. Restricted content is hidden from unauthorized users.

---

### Sprint 19: Entity Resolution & Retention
> Link entities across sources and implement data lifecycle.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Implement entity matching: match mentions against `projects.aliases` during ingestion | REQ-1605 | TODO |
| 2 | Create new project entity if no alias match (or flag for review if low confidence) | REQ-1606 | TODO |
| 3 | Implement retention policies: archived 12mo → drop embeddings, rejected 90d → purge metadata | REQ-1700, REQ-1701, REQ-1702 | TODO |

**Done when:** Entities link across sources via aliases. Retention runs automatically.

---

### Sprint 20: Slack Socket Mode + Event Replay
> Development tooling and resilience.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Implement Slack Socket Mode for development/testing without public URL | REQ-409 | TODO |
| 2 | Implement event replay: failed events can be re-processed from queue | REQ-1502 | TODO |
| 3 | Verify agents can restart independently without affecting others | REQ-1503 | TODO |

**Done when:** Dev environment works without public URL. Failed events can be replayed. Agents are independently restartable.

---

## Phase 3 — Insights & Delivery

### Sprint 21: Gmail Ingestion Setup
> Connect to Gmail via Pub/Sub push notifications.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Create Cloud Pub/Sub topic, grant Gmail Publisher role | REQ-500, REQ-501 | TODO |
| 2 | Call `users.watch` with INBOX label filter, set up daily renewal via pg_cron | REQ-502, REQ-503 | TODO |
| 3 | Build ingestion: on notification, fetch emails via `history.list` + `messages.get`, apply pre-filters | REQ-504, REQ-505 | TODO |
| 4 | Chunk emails: one email = one chunk, long threads split per reply with thread context | REQ-506 | TODO |

**Done when:** Emails flow into the system in real-time. Pre-filters skip newsletters/spam.

---

### Sprint 22: Analyst Agent
> Build the deep analysis agent that generates proactive insights.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Set up Analyst using Claude Agent SDK with Claude Opus, daily schedule + Curator-triggered | REQ-800, REQ-801 | TODO |
| 2 | Implement cross-source pattern detection and trend identification | REQ-802, REQ-803 | TODO |
| 3 | Implement risk/opportunity flagging and contradiction alerts | REQ-804, REQ-805 | TODO |
| 4 | Write insight cards to `insights` table with supporting source references | REQ-806 | TODO |

**Done when:** Analyst runs daily, finds patterns across sources, writes insights with evidence.

---

### Sprint 23: Dispatcher Agent
> Route insights and alerts to the right people via Slack and email.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build Dispatcher: trigger on new `insights` table entries and alerts | REQ-900 | TODO |
| 2 | Implement Slack routing: post to relevant channels based on topic/urgency/role | REQ-901 | TODO |
| 3 | Implement email routing: send digests based on topic/urgency/role | REQ-902 | TODO |

**Done when:** Insights automatically appear in the right Slack channels and email inboxes.

---

### Sprint 24: Frontend — Knowledge Browser & People Directory
> Build the first two dashboard views.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build Knowledge Browser: browse/search all content with filters (source, category, date, status) | REQ-1400 | TODO |
| 2 | Build People Directory: view people profiles, skills, project involvement | REQ-1401 | TODO |
| 3 | Set up Supabase real-time subscriptions for live updates | REQ-1406 | TODO |

**Done when:** Users can browse all knowledge and people profiles in the web UI with live updates.

---

### Sprint 25: Frontend — Projects & Quarantine
> Build project overview and quarantine management views.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build Project Overview: all knowledge linked to a project (decisions, action items, meetings, docs) | REQ-1402 | TODO |
| 2 | Build Quarantine Queue: team-specific view, approve/reject with one click, agent-assisted suggestions | REQ-1403 | TODO |
| 3 | Implement role-based views via Supabase Auth + RLS | REQ-1407 | TODO |

**Done when:** Users can see project status at a glance. Teams can manage their quarantine queue.

---

### Sprint 26: Frontend — System Health & Insights + MCP Insights Tool
> Build the final dashboard views and connect insights to MCP.

| # | Task | Requirements | Status |
|---|---|---|---|
| 1 | Build System Health dashboard: Gatekeeper rates, embedding staleness, Curator actions, agent history | REQ-1404 | TODO |
| 2 | Build Insights Feed: analyst-generated insights, filterable by topic and timeframe | REQ-1405 | TODO |
| 3 | Surface metrics (query volume, admit rate, zero-match rate) in System Health view | REQ-1803 | TODO |
| 4 | Implement `get_insights(topic, timeframe)` MCP tool | REQ-1205 | TODO |

**Done when:** Full dashboard is live. All metrics visible. Insights queryable via MCP.

---

## Sprint Summary

| Phase | Sprints | Requirements Covered |
|---|---|---|
| **Phase 1 — Foundation** | Sprint 1–9 | 54 requirements |
| **Phase 2 — Expand** | Sprint 10–20 | 50 requirements |
| **Phase 3 — Insights & Delivery** | Sprint 21–26 | 30 requirements |
| **Total** | **26 sprints** | **134 requirements + 1 deferred** |

Each sprint is designed to be completable in a single focused session with Claude, keeping the context window clean and the scope tight.
