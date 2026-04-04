# Micro Sprint 016: Zod Schema Validatietests

## Doel

Schrijf uitgebreide tests voor alle Zod schemas in het project. Dit zijn pure functie-tests zonder mocks of database — alleen schema.safeParse() met geldige en ongeldige input. Dit is de snelste en meest waardevolle testcategorie omdat Zod schemas de eerste verdedigingslinie zijn tegen ongeldige data. Inclusief de pure utility functies uit MCP tools/utils.ts en AI validations/fireflies.ts.

## Requirements

| ID       | Beschrijving                                                                          |
| -------- | ------------------------------------------------------------------------------------- |
| TEST-011 | Test promoteToTaskSchema: geldige input met alle velden                               |
| TEST-012 | Test promoteToTaskSchema: ongeldige extractionId (niet UUID)                          |
| TEST-013 | Test promoteToTaskSchema: lege title wordt afgewezen                                  |
| TEST-014 | Test promoteToTaskSchema: ongeldig datumformaat in dueDate                            |
| TEST-015 | Test promoteToTaskSchema: optionele velden (assignedTo, dueDate, alreadyDone)         |
| TEST-016 | Test updateTaskSchema: geldige input met taskId                                       |
| TEST-017 | Test updateTaskSchema: ongeldige taskId (niet UUID)                                   |
| TEST-018 | Test taskIdSchema: geldige UUID                                                       |
| TEST-019 | Test taskIdSchema: ongeldige waarde (lege string, geen UUID)                          |
| TEST-020 | Test updateOrganizationSchema: geldige input met id en optionele velden               |
| TEST-021 | Test updateOrganizationSchema: ongeldig email-formaat                                 |
| TEST-022 | Test updateOrganizationSchema: ongeldige type enum waarde                             |
| TEST-023 | Test updateProjectSchema: geldige input met alle status enum waarden                  |
| TEST-024 | Test updatePersonSchema: geldige input met optionele velden                           |
| TEST-025 | Test createExtractionSchema: geldige input met alle type enum waarden                 |
| TEST-026 | Test createExtractionSchema: lege content wordt afgewezen                             |
| TEST-027 | Test updateExtractionSchema: geldige input met optionele velden                       |
| TEST-028 | Test deleteSchema: geldige UUID                                                       |
| TEST-029 | Test verifyMeetingSchema: geldige UUID                                                |
| TEST-030 | Test verifyMeetingWithEditsSchema: geldige input met extractionEdits en typeChanges   |
| TEST-031 | Test verifyMeetingWithEditsSchema: ongeldige type in typeChanges                      |
| TEST-032 | Test rejectMeetingSchema: lege reason wordt afgewezen                                 |
| TEST-033 | Test updateTitleSchema: lege titel wordt afgewezen                                    |
| TEST-034 | Test updateTitleSchema: titel langer dan 500 tekens wordt afgewezen                   |
| TEST-035 | Test updateMeetingTypeSchema: alle geldige enum waarden                               |
| TEST-036 | Test createOrganizationSchema: geldige input met naam en optioneel type               |
| TEST-037 | Test createProjectSchema: geldige input met naam en optionele organizationId          |
| TEST-038 | Test createPersonSchema: geldige input met alle velden                                |
| TEST-039 | Test createPersonSchema: ongeldig email-formaat wordt afgewezen                       |
| TEST-040 | Test meetingProjectSchema: beide velden verplicht en min 1 karakter                   |
| TEST-041 | Test meetingParticipantSchema: beide velden verplicht en min 1 karakter               |
| TEST-042 | Test GatekeeperSchema: geldige output met alle meeting_type waarden                   |
| TEST-043 | Test GatekeeperSchema: relevance_score moet een nummer zijn                           |
| TEST-044 | Test GatekeeperSchema: organization_name nullable                                     |
| TEST-045 | Test ExtractionItemSchema: geldige item met alle type waarden                         |
| TEST-046 | Test ExtractionItemSchema: confidence moet een nummer zijn                            |
| TEST-047 | Test ExtractionItemSchema: nullable velden (transcript_ref, assignee, deadline, etc.) |
| TEST-048 | Test ExtractorOutputSchema: geldige output met extractions en entities                |
| TEST-049 | Test SummarizerOutputSchema: geldige output met alle verplichte velden                |
| TEST-050 | Test ThemeSchema: geldige theme met title, summary, quotes                            |
| TEST-051 | Test ParticipantProfileSchema: nullable velden (role, organization, stance)            |
| TEST-052 | Test isValidDuration: meeting korter dan 2 minuten is ongeldig                        |
| TEST-053 | Test isValidDuration: lege sentences array is geldig                                  |
| TEST-054 | Test hasParticipants: minder dan 2 deelnemers is ongeldig                             |
| TEST-055 | Test hasParticipants: undefined participants is ongeldig                               |
| TEST-065 | Test escapeLike: escaped % en _ karakters                                             |
| TEST-066 | Test formatVerificatieStatus: alle status varianten                                   |
| TEST-067 | Test collectVerifiedByIds: extraheert unieke non-null IDs                             |

