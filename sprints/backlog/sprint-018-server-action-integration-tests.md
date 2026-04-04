# Micro Sprint 018: Server Actions Integratietests

## Doel

Schrijf integratietests voor alle Server Actions in `apps/cockpit/src/actions/`. Deze tests gebruiken een echte Supabase testdatabase voor database-operaties en mocken alleen Next.js-specifieke functies (revalidatePath) en de auth layer. Dit is de meest waardevolle testcategorie omdat Server Actions de kernlogica van de applicatie bevatten: validatie + auth check + database mutatie + cache invalidatie.

## Requirements

| ID       | Beschrijving                                                                          |
| -------- | ------------------------------------------------------------------------------------- |
| TEST-056 | Test Server Actions: niet-ingelogde gebruiker krijgt error "Niet ingelogd"            |
| TEST-057 | Test promoteToTaskAction: succesvolle taak aanmaak met geldige input                  |
| TEST-058 | Test promoteToTaskAction: dubbele taak voor zelfde extractie wordt geweigerd          |
| TEST-059 | Test promoteToTaskAction: ongeldige input geeft validatiefout                         |
| TEST-060 | Test completeTaskAction en dismissTaskAction: status wijziging                        |
| TEST-061 | Test createOrganizationAction: succesvolle aanmaak                                   |
| TEST-062 | Test createProjectAction: succesvolle aanmaak met organisatie koppeling               |
| TEST-063 | Test createPersonAction: succesvolle aanmaak met alle velden                          |
| TEST-064 | Test updateOrganizationAction/deleteOrganizationAction: CRUD cycle                   |

## Bronverwijzingen

- Task actions: `apps/cockpit/src/actions/tasks.ts` (regels 54-156) — promoteToTaskAction, updateTaskAction, completeTaskAction, dismissTaskAction
- Entity actions: `apps/cockpit/src/actions/entities.ts` (regels 93-283) — updateOrganizationAction, deleteOrganizationAction, updateProjectAction, deleteProjectAction, updatePersonAction, deletePersonAction, createExtractionAction, updateExtractionAction, deleteExtractionAction, deleteMeetingAction
- Meeting actions: `apps/cockpit/src/actions/meetings.ts` (regels 80-260) — updateMeetingTitleAction, updateMeetingTypeAction, createOrganizationAction, createProjectAction, createPersonAction, linkMeetingProjectAction, unlinkMeetingProjectAction, linkMeetingParticipantAction, unlinkMeetingParticipantAction
- Review actions: `apps/cockpit/src/actions/review.ts` (regels 57-113) — approveMeetingAction, approveMeetingWithEditsAction, rejectMeetingAction
- Task mutations: `packages/database/src/mutations/tasks.ts` — createTaskFromExtraction, updateTask, completeTask, dismissTask
- Task queries: `packages/database/src/queries/tasks.ts` — hasTaskForExtraction
- Test helpers: `apps/cockpit/__tests__/helpers/mock-auth.ts`, `mock-next.ts` (sprint 017)
- Seed helpers: `packages/database/__tests__/helpers/seed.ts` (sprint 017)

## Context

### Teststrategie

Elke Server Action volgt hetzelfde patroon:
1. Zod validatie van input
2. Auth check (getAuthenticatedUser/getAuthenticatedUserId)
3. Business logic (database mutatie)
4. Cache invalidatie (revalidatePath)
5. Return `{ success: true }` of `{ error: string }`

De tests moeten elke stap verifiereren:
- **Ongeldige input:** Action retourneert `{ error: "..." }` met Zod foutmelding
- **Niet ingelogd:** Action retourneert `{ error: "Niet ingelogd" }` of `{ error: "Unauthorized" }`
- **Happy path:** Action retourneert `{ success: true }` en data is correct in de database
- **Business rules:** Bijv. dubbele taak voor zelfde extractie wordt geweigerd

### Mock strategie

**WEL mocken:**
- `next/cache` — `revalidatePath` wordt een no-op spy
- `@repo/database/supabase/server` — `createClient()` wordt gemocked om een test-client te retourneren die auth.getUser() controleert

**NIET mocken:**
- Database (Supabase) — gebruik echte testdatabase
- Zod schemas — pure validatie
- Mutation/query functies — deze worden meegetest (dat is het punt van integratietests)

### Database state per test

Elke test suite (describe block) moet:
- `beforeEach`: seed de benodigde testdata (organisatie, project, persoon, meeting, extraction)
- `afterEach`: cleanup alle testdata

De seed data gebruikt deterministic UUIDs:
```
Test Org:        00000000-0000-0000-0000-000000000001
Test Project:    00000000-0000-0000-0000-000000000002
Test Person:     00000000-0000-0000-0000-000000000003
Test Meeting:    00000000-0000-0000-0000-000000000004
Test Extraction: 00000000-0000-0000-0000-000000000005
Test User ID:    00000000-0000-0000-0000-000000000099
```

### Server Action signaturen (exacte code)

**tasks.ts:**
```typescript
export async function promoteToTaskAction(
  input: z.infer<typeof promoteToTaskSchema>,
): Promise<{ success: true; id: string } | { error: string }>

export async function updateTaskAction(
  input: z.infer<typeof updateTaskSchema>,
): Promise<{ success: true } | { error: string }>

export async function completeTaskAction(
  input: z.infer<typeof taskIdSchema>,
): Promise<{ success: true } | { error: string }>

export async function dismissTaskAction(
  input: z.infer<typeof taskIdSchema>,
): Promise<{ success: true } | { error: string }>
```

