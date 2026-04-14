# Sprint 034: E-mail-koppeling aan adviseurs + administratie-detailpagina

> **Scope-afbakening.** Mails van boekhouder, fiscalist, jurist et cetera automatisch koppelen aan hun adviseur-organisatie, plus een detail-pagina `/administratie/[id]` waar je die gekoppelde mails per adviseur terugvindt. Eerste sprint in de e-mail-koppeling-tranche — bouwt voort op sprint 032 (datamodel) en sprint 033 (UI).

## Doel

Na deze sprint:

1. Kan Stef een adviseur (boekhouder, fiscalist, jurist) aanmaken mét één of meer e-maildomeinen (bv. `finconnect.nl`, `belastingdienst.nl`).
2. Worden nieuwe inkomende mails automatisch aan die adviseur-organisatie gekoppeld — via drie matching-strategieën met fallbacks.
3. Kan Stef op `/administratie/[id]` per adviseur een overzicht zien van: contactgegevens, gekoppelde contactpersonen, en alle gekoppelde e-mails chronologisch.
4. Kan Stef een eenmalig backfill-script draaien dat bestaande, ongekoppelde mails alsnog probeert te matchen.

## Matching-strategie (drie lagen, in prioriteitsvolgorde)

1. **Classifier organisatienaam** (bestaand, ongewijzigd) — blijft de eerste poging. Werkt alleen als de mailtekst expliciet de organisatienaam noemt.
2. **Sender-person → organisatie** — als het `from_address` matcht op een bestaande `people`-rij, en die `person.organization_id` gezet heeft, gebruikt de pipeline die organisatie.
3. **Email-domein → organisatie** — nieuwe kolom `organizations.email_domains TEXT[]`. Als `from_address` eindigt op een domein dat in deze array staat, match op die organisatie.

Deze volgorde zorgt dat specifieke signalen (persoon-match) zwaarder wegen dan generieke (domein-match). Eerste match wint, de rest wordt overgeslagen.

## Requirements

| ID       | Beschrijving                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA-058 | Kolom `organizations.email_domains TEXT[] DEFAULT '{}'` toegevoegd. Stores known email domains (zonder `@`, bv. `finconnect.nl`).            |
| DATA-059 | Functionele index `idx_organizations_email_domains` (GIN op `email_domains`) voor snelle domein-lookups.                                     |
| FUNC-035 | Query `findPersonOrgByEmail(email)` retourneert `{ personId, organizationId \| null }` of `null`.                                            |
| FUNC-036 | Query `findOrganizationIdByEmailDomain(domain)` retourneert de `organization.id` die `domain` in `email_domains` heeft, of `null`.           |
| FUNC-037 | Query `listEmailsByOrganization(orgId, options?)` retourneert emails waar `organization_id = orgId`, met pagination.                         |
| AI-010   | Pipeline `processEmail` probeert 3 matching-strategieën in volgorde (classifier-name → person → domain); eerste match zet `organization_id`. |
| AI-011   | Backfill-script `backfillEmailOrganizations` draait over `emails WHERE organization_id IS NULL` en past matching-strategie 2 en 3 toe.       |
| UI-220   | Route `/administratie/[id]/page.tsx` toont organisatie-header (naam, type-badge, status, contactgegevens, e-maildomeinen).                   |
| UI-221   | `/administratie/[id]` toont een lijst van gekoppelde e-mails, gesorteerd op datum aflopend, hergebruik van `EmailList`-component.            |
| UI-222   | `/administratie/[id]` toont gekoppelde contactpersonen (via `people.organization_id = [id]`).                                                |
| UI-223   | `/administratie/[id]` heeft eigen `loading.tsx` en `error.tsx`.                                                                              |
| UI-224   | `OrganizationCard` op `/administratie` linkt naar `/administratie/[id]` in plaats van `/clients/[id]`.                                       |
| UI-225   | `AddOrganizationButton` uitgebreid met optionele velden: `email` en `email_domains` (komma-gescheiden invoer).                               |

## Bronverwijzingen

- Pipeline: `packages/ai/src/pipeline/email-pipeline.ts` (regel 93-111 matching, regel 113-122 sender-match)
- Entity-resolution: `packages/ai/src/pipeline/entity-resolution.ts` (bestaande naam-matching)
- Emails query: `packages/database/src/queries/emails.ts` (bestaande `listEmails`, email-list shape)
- People query: `packages/database/src/queries/people.ts:255` (bestaande `findPeopleByEmails`)
- Mutations: `packages/database/src/mutations/organizations.ts` (uitbreiden met `email_domains`)
- Zod-validatie: `packages/database/src/validations/{meetings,entities}.ts`
- UI-template: `apps/cockpit/src/app/(dashboard)/clients/[id]/page.tsx` + `apps/cockpit/src/components/emails/email-list.tsx`

## Context

### DB-migratie

```sql
ALTER TABLE organizations ADD COLUMN email_domains TEXT[] DEFAULT '{}';

CREATE INDEX idx_organizations_email_domains
  ON organizations USING GIN (email_domains);
```

