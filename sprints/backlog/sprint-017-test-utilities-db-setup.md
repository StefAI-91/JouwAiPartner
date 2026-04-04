# Micro Sprint 017: Test Utilities en Database Setup

## Doel

Maak de test-infrastructuur voor integratietests: Supabase lokale testdatabase configuratie, database seeding/cleanup helpers, auth mock helpers, en Next.js revalidatePath mock. Na deze sprint kunnen integratietests (sprint 018+) database-operaties uitvoeren tegen een echte Supabase instance zonder productiedata te raken.

## Requirements

| ID       | Beschrijving                                                     |
| -------- | ---------------------------------------------------------------- |
| TEST-006 | Test utilities: database seeding helpers                         |
| TEST-007 | Test utilities: database cleanup helpers (teardown)              |
| TEST-008 | Test utilities: auth mock helpers (getAuthenticatedUser)         |
| TEST-009 | Test utilities: revalidatePath mock (Next.js specifiek)          |
| TEST-010 | Supabase lokale testdatabase setup documentatie                  |

## Bronverwijzingen

- Supabase client setup: `packages/database/src/supabase/admin.ts` — getAdminClient() singleton
- Supabase client setup: `packages/database/src/supabase/server.ts` — createClient() met cookie handling
- Auth pattern in actions: `apps/cockpit/src/actions/tasks.ts` (regels 44-49) — `getAuthenticatedUserId()`
- Auth pattern in actions: `apps/cockpit/src/actions/entities.ts` (regels 27-33) — `getAuthenticatedUser()`
- Auth pattern in actions: `apps/cockpit/src/actions/review.ts` (regels 47-52) — `getAuthenticatedUser()`
- revalidatePath usage: alle action-bestanden gebruiken `revalidatePath` van `next/cache`
- Database tabellen: `supabase/migrations/` — alle tabellen en constraints
- Supabase Docker: `supabase/` directory (lokale setup)

## Context

### Auth pattern in Server Actions

Alle Server Actions volgen hetzelfde patroon:
```typescript
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// In elke action:
const user = await getAuthenticatedUser();
if (!user) return { error: "Niet ingelogd" };
```

De `createClient()` functie uit `@repo/database/supabase/server` gebruikt Next.js cookies. Voor tests moeten we:
1. De `createClient` import mocken zodat hij een Supabase client teruggeeft die verbindt met de test-database
2. De auth.getUser() call mocken zodat hij een test-gebruiker teruggeeft (of null voor unauthenticated tests)

### revalidatePath pattern

Alle Server Actions gebruiken `revalidatePath` van `next/cache` voor cache invalidatie:
```typescript
import { revalidatePath } from "next/cache";
// ...
revalidatePath("/");
revalidatePath("/meetings");
```

Dit is Next.js specifiek en werkt niet buiten de Next.js runtime. Voor tests moet deze functie gemocked worden als een no-op.

### Database cleanup strategie

Integratietests moeten de database in een bekende staat brengen voor elke test:
1. **beforeEach:** Insert seed data (organisaties, projecten, personen, meetings, extractions)
2. **afterEach:** Delete de seed data (in omgekeerde volgorde vanwege foreign keys)

Gebruik de admin client (`getAdminClient()`) voor seeding/cleanup omdat deze geen auth checks heeft.

### Supabase lokale testdatabase

De test-database gebruikt dezelfde Supabase lokale instance (Docker) maar met een dedicated set van testdata die na elke test wordt opgeruimd. De env vars `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` moeten naar de lokale instance wijzen.

### Structuur van test utilities

```
packages/database/
  __tests__/
    helpers/
      seed.ts          -- functies om testdata te inserten
      cleanup.ts       -- functies om testdata te verwijderen
      test-client.ts   -- getTestClient() wrapper

apps/cockpit/
  __tests__/
    helpers/
      mock-auth.ts     -- vi.mock voor createClient + auth
      mock-next.ts     -- vi.mock voor next/cache
```

### Seed data schema

