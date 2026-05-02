# Vision: Customer Communication

> **Status:** Active — strategic source of truth for client-facing communication
> **Date:** 2026-05-01
> **Owner:** Stef Banninga
> **Version:** 1.0
> **Related:** `vision-ai-native-architecture.md` (parent vision), `requirements-portal.md`, `prd-feedback-widget.md`

---

## 1. Why This Document

The parent vision doc (`vision-ai-native-architecture.md`) defines the four quadrants and the high-level data loop, but it does not specify **how customer communication actually works** end-to-end. As the platform grows from "single Userback feed" to "many channels, two directions, multiple item types", the gaps surfaced. This document captures the decisions that resolve them.

Scope: every communication item that crosses the boundary between Jouw AI Partner and a client — inbound feature requests, bug reports, questions, end-user widget submissions, and outbound team-to-client messages.

Out of scope: internal team chat (Slack stays), pre-contract lead communication, vendor/supplier comms.

---

## 2. Core Principle: Verification Before Truth, Applied to Communication

The parent vision states: _all content is human-verified before becoming queryable truth_. We extend that principle here — **all customer communication crossing the team↔client boundary passes a human review gate**, in either direction:

- **Inbound feedback** → PM reviews before it enters the dev backlog as actionable work
- **Outbound replies** → human reviews AI-drafted answers before they are sent to the client

This is consistent with how the email and meeting pipelines already work. Customer communication gets the same treatment.

---

## 3. The Inbox Model — One Database, Two Views

We do not build separate inbox databases for portal and cockpit. Every communication item lives in a single row in the shared Supabase instance and is rendered through two role-appropriate views.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              Single Supabase database                  │
│      (issues, client_questions, future tables)         │
│                                                        │
└──────────────┬──────────────────────┬──────────────────┘
               │                      │
               ▼                      ▼
       ┌──────────────┐       ┌──────────────┐
       │   Cockpit    │       │    Portal    │
       │    Inbox     │       │    Inbox     │
       │              │       │              │
       │  Team view   │       │  Client view │
       │ (PM context, │       │ (own project │
       │  triage,     │       │  threads,    │
       │  AI-drafts)  │       │  replies)    │
       └──────────────┘       └──────────────┘
```

**Naming:** "Inbox" — used in both apps' sidebar and in per-project tabs. No clever names.

**Entry points:**

- Cockpit sidebar (top-level "Inbox") — global cross-project view for the PM doing daily triage
- Cockpit `projects/[id]/inbox` tab — same items, scoped to one project, when working in client context
- Portal sidebar (top-level "Inbox") — client-side, scoped to projects they have access to

---

## 4. Item Types

The inbox unifies four content types. Each type has its own status flow, but they share the inbox-shell, sorting, and filters.

| Type                       | Source                              | Inbound or outbound | Storage                        |
| -------------------------- | ----------------------------------- | ------------------- | ------------------------------ |
| **Feedback (feature/bug)** | portal form, widget, Userback       | Inbound             | `issues` table (existing)      |
| **Question / Q&A**         | portal client_questions form        | Two-way             | `client_questions` (existing)  |
| **End-user widget item**   | embedded widget on shipped products | Inbound             | `issues` table (source-tagged) |
| **Outbound message**       | team-initiated proactive update     | Outbound            | extends `client_questions`     |

The four types collapse into two visual groups in the inbox:

- **Conversations** (questions, outbound) — threaded text exchanges
- **Items** (feedback, widget) — actionable tickets that need PM endorsement

---

## 5. Inbound Feedback Flow — PM Endorsement Gate

This is the headline change versus the original "feedback goes directly to DevHub" pattern.

```
Client submits (portal / widget / userback)
         │
         ▼
   issues row created
   status = 'needs_pm_review'
   source = 'portal' | 'jaip_widget' | 'userback'
         │
         ▼
 Visible in Cockpit Inbox (not in DevHub triage yet)
         │
         ▼
   PM decides:
   ├─ Endorse → status = 'triage' → enters DevHub backlog
   ├─ Decline → status = 'declined' + decline_reason → client sees explanation in portal
   ├─ Defer   → status = 'deferred' → parked, not in active backlog
   └─ Convert → spawns a client_questions thread, status = 'converted_to_qa'
