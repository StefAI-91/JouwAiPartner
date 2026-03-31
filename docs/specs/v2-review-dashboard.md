# PRD: v2 — Review & Dashboard

> **Status:** Draft v3 (design integrated)
> **Date:** 2026-03-31
> **Owner:** Stef Banninga
> **Builds on:** `docs/specs/platform-spec.md` (section 13, v2 scope)

---

## 1. Goal

Make the platform visually usable and trustworthy. After v2, the team can:

- **See** all projects, meetings, and extractions in a dashboard
- **Verify** incoming content before it becomes queryable truth
- **Trust** that MCP answers are based on verified information

### Demo Moment

> "A new Fireflies meeting comes in. Stef opens the cockpit, sees it in the review queue, approves the extractions with two clicks, and now when Wouter asks Claude 'what were the action items from yesterday's meeting?', he gets a verified answer with source."

### What v2 Does NOT Include

- No client portal (v3)
- No RLS policies (v3 — accepted risk, see SEC-008)
- No additional data sources (v3)
- No AI-generated insights or summaries (v3)
- No Curator/Analyst/Dispatcher agents (v3+)
- No AI action triggers (v4+)
- No project `phase` field — current `status` field covers the full lifecycle
- No keyboard shortcuts for review — click interface is sufficient for 3 reviewers
- No MCP API key auth — deferred to v3 when external access is introduced

---

## 2. Architecture Decision: Monorepo

v2 introduces Turborepo to prepare for the client portal in v3.

### Structure

```
/
├── apps/
│   ├── cockpit/               # Current Next.js app (renamed from root)
│   │   ├── src/
│   │   │   ├── app/           # Dashboard routes
│   │   │   ├── components/    # UI components
│   │   │   ├── actions/       # Server Actions
│   │   │   └── middleware.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── portal/                # v3: Client portal (empty placeholder)
│
├── packages/
│   ├── database/              # Shared: Supabase clients, queries, types
│   │   ├── src/
│   │   │   ├── supabase/      # client.ts, server.ts, admin.ts
│   │   │   ├── queries/       # All query functions
│   │   │   ├── validations/   # Zod schemas
│   │   │   └── types/         # database.ts, app.ts
│   │   └── package.json
│   │
│   ├── ai/                    # Shared: Agents, embeddings, pipeline
│   │   ├── src/
│   │   │   ├── agents/        # gatekeeper.ts, extractor.ts
│   │   │   ├── embeddings.ts
│   │   │   └── pipeline/      # gatekeeper-pipeline.ts, entity-resolution.ts
│   │   └── package.json
│   │
│   └── mcp/                   # Shared: MCP server + tools
│       ├── src/
│       │   ├── server.ts
│       │   └── tools/
│       └── package.json
│
├── supabase/                  # Stays at root (shared across apps)
│   ├── migrations/
│   ├── functions/
│   └── seed/
│
├── turbo.json
├── package.json               # Root workspace config
└── CLAUDE.md                  # Updated for monorepo
```

### What Moves Where

| Current location                                                   | New location                           |
| ------------------------------------------------------------------ | -------------------------------------- |
| `src/lib/supabase/`                                                | `packages/database/src/supabase/`      |
| `src/lib/queries/`                                                 | `packages/database/src/queries/`       |
| `src/lib/validations/`                                             | `packages/database/src/validations/`   |
| `src/lib/types/`                                                   | `packages/database/src/types/`         |
| `src/lib/agents/`                                                  | `packages/ai/src/agents/`              |
| `src/lib/embeddings.ts`                                            | `packages/ai/src/embeddings.ts`        |
| `src/lib/mcp/`                                                     | `packages/mcp/src/`                    |
| `src/app/`, `src/components/`, `src/actions/`, `src/middleware.ts` | `apps/cockpit/src/`                    |
| `src/lib/hooks/`, `src/lib/utils/`                                 | `apps/cockpit/src/lib/` (app-specific) |

### Import Path Changes

