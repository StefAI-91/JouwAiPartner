# Testing Guide

## Prerequisites

- Node.js 20+
- Docker (for Supabase local)
- Supabase CLI (`npx supabase`)

## Setup

### 1. Start Supabase local instance

```bash
npx supabase start
```

This starts PostgreSQL, Auth, Storage, and other Supabase services locally via Docker. Note the output — it contains the API URL and service role key.

### 2. Configure environment variables

Create a `.env.test` or set these env vars:

```bash
# Option A: Dedicated test vars (preferred)
TEST_SUPABASE_URL=http://127.0.0.1:54321
TEST_SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>

# Option B: Falls back to standard vars if test vars are not set
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 3. Run migrations

```bash
npx supabase db reset
```

This applies all migrations from `supabase/migrations/` to the local database.

## Running Tests

```bash
# Run all tests (via Turborepo)
npm run test

# Run all tests directly (with workspace detection)
npx vitest run

# Run tests in watch mode
npm run test:watch

# Run tests for a specific workspace
cd packages/database && npx vitest run
cd packages/ai && npx vitest run
cd packages/mcp && npx vitest run
cd apps/cockpit && npx vitest run

# Run a specific test file
npx vitest run packages/ai/__tests__/validations/gatekeeper.test.ts
```

## Test Structure

```
packages/database/__tests__/
  helpers/
    test-client.ts    — getTestClient() for Supabase admin access
    seed.ts           — seedOrganization(), seedMeeting(), etc.
    cleanup.ts        — cleanupTestData() (respects FK order)
    global-setup.ts   — verifies DB connection before suite
  setup.test.ts       — framework sanity check

packages/ai/__tests__/
  validations/        — Zod schema tests (gatekeeper, extractor, summarizer, fireflies)

packages/mcp/__tests__/
  utils.test.ts       — pure utility function tests

apps/cockpit/__tests__/
  helpers/
    mock-auth.ts      — mockAuthenticated() / mockUnauthenticated()
    mock-next.ts      — revalidatePath mock + getRevalidatePathCalls()
  validations/        — Zod schema tests (tasks, entities, review, meetings)
```

## Test Utilities

### Database Seed Helpers

```typescript
import { seedAll, seedMeeting, TEST_IDS } from "../helpers/seed";
import { cleanupTestData } from "../helpers/cleanup";

beforeEach(async () => {
  await seedAll(); // creates org, project, person, meeting, extraction, task
});

afterEach(async () => {
  await cleanupTestData(); // removes in correct FK order
});
```

All seed functions accept optional overrides:

```typescript
await seedMeeting({ title: "Custom Title", verification_status: "verified" });
```

### Auth Mocking

```typescript
import { mockAuthenticated, mockUnauthenticated, createServerMock } from "../helpers/mock-auth";

vi.mock("@repo/database/supabase/server", () => createServerMock());

beforeEach(() => {
  mockAuthenticated("user-123");
});

// Test unauthenticated scenario:
it("returns error when not logged in", async () => {
  mockUnauthenticated();
  const result = await someAction(input);
  expect(result).toEqual({ error: "Niet ingelogd" });
});
```

### Next.js Cache Mocking

```typescript
import { createNextCacheMock, getRevalidatePathCalls, resetNextMocks } from "../helpers/mock-next";

vi.mock("next/cache", () => createNextCacheMock());

afterEach(() => resetNextMocks());

it("revalidates the correct paths", async () => {
  await someAction(input);
  expect(getRevalidatePathCalls()).toContain("/meetings");
});
```

## Test Categories

| Category | Location | Needs DB? | Needs Mocks? |
|---|---|---|---|
| Zod schema tests | `__tests__/validations/` | No | No |
| Utility function tests | `__tests__/utils.test.ts` | No | No |
| Server Action integration tests | `__tests__/actions/` | Yes | Yes (auth, next/cache) |
| Database query/mutation tests | `__tests__/queries/` | Yes | No |
| MCP tool tests | `__tests__/tools/` | Yes | No |

## Deterministic Test IDs

All seed helpers use predictable UUIDs from `TEST_IDS`:

```typescript
import { TEST_IDS } from "../helpers/seed";

TEST_IDS.organization  // 00000000-0000-0000-0000-000000000001
TEST_IDS.project       // 00000000-0000-0000-0000-000000000002
TEST_IDS.person        // 00000000-0000-0000-0000-000000000003
TEST_IDS.meeting       // 00000000-0000-0000-0000-000000000004
TEST_IDS.extraction    // 00000000-0000-0000-0000-000000000005
TEST_IDS.task          // 00000000-0000-0000-0000-000000000006
TEST_IDS.userId        // 00000000-0000-0000-0000-000000000099
```