## Bronverwijzingen

- Tasks schemas: `apps/cockpit/src/actions/tasks.ts` (regels 14-40)
- Entities schemas: `apps/cockpit/src/actions/entities.ts` (regels 36-89)
- Review schemas: `apps/cockpit/src/actions/review.ts` (regels 13-43)
- Meetings schemas: `apps/cockpit/src/actions/meetings.ts` (regels 33-76)
- Gatekeeper schema: `packages/ai/src/validations/gatekeeper.ts` (regels 1-38)
- Extractor schema: `packages/ai/src/validations/extractor.ts` (regels 1-63)
- Summarizer schema: `packages/ai/src/validations/summarizer.ts` (regels 1-52)
- Fireflies validations: `packages/ai/src/validations/fireflies.ts` (regels 1-13)
- MCP utils: `packages/mcp/src/tools/utils.ts` (regels 1-118)

## Context

### Probleem: schemas zijn niet geexporteerd uit action-bestanden

De Zod schemas in `apps/cockpit/src/actions/` zijn lokale constanten (niet geexporteerd). Om ze te testen zonder de action-functies aan te roepen, moeten de schemas geexporteerd worden. **De sprint moet de schemas herbruikbaar maken door ze te verplaatsen naar aparte validatie-bestanden of door ze te exporteren.**

Aanpak: maak een `apps/cockpit/src/validations/` directory met aparte bestanden per domein (tasks.ts, entities.ts, review.ts, meetings.ts). Verplaats de schema-definities daar naartoe en importeer ze in de action-bestanden. Dit maakt de schemas testbaar EN herbruikbaar.

### Zod schema definities (exacte code)

**tasks.ts schemas:**
```typescript
const optionalStringOrNull = z.string().nullable().optional();
const optionalDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldig datumformaat (YYYY-MM-DD)")
  .nullable()
  .optional();

const promoteToTaskSchema = z.object({
  extractionId: z.string().uuid(),
  title: z.string().min(1),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
  alreadyDone: z.boolean().optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  assignedTo: optionalStringOrNull,
  dueDate: optionalDateOrNull,
  title: z.string().min(1).optional(),
});

const taskIdSchema = z.object({
  taskId: z.string().uuid(),
});
```