Geen CHECK constraint op formaat — we valideren in de Zod-schema dat het geldige domeinen zijn (geen `@`, geen spaties, lowercase).

### Query-uitbreidingen

Drie nieuwe functies, geen bestaande breaken:

```typescript
// people.ts
export async function findPersonOrgByEmail(
  email: string,
  client?: SupabaseClient,
): Promise<{ personId: string; organizationId: string | null } | null>;

// organizations.ts
export async function findOrganizationIdByEmailDomain(
  domain: string,
  client?: SupabaseClient,
): Promise<string | null>;

// emails.ts
export async function listEmailsByOrganization(
  orgId: string,
  options?: { limit?: number; offset?: number },
  client?: SupabaseClient,
): Promise<EmailListItem[]>;
```

### Pipeline-refactor

Huidige regel 93-111 in `email-pipeline.ts` vervangen door een helper `resolveEmailOrganization` die de 3-stage chain doet en een gefinaliseerde `organization_id` + `unmatched_organization_name` teruggeeft. De bestaande `resolveOrganization` (naam-match) blijft ongewijzigd — wordt alleen als stap 1 aangeroepen.

### Backfill-script

Nieuwe file `packages/ai/src/scripts/backfill-email-organizations.ts`. Draait standalone via `npx tsx`. Selecteert batches van 100 emails waar `organization_id IS NULL`, probeert per email strategie 2 en 3 (niet 1 — dat zou een volledige classifier-call per email vragen, te duur). Update alleen als match gevonden. Idempotent en resumable.

### UI: detail-pagina

Hergebruik bestaande patronen:

- Header-layout uit `/clients/[id]/page.tsx`
- `EmailList` component uit `/components/emails/email-list.tsx`
- Breadcrumb "Administratie → [naam]"

Drie secties, verticaal gestapeld:

1. **Contactinfo** — email, contact_person, e-maildomeinen (badges)
2. **Contactpersonen** — lijst van `people WHERE organization_id = [id]`
3. **E-mails** — chronologisch, gepagineerd (50 per keer)

### Add-organization modal uitbreiding

Nieuwe velden onderaan het formulier (alleen zichtbaar als type `advisor` of `supplier`):

- **Email** — primary email van de organisatie, optioneel
- **E-maildomeinen** — komma-gescheiden, bv. `finconnect.nl, finconnect.com`. Pipeline splitst, trimt, lowercased, dedupeert.

Als een adviseur wordt aangemaakt met domeinen, is matching onmiddellijk actief voor nieuwe mails — geen pipeline-restart nodig.

## Prerequisites

Sprint 032 (datamodel) en 033 (UI basis) moeten af zijn. ✓

## Taken (per fase, elk een eigen commit)

### Fase A — Datamodel + validaties

- [ ] Nieuwe migratie `YYYYMMDDHHMMSS_organizations_email_domains.sql`:
  - `ALTER TABLE organizations ADD COLUMN email_domains TEXT[] DEFAULT '{}';`
  - `CREATE INDEX idx_organizations_email_domains ON organizations USING GIN (email_domains);`
- [ ] Update `packages/database/src/validations/entities.ts`: `updateOrganizationSchema.email_domains = z.array(z.string().regex(/^[a-z0-9.-]+$/)).optional()`
- [ ] Idem `createOrganizationSchema` in `validations/meetings.ts` — veld `email` en `email_domains` beide optioneel
- [ ] Update `mutations/organizations.ts`: `createOrganization` en `updateOrganization` accepteren `email_domains?: string[]`

### Fase B — Query helpers

- [ ] `queries/people.ts`: `findPersonOrgByEmail(email)` toevoegen
- [ ] `queries/organizations.ts`: `findOrganizationIdByEmailDomain(domain)` toevoegen
- [ ] `queries/emails.ts`: `listEmailsByOrganization(orgId, options?)` toevoegen, hergebruik van bestaande select-columns en email-shape

### Fase C — Pipeline refactor

- [ ] `packages/ai/src/pipeline/email-pipeline.ts`: nieuwe private helper `resolveEmailOrganization(email, classifierOutput)` die 3-stage matching doet
- [ ] `processEmail` aanroepen vervangt bestaande regel 93-111 door `await resolveEmailOrganization(email, result.classifier)`
- [ ] Tests bijwerken in `packages/ai/__tests__/pipeline/email-pipeline.test.ts`: nieuwe mocks voor person-org en domain queries

### Fase D — Backfill-script

- [ ] `packages/ai/src/scripts/backfill-email-organizations.ts` schrijven
- [ ] Dry-run mode via `--dry-run` flag (print wat er gekoppeld zou worden zonder UPDATE)
- [ ] Batch size 100, resumable (geen state-file nodig — query zelf filtert `organization_id IS NULL`)
- [ ] Logging per batch: hoeveel gematcht via person, hoeveel via domain, hoeveel ongekoppeld blijft
- [ ] Documenteer aanroep in script-header: `npx tsx packages/ai/src/scripts/backfill-email-organizations.ts [--dry-run]`

