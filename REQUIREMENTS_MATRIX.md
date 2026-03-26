# Requirements Traceability Matrix

Every requirement from the PRD, numbered for traceability. Use these IDs when referencing requirements in implementation, testing, and review.

**Status legend:** `OPEN` = not started | `IN PROGRESS` = being built | `DONE` = implemented & verified | `DEFERRED` = intentionally postponed

---

## REQ-1xx: Infrastructure & Stack

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-100 | Use TypeScript as the single language across the entire stack | Stack | 1 | 3.1 | OPEN |
| REQ-101 | Set up Supabase project with PostgreSQL + pgvector extension | Infrastructure | 1 | 3.1 | OPEN |
| REQ-102 | Deploy frontend and API on Vercel (Next.js) | Infrastructure | 1 | 3.1 | OPEN |
| REQ-103 | Use Supabase Edge Functions for webhook ingestion endpoints | Infrastructure | 1 | 3.1 | OPEN |
| REQ-104 | Use OpenAI `text-embedding-3-small` (1536 dimensions) for embeddings | Infrastructure | 1 | 3.1, 16 | OPEN |
| REQ-105 | Build MCP server in TypeScript (Node.js), separate process | Infrastructure | 1 | 3.1 | OPEN |
| REQ-106 | Use Supabase Edge Functions + pg_cron for background jobs and scheduling | Infrastructure | 2 | 3.1 | OPEN |
| REQ-107 | Use Vercel AI SDK (`generateObject`) for single-pass agents (Gatekeeper, Dispatcher, extraction) | Stack | 1 | 3.2 | OPEN |
| REQ-108 | Use Claude Agent SDK for multi-step agents (Curator, Analyst) | Stack | 2 | 3.2 | OPEN |
| REQ-109 | Use Vercel AI SDK (`useChat`) for frontend chat/query interface | Stack | 3 | 3.2 | OPEN |

---

## REQ-2xx: Data Ingestion — Fireflies

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-200 | Receive Fireflies webhook on `transcription_completed` event | Ingestion | 1 | 4.2 | OPEN |
| REQ-201 | Fetch full transcript, summary, and action items via Fireflies GraphQL API on webhook trigger | Ingestion | 1 | 4.2 | OPEN |
| REQ-202 | Implement polling fallback for Fireflies in case of missed webhooks | Ingestion | 1 | 4.2 | OPEN |
| REQ-203 | Process all Fireflies content (no pre-filter — low volume, high value) | Ingestion | 1 | 4.3 | OPEN |
| REQ-204 | Chunk meeting transcripts by topic segments, ~500-800 tokens per chunk | Ingestion | 1 | 16 | OPEN |

---

## REQ-3xx: Data Ingestion — Google Drive / Docs

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-300 | Subscribe to Google Drive changes via `changes.watch` push notifications | Ingestion | 2 | 4.2 | OPEN |
| REQ-301 | Auto-renew Drive watch channel before 24-hour expiry (~80% TTL) | Ingestion | 2 | 4.2 | OPEN |
| REQ-302 | Fetch changed doc content via `changes.list` + Drive API on notification | Ingestion | 2 | 4.2 | OPEN |
| REQ-303 | Pre-filter: skip empty docs and templates | Ingestion | 2 | 4.3 | OPEN |
| REQ-304 | Chunk documents by headings/sections, ~400 tokens with 50-token overlap | Ingestion | 2 | 16 | OPEN |
| REQ-305 | Handle document updates: re-chunk and re-embed changed docs (not duplicate) | Ingestion | 2 | 6 | OPEN |
| REQ-306 | Set up Google domain verification in Search Console | Infrastructure | 2 | 4.2 | OPEN |
| REQ-307 | Configure OAuth 2.0 or service account with domain-wide delegation | Infrastructure | 2 | 4.2 | OPEN |

---