**entities.ts schemas:**
```typescript
const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  type: z.enum(["client", "partner", "supplier", "other"]).optional(),
  status: z.enum(["prospect", "active", "inactive"]).optional(),
  contact_person: z.string().max(200).nullable().optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
});

const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  status: z.enum([
    "lead", "discovery", "proposal", "negotiation", "won",
    "kickoff", "in_progress", "review", "completed",
    "on_hold", "lost", "maintenance", "active",
  ]).optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

const updatePersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  team: z.string().max(200).nullable().optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

const createExtractionSchema = z.object({
  meeting_id: z.string().uuid(),
  type: z.enum(["decision", "action_item", "need", "insight"]),
  content: z.string().min(1, "Content is verplicht"),
  transcript_ref: z.string().nullable().optional(),
});

const updateExtractionSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, "Content is verplicht").optional(),
  type: z.enum(["decision", "action_item", "need", "insight"]).optional(),
  transcript_ref: z.string().nullable().optional(),
  meetingId: z.string().uuid().optional(),
});

const deleteSchema = z.object({ id: z.string().uuid() });
const deleteWithContextSchema = deleteSchema.extend({
  meetingId: z.string().uuid().optional(),
});
```

**review.ts schemas:**
```typescript
const verifyMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

const verifyMeetingWithEditsSchema = z.object({
  meetingId: z.string().uuid(),
  extractionEdits: z.array(z.object({
    extractionId: z.string().uuid(),
    content: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  rejectedExtractionIds: z.array(z.string().uuid()).optional(),
  typeChanges: z.array(z.object({
    extractionId: z.string().uuid(),
    type: z.enum(["decision", "action_item", "need", "insight"]),
  })).optional(),
});

const rejectMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
});
```

**meetings.ts schemas:**
```typescript
const updateTitleSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(1, "Titel is verplicht").max(500),
});

const updateMeetingTypeSchema = z.object({
  meetingId: z.string().min(1),
  meetingType: z.enum([
    "strategy", "one_on_one", "team_sync", "discovery",
    "sales", "project_kickoff", "status_update", "collaboration", "other",
  ]),
});

const updateOrganizationSchema = z.object({
  meetingId: z.string().min(1),
  organizationId: z.string().nullable(),
});

const meetingProjectSchema = z.object({
  meetingId: z.string().min(1),
  projectId: z.string().min(1),
});

const meetingParticipantSchema = z.object({
  meetingId: z.string().min(1),
  personId: z.string().min(1),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  type: z.enum(["client", "partner", "supplier", "other"]).optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  organizationId: z.string().nullable().optional(),
});

const createPersonSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  organizationId: z.string().nullable().optional(),
});
```

**AI validation schemas (al geexporteerd):**
- `GatekeeperSchema` uit `packages/ai/src/validations/gatekeeper.ts`
- `ExtractionItemSchema`, `ExtractorOutputSchema` uit `packages/ai/src/validations/extractor.ts`
- `SummarizerOutputSchema`, `ThemeSchema`, `ParticipantProfileSchema` uit `packages/ai/src/validations/summarizer.ts`
- `isValidDuration`, `hasParticipants` uit `packages/ai/src/validations/fireflies.ts`

**MCP pure utility functies (al geexporteerd):**
```typescript
// packages/mcp/src/tools/utils.ts
export function escapeLike(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function formatVerificatieStatus(
  verificationStatus: string | null,
  verifiedByName: string | null,
  verifiedAt: string | null,
  confidence: number | null,
  correctedBy: string | null,
): string { /* ... */ }

export function collectVerifiedByIds(items: { verified_by?: string | null }[]): string[] {
  return [...new Set(items.map((i) => i.verified_by).filter((id): id is string => id != null))];
}
```

### Testfilosofie

- **Geen mocks nodig.** Zod schemas en utility functies zijn pure functies.
- **Test met `safeParse`.** Gebruik `schema.safeParse(input)` en check `.success` en `.error`.
- **Test elke enum waarde.** Loop door alle geldige waarden en verifieer dat ze geaccepteerd worden.
- **Test grensgevallen.** Lege strings, null vs undefined, maximale lengtes, ongeldige formaten.
- **Een test per scenario.** Niet meerdere assertions combineren.

## Prerequisites

- [ ] Micro Sprint 015: Testframework Setup moet afgerond zijn

## Taken

