# Micro Sprint FND-004: Fix DevHub Architectuur

## Doel

De architectuurbreuken in DevHub herstellen zodat de app dezelfde patronen volgt als cockpit. Twee hoofdproblemen:

1. **Issues-pagina is een client component met `useEffect` data fetching** — moet een Server Component worden die `listIssues()` uit het database-pakket gebruikt
2. **Project-selectie via `localStorage`** — dwingt alles naar client-side; moet naar URL-parameter

Na deze sprint volgt DevHub de CLAUDE.md architectuurregels: Server Components voor data, `"use client"` alleen voor interactie.

## Waarom

### Probleem 1: Client-side data fetching

`apps/devhub/src/app/(app)/issues/page.tsx` is een `"use client"` component die:

- Direct `createClient()` (browser Supabase) aanroept
- Data fetcht via `useEffect`
- De `ISSUE_SELECT` query dupliceert uit `packages/database/src/queries/issues.ts`
- De `PRIORITY_ORDER` sort-logica dupliceert

Dit breekt 3 CLAUDE.md regels:

- _"Data ophalen in Server Components. Geen `useEffect` voor data fetching."_
- _"Data muteren via Server Actions. Geen directe Supabase calls in components."_
- _"Centraliseer queries in `packages/database/src/queries/`."_

### Probleem 2: localStorage project-selectie

`apps/devhub/src/hooks/use-project.ts` slaat het geselecteerde project op in `localStorage`. Dit werkt alleen client-side, waardoor:

- De issues-pagina geforceerd `"use client"` wordt
- De sidebar client-side data moet fetchen
- Server Components onmogelijk worden voor data-pagina's

### Probleem 3: Sidebar client-side counting

`apps/devhub/src/components/layout/app-sidebar.tsx` doet een directe Supabase call in `useEffect` om issue-counts op te halen. De `getIssueCounts()` query-functie bestaat al in het database-pakket maar wordt niet gebruikt.

## Prerequisites

- FND-003 (voor gedeelde constanten) — aanbevolen maar niet strikt vereist

## Oplossingsrichting: Project via URL searchParam

Vervang `localStorage` door een `?project=<id>` URL-parameter. Dit maakt project-selectie beschikbaar voor Server Components via `searchParams`.

**Voordelen:**

- Server Components kunnen `searchParams.project` lezen
- Bookmarkbaar en deelbaar
- Geen hydration mismatch risico
- Browser back/forward werkt

**Nadelen:**

- URL wordt langer (UUID in query string)
- Bij wisselen moet de URL updaten

Dit is hetzelfde patroon dat cockpit gebruikt voor filters (bijv. `/meetings?type=strategy`).

## Taken

### Taak 1: Project-selectie naar URL

**Verwijder:** `apps/devhub/src/hooks/use-project.ts`

**Update `apps/devhub/src/components/layout/project-switcher.tsx`:**

```typescript
// In plaats van localStorage schrijven:
// Gebruik useRouter().push() om ?project=<id> te zetten
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProjectSwitcher({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProject = searchParams.get("project");

  function selectProject(projectId: string) {
    const params = new URLSearchParams(searchParams);
    params.set("project", projectId);
    router.push(`/issues?${params.toString()}`);
  }
  // ... rest van component
}
```

**Update `apps/devhub/src/components/layout/top-bar.tsx`:**

- Verwijder `useProjectId()` import
- Lees project uit props (doorgegeven vanuit layout)

### Taak 2: Issues-pagina naar Server Component

**Herschrijf `apps/devhub/src/app/(app)/issues/page.tsx`:**

```typescript
// GEEN "use client"
import { createClient } from "@repo/database/supabase/server";
import { listIssues, getIssueCounts } from "@repo/database/queries/issues";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    status?: string;
    priority?: string;
    type?: string;
    component?: string;
  }>;
}) {
  const params = await searchParams;
  const projectId = params.project;

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Selecteer een project om issues te bekijken.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const issues = await listIssues({
    projectId,
    status: params.status?.split(","),
    priority: params.priority?.split(","),
    type: params.type?.split(","),
    component: params.component?.split(","),
  }, supabase);

  return (
    <div className="flex flex-1 flex-col">
      <IssueFilters />
      <IssueList issues={issues} />
    </div>
  );
}
```

**Verwijder uit dit bestand:**