## REQ-4xx: Data Ingestion — Slack

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-400 | Receive Slack messages via Events API (`message.channels`, `message.groups`) | Ingestion | 2 | 4.2 | OPEN |
| REQ-401 | Respond to Slack event webhooks within 3 seconds; offload processing to queue | Ingestion | 2 | 4.2 | OPEN |
| REQ-402 | Implement idempotent event processing using `event_id` | Ingestion | 2 | 4.2 | OPEN |
| REQ-403 | Ingest Slack threads as a single unit (not individual messages) | Ingestion | 2 | 16 | OPEN |
| REQ-404 | On thread reply: re-fetch full thread via `conversations.replies`, replace previous version, re-embed | Ingestion | 2 | 16 | OPEN |
| REQ-405 | Hold new top-level messages for ~5 minutes before ingesting (wait for thread development) | Ingestion | 2 | 16 | OPEN |
| REQ-406 | Pre-filter: skip bot messages, reactions, messages under 20 characters | Ingestion | 2 | 4.3 | OPEN |
| REQ-407 | Pre-filter: exclude configured noisy channels | Ingestion | 2 | 4.3 | OPEN |
| REQ-408 | Bot must be invited to each monitored channel | Ingestion | 2 | 4.2 | OPEN |
| REQ-409 | Support Socket Mode for development/testing without public URL | Ingestion | 2 | 4.2 | OPEN |

---

## REQ-5xx: Data Ingestion — Gmail

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-500 | Set up Google Cloud Pub/Sub topic for Gmail push notifications | Ingestion | 3 | 4.2 | OPEN |
| REQ-501 | Grant `gmail-api-push@system.gserviceaccount.com` Publisher role on Pub/Sub topic | Ingestion | 3 | 4.2 | OPEN |
| REQ-502 | Call `users.watch` with `labelIds` filter (INBOX) to subscribe to mailbox changes | Ingestion | 3 | 4.2 | OPEN |
| REQ-503 | Auto-renew Gmail watch daily (expires every 7 days) | Ingestion | 3 | 4.2 | OPEN |
| REQ-504 | Fetch actual emails via `users.history.list` + `messages.get` on notification | Ingestion | 3 | 4.2 | OPEN |
| REQ-505 | Pre-filter: filter by sender/subject relevance, skip newsletters and spam | Ingestion | 3 | 4.3 | OPEN |
| REQ-506 | Chunk emails: one email = one chunk, long threads split per reply with thread context in metadata | Ingestion | 3 | 16 | OPEN |

---

## REQ-6xx: Gatekeeper Agent

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-600 | Run Gatekeeper on all content that passes pre-filters | Agent | 1 | 7.1 | OPEN |
| REQ-601 | Use Claude Haiku via Vercel AI SDK `generateObject()` | Agent | 1 | 7.1, 3.2 | OPEN |
| REQ-602 | Score content relevance on 0.0–1.0 scale | Agent | 1 | 7.1 | OPEN |
| REQ-603 | Route by score: 0.0–0.3 REJECT, 0.3–0.6 QUARANTINE, 0.6–1.0 PASS | Agent | 1 | 4.3 | OPEN |
| REQ-604 | Classify content into categories: `decision`, `context`, `action_item`, `reference`, `insight` | Agent | 1 | 4.3 | OPEN |
| REQ-605 | Novelty check: reject content with embedding similarity > 0.92 to existing entries | Agent | 1 | 7.1 | OPEN |
| REQ-606 | Auto-tag content sensitivity level: `open` (default) or `restricted` | Agent | 2 | 13 | OPEN |
| REQ-607 | Log all decisions (admit/reject/quarantine) to `content_reviews` table with reason | Agent | 1 | 5.4 | OPEN |

---

## REQ-7xx: Curator Agent

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-700 | Run Curator on nightly schedule via pg_cron | Agent | 2 | 7.2 | OPEN |
| REQ-701 | Use Claude Sonnet via Claude Agent SDK (multi-step loop) | Agent | 2 | 7.2, 3.2 | OPEN |
| REQ-702 | Duplicate sweep: merge entries with embedding similarity > 0.90 | Agent | 2 | 7.2 | OPEN |
| REQ-703 | Staleness check: flag unreferenced content older than configured threshold | Agent | 2 | 7.2 | OPEN |
| REQ-704 | Contradiction detection: find conflicting statements on same topic | Agent | 2 | 7.2 | OPEN |
| REQ-705 | Source validation: verify source documents still exist | Agent | 2 | 7.2 | OPEN |
| REQ-706 | Quarantine review: auto-promote or auto-reject based on learned patterns | Agent | 2 | 7.2 | OPEN |
| REQ-707 | Entity resolution: nightly sweep for duplicate project/entity names using embedding similarity | Agent | 2 | 16 | OPEN |
| REQ-708 | Log all actions to `content_reviews` table | Agent | 2 | 5.4 | OPEN |
| REQ-709 | Generate health report after each run | Agent | 2 | 7.2 | OPEN |