```typescript
// Before (v1)
import { getAdminClient } from "@/lib/supabase/admin";
import { listMeetings } from "@/lib/queries/meetings";

// After (v2)
import { getAdminClient } from "@repo/database/supabase/admin";
import { listMeetings } from "@repo/database/queries/meetings";

// App-specific imports stay the same within cockpit
import { MeetingCard } from "@/components/meetings/meeting-card";
```

---

## 3. Database Migration

### 3.1 Verification Status on Meetings

```sql
ALTER TABLE meetings
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'rejected')),
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_meetings_verification_status ON meetings(verification_status);

-- Migrate existing data: all current meetings become verified
-- (they've been in use via MCP, so they're implicitly approved)
UPDATE meetings SET
  verification_status = 'verified',
  verified_at = now()
WHERE verification_status = 'draft';
```

### 3.2 Verification Status on Extractions

```sql
ALTER TABLE extractions
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'rejected')),
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_extractions_verification_status ON extractions(verification_status);

UPDATE extractions SET
  verification_status = 'verified',
  verified_at = now()
WHERE verification_status = 'draft';
```

### 3.3 Migration Strategy for Existing Content

**Critical:** The platform is in daily use via MCP. We cannot break this.

| Step | What                                                   | Why                                                              |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 1    | Add columns with defaults                              | Non-breaking. New columns appear, old code still works.          |
| 2    | Migrate existing data to `verified`                    | Everything currently in the DB is implicitly approved.           |
| 3    | Update pipeline to set `draft` on new content          | Only NEW meetings/extractions start as draft.                    |
| 4    | Deploy review queue UI                                 | Team can start reviewing new content.                            |
| 5    | Update MCP tools to filter on `verified` (last sprint) | Now safe — all old data is verified, only new data needs review. |

This order ensures **zero downtime** and no loss of existing functionality.

---

## 4. Security Fixes (included in v2)

These security issues from the audit must be resolved in v2 because the dashboard introduces authenticated UI and new mutation endpoints.

### SEC-001: Auth on API routes (Critical)

All API routes get auth checks. Server Actions are protected by Supabase session cookies.

```typescript
// Pattern for all API routes
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ... rest of handler
}
```

### SEC-003: CRON_SECRET mandatory (Critical)