De seed helpers moeten minimaal deze data kunnen aanmaken:
- **Organisatie:** `{ id, name, type, status }` — nodig voor meetings, extractions
- **Project:** `{ id, name, organization_id, status }` — nodig voor meetings, extractions
- **Persoon:** `{ id, name, email, role, organization_id }` — nodig voor tasks, meeting participants
- **Meeting:** `{ id, title, date, meeting_type, party_type, organization_id, verification_status, fireflies_id }` — nodig voor extractions, review
- **Extraction:** `{ id, meeting_id, type, content, confidence, verification_status }` — nodig voor tasks
- **Task:** `{ id, extraction_id, title, status, assigned_to, due_date, created_by }` — nodig voor task tests

Alle IDs moeten deterministic UUIDs zijn (bijv. `00000000-0000-0000-0000-000000000001`) zodat tests ze voorspelbaar kunnen refereren.

## Prerequisites

- [ ] Micro Sprint 015: Testframework Setup moet afgerond zijn

## Taken

- [ ] **Maak database test helpers:** Maak `packages/database/__tests__/helpers/seed.ts` met functies: `seedOrganization()`, `seedProject()`, `seedPerson()`, `seedMeeting()`, `seedExtraction()`, `seedTask()`. Elke functie accepteert optionele overrides en retourneert het aangemaakte record. Gebruik deterministic UUIDs. Maak ook `cleanup.ts` met `cleanupTestData()` die alle testdata verwijdert in de juiste volgorde (tasks -> extractions -> meetings -> projects -> people -> organizations).

- [ ] **Maak test client helper:** Maak `packages/database/__tests__/helpers/test-client.ts` met `getTestClient()` die een Supabase admin client teruggeeft geconfigureerd voor de test-database. Gebruik env vars `TEST_SUPABASE_URL` en `TEST_SUPABASE_SERVICE_ROLE_KEY` (fallback naar de standaard env vars).

- [ ] **Maak auth mock helper:** Maak `apps/cockpit/__tests__/helpers/mock-auth.ts` met helpers om `@repo/database/supabase/server` te mocken. Exporteer `mockAuthenticated(userId)` die `createClient()` mockt zodat `auth.getUser()` de gegeven userId retourneert, en `mockUnauthenticated()` die null retourneert.

- [ ] **Maak Next.js mock helper:** Maak `apps/cockpit/__tests__/helpers/mock-next.ts` met een `vi.mock("next/cache")` die `revalidatePath` vervangt door een no-op spy. Exporteer `getRevalidatePathCalls()` waarmee tests kunnen verifiereren welke paden ge-revalideerd zijn.

- [ ] **Maak Vitest global setup:** Maak `packages/database/__tests__/helpers/global-setup.ts` die voor de test suite verifieert dat de database bereikbaar is en de juiste tabellen heeft. Log een duidelijke foutmelding als de database niet draait.

- [ ] **Schrijf documentatie:** Maak `docs/testing.md` met instructies voor: (1) Supabase lokale instance starten, (2) env vars configureren, (3) tests draaien, (4) test utilities gebruiken in nieuwe tests.

## Acceptatiecriteria

- [ ] TEST-006: `seedOrganization()`, `seedProject()`, `seedPerson()`, `seedMeeting()`, `seedExtraction()`, `seedTask()` werken en inserten data in de testdatabase
- [ ] TEST-007: `cleanupTestData()` verwijdert alle testdata zonder foreign key errors
- [ ] TEST-008: `mockAuthenticated("user-id")` zorgt dat Server Actions een ingelogde user zien; `mockUnauthenticated()` zorgt dat ze "Niet ingelogd" retourneren
- [ ] TEST-009: `revalidatePath` is gemocked als no-op spy en calls zijn verifieerbaar
- [ ] TEST-010: `docs/testing.md` bevat complete instructies om de testdatabase op te zetten en tests te draaien
- [ ] Alle bestaande tests uit sprint 016 blijven slagen

## Geraakt door deze sprint

- `packages/database/__tests__/helpers/seed.ts` (nieuw)
- `packages/database/__tests__/helpers/cleanup.ts` (nieuw)
- `packages/database/__tests__/helpers/test-client.ts` (nieuw)
- `packages/database/__tests__/helpers/global-setup.ts` (nieuw)
- `apps/cockpit/__tests__/helpers/mock-auth.ts` (nieuw)
- `apps/cockpit/__tests__/helpers/mock-next.ts` (nieuw)
- `docs/testing.md` (nieuw)
