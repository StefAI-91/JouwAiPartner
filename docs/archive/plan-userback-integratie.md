# Plan: Userback Feedback Integratie

## Context

Userback widget draait al in de cockpit, maar feedback data zit alleen in Userback. Met de Business+ upgrade is de REST API nu beschikbaar. We syncen Userback feedback naar onze Supabase database zodat het queryable is vanuit het cockpit dashboard, naast meetings en emails als derde databron onder "Bronnen".

**615 bestaande feedback items** over 62 pagina's, allemaal van project caistudio.nl (projectId 127499).

## Design Beslissingen

| Beslissing      | Keuze                                           | Reden                                                                    |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| Tabelnaam       | `userback_feedback`                             | Source-specifiek, niet conflicteren met PRD's generieke `feedback` tabel |
| Project mapping | Config-based constant, geen FK vereist          | Slechts 1 Userback project nu, kan later lookup table worden             |
| Opslag          | Genormaliseerde kolommen + `raw_userback` JSONB | Zelfde patroon als `raw_gmail` op emails tabel                           |
| Sync methode    | Polling via cron (elke 6 uur)                   | Zelfde patroon als Fireflies ingest, eenvoudig en bewezen                |
| UI locatie      | `/feedback` als derde item onder "Bronnen"      | Cross-project feedback, naast Meetings en Emails                         |
| Detail view v1  | Link naar Userback share_url                    | Detail page later (v1.1)                                                 |

## Implementatie Stappen

### Stap 1: Database Migratie

**File:** `supabase/migrations/20260409000002_userback_feedback.sql`

```sql
CREATE TABLE userback_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userback_id     INTEGER NOT NULL UNIQUE,
  userback_project_id INTEGER NOT NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  title           TEXT,
  description     TEXT,
  feedback_type   TEXT NOT NULL,          -- Bug, Idea, General
  priority        TEXT NOT NULL DEFAULT 'neutral',
  status          TEXT NOT NULL DEFAULT 'Open',
  status_color    TEXT,
  email           TEXT,
  name            TEXT,
  page_url        TEXT,
  share_url       TEXT,
  screenshot_url  TEXT,
  rating          TEXT,
  vote_count      INTEGER DEFAULT 0,
  is_pinned       BOOLEAN DEFAULT FALSE,
  assignee_id     INTEGER,
  due_date        TIMESTAMPTZ,
  raw_userback    JSONB,
  userback_created_at TIMESTAMPTZ NOT NULL,
  userback_modified_at TIMESTAMPTZ NOT NULL,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ub_feedback_type ON userback_feedback(feedback_type);
CREATE INDEX idx_ub_feedback_status ON userback_feedback(status);
CREATE INDEX idx_ub_feedback_created ON userback_feedback(userback_created_at DESC);

-- RLS
ALTER TABLE userback_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view feedback"
  ON userback_feedback FOR SELECT USING (auth.role() = 'authenticated');
```

### Stap 2: Query Functies

**File:** `packages/database/src/queries/feedback.ts`

- `listFeedback(options?)` → `{ items: FeedbackListItem[], count: number }`
  - Filters: feedbackType, status, limit (default 200)
  - Order: userback_created_at DESC
- `getFeedbackSyncCursor()` → `string | null`
  - MAX(userback_modified_at) voor incremental sync

**Ref:** `packages/database/src/queries/emails.ts` patroon

### Stap 3: Mutation Functies

**File:** `packages/database/src/mutations/feedback.ts`

- `upsertFeedbackBatch(rows[])` → `{ success: true, count } | { error }`
  - Upsert met `onConflict: "userback_id"` voor idempotent sync

**Ref:** `packages/database/src/mutations/emails.ts` patroon

### Stap 4: Userback API Client

**File:** `packages/ai/src/userback.ts`

- `fetchUserbackFeedbackPage(options)` → 1 pagina van REST API
  - `GET https://rest.userback.io/1.0/feedback?page={n}&per_page=50`
  - Bearer token: `USERBACK_API_TOKEN` env var
- `fetchAllUserbackFeedback(updatedAfter?)` → alle pagina's
  - 200ms delay tussen pagina's (rate limit)
  - Gebruikt `_pagination.totalPages` om te stoppen

### Stap 5: Sync API Route

**File:** `apps/cockpit/src/app/api/ingest/userback/route.ts`

- **GET** (Vercel Cron): auth via `CRON_SECRET`, volledige sync
- **POST** (handmatig): auth via Supabase session, trigger vanuit UI
- Logica:
  1. Haal sync cursor op (laatste `userback_modified_at`)
  2. Fetch pagina's van Userback API (alleen nieuw/gewijzigd als cursor bestaat)
  3. Map naar DB schema (screenshot_url = Screenshots[0]?.url, due_date filter voor 1970 sentinel)
  4. Upsert in batches van 50
  5. Return: `{ synced, total, isInitial }`
- `maxDuration = 60`

**Ref:** `apps/cockpit/src/app/api/ingest/fireflies/route.ts` patroon

### Stap 6: Navigatie

**File:** `apps/cockpit/src/lib/constants/navigation.ts`

Toevoegen aan `secondaryNavItems`:

```typescript
{ href: "/feedback", label: "Feedback", icon: MessageSquareMore }
```

### Stap 7: Feedback Pagina + Components

**Files:**

- `apps/cockpit/src/app/(dashboard)/feedback/page.tsx` — Server Component
- `apps/cockpit/src/app/(dashboard)/feedback/loading.tsx` — Skeleton
- `apps/cockpit/src/app/(dashboard)/feedback/error.tsx` — Error boundary
- `apps/cockpit/src/components/feedback/feedback-list.tsx` — Client Component
- `apps/cockpit/src/components/feedback/sync-button.tsx` — Sync trigger

**Feedback list features:**

- Filters: feedbackType (Bug/Idea/General), status (Open/In Progress/Closed)
- Per item: type badge (kleur-coded), title, truncated description, status badge, datum, screenshot thumbnail
- Klik → Userback share_url (extern, nieuw tabblad)
- Empty state met icoon

**Ref:** `apps/cockpit/src/app/(dashboard)/emails/page.tsx` + `components/emails/email-list.tsx` + `components/emails/sync-button.tsx`

### Stap 8: Vercel Cron

**File:** `apps/cockpit/vercel.json`

Toevoegen:

```json
{ "path": "/api/ingest/userback", "schedule": "0 */6 * * *" }
```

### Stap 9: Environment Variable

- `USERBACK_API_TOKEN` toevoegen aan `.env.local` en Vercel
- Documenteren in CLAUDE.md

## Verificatie

1. Run migratie: `npx supabase db push` of `npx supabase migration up`
2. Test sync handmatig: `curl -X POST localhost:3000/api/ingest/userback` (met auth)
3. Check Supabase: 615 rows in `userback_feedback`
4. Open `/feedback` in cockpit: lijst met filters, sync button
5. Filter op Bug → alleen bugs zichtbaar
6. Klik item → opent Userback share_url in nieuw tabblad
7. Run sync opnieuw → upsert, geen duplicaten
8. `npm run build` + `npm run type-check` moeten slagen