```typescript
// Before (broken)
if (process.env.CRON_SECRET && authHeader !== expectedToken) { ... }

// After (correct)
if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### SEC-005: Security headers (High)

Add headers to `next.config.ts`: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Referrer-Policy.

### SEC-004: Server client for dashboard queries (Critical)

| Context                             | Client to use                   |
| ----------------------------------- | ------------------------------- |
| Dashboard pages (Server Components) | Server client (user session)    |
| Server Actions (user mutations)     | Server client                   |
| Pipeline (webhook, cron, agents)    | Admin client                    |
| MCP tools                           | Admin client (separate process) |

### F1: SQL injection fix

Whitelist for table parameter in dynamic queries.

---

## 5. Design Direction

Full style guide: `docs/specs/style-guide.md`
Reference prototype: `docs/specs/revieuw-que.html`

### 5.1 Design Personality

The cockpit has an AI assistant character — a friendly robot mascot that communicates with the user. The interface feels like a conversation with a helpful colleague, not a generic SaaS dashboard.

**Tone:** Warm, professional, casual English. "A calm colleague who has your back."

- Good: "All caught up" / "8 meetings awaiting review"
- Bad: "Your intelligent queue prioritizes entries with high decision-impact"

**Language:** The entire UI is in English. Content (transcripts, extractions) stays in whatever language the meeting was in (usually Dutch).

### 5.2 Visual Foundation

| Element       | Choice                                                                |
| ------------- | --------------------------------------------------------------------- |
| Theme         | Light (confirmed)                                                     |
| Background    | Subtle gradient (#fdfbfb to #ebedee)                                  |
| Fonts         | Fredoka (headlines, warm + rounded), Nunito (body, clean + readable)  |
| Primary color | #006B3F (brand green, NOT the purple from prototype)                  |
| Border radius | Rounded/bubble (2rem for cards, full for buttons and badges)          |
| Navigation    | Bottom nav bar (fixed, centered, frosted glass effect)                |
| Shadows       | Soft and subtle (shadow-sm for cards, shadow-xl for feature elements) |

### 5.3 Navigation (bottom bar)

| Item      | Icon                      | Label    |
| --------- | ------------------------- | -------- |
| Dashboard | dashboard                 | Home     |
| Review    | rate_review + badge count | Review   |
| Projects  | folder_open               | Projects |
| Meetings  | calendar_today            | Meetings |
| Clients   | corporate_fare            | Clients  |
| People    | group                     | People   |

Active item: brand green background, white icon, rounded-full with shadow.

### 5.4 Color System Per Entity Type

**Extraction types:**
| Type | Color | Pastel |
|------|-------|--------|
| Decisions | Blue #3B82F6 | #DBEAFE |
| Action items | Green #16A34A | #DCFCE7 |
| Needs | Purple #A855F7 | #F3E8FF |
| Insights | Gray #6B7280 | #F3F4F6 |

**Meeting type badges:**
| Type | Style |
|------|-------|
| sales | bg-blue-100 text-blue-700 |
| discovery | bg-purple-100 text-purple-700 |
| internal_sync | bg-gray-100 text-gray-700 |
| review | bg-green-100 text-green-700 |
| strategy | bg-amber-100 text-amber-700 |
| partner | bg-pink-100 text-pink-700 |

**Confidence indicators (extraction detail only):**
Confidence is shown per extraction in the detail view, not on queue cards. Colors used for confidence bars on individual extraction cards:
| Range | Color |
|-------|-------|
| > 0.8 | Green #006B3F |
| 0.5 - 0.8 | Amber #F59E0B |
| < 0.5 | Red #EF4444 |

### 5.5 Empty States

The mascot (rounded white square with dot-eyes) appears with a chat-bubble message. Tone is calm, not celebratory. Shows real stats from the system ("5 verified today, 142 total"). Below: filter pills to revisit verified content by organization, meeting type, or party type.

### 5.6 Design Per Sprint

**v2-003 Review Queue:**

- Queue list: cards with metadata row (org + type + party + time ago), title, participant names (via people join), extraction summary as colored dots with counts, approve/review buttons right-aligned
- No confidence on queue cards — confidence is shown per extraction in the detail view only
- Cards vary visually: more extractions = slightly more height
- Review detail: split layout (55% transcript left, 45% extractions right), inline editing, sticky bottom action bar
- Empty state: mascot + "All caught up" + stats + filter pills

**v2-004 Meeting Detail:**

- Same split layout as review detail but read-only
- Verification badge: "Verified by Stef Banninga on March 16, 2026"
- Transcript with highlighted quotes matching extraction transcript_refs

**v2-005 Projects:**

- Overview: cards with project name, client, status as visual pipeline indicator, last meeting, open action count
- Detail: header with status pipeline, tabbed sections (meetings, action items, decisions, needs/insights)

**v2-006 Dashboard:**

- Top: attention zone with review count (links to /review), color indicates urgency (green=0, amber=few, red=many)
- Middle: project cards showing name, client, status, open actions, last meeting
- Bottom two columns: recent verified meetings (left), open action items across projects (right)

---

## 6. Review Queue

### How It Works

When a new meeting arrives via Fireflies:

1. Pipeline processes it (Gatekeeper → Extractor → embed)
2. Meeting gets `verification_status = 'draft'`
3. All extractions get `verification_status = 'draft'`
4. Meeting appears in the review queue

### Review Actions

| Action                           | Effect                                           | When to use                       |
| -------------------------------- | ------------------------------------------------ | --------------------------------- |
| **Quick approve**                | Meeting + all extractions → `verified`           | Meeting looks correct at a glance |
| **Open detail → edit → approve** | Edit specific extractions, then approve meeting  | Something looks off, need to fix  |
| **Reject**                       | Meeting + extractions → `rejected` (with reason) | Wrong meeting, test data, garbage |

### Server Actions

```typescript
// Verify a meeting (quick approve)
verifyMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