---

## REQ-8xx: Analyst Agent

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-800 | Run Analyst daily on schedule + triggered by Curator findings | Agent | 3 | 7.3 | OPEN |
| REQ-801 | Use Claude Opus via Claude Agent SDK (multi-step loop with tools) | Agent | 3 | 7.3, 3.2 | OPEN |
| REQ-802 | Cross-source pattern detection | Agent | 3 | 7.3 | OPEN |
| REQ-803 | Trend identification over time | Agent | 3 | 7.3 | OPEN |
| REQ-804 | Risk/opportunity flagging | Agent | 3 | 7.3 | OPEN |
| REQ-805 | Contradiction alerts | Agent | 3 | 7.3 | OPEN |
| REQ-806 | Write insight cards to `insights` table with supporting source references | Agent | 3 | 7.3 | OPEN |
| REQ-807 | Analyst output design: define specific insight types to generate | Agent | 3 | 16 | DEFERRED |

---

## REQ-9xx: Dispatcher Agent

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-900 | Trigger on new entries in `insights` table and new alerts | Agent | 3 | 7.4 | OPEN |
| REQ-901 | Route to Slack channels based on topic, urgency, and recipient role | Agent | 3 | 7.4 | OPEN |
| REQ-902 | Route to email based on topic, urgency, and recipient role | Agent | 3 | 7.4 | OPEN |
| REQ-903 | Use Claude Haiku or pure rule-based logic (Vercel AI SDK or rules) | Agent | 3 | 7.4, 3.2 | OPEN |

---

## REQ-10xx: Database Schema

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1000 | Create `documents` table with embedding, status, category, sensitivity fields | Database | 1 | 5.1 | OPEN |
| REQ-1001 | Create `meetings` table with participants, summary, action_items, transcript | Database | 1 | 5.1 | OPEN |
| REQ-1002 | Create `slack_messages` table with channel, thread_id, full thread content | Database | 1 | 5.1 | OPEN |
| REQ-1003 | Create `emails` table with thread_id, sender, recipients, embedding | Database | 1 | 5.1 | OPEN |
| REQ-1004 | Create `people` table with aggregated profile embedding | Database | 1 | 5.2 | OPEN |
| REQ-1005 | Create `people_skills` table with evidence_count and source references | Database | 1 | 5.2 | OPEN |
| REQ-1006 | Create `people_projects` table with role_in_project | Database | 1 | 5.2 | OPEN |
| REQ-1007 | Create `projects` table with aliases array and embedding | Database | 1 | 5.2 | OPEN |
| REQ-1008 | Create `decisions` table with source linkage | Database | 1 | 5.3 | OPEN |
| REQ-1009 | Create `action_items` table with assignee, due_date, status | Database | 1 | 5.3 | OPEN |
| REQ-1010 | Create `content_reviews` audit trail table | Database | 1 | 5.4 | OPEN |
| REQ-1011 | Create `insights` table with supporting_sources and dispatched flag | Database | 1 | 5.4 | OPEN |
| REQ-1012 | All content tables include `embedding_stale` boolean flag | Database | 1 | 6 | OPEN |

---

## REQ-11xx: Re-Embedding Pipeline

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1100 | Background worker queries `embedding_stale = true` rows in batches (50 at a time) | Pipeline | 1 | 6.3 | OPEN |
| REQ-1101 | Re-generate embeddings via OpenAI API and write back to row | Pipeline | 1 | 6.3 | OPEN |
| REQ-1102 | Set `embedding_stale = false` after successful re-embedding | Pipeline | 1 | 6.3 | OPEN |
| REQ-1103 | Run every 5-10 minutes (near-real-time, non-blocking) | Pipeline | 1 | 6.3 | OPEN |
| REQ-1104 | Trigger re-embed on: doc update, new meeting mentioning a person, Curator merge, skill extraction, project change | Pipeline | 1 | 6.2 | OPEN |
| REQ-1105 | For `people.embedding`: aggregate skills, projects, and recent mentions into text profile before embedding | Pipeline | 1 | 6.3 | OPEN |