```

**Statuses (new + existing):**

| Status            | Where it sits        | Visible to client   | New?     |
| ----------------- | -------------------- | ------------------- | -------- |
| `needs_pm_review` | Cockpit Inbox        | Yes (as "received") | **New**  |
| `triage`          | DevHub triage        | Yes                 | Existing |
| `in_progress`     | DevHub               | Yes                 | Existing |
| `done`            | DevHub               | Yes                 | Existing |
| `declined`        | Cockpit history      | Yes (with reason)   | **New**  |
| `deferred`        | Cockpit Inbox bucket | Yes (as "later")    | **New**  |
| `converted_to_qa` | Linked to question   | Yes                 | **New**  |

**Why this gate exists:** see §6 of `vision-ai-native-architecture.md` ("verification before truth"). A PM has scope, contract, and prior-meeting context that a developer in DevHub triage does not. Without this gate, developers become de-facto product managers and AI agents (phase 3+) may execute work that should never have been built.

**Decline UX:** when PM declines, a short reason is required. The decline reason becomes a portal-message to the client so they always get an explanation, not silence.

---

## 6. Two-Way Messaging — Cockpit Can Reply

The `client_questions` table already supports two-way messaging at the DB level (`role: "team" | "client"`, see `packages/database/src/mutations/client-questions.ts:106`). Today the portal hardcodes `"client"` and cockpit has no UI. This vision unblocks the second half:

- Cockpit Inbox shows open questions across projects, status-first ordered
- Reply form supports plain text + attachments
- AI-draft button (Phase 2) populates the reply field with an AI-suggested answer based on knowledge search; human reviews and sends

The `client_questions` reply mutation already accepts `role: "team"` — only UI work is needed to enable it.

---

## 7. Outbound — Proactive Team-to-Client Messages

Outbound is the genuinely new layer. Team can initiate messages (not only respond):

- **Decision explanation** — when PM declines a feedback item, the decline_reason becomes an outbound message
- **Proactive update** — "this week we shipped X, next week Y" (AI-drafted from DevHub activity)
- **Status context** — when a ticket transitions to `in_progress`, optional human-tweaked context message
- **Scope clarification** — when the PM wants to nudge or clarify something

All outbound passes the AI-draft → human-review → send pattern. No team member sends raw — drafts are always reviewable, even if approved unchanged in two seconds. This is consistent with the email-pipeline reviewer model in `vision-ai-native-architecture.md` §6.

---

## 8. Notifications

**Channel:** Resend (transactional email).

**Client-side triggers:** every status update or new team-message generates an immediate email to the client. The email contains a clear summary and a deep-link to the relevant inbox item. No digesting in v1 — clients want to know now, not tomorrow.

**Team-side triggers:** in-app only (cockpit). New client items show as inbox count badge in the cockpit sidebar. No email or Slack to team for v1 — the team lives in cockpit by default. Re-evaluate when team grows beyond founders.

**Rationale:** the notification layer is the difference between "portal that nobody visits" and "portal as primary channel". Without it, this whole architecture fails silently.

---

## 9. UX Principles

The inbox is non-negotiable as a polished surface. If it does not feel great, neither side uses it and the architecture collapses to email-by-default.

- **Status-first sorting**, not type-first. Top section: "needs your attention" (PM-review pending, draft awaiting approval, unanswered question). Below: "waiting on client", "resolved this week".
- **Type filters as tabs** — feedback, questions, outbound — but the default view is everything-mixed status-first.
- **Conversation threading** — questions render as a chat-style thread (latest at bottom), not a flat list of replies.
- **Mobile-tolerable** — AI-drafted replies make it possible to approve/edit-and-send on phone. Full-feature mobile is not the goal; "approve a draft on the go" is.
- **No empty state without onboarding cue** — first-time users see a short explainer card on what the inbox is for and how to get the most out of it.

---

## 10. Cross-Cutting Decisions (with rationale)

These are the strategic decisions made during the 2026-05-01 design session. Each maps to a real risk surfaced in the helicopter analysis.

| #   | Decision                                                                              | Why                                                                                | Status                           |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Resend for client-facing email notifications, immediate per-event                     | Without notifications, portal stays unvisited; email is unfair fallback            | Implemented in CC-002            |
| 2   | Multi-stakeholder per client: deferred to v2                                          | Single-user-per-project works for current client volume; revisit when it breaks    | Deferred                         |
| 3   | Internal team-thread on a client item: not now                                        | With two founders, Slack/in-person suffices; revisit at >3 reviewers               | Deferred                         |
| 4   | Audit-layer (formal agreement trail): deferred, formal scope still via mail/contract  | Legal-grade audit needs design effort not justified at current scale               | Deferred                         |
| 5   | Email integration for exceptions (not primary channel)                                | Cannot mid-thread cut clients to portal; existing Gmail-pipeline keeps capturing   | **Open** — concrete approach TBD |
| 6   | Out-of-office / escalation: both founders see everything for now                      | Two-founder bandwidth + shared visibility = no formal routing needed yet           | Deferred                         |
| 7   | Mobile experience leans on AI-drafts ("approve on phone"), not full feature parity    | Most mobile use is review-and-approve; building full mobile UI is overkill         | Decided                          |
| 8   | Onboarding: short in-portal explainer of purpose + how-to                             | First five minutes determine whether client adopts portal as primary channel       | Decided                          |
| 9   | Attachments stored in Supabase storage bucket; eligible as AI-context after PM review | Files are already partially supported (issue-attachments); extend to questions     | Decided                          |
| 10  | Cross-thread search: not in v1                                                        | High effort, not a launch-blocker; clients/team can scroll within a thread for now | Deferred                         |

---

## 11. Open Items

These remain unresolved and must be answered before they become blocking:

- **Email-excepties (#5).** When should cockpit be able to send an actual email instead of a portal message? Examples: client has portal access but hasn't logged in for 14 days; legal/contractual document requires email-of-record. Needs a small follow-up decision session.
- **Audit-layer (#4) revisit trigger.** Defined as "deferred", but what event tips it from deferred to active? Suggested: first contract dispute, first client request, or 5+ paying clients — whichever comes first.

---

## 12. Sprint Sequencing (Proposal)

This document is the input for sprint planning, not a sprint itself. Suggested order:

1. **Sprint A — Cockpit Inbox + two-way replies.** Cockpit-side inbox view, reply UI on `client_questions`, status-first sort, basic filters. Includes the new `needs_pm_review` status on `issues` and the four PM actions (endorse/decline/defer/convert).
2. **Sprint B — Resend notifications.** Wire up immediate per-event email to client on new team-message and status changes.
3. **Sprint C — DevHub source badge.** Small UX win: visual distinction for client-sourced tickets in DevHub triage (per the agreement in the 2026-05-01 design session).
4. **Sprint D — Outbound with AI-draft + review-gate.** New agent + draft flow + human review pattern. Larger sprint.
5. **Sprint E — Per-project inbox tab + onboarding card.** Polish layer on top of A-D.

Each gets its own micro-sprint spec under `sprints/backlog/` with a CC- (Customer Communication) prefix.

---

## 13. Required Updates to Other Docs

When this document is approved:

- `vision-ai-native-architecture.md` §3 "Data Flow": update step 5 ("FEEDBACK CAPTURED") to flow through Cockpit Inbox before reaching DevHub triage. Update the bridges table accordingly.
- `vision-ai-native-architecture.md` §2.4 "Client Portal": update the bullet "Submit feedback (flows directly into DevHub as a ticket)" to "Submit feedback (flows into Cockpit Inbox for PM review, then into DevHub if endorsed)".
- `requirements-portal.md`: add new requirement IDs for two-way messaging and decline-with-reason.
- `prd-feedback-widget.md`: confirm widget items also pass the PM-review gate.

---

## 14. Status & Review

- Drafted: 2026-05-01 (this document)
- Reviewer: Stef
- Re-review trigger: when any deferred item (#2, #3, #4, #6, #10) gets activated, or when first sprint completes and we learn something that contradicts a decision here.
