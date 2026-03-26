# Sprint 01: Project Scaffolding

**Phase:** 1 — Foundation
**Requirements:** REQ-100, REQ-101, REQ-102, REQ-1408
**Depends on:** Nothing (first sprint)
**Produces:** Running Next.js app with Supabase connection

---

## Task 1: Initialize Next.js project

**What:** Create Next.js app with TypeScript, Tailwind, and shadcn/ui.

**Commands:**
```bash
npx create-next-app@latest knowledge-platform --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd knowledge-platform
npx shadcn@latest init
# Style: New York | Base color: Zinc | CSS variables: yes
```

**Packages to install:**
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install ai @ai-sdk/anthropic zod
npm install openai
```

**File structure to verify:**
```
knowledge-platform/
  src/
    app/
      layout.tsx
      page.tsx
    lib/          # we'll add supabase clients here
  tailwind.config.ts
  tsconfig.json
  package.json
```

---

## Task 2: Set up Supabase project

**What:** Create Supabase project and enable pgvector.

**Steps:**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note down: Project URL, anon key, service role key
3. Run in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Why pg_cron + pg_net:** pg_cron schedules background jobs, pg_net lets those jobs call Edge Functions via HTTP.

---

## Task 3: Configure Supabase client

**What:** Create server-side and client-side Supabase clients for Next.js App Router.

**Create `src/lib/supabase/server.ts`:**
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**Create `src/lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Create `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

**Gotchas:**
- `NEXT_PUBLIC_` prefix exposes vars to the browser — only use for URL and anon key
- Service role key bypasses RLS — never expose to the client
- Add `.env.local` to `.gitignore`

---

## Verification

- [ ] `npm run dev` starts without errors
- [ ] Supabase connection works: test query from a server component
- [ ] pgvector extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] shadcn/ui components render (add a test `<Button>` to page.tsx)