// Verify with extraction edits
verifyMeetingWithEditsSchema = z.object({
  meetingId: z.string().uuid(),
  extractionEdits: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        content: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
});

// Reject a meeting
rejectMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().min(1),
});
```

---

## 7. Dashboard Pages

### Route Structure

```
apps/cockpit/src/app/(dashboard)/
├── layout.tsx                    # Shell: sidebar + header
├── page.tsx                      # Dashboard home
├── review/
│   ├── page.tsx                  # Review queue list
│   └── [id]/page.tsx            # Review detail (meeting + extractions)
├── meetings/
│   └── [id]/page.tsx            # Meeting detail
├── projects/
│   ├── page.tsx                  # All projects overview
│   └── [id]/page.tsx            # Project detail
├── clients/
│   ├── page.tsx                  # All organizations
│   └── [id]/page.tsx            # Organization detail
└── people/
    └── page.tsx                  # Team + contacts
```

### Page Descriptions

**Review Queue (`/review`):**
List of draft meetings, newest first. Shows: date, title, participant names (via people join), client, meeting type, extraction summary (colored dots with counts). No confidence on cards — confidence is per extraction in detail view only. Quick approve button per row. Click to open detail.

**Review Detail (`/review/[id]`):**
Left side: meeting metadata + transcript. Right side: extractions grouped by type, with content, confidence, transcript_ref. Inline edit on extractions. Approve / Reject buttons at bottom.

**Meeting Detail (`/meetings/[id]`):**
Same layout as review detail but for verified meetings. Read-only. Shows verification status and who verified it.

**Projects Overview (`/projects`):**
All projects as cards or table. Shows: name, client, status (visual pipeline indicator), last meeting date, open action item count.

**Project Detail (`/projects/[id]`):**
Header with name, client, status. Tabs or sections: meetings (linked to this project), action items (open/done), decisions, needs & insights.

**Dashboard Home (`/`):**
Overview: review badge ("X awaiting review"), project cards with status, recent verified meetings, open action items across all projects.

**Clients (`/clients`):**
Organization list. Shows: name, type badge, status, project count, last contact date.

**People (`/people`):**
Team members and contacts. Shows: name, role, team, email.

---

## 8. MCP Updates

### Default to Verified

All search and retrieval tools add `verification_status = 'verified'` filter by default.

### Optional Draft Access

Tools accept optional `include_drafts` parameter for internal use:

```typescript
include_drafts: z.boolean()
  .optional()
  .default(false)
  .describe("Include unverified (draft) content. Only for internal review purposes.");