- `"use client"` directive
- `useEffect` data fetching
- Lokale `ISSUE_SELECT` constante
- Lokale `PRIORITY_ORDER` constante
- `createClient` (browser) import
- `useProjectId()` hook

### Taak 3: Sidebar server-side counts

**Update `apps/devhub/src/app/(app)/layout.tsx`:**

```typescript
import { getIssueCounts } from "@repo/database/queries/issues";
import { createClient } from "@repo/database/supabase/server";

export default async function AppLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode;
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const projects = await listAccessibleProjects(user?.id ?? "", supabase);

  // Haal counts server-side op
  const projectId = params.project;
  const counts = projectId
    ? await getIssueCounts(projectId, supabase)
    : { triage: 0, backlog: 0, todo: 0, in_progress: 0, done: 0, cancelled: 0 };

  return (
    <div className="flex h-full">
      <AppSidebar counts={counts} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar projects={projects} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

**Update `apps/devhub/src/components/layout/app-sidebar.tsx`:**

- Verwijder `"use client"` (wordt Server Component)
- Verwijder `useEffect` data fetching
- Verwijder `useProjectId()` hook
- Accepteer `counts` als prop

```typescript
// GEEN "use client"
interface AppSidebarProps {
  counts: Record<string, number>;
}

export function AppSidebar({ counts }: AppSidebarProps) {
  // Pure render, geen data fetching
}
```

**Let op:** De navigatie-links in de sidebar moeten de `?project=<id>` parameter behouden. Dit kan via een wrapper client component die `useSearchParams()` leest en de links genereert, of door `projectId` als prop door te geven.

### Taak 4: Filters client component houden

`IssueFilters` mag een `"use client"` component blijven — het is interactie. Maar in plaats van client-side fetching, gebruikt het `useRouter().push()` om URL params te wijzigen, wat de Server Component pagina triggert om opnieuw te renderen.

### Taak 5: use-project.ts opruimen

1. Verwijder `apps/devhub/src/hooks/use-project.ts`
2. Grep naar alle `useProjectId` imports — update of verwijder ze
3. Verwijder `devhub-selected-project` localStorage key referenties

### Taak 6: Issue form updaten

`apps/devhub/src/app/(app)/issues/new/page.tsx` is al een Server Component. Maar `IssueForm` gebruikt `useProjectId()`. Update:

```typescript
// issues/new/page.tsx
export default async function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const projectId = params.project;
  // ...
  return <IssueForm projectId={projectId} people={people} />;
}

// IssueForm: accepteer projectId als prop in plaats van useProjectId()
```

### Taak 7: Verify

1. `npm run type-check`
2. `npm run build`
3. Test de volledige flow:
   - Project selecteren → URL update met `?project=<id>`
   - Issues laden → Server-side via `listIssues()`
   - Filters toepassen → URL params wijzigen → pagina herlaadt met gefilterde data
   - Sidebar counts → correct zonder client-side fetch
   - Issue aanmaken → projectId uit URL
   - Issue detail → ongewijzigd (was al Server Component)

## Acceptatiecriteria

- [ ] `apps/devhub/src/hooks/use-project.ts` is verwijderd
- [ ] Issues-pagina is een Server Component (geen `"use client"`)
- [ ] Issues-pagina gebruikt `listIssues()` uit `@repo/database/queries/issues`
- [ ] Sidebar is een Server Component die counts via props ontvangt
- [ ] Geen directe Supabase client calls in components
- [ ] Geen `useEffect` voor data fetching in devhub
- [ ] Project-selectie werkt via URL `?project=<id>`
- [ ] `npm run build` slaagt

## Risico's

- **Layout searchParams:** Next.js 16 layouts ontvangen mogelijk geen `searchParams`. Als dat zo is, gebruik een parallel route of lees de counts in een Server Component wrapper binnen de layout. Controleer de Next.js 16 docs.
- **Filter UX:** Bij elke filter-wijziging doet de server een nieuwe query. Dit kan iets langzamer voelen dan client-side filtering. Oplossing: `loading.tsx` met skeletons, en eventueel `useOptimistic` voor instant UI feedback.
- **Project-ID in URL:** UUID's in URL zijn lang maar functioneel. Alternatief: gebruik `project_key` (kort, leesbaar) in de URL en resolve naar UUID server-side.