---

## REQ-12xx: MCP Server

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1200 | Implement `search_knowledge(query)` — semantic search across all content tables | MCP | 1 | 8.2 | OPEN |
| REQ-1201 | Implement `get_decisions(topic, date_range)` — structured query for decisions | MCP | 2 | 8.2 | OPEN |
| REQ-1202 | Implement `get_action_items(assignee, status)` — filterable action item list | MCP | 2 | 8.2 | OPEN |
| REQ-1203 | Implement `get_meeting_summary(meeting_id)` — retrieve specific meeting | MCP | 1 | 8.2 | OPEN |
| REQ-1204 | Implement `get_document(doc_id)` — retrieve specific document | MCP | 2 | 8.2 | OPEN |
| REQ-1205 | Implement `get_insights(topic, timeframe)` — retrieve analyst insights | MCP | 3 | 8.2 | OPEN |
| REQ-1206 | Implement `find_people(query, skill, project)` — find people by skill/project/semantic match | MCP | 2 | 8.2 | OPEN |
| REQ-1207 | Implement `get_person_profile(person_id)` — full profile with skills, projects, activity | MCP | 2 | 8.2 | OPEN |
| REQ-1208 | Implement `get_project_status(project_name)` — all knowledge linked to a project | MCP | 2 | 8.2 | OPEN |
| REQ-1209 | Embed query via OpenAI API before running vector similarity search | MCP | 1 | 8.3 | OPEN |
| REQ-1210 | Return ranked results with source citations | MCP | 1 | 8.3 | OPEN |

---

## REQ-13xx: Access Control & Security

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1300 | All content is open by default (queryable by all users) | Security | 2 | 13 | OPEN |
| REQ-1301 | Gatekeeper auto-tags sensitivity: `open` or `restricted` | Security | 2 | 13 | OPEN |
| REQ-1302 | Restricted content visible only to originating team or specified roles | Security | 2 | 13 | OPEN |
| REQ-1303 | Implement Supabase Row Level Security based on sensitivity + user role | Security | 2 | 13 | OPEN |
| REQ-1304 | Set up Supabase Auth for user authentication | Security | 2 | 3.1 | OPEN |
| REQ-1305 | Support 5 users initially, scale to 20-25 | Security | 1 | 1 | OPEN |

---

## REQ-14xx: Frontend — Data Explorer & Dashboard

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1400 | Build Knowledge Browser: browse/search all content with filters (source, category, date, status) | Frontend | 3 | 10.2 | OPEN |
| REQ-1401 | Build People Directory: view extracted people profiles, skills, project involvement | Frontend | 3 | 10.2 | OPEN |
| REQ-1402 | Build Project Overview: all knowledge linked to a project (decisions, action items, meetings, docs) | Frontend | 3 | 10.2 | OPEN |
| REQ-1403 | Build Quarantine Queue: team-specific view, approve/reject with one click, agent-assisted suggestions | Frontend | 3 | 10.2 | OPEN |
| REQ-1404 | Build System Health dashboard: Gatekeeper rates, embedding staleness, Curator actions, agent history | Frontend | 3 | 10.2 | OPEN |
| REQ-1405 | Build Insights Feed: analyst-generated insights, filterable by topic and timeframe | Frontend | 3 | 10.2 | OPEN |
| REQ-1406 | Use Supabase client SDK for real-time subscriptions (live updates on new content) | Frontend | 3 | 10.3 | OPEN |
| REQ-1407 | Role-based views via Supabase Auth + RLS | Frontend | 3 | 10.3 | OPEN |
| REQ-1408 | Use Next.js + Tailwind + shadcn/ui | Frontend | 3 | 10.3 | OPEN |

---

## REQ-15xx: Agent Communication & Events

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1500 | Agents communicate via database writes, not direct calls | Architecture | 1 | 9 | OPEN |
| REQ-1501 | All agent actions logged to audit trail (`content_reviews` table) | Architecture | 1 | 9 | OPEN |
| REQ-1502 | Events can be replayed if processing fails | Architecture | 2 | 9 | OPEN |
| REQ-1503 | Agents can be restarted independently without affecting others | Architecture | 2 | 9 | OPEN |

