# Micro Sprint FND-002: packages/auth/ — Shared Auth Helpers

## Doel

Een gedeeld auth-pakket (`packages/auth/`) opzetten met `getAuthenticatedUser()` en een middleware-factory. Elimineert de 9 gedupliceerde auth-helpers verspreid over action-bestanden in cockpit en devhub. Na deze sprint heeft elke app één import voor auth, en nieuwe apps (portal) krijgen het gratis.

## Waarom

`getAuthenticatedUser()` staat nu **9 keer** gekopieerd in de codebase:

| App     | Bestand                   | Variant                      |
| ------- | ------------------------- | ---------------------------- |
| cockpit | `actions/review.ts`       | `User \| null`               |
| cockpit | `actions/summaries.ts`    | `User \| null`               |
| cockpit | `actions/email-links.ts`  | `User \| null`               |
| cockpit | `actions/email-review.ts` | `User \| null`               |
| cockpit | `actions/entities.ts`     | `User \| null`               |
| cockpit | `actions/meetings.ts`     | `User \| null`               |
| cockpit | `actions/tasks.ts`        | `string \| null` (alleen ID) |
| devhub  | `actions/issues.ts`       | `User \| null`               |
| devhub  | `actions/comments.ts`     | `User \| null`               |

De middleware is 90% identiek tussen beide apps. De devhub-versie heeft betere env-var guards.

## Prerequisites

Geen — onafhankelijk van FND-001.

## Taken

### Taak 1: Package opzetten

```
packages/auth/
├── package.json
├── tsconfig.json
└── src/
    ├── helpers.ts        ← getAuthenticatedUser(), getAuthenticatedUserId()
    └── middleware.ts      ← createAuthMiddleware() factory
```

**package.json:**

```json
{
  "name": "@repo/auth",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./helpers": "./src/helpers.ts",
    "./middleware": "./src/middleware.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.49.4"
  },
  "peerDependencies": {
    "next": ">=16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0"
  }
}
```

### Taak 2: Auth helpers

Maak `packages/auth/src/helpers.ts`:

```typescript
import { createClient } from "@repo/database/supabase/server";

/**
 * Returns the authenticated Supabase user, or null.
 * Use in Server Actions.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns only the user ID, or null.
 * Use when you only need the ID (e.g., for ownership checks).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const user = await getAuthenticatedUser();
  return user?.id ?? null;
}
```

### Taak 3: Middleware factory

Maak `packages/auth/src/middleware.ts` — combineert het beste van beide apps:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface AuthMiddlewareOptions {
  loginPath?: string; // default: "/login"
  defaultRedirect?: string; // default: "/"
}

export function createAuthMiddleware(options?: AuthMiddlewareOptions) {
  const loginPath = options?.loginPath ?? "/login";
  const defaultRedirect = options?.defaultRedirect ?? "/";

  return async function middleware(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Env var guard (van devhub — veiliger dan cockpit's ! assertion)
    if (!supabaseUrl || !supabaseAnonKey) {
      if (request.nextUrl.pathname.startsWith(loginPath)) {
        return NextResponse.next({ request });
      }
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !request.nextUrl.pathname.startsWith(loginPath)) {
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }

    if (user && request.nextUrl.pathname.startsWith(loginPath)) {
      const url = request.nextUrl.clone();
      url.pathname = defaultRedirect;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  };
}
```

### Taak 4: Cockpit updaten

1. Voeg `"@repo/auth": "*"` toe aan `apps/cockpit/package.json`
2. Voeg `"@repo/auth"` toe aan `transpilePackages` in `next.config.ts`
3. Vervang middleware:

```typescript
// apps/cockpit/src/middleware.ts
import { createAuthMiddleware } from "@repo/auth/middleware";

export const middleware = createAuthMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|api/test|api/ingest|api/debug|api/mcp|api/oauth|api/scan-needs|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

4. Verwijder `getAuthenticatedUser()` uit alle 7 action-bestanden. Vervang met:

```typescript
import { getAuthenticatedUser } from "@repo/auth/helpers";
// of voor tasks.ts:
import { getAuthenticatedUserId } from "@repo/auth/helpers";
```

**Bestanden te updaten in cockpit:**

- `src/actions/review.ts`
- `src/actions/summaries.ts`
- `src/actions/email-links.ts`
- `src/actions/email-review.ts`
- `src/actions/entities.ts`
- `src/actions/meetings.ts`
- `src/actions/tasks.ts`

### Taak 5: DevHub updaten

1. Voeg `"@repo/auth": "*"` toe aan `apps/devhub/package.json`
2. Voeg `"@repo/auth"` toe aan `transpilePackages` in `next.config.ts`
3. Vervang middleware (zelfde patroon als cockpit, eigen matcher)
4. Verwijder `getAuthenticatedUser()` uit:
   - `src/actions/issues.ts`
   - `src/actions/comments.ts`

### Taak 6: @supabase/ssr opruimen

Verwijder `@supabase/ssr` uit `apps/devhub/package.json` — het komt nu via `@repo/auth`.

### Taak 7: Verify

1. `npm install` (root)
2. `npm run type-check`
3. `npm run build`
4. Test login flow in beide apps

## Acceptatiecriteria

- [ ] `packages/auth/` bestaat met helpers.ts en middleware.ts
- [ ] Geen enkele `getAuthenticatedUser()` definitie meer in action-bestanden
- [ ] Beide apps gebruiken `createAuthMiddleware()` in hun middleware
- [ ] `npm run build` slaagt voor beide apps
- [ ] Login/logout werkt in beide apps

## Risico's

- `@repo/auth` importeert `@repo/database/supabase/server` — er is een package-dependency. Dit is correct want auth hangt af van de database-client.
- Cockpit's middleware heeft een complexere matcher (meer API routes excluded). Dit blijft per app geconfigureerd via de `config.matcher` — dat is correct.
