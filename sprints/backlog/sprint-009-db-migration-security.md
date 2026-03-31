# Sprint 009: Database Migration + Security Fixes (v2-002)

## Doel

Database klaarmaken voor het verificatiemodel en kritieke security gaten dichten. Na deze sprint hebben meetings en extractions een `verification_status` kolom, starten nieuwe pipeline items als 'draft', en zijn alle API routes beveiligd. Dit is de fundatie voor de review queue UI.

## Requirements

| ID       | Beschrijving                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| DATA-001 | meetings: kolom verification_status (TEXT NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'verified', 'rejected'))    |
| DATA-002 | meetings: kolom verified_by (UUID REFERENCES profiles(id))                                                         |
| DATA-003 | meetings: kolom verified_at (TIMESTAMPTZ)                                                                          |
| DATA-004 | Index idx_meetings_verification_status op meetings(verification_status)                                            |
| DATA-005 | Migratie bestaande meetings: verification_status = 'verified', verified_at = now()                                 |
| DATA-006 | extractions: kolom verification_status (TEXT NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'verified', 'rejected')) |
| DATA-007 | extractions: kolom verified_by (UUID REFERENCES profiles(id))                                                      |
| DATA-008 | extractions: kolom verified_at (TIMESTAMPTZ)                                                                       |
| DATA-009 | Index idx_extractions_verification_status op extractions(verification_status)                                      |
| DATA-010 | Migratie bestaande extractions: verification_status = 'verified', verified_at = now()                              |
| FUNC-008 | Pipeline update: nieuwe meetings/extractions starten als 'draft'                                                   |
| FUNC-009 | Supabase types regenereren na migratie                                                                             |
| SEC-001  | Auth op alle API routes — getUser() check, 401 bij geen user                                                       |
| SEC-002  | CRON_SECRET verplicht — falen als env var ontbreekt OF token niet klopt                                            |
| SEC-003  | Security headers in next.config.ts                                                                                 |
| SEC-004  | Server client voor dashboard queries, NIET admin client                                                            |
| SEC-005  | SQL injection fix: whitelist voor table parameter in dynamic queries                                               |
| AUTH-001 | API routes vereisen authenticatie                                                                                  |
| AUTH-003 | Pipeline gebruikt admin client                                                                                     |
| RULE-003 | Nieuwe pipeline content start als 'draft'                                                                          |
| RULE-004 | Bestaande meetings/extractions migreren naar 'verified'                                                            |
| RULE-007 | Migratiestrategie voor zero downtime                                                                               |
| PERF-001 | Zero downtime tijdens migratie                                                                                     |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "3. Database Migration" (regels 119-168)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "4. Security Fixes" (regels 174-218)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-002" (regels 463-485)
- Platform spec: `docs/specs/platform-spec.md` -> sectie "4.5 Schema Extensions Needed (v2)" (regels 311-329)

## Context

### Relevante business rules

- **RULE-003**: "Nieuwe pipeline content start als 'draft' — na de migratie zetten Gatekeeper en Extractor verification_status='draft' op nieuwe meetings en extractions."
- **RULE-004**: "Bestaande meetings/extractions migreren naar 'verified' — alles wat nu in de DB staat is impliciet goedgekeurd door dagelijks gebruik via MCP."
- **RULE-007**: "Migratiestrategie voor zero downtime: (1) kolommen toevoegen met defaults, (2) bestaande data migreren naar verified, (3) pipeline updaten naar draft, (4) UI deployen, (5) MCP updaten als laatste."

### Datamodel

**Meetings tabel — nieuwe kolommen:**

```sql
ALTER TABLE meetings
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'rejected')),
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_meetings_verification_status ON meetings(verification_status);

-- Migrate existing data
UPDATE meetings SET
  verification_status = 'verified',
  verified_at = now()
WHERE verification_status = 'draft';
```

**Extractions tabel — nieuwe kolommen:**

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

**Let op:** De bestaande `corrected_by`/`corrected_at` velden op extractions blijven bestaan. Die handelen post-verificatie correcties af. De nieuwe `verification_status`/`verified_by`/`verified_at` velden handelen de initieel review gate af. Beide dienen een ander doel.

### Security fixes

**SEC-001: Auth op API routes**

```typescript
// Pattern voor alle API routes
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

**SEC-002: CRON_SECRET verplicht**

```typescript
// FOUT (oud):
if (process.env.CRON_SECRET && authHeader !== expectedToken) { ... }

// GOED (nieuw):
if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**SEC-003: Security headers** — Toe te voegen aan next.config.ts:

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Referrer-Policy: strict-origin-when-cross-origin

**SEC-004: Client gebruik per context**

| Context                             | Client                       |
| ----------------------------------- | ---------------------------- |
| Dashboard pages (Server Components) | Server client (user session) |
| Server Actions (user mutations)     | Server client                |
| Pipeline (webhook, cron, agents)    | Admin client                 |
| MCP tools                           | Admin client (apart process) |

**SEC-005: SQL injection fix** — Whitelist voor table parameter in dynamic queries, geen vrije string interpolatie.

## Prerequisites

- [ ] Sprint 008: Monorepo Setup moet afgerond zijn

## Taken

- [ ] SQL migratie schrijven: verification_status, verified_by, verified_at op meetings + extractions, inclusief indexes en data migratie
- [ ] Pipeline code updaten: Gatekeeper en Extractor zetten verification_status='draft' op nieuwe content
- [ ] Auth checks toevoegen aan alle API routes (getUser() pattern)
- [ ] CRON_SECRET fix implementeren (verplicht, niet optioneel)
- [ ] Security headers toevoegen aan next.config.ts
- [ ] SQL injection whitelist fix + server client audit (SEC-004, SEC-005) + Supabase types regenereren

## Acceptatiecriteria

- [ ] [DATA-001..010] Migratie draait zonder fouten, kolommen bestaan met juiste types en constraints
- [ ] [RULE-004] Bestaande meetings hebben verification_status='verified' en verified_at gevuld
- [ ] [FUNC-008] Nieuw via webhook binnengekomen meeting krijgt verification_status='draft'
- [ ] [SEC-001] API routes retourneren 401 zonder authenticatie
- [ ] [SEC-002] Zonder CRON_SECRET env var falen cron endpoints met 401
- [ ] [SEC-003] Security headers aanwezig in HTTP responses (check via browser dev tools)
- [ ] [SEC-005] Dynamic queries gebruiken whitelist, geen string interpolatie
- [ ] [FUNC-009] Supabase types zijn geregenereerd en bevatten nieuwe kolommen
- [ ] `npm run build` slaagt zonder fouten

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDDHHMMSS_verification_status.sql` (nieuw)
- `packages/ai/src/pipeline/gatekeeper-pipeline.ts` (gewijzigd — draft status)
- `packages/ai/src/agents/extractor.ts` (gewijzigd — draft status)
- `apps/cockpit/src/app/api/` (alle route handlers — auth check)
- `apps/cockpit/next.config.ts` (gewijzigd — security headers)
- `packages/database/src/types/database.ts` (geregenereerd)
- Dynamic query bestanden met SQL injection fix
