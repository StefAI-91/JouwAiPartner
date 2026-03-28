Stack

Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4 (CSS-first, geen tailwind.config), shadcn/ui, Supabase (PostgreSQL EU-Frankfurt), Zod, Vercel.

## Structuur

```
/
├── app/
│   ├── (auth)/                  # Publieke routes (geen auth vereist)
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/             # Beschermde routes
│   │   ├── layout.tsx           # Shell: sidebar + header
│   │   ├── page.tsx             # Dashboard home
│   │   └── [feature]/           # Feature-specifieke routes
│   │       ├── page.tsx         # Overzichtspagina (Server Component)
│   │       ├── [id]/page.tsx    # Detailpagina
│   │       ├── loading.tsx      # Suspense fallback
│   │       └── error.tsx        # Error boundary
│   ├── api/                     # Route handlers (alleen voor webhooks/externe calls)
│   ├── layout.tsx               # Root layout (providers, fonts, metadata)
│   └── globals.css              # Tailwind 4 config + design tokens
│
├── components/
│   ├── ui/                      # shadcn/ui componenten (NIET handmatig wijzigen)
│   ├── shared/                  # Herbruikbare project-componenten
│   │   ├── data-table.tsx
│   │   ├── file-upload.tsx
│   │   ├── status-badge.tsx
│   │   ├── form-modal.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-state.tsx
│   │   └── error-state.tsx
│   ├── layout/                  # Layout-specifieke componenten
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-items.tsx
│   └── [feature]/               # Feature-specifieke componenten
│       ├── feature-form.tsx     # Formulier voor deze feature
│       ├── feature-card.tsx     # Kaart/row weergave
│       ├── feature-list.tsx     # Lijst/overzicht
│       └── feature-actions.tsx  # Actieknoppen (delete, status change)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client
│   │   ├── admin.ts             # Service role (alleen server-side)
│   │   └── middleware.ts        # Auth middleware helper
│   ├── queries/                 # Database queries, gegroepeerd per domein
│   │   ├── protocols.ts         # getProtocols(), getProtocolById(), etc.
│   │   ├── assessments.ts
│   │   └── users.ts
│   ├── validations/             # Zod schemas, gegroepeerd per domein
│   │   ├── protocols.ts         # protocolSchema, createProtocolSchema
│   │   ├── assessments.ts
│   │   └── shared.ts            # emailSchema, dateSchema, etc.
│   ├── utils/
│   │   ├── formatting.ts        # Datum, valuta, tekst formattering
│   │   └── constants.ts         # App-brede constanten
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   └── use-autosave.ts
│   └── types/
│       ├── database.ts          # Supabase generated types (niet handmatig wijzigen)
│       └── app.ts               # App-specifieke types en interfaces
│
├── actions/                     # Server Actions, gegroepeerd per domein
│   ├── protocols.ts             # createProtocol(), updateProtocol(), etc.
│   ├── assessments.ts
│   └── users.ts
│
├── middleware.ts                 # Route guards + auth redirects
│
├── supabase/
│   ├── migrations/              # SQL migrations (versioneerd, chronologisch)
│   └── seed/                    # Seed data scripts
│
├── docs/
│   ├── specs/                   # Bron van waarheid: PRD, design doc, DB schema
│   ├── backlog/                 # Micro sprints die nog gedaan moeten worden
│   ├── active/                  # Micro sprint waar nu aan gewerkt wordt (max 1-2)
│   └── done/                    # Afgeronde micro sprints
│
└── public/                      # Statische assets
```

**Wanneer nieuwe folders:** feature-folder in `components/` bij 2+ eigen componenten. Component naar `shared/` zodra het op 2+ plekken gebruikt wordt. `shared/` mag geen dumpplek worden — elk component moet een duidelijk herbruikbaar doel hebben.

---

## Regels

### Architectuur

- **Bouwvolgorde:** database → query → validatie → action → component → page.
- **Single responsibility:** elk bestand doet één ding. Page composeert, component rendert, action muteert, query haalt op.
- **Server Components als default.** `'use client'` alleen voor formulieren, klikhandlers, hooks, browser APIs.
- **Data ophalen in Server Components.** Geen `useEffect` voor data fetching.
- **Data muteren via Server Actions.** Geen directe Supabase calls in components.
- **Splits bij ~150 regels.** Component te groot? Splits het.

### Database & Queries

- **Geen `select('*')`.** Selecteer alleen kolommen die je nodig hebt.
- **Geen queries in loops (N+1).** Gebruik Supabase joins voor relaties.
- **Centraliseer queries in `lib/queries/`.** Eén plek per domein.
- **Filter op de database.** Niet ophalen en dan in JS filteren.
- **Pagination bij grote datasets.** Gebruik `.range()`.
- **Seed data is idempotent.** Altijd `ON CONFLICT DO UPDATE`.

### Security (drie lagen, altijd alle drie)

1. **Middleware** — route bescherming per rol.
2. **Zod validatie in Server Actions** — valideer álle input vóór de database call.
3. **RLS policies op elke tabel** — SELECT, INSERT, UPDATE per rol. Geen uitzonderingen.

- Frontend checks zijn voor UX, niet voor security.
- Service role client alleen server-side, alleen voor admin/seed taken.
- Geen secrets in `NEXT_PUBLIC_` variabelen.

### Error Handling

- Server Actions retourneren `{ success, data? }` of `{ error }`. Consistent.
- Zod field errors terug naar het formulier, server errors als toast.
- Elke feature-route heeft `loading.tsx` en `error.tsx`.

### Components

- Shared components accepteren data via props. Geen hardcoded waarden.
- Alle states afhandelen: default, loading, empty, error.
- Geen data fetching in components.

### Data-driven

- Waarden die kunnen veranderen → database, niet code.
- Statussen, rollen, niveaus → database tabel, geen enum in code.
- Meer dan 3 items in een lijst → database.

---

## Conventies

**Bestanden:** kebab-case (`data-table.tsx`). **Components:** PascalCase. **Functies:** camelCase. **Types:** PascalCase. **DB tabellen/kolommen:** snake_case. **Constanten:** UPPER_SNAKE.

**Query functies:** `get`/`list` prefix (`getProtocolById`, `listAssessments`).
**Server Actions:** actie-prefix (`createProtocol`, `updateAssessment`).
**Zod schemas:** camelCase + Schema (`createProtocolSchema`).

**TypeScript:** strict, geen `any` (tijdelijk mag met `// TODO: type this`).
**Tailwind 4:** design tokens via `@theme` in globals.css, geen config file.
**Git:** `feature/[beschrijving]` of `fix/[beschrijving]`, één feature per branch.

---

## Werkwijze

**Nieuwe taak:** lees de spec in docs/specs/ → check of database klaar is → identificeer bestaande shared components → bouw inside-out.

**Nieuw component:** bepaal shared vs feature → props interface eerst → alle states maken → geen data fetching.

**Database wijziging:** migratie → RLS policies → regenereer types → seed data → update queries.

**Nieuwe pagina:** route in juiste group → loading.tsx + error.tsx → data via query functie → render via child components → check route guard.

**Nieuwe actie:** Zod schema → Server Action (valideer, muteer, revalidate) → formulier component → error handling.