- [ ] **Maak `apps/cockpit/src/validations/` directory met geexporteerde schemas:** Verplaats alle Zod schema-definities uit de action-bestanden naar aparte validatie-bestanden: `tasks.ts`, `entities.ts`, `review.ts`, `meetings.ts`. Exporteer elk schema. Update de action-bestanden om de schemas te importeren. Dit breekt geen functionaliteit — alleen de locatie van de definities verandert.

- [ ] **Schrijf tests voor cockpit task schemas:** Maak `apps/cockpit/__tests__/validations/tasks.test.ts` met tests voor promoteToTaskSchema, updateTaskSchema, taskIdSchema. Test geldige input, ongeldige UUIDs, lege titels, ongeldig datumformaat, optionele velden.

- [ ] **Schrijf tests voor cockpit entity schemas:** Maak `apps/cockpit/__tests__/validations/entities.test.ts` met tests voor updateOrganizationSchema, updateProjectSchema, updatePersonSchema, createExtractionSchema, updateExtractionSchema, deleteSchema. Test enum waarden, email validatie, max lengths, nullable velden.

- [ ] **Schrijf tests voor cockpit review en meeting schemas:** Maak `apps/cockpit/__tests__/validations/review.test.ts` en `apps/cockpit/__tests__/validations/meetings.test.ts`. Test alle schemas inclusief verifyMeetingWithEditsSchema (complex genest object) en de meeting type enum.

- [ ] **Schrijf tests voor AI validation schemas:** Maak `packages/ai/__tests__/validations/gatekeeper.test.ts`, `extractor.test.ts`, `summarizer.test.ts`, `fireflies.test.ts`. Test GatekeeperSchema, ExtractionItemSchema, ExtractorOutputSchema, SummarizerOutputSchema en de helper functies isValidDuration en hasParticipants.

- [ ] **Schrijf tests voor MCP pure utility functies:** Maak `packages/mcp/__tests__/utils.test.ts` met tests voor escapeLike, formatVerificatieStatus (alle 5 status varianten), en collectVerifiedByIds.

## Acceptatiecriteria

- [ ] TEST-011..041: Alle cockpit Zod schema tests slagen (31 tests)
- [ ] TEST-042..055: Alle AI validation schema tests slagen (14 tests)
- [ ] TEST-065..067: Alle MCP utility functie tests slagen (3 tests)
- [ ] Schemas zijn geexporteerd uit `apps/cockpit/src/validations/` en geimporteerd in action-bestanden
- [ ] `npm run test` slaagt zonder errors
- [ ] Elke test test een enkel scenario (geen mega-tests met 10 assertions)

## Geraakt door deze sprint

- `apps/cockpit/src/validations/tasks.ts` (nieuw)
- `apps/cockpit/src/validations/entities.ts` (nieuw)
- `apps/cockpit/src/validations/review.ts` (nieuw)
- `apps/cockpit/src/validations/meetings.ts` (nieuw)
- `apps/cockpit/src/actions/tasks.ts` (gewijzigd — import schemas)
- `apps/cockpit/src/actions/entities.ts` (gewijzigd — import schemas)
- `apps/cockpit/src/actions/review.ts` (gewijzigd — import schemas)
- `apps/cockpit/src/actions/meetings.ts` (gewijzigd — import schemas)
- `apps/cockpit/__tests__/validations/tasks.test.ts` (nieuw)
- `apps/cockpit/__tests__/validations/entities.test.ts` (nieuw)
- `apps/cockpit/__tests__/validations/review.test.ts` (nieuw)
- `apps/cockpit/__tests__/validations/meetings.test.ts` (nieuw)
- `packages/ai/__tests__/validations/gatekeeper.test.ts` (nieuw)
- `packages/ai/__tests__/validations/extractor.test.ts` (nieuw)
- `packages/ai/__tests__/validations/summarizer.test.ts` (nieuw)
- `packages/ai/__tests__/validations/fireflies.test.ts` (nieuw)
- `packages/mcp/__tests__/utils.test.ts` (nieuw)