### Fase E — UI

- [ ] `apps/cockpit/src/app/(dashboard)/administratie/[id]/page.tsx` — server component
- [ ] `apps/cockpit/src/app/(dashboard)/administratie/[id]/loading.tsx` + `error.tsx`
- [ ] `apps/cockpit/src/components/administratie/administratie-detail-header.tsx` — header-component (naam, type, status, contactinfo, domeinen)
- [ ] `apps/cockpit/src/components/administratie/administratie-contacts.tsx` — contactpersonen-sectie
- [ ] `apps/cockpit/src/components/administratie/administratie-emails.tsx` — e-mails-sectie (hergebruikt `EmailList`)
- [ ] Update `components/administratie/organization-card.tsx` — link naar `/administratie/[id]` i.p.v. `/clients/[id]`

### Fase F — Add-organization modal

- [ ] `components/clients/add-organization-button.tsx`: twee nieuwe velden (email, email_domains). Alleen tonen bij type in `['advisor', 'supplier']`
- [ ] Server action `createOrganizationAction` uitbreiden om `email` en `email_domains` door te geven aan mutation

### Fase G — Verificatie

- [ ] `npm run type-check` op cockpit, database, ai
- [ ] `npm run lint` op gewijzigde files
- [ ] Handmatig: maak testadviseur aan met domein, stuur testmail, verifieer koppeling op `/administratie/[id]`
- [ ] Requirements toevoegen aan `docs/specs/requirements.md`

## Acceptatiecriteria

- [ ] [DATA-058 / DATA-059] `organizations.email_domains` bestaat, GIN-index aanwezig
- [ ] [FUNC-035] `findPersonOrgByEmail('jan@finconnect.nl')` retourneert `{ personId, organizationId }` als person+org bestaan
- [ ] [FUNC-036] `findOrganizationIdByEmailDomain('finconnect.nl')` retourneert de adviseur-id
- [ ] [FUNC-037] `listEmailsByOrganization(advisorId)` retourneert alle gekoppelde mails, gesorteerd op datum desc
- [ ] [AI-010] Nieuwe mail met `from_address = jan@finconnect.nl` (person bestaat) → `organization_id` = adviseur-id
- [ ] [AI-010] Nieuwe mail met onbekende sender maar `@finconnect.nl` domein → `organization_id` = adviseur-id (via domein)
- [ ] [AI-010] Volgorde: als classifier-naam matcht, domein-fallback wordt niet geraakt
- [ ] [AI-011] Backfill-script logt batches + eind-totaal, koppelt ongekoppelde mails met bekende personen/domeinen
- [ ] [AI-011] `--dry-run` wijzigt geen rijen
- [ ] [UI-220..224] Navigeren naar `/administratie`, klikken op adviseur → detail-pagina toont header, contactpersonen, e-mails
- [ ] [UI-225] Bij type-selectie `Adviseur` in add-modal verschijnen de email- en domein-velden; na opslaan staat de adviseur in DB met ingevulde domeinen
- [ ] `/administratie` tab Intern blijft werken (Jouw AI Partner zichtbaar), detail-link werkt
- [ ] Pre-existing test-errors niet verergerd; type-check op gewijzigde packages schoon

## Geraakt door deze sprint

### Nieuw

- `supabase/migrations/YYYYMMDDHHMMSS_organizations_email_domains.sql`
- `packages/ai/src/scripts/backfill-email-organizations.ts`
- `apps/cockpit/src/app/(dashboard)/administratie/[id]/{page,loading,error}.tsx`
- `apps/cockpit/src/components/administratie/{administratie-detail-header,administratie-contacts,administratie-emails}.tsx`

### Gewijzigd

- `packages/database/src/validations/entities.ts` + `validations/meetings.ts`
- `packages/database/src/mutations/organizations.ts`
- `packages/database/src/queries/{people,organizations,emails}.ts`
- `packages/ai/src/pipeline/email-pipeline.ts`
- `packages/ai/__tests__/pipeline/email-pipeline.test.ts`
- `apps/cockpit/src/components/administratie/organization-card.tsx`
- `apps/cockpit/src/components/clients/add-organization-button.tsx`
- `apps/cockpit/src/actions/entities.ts` (server action uitbreiden)
- `docs/specs/requirements.md`

## Vervolg (niet in scope)

- **Sprint 035** — HR en Vendors/Tools tabs; notities-veld per adviseur (btw-periodes, aangifte-deadlines)
- **Sprint 036** — tasks uit administratie-mails: deadlines uit boekhouder-mails automatisch als task met aparte "administratie"-categorie
- **Sprint 037** — verificatie-flow voor auto-gematchte e-mails (zoals review queue voor meetings): de mens bevestigt of de match klopt
- **Sprint 038** — volledige vernederlandsing van de rest van de nav