```

### Verification Status in Output

Every extraction shows its verification state:

```
Decision: "We choose vendor X for cloud migration"
Source: Meeting "Discovery call Acme Corp" — March 15, 2026
Status: Verified by Stef Banninga on March 16, 2026
Confidence: 0.87
```

### Update search_all_content()

The SQL function gets a `verified_only` parameter (default true) to filter on verification_status.

---

## 9. Sprints

### v2-001: Monorepo Setup

**Goal:** Restructure into Turborepo monorepo. Nothing breaks.

**Scope:**

- Install Turborepo, configure `turbo.json` and workspace `package.json`
- Create `apps/cockpit/` — move app code (app/, components/, actions/, middleware, next.config)
- Create `packages/database/` — move supabase clients, queries, validations, types
- Create `packages/ai/` — move agents, embeddings, pipeline code
- Create `packages/mcp/` — move MCP server and tools
- Update all imports across the codebase
- Update `CLAUDE.md` with new project structure
- Verify: `npm run dev`, `npm run build`, `npm run lint` all pass

**Testable:** Everything works as before. Build passes. No regressions.

**Does NOT include:** Any new features, UI, or database changes.

---

### v2-002: Database Migration + Security Fixes

**Goal:** Database ready for verification. Critical security holes closed.

**Scope:**

- Migration: `verification_status`, `verified_by`, `verified_at` on meetings and extractions
- Data migration: all existing content → `verified`
- Update pipeline: new meetings/extractions start as `draft`
- SEC-001: auth on API routes
- SEC-003: CRON_SECRET mandatory
- SEC-004: server client for dashboard queries (not admin client)
- SEC-005: security headers in next.config.ts
- F1: SQL injection fix (whitelist)
- Regenerate Supabase types

**Testable:**

- New webhook meeting → `verification_status = 'draft'`
- Existing meetings → `verification_status = 'verified'`
- API routes return 401 without auth
- Security headers present in responses

**Prerequisites:** v2-001

---

### v2-003: Review Queue

**Goal:** Team can verify incoming meetings through a visual interface.

**Design:** See section 5.6. Reference: `docs/specs/style-guide.md`, prototype: `docs/specs/revieuw-que.html`

**Scope:**

- App shell: bottom nav bar with all 6 items, active state on Review, badge count
- Review queue page (`/review`) — cards with confidence border, metadata, extraction summary, approve/review buttons
- Review detail page (`/review/[id]`) — split layout: transcript (55%) left, extractions (45%) right, inline edit, sticky action bar
- Empty state with mascot, "All caught up" message, stats, filter pills
- Server Actions: `verifyMeeting`, `verifyMeetingWithEdits`, `rejectMeeting`
- Zod schemas for all actions

**Testable:**

- Open /review → see draft meetings as styled cards with participant names and extraction summaries
- Quick approve → meeting + extractions → verified
- Open detail → transcript with highlighted refs, extractions grouped by type with confidence per extraction
- Edit extraction content inline → approve → saved correctly
- Reject → meeting marked rejected with reason
- Empty queue → mascot + stats shown
- Badge count in nav updates after approve/reject

**Prerequisites:** v2-002

---

### v2-004: Meeting Detail

**Goal:** Team can view verified meetings with transcript and extractions.

**Design:** Same split layout as review detail but read-only. Verification badge shows who verified and when. Transcript highlights matching transcript_refs.

**Scope:**

- Meeting detail page (`/meetings/[id]`) — read-only split layout: transcript left, extractions right
- Verification badge: "Verified by [name] on [date]"
- Shared components (reused from v2-003): extraction card, confidence bar, source attribution
- Meeting query function in `packages/database`
- loading.tsx + error.tsx

**Testable:**

- Navigate to a verified meeting → see full transcript and extractions
- Extractions show confidence bar, transcript_ref as highlighted quote, type color
- Verification badge displays correctly
- 404 for non-existent meeting ID

**Prerequisites:** v2-003 (review queue creates verified content to view, components are reusable)

---

### v2-005: Projects Overview + Detail

**Goal:** Team can see all projects and drill into details.

**Design:** Overview as cards with status pipeline indicator (visual steps: lead → discovery → ... → maintenance). Detail page with tabbed sections. Same card style and fonts as review queue.

**Scope:**

- Projects page (`/projects`) — project cards with name, client, status pipeline, last meeting, open actions count
- Project detail (`/projects/[id]`) — header with status pipeline, sections: meetings, action items, decisions, needs/insights
- Project query functions in `packages/database`
- loading.tsx + error.tsx + empty states

**Testable:**

- /projects shows all projects with visual status pipeline
- Click project → see linked meetings and extractions
- Open action items shown with assignee and due date
- Empty states with appropriate messaging (no mascot here — just clean empty state)

**Prerequisites:** v2-004 (meeting components are reusable)

---

### v2-006: Dashboard + Clients + People

**Goal:** Landing page with overview and remaining entity pages.

**Design:** Dashboard is an action-oriented landing page, not a report. Top: attention zone (review count with color urgency). Middle: project cards. Bottom: two columns (recent meetings left, open actions right). Clients and People are simple list pages following the same card/table patterns.

**Scope:**

- Dashboard home (`/`) — review attention zone, project cards, recent meetings, open action items
- Clients page (`/clients`) — organization list with type badge, status, project count, last contact
- Client detail (`/clients/[id]`) — organization overview with linked projects and meetings
- People page (`/people`) — team members and contacts
- loading.tsx + error.tsx for all new pages

**Testable:**

- Dashboard shows accurate review count with correct urgency color
- Project cards show status, last meeting, open actions
- Clients list shows all organizations with correct data
- People page shows team and contacts
- All nav items in bottom bar work and highlight correctly

**Prerequisites:** v2-005 (project and meeting components exist to compose dashboard)

---

### v2-007: MCP Verification Filter

**Goal:** MCP tools aligned with verification model.

**Scope:**

- All MCP search/retrieve tools: default filter `verification_status = 'verified'`
- All tools: optional `include_drafts` parameter
- All tools: show verification status in output
- Update `search_all_content()` SQL function with verification filter
- Update MCP tool descriptions for LLM clients
- Update platform-spec.md and MILESTONES.md to reflect v2 completion

**Testable:**

- MCP query → only verified content returned
- MCP with `include_drafts=true` → all content
- Verification status visible in every response
- search_all_content() respects filter

**Prerequisites:** v2-006 (all UI is done, team is actively verifying content)

---

## 10. Sprint Dependencies

```
v2-001 Monorepo Setup
    |
    v