**meetings.ts:**
```typescript
export async function createOrganizationAction(
  input: z.infer<typeof createOrganizationSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }>

export async function createProjectAction(
  input: z.infer<typeof createProjectSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }>

export async function createPersonAction(
  input: z.infer<typeof createPersonSchema>,
): Promise<{ success: true; data: { id: string; name: string } } | { error: string }>
```

**entities.ts:**
```typescript
export async function updateOrganizationAction(
  input: z.infer<typeof updateOrganizationSchema>,
): Promise<{ success: true } | { error: string }>

export async function deleteOrganizationAction(
  input: z.infer<typeof deleteSchema>,
): Promise<{ success: true } | { error: string }>
```

**review.ts:**
```typescript
export async function approveMeetingAction(
  input: z.infer<typeof verifyMeetingSchema>,
): Promise<{ success: true } | { error: string }>

export async function rejectMeetingAction(
  input: z.infer<typeof rejectMeetingSchema>,
): Promise<{ success: true } | { error: string }>
```

### Business rules uit de code

- **RULE-TASK-DUP:** `promoteToTaskAction` checkt `hasTaskForExtraction()` — als er al een taak bestaat voor de extractie, retourneert het `{ error: "Er bestaat al een taak voor dit actiepunt" }` (tasks.ts:68-69)
- **RULE-TASK-DONE:** Als `alreadyDone: true`, wordt de taak direct aangemaakt met status "done" en `completed_at` timestamp (mutations/tasks.ts:19-29)
- **RULE-EXTRACTION-MANUAL:** `createExtractionAction` zet altijd `confidence: 1.0` en `verification_status: "verified"` voor handmatige extracties (entities.ts:219-220)

## Prerequisites

- [ ] Micro Sprint 015: Testframework Setup moet afgerond zijn
- [ ] Micro Sprint 017: Test Utilities en Database Setup moet afgerond zijn

## Taken

- [ ] **Schrijf task action tests:** Maak `apps/cockpit/__tests__/actions/tasks.test.ts`. Test: (1) promoteToTaskAction met geldige input creëert taak in DB, (2) promoteToTaskAction met ongeldige input retourneert error, (3) promoteToTaskAction zonder auth retourneert "Niet ingelogd", (4) dubbele taak voor zelfde extractie wordt geweigerd, (5) completeTaskAction zet status op "done", (6) dismissTaskAction zet status op "dismissed".

- [ ] **Schrijf entity CRUD action tests:** Maak `apps/cockpit/__tests__/actions/entities.test.ts`. Test: (1) updateOrganizationAction wijzigt naam, (2) deleteOrganizationAction verwijdert organisatie, (3) createExtractionAction maakt extraction met confidence 1.0 en status "verified", (4) alle actions retourneren "Niet ingelogd" zonder auth.

- [ ] **Schrijf meeting action tests:** Maak `apps/cockpit/__tests__/actions/meetings.test.ts`. Test: (1) createOrganizationAction maakt organisatie en retourneert id+name, (2) createProjectAction met organizationId koppelt project aan org, (3) createPersonAction met alle velden, (4) updateMeetingTitleAction wijzigt titel in DB, (5) alle actions retourneren "Niet ingelogd" zonder auth.

- [ ] **Schrijf review action tests:** Maak `apps/cockpit/__tests__/actions/review.test.ts`. Test: (1) approveMeetingAction zet verification_status op "verified", (2) rejectMeetingAction zet status en slaat reason op, (3) alle actions retourneren "Unauthorized" zonder auth.

## Acceptatiecriteria

- [ ] TEST-056: Elke Server Action retourneert fout bij niet-ingelogde gebruiker (minimaal 1 test per action bestand)
- [ ] TEST-057: promoteToTaskAction creëert taak in de database met correcte velden
- [ ] TEST-058: Dubbele taak voor zelfde extractie retourneert error "Er bestaat al een taak voor dit actiepunt"
- [ ] TEST-059: Ongeldige input (lege title, niet-UUID) retourneert validatiefout
- [ ] TEST-060: completeTaskAction zet status op "done" met completed_at; dismissTaskAction zet status op "dismissed"
- [ ] TEST-061: createOrganizationAction retourneert { success: true, data: { id, name } }
- [ ] TEST-062: createProjectAction met organizationId koppelt project aan organisatie in DB
- [ ] TEST-063: createPersonAction creëert persoon met alle velden in DB
- [ ] TEST-064: updateOrganizationAction wijzigt velden; deleteOrganizationAction verwijdert record
- [ ] Alle tests ruimen hun testdata op (geen vervuiling tussen tests)
- [ ] `npm run test` slaagt inclusief alle eerdere tests

## Geraakt door deze sprint

- `apps/cockpit/__tests__/actions/tasks.test.ts` (nieuw)
- `apps/cockpit/__tests__/actions/entities.test.ts` (nieuw)
- `apps/cockpit/__tests__/actions/meetings.test.ts` (nieuw)
- `apps/cockpit/__tests__/actions/review.test.ts` (nieuw)