---

## REQ-16xx: Extraction & Entity Resolution

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1600 | Extract people mentions from ingested content | Extraction | 1 | 5.2 | OPEN |
| REQ-1601 | Extract skills/expertise from meeting transcripts and docs | Extraction | 1 | 5.2 | OPEN |
| REQ-1602 | Extract project involvement (person + project + role) | Extraction | 1 | 5.2 | OPEN |
| REQ-1603 | Extract decisions from all source types | Extraction | 1 | 5.3 | OPEN |
| REQ-1604 | Extract action items with assignee and due date | Extraction | 1 | 5.3 | OPEN |
| REQ-1605 | Match entity mentions against `projects.aliases` during ingestion | Extraction | 2 | 16 | OPEN |
| REQ-1606 | Create new project entity if no alias match found (or flag for review) | Extraction | 2 | 16 | OPEN |
| REQ-1607 | Use Vercel AI SDK `generateObject()` with Claude Haiku for all extraction | Extraction | 1 | 3.2 | OPEN |

---

## REQ-17xx: Retention & Data Lifecycle

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1700 | Active content: retain indefinitely | Data Lifecycle | 2 | 16 | OPEN |
| REQ-1701 | Archived content: keep 12 months, then drop embeddings (keep raw text) | Data Lifecycle | 2 | 16 | OPEN |
| REQ-1702 | Rejected content: keep metadata + reason for 90 days, then purge | Data Lifecycle | 2 | 16 | OPEN |
| REQ-1703 | Quarantined content: auto-reject after 30 days if unreviewed | Data Lifecycle | 2 | 16 | OPEN |

---

## REQ-18xx: Success Metrics

| ID | Requirement | Category | Phase | PRD Section | Status |
|---|---|---|---|---|---|
| REQ-1800 | Track query volume (MCP tool calls per day) | Metrics | 1 | 14 | OPEN |
| REQ-1801 | Track Gatekeeper admit rate (% admitted vs rejected vs quarantined) | Metrics | 1 | 14 | OPEN |
| REQ-1802 | Track zero-match rate (% of searches returning 0 results) | Metrics | 1 | 14 | OPEN |
| REQ-1803 | Surface metrics in System Health dashboard | Metrics | 3 | 14 | OPEN |

---

## Summary

| Category | ID Range | Count | Phase 1 | Phase 2 | Phase 3 | Deferred |
|---|---|---|---|---|---|---|
| Infrastructure & Stack | REQ-1xx | 10 | 7 | 2 | 1 | 0 |
| Ingestion — Fireflies | REQ-2xx | 5 | 5 | 0 | 0 | 0 |
| Ingestion — Google Drive | REQ-3xx | 8 | 0 | 8 | 0 | 0 |
| Ingestion — Slack | REQ-4xx | 10 | 0 | 10 | 0 | 0 |
| Ingestion — Gmail | REQ-5xx | 7 | 0 | 0 | 7 | 0 |
| Gatekeeper Agent | REQ-6xx | 8 | 7 | 1 | 0 | 0 |
| Curator Agent | REQ-7xx | 10 | 0 | 10 | 0 | 0 |
| Analyst Agent | REQ-8xx | 8 | 0 | 0 | 7 | 1 |
| Dispatcher Agent | REQ-9xx | 4 | 0 | 0 | 4 | 0 |
| Database Schema | REQ-10xx | 13 | 13 | 0 | 0 | 0 |
| Re-Embedding Pipeline | REQ-11xx | 6 | 6 | 0 | 0 | 0 |
| MCP Server | REQ-12xx | 11 | 4 | 6 | 1 | 0 |
| Access Control | REQ-13xx | 6 | 1 | 5 | 0 | 0 |
| Frontend | REQ-14xx | 9 | 0 | 0 | 9 | 0 |
| Agent Communication | REQ-15xx | 4 | 2 | 2 | 0 | 0 |
| Extraction & Entities | REQ-16xx | 8 | 6 | 2 | 0 | 0 |
| Retention & Lifecycle | REQ-17xx | 4 | 0 | 4 | 0 | 0 |
| Success Metrics | REQ-18xx | 4 | 3 | 0 | 1 | 0 |
| **TOTAL** | | **135** | **54** | **50** | **30** | **1** |