v2-002 DB Migration + Security
    |
    v
v2-003 Review Queue
    |
    v
v2-004 Meeting Detail
    |
    v
v2-005 Projects Overview + Detail
    |
    v
v2-006 Dashboard + Clients + People
    |
    v
v2-007 MCP Verification Filter
```

Sequential. Each sprint builds on the previous.

---

## 11. Risks & Mitigations

| Risk                                        | Impact                            | Mitigation                                                                                  |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| Monorepo migration breaks imports           | Build fails, all features blocked | Do monorepo FIRST (v2-001), verify everything works before continuing                       |
| Existing MCP usage breaks during transition | Team can't query meetings         | Migrate existing data to `verified` BEFORE changing MCP filters. MCP change is last sprint. |
| Review queue becomes bottleneck             | Content piles up unreviewed       | Quick approve at meeting level. Keep it simple.                                             |
| Security fixes introduce regressions        | Features break                    | Test each fix in isolation. Auth changes before new features.                               |

---

## 12. Out of Scope

| Topic                         | Decision       | Reason                                                                          |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------- |
| Project `phase` field         | Not needed     | Current `status` covers the full lifecycle. Add later if needed.                |
| Keyboard shortcuts for review | Not needed     | 3 reviewers, ~8 meetings/day. Click interface is sufficient.                    |
| MCP API key auth              | Deferred to v3 | Only internal users. SEC-001 (route auth) covers the web risk.                  |
| RLS policies                  | Deferred to v3 | No external users. Server client + auth middleware is sufficient.               |
| Rate limiting (SEC-006)       | Deferred to v3 | Low risk with auth in place and small team.                                     |
| CORS (SEC-007)                | Deferred to v3 | Only internal users, no cross-origin requests.                                  |
| Notification system           | Deferred to v3 | Badge in sidebar is sufficient for 3 reviewers.                                 |
| AI-generated summaries        | Deferred to v3 | Need verified knowledge base first.                                             |
| Backlog sprints 02-04         | Partial        | SRP page splits, API refactoring, structure cleanup — deferred unless blocking. |

---

## 13. Success Criteria

v2 is done when:

- [ ] Project is a Turborepo monorepo with `apps/cockpit/`, `packages/database/`, `packages/ai/`, `packages/mcp/`
- [ ] Meetings and extractions have `verification_status` field
- [ ] All existing content is migrated to `verified`
- [ ] New pipeline content starts as `draft`
- [ ] Review queue works: list, quick approve, detailed review, reject
- [ ] Meeting detail page shows transcript, extractions, verification status
- [ ] Project overview shows all projects with status and key metrics
- [ ] Project detail shows linked meetings, action items, decisions
- [ ] Dashboard shows review badge, project overview, recent activity
- [ ] Clients and people pages show entity information
- [ ] MCP tools filter on verified content by default
- [ ] MCP tools show verification status in output
- [ ] API routes require authentication
- [ ] CRON_SECRET is mandatory
- [ ] Security headers are in place
- [ ] `npm run build` passes with zero errors
- [ ] Team has verified at least 10 meetings through the review queue
