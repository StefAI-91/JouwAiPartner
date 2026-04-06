# Requirements Register: Testing

Gegenereerd op 2026-04-04.
Totaal: 68 requirements.

## Testframework eisen

| ID       | Beschrijving                                                         | Bron                  | Sprint |
| -------- | -------------------------------------------------------------------- | --------------------- | ------ |
| TEST-001 | Vitest als test runner (native TypeScript/ESM support)               | techdebt-scan:cat-0   | 015    |
| TEST-002 | Vitest workspace config voor monorepo (packages + apps)              | techdebt-scan:cat-0   | 015    |
| TEST-003 | Turbo `test` script in root package.json                             | techdebt-scan:cat-0   | 015    |
| TEST-004 | Turbo `test` task in turbo.json                                      | techdebt-scan:cat-0   | 015    |
| TEST-005 | Vitest config per workspace package (database, ai, mcp, cockpit)     | techdebt-scan:cat-0   | 015    |
| TEST-006 | Test utilities: database seeding helpers                             | techdebt-scan:cat-0   | 017    |
| TEST-007 | Test utilities: database cleanup helpers (teardown)                  | techdebt-scan:cat-0   | 017    |
| TEST-008 | Test utilities: auth mock helpers (getAuthenticatedUser)             | techdebt-scan:cat-0   | 017    |
| TEST-009 | Test utilities: revalidatePath mock (Next.js specifiek)              | techdebt-scan:cat-0   | 017    |
| TEST-010 | Supabase lokale testdatabase setup documentatie                      | techdebt-scan:cat-0   | 017    |

## Zod schema validatietests - cockpit actions

| ID       | Beschrijving                                                                        | Bron                              | Sprint |
| -------- | ----------------------------------------------------------------------------------- | --------------------------------- | ------ |
| TEST-011 | Test promoteToTaskSchema: geldige input met alle velden                             | actions/tasks.ts:23-29            | 016    |
| TEST-012 | Test promoteToTaskSchema: ongeldige extractionId (niet UUID)                        | actions/tasks.ts:24               | 016    |
| TEST-013 | Test promoteToTaskSchema: lege title wordt afgewezen                                | actions/tasks.ts:25               | 016    |
| TEST-014 | Test promoteToTaskSchema: ongeldig datumformaat in dueDate                          | actions/tasks.ts:17-21            | 016    |
| TEST-015 | Test promoteToTaskSchema: optionele velden (assignedTo, dueDate, alreadyDone)       | actions/tasks.ts:26-28            | 016    |
| TEST-016 | Test updateTaskSchema: geldige input met taskId                                     | actions/tasks.ts:31-36            | 016    |
| TEST-017 | Test updateTaskSchema: ongeldige taskId (niet UUID)                                 | actions/tasks.ts:32               | 016    |
| TEST-018 | Test taskIdSchema: geldige UUID                                                     | actions/tasks.ts:38-40            | 016    |
| TEST-019 | Test taskIdSchema: ongeldige waarde (lege string, geen UUID)                        | actions/tasks.ts:39               | 016    |
| TEST-020 | Test updateOrganizationSchema: geldige input met id en optionele velden             | actions/entities.ts:37-44         | 016    |
| TEST-021 | Test updateOrganizationSchema: ongeldig email-formaat                               | actions/entities.ts:43            | 016    |
| TEST-022 | Test updateOrganizationSchema: ongeldige type enum waarde                           | actions/entities.ts:40            | 016    |
| TEST-023 | Test updateProjectSchema: geldige input met alle status enum waarden                | actions/entities.ts:46-57         | 016    |
| TEST-024 | Test updatePersonSchema: geldige input met optionele velden                         | actions/entities.ts:59-66         | 016    |
| TEST-025 | Test createExtractionSchema: geldige input met alle type enum waarden               | actions/entities.ts:68-73         | 016    |
| TEST-026 | Test createExtractionSchema: lege content wordt afgewezen                           | actions/entities.ts:71            | 016    |
| TEST-027 | Test updateExtractionSchema: geldige input met optionele velden                     | actions/entities.ts:75-81         | 016    |
| TEST-028 | Test deleteSchema: geldige UUID                                                     | actions/entities.ts:83-85         | 016    |
| TEST-029 | Test verifyMeetingSchema: geldige UUID                                              | actions/review.ts:14-16           | 016    |
| TEST-030 | Test verifyMeetingWithEditsSchema: geldige input met extractionEdits en typeChanges | actions/review.ts:18-38           | 016    |
| TEST-031 | Test verifyMeetingWithEditsSchema: ongeldige type in typeChanges                    | actions/review.ts:33-35           | 016    |
| TEST-032 | Test rejectMeetingSchema: lege reason wordt afgewezen                               | actions/review.ts:41-43           | 016    |
| TEST-033 | Test updateTitleSchema: lege titel wordt afgewezen                                  | actions/meetings.ts:34-36         | 016    |
| TEST-034 | Test updateTitleSchema: titel langer dan 500 tekens wordt afgewezen                 | actions/meetings.ts:35            | 016    |
| TEST-035 | Test updateMeetingTypeSchema: alle geldige enum waarden                             | actions/meetings.ts:38-44         | 016    |
| TEST-036 | Test createOrganizationSchema: geldige input met naam en optioneel type             | actions/meetings.ts:61-64         | 016    |
| TEST-037 | Test createProjectSchema: geldige input met naam en optionele organizationId        | actions/meetings.ts:66-69         | 016    |
| TEST-038 | Test createPersonSchema: geldige input met alle velden                              | actions/meetings.ts:71-76         | 016    |
| TEST-039 | Test createPersonSchema: ongeldig email-formaat wordt afgewezen                     | actions/meetings.ts:73            | 016    |
| TEST-040 | Test meetingProjectSchema: beide velden verplicht en min 1 karakter                 | actions/meetings.ts:51-54         | 016    |
| TEST-041 | Test meetingParticipantSchema: beide velden verplicht en min 1 karakter             | actions/meetings.ts:56-59         | 016    |

## Zod schema validatietests - AI validations

| ID       | Beschrijving                                                                          | Bron                              | Sprint |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| TEST-042 | Test GatekeeperSchema: geldige output met alle meeting_type waarden                   | validations/gatekeeper.ts:20-36   | 016    |
| TEST-043 | Test GatekeeperSchema: relevance_score moet een nummer zijn                           | validations/gatekeeper.ts:22-25   | 016    |
| TEST-044 | Test GatekeeperSchema: organization_name nullable                                     | validations/gatekeeper.ts:31-35   | 016    |
| TEST-045 | Test ExtractionItemSchema: geldige item met alle type waarden                         | validations/extractor.ts:3-46     | 016    |
| TEST-046 | Test ExtractionItemSchema: confidence moet een nummer zijn                            | validations/extractor.ts:6-10     | 016    |
| TEST-047 | Test ExtractionItemSchema: nullable velden (transcript_ref, assignee, deadline, etc.) | validations/extractor.ts:11-45    | 016    |
| TEST-048 | Test ExtractorOutputSchema: geldige output met extractions en entities                | validations/extractor.ts:48-60    | 016    |
| TEST-049 | Test SummarizerOutputSchema: geldige output met alle verplichte velden                | validations/summarizer.ts:26-48   | 016    |
| TEST-050 | Test ThemeSchema: geldige theme met title, summary, quotes                            | validations/summarizer.ts:3-9     | 016    |
| TEST-051 | Test ParticipantProfileSchema: nullable velden (role, organization, stance)            | validations/summarizer.ts:11-24   | 016    |
| TEST-052 | Test isValidDuration: meeting korter dan 2 minuten is ongeldig                        | validations/fireflies.ts:1-9      | 016    |
| TEST-053 | Test isValidDuration: lege sentences array is geldig                                  | validations/fireflies.ts:5        | 016    |
| TEST-054 | Test hasParticipants: minder dan 2 deelnemers is ongeldig                             | validations/fireflies.ts:12-13    | 016    |
| TEST-055 | Test hasParticipants: undefined participants is ongeldig                               | validations/fireflies.ts:12       | 016    |

## Server Actions integratietests

| ID       | Beschrijving                                                                          | Bron                              | Sprint |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| TEST-056 | Test Server Actions: niet-ingelogde gebruiker krijgt error "Niet ingelogd"            | actions/*.ts                      | 018    |
| TEST-057 | Test promoteToTaskAction: succesvolle taak aanmaak met geldige input                  | actions/tasks.ts:54-88            | 018    |
| TEST-058 | Test promoteToTaskAction: dubbele taak voor zelfde extractie wordt geweigerd          | actions/tasks.ts:68-69            | 018    |
| TEST-059 | Test promoteToTaskAction: ongeldige input geeft validatiefout                         | actions/tasks.ts:57-60            | 018    |
| TEST-060 | Test completeTaskAction en dismissTaskAction: status wijziging                        | actions/tasks.ts:118-156          | 018    |
| TEST-061 | Test createOrganizationAction: succesvolle aanmaak                                   | actions/meetings.ts:199-216       | 018    |
| TEST-062 | Test createProjectAction: succesvolle aanmaak met organisatie koppeling               | actions/meetings.ts:220-237       | 018    |
| TEST-063 | Test createPersonAction: succesvolle aanmaak met alle velden                          | actions/meetings.ts:241-260       | 018    |
| TEST-064 | Test updateOrganizationAction/deleteOrganizationAction: CRUD cycle                   | actions/entities.ts:93-127        | 018    |

## MCP tools tests

| ID       | Beschrijving                                                                          | Bron                              | Sprint |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------- | ------ |
| TEST-065 | Test escapeLike: escaped % en _ karakters                                             | tools/utils.ts:7-9                | 016    |
| TEST-066 | Test formatVerificatieStatus: alle status varianten                                   | tools/utils.ts:51-85              | 016    |
| TEST-067 | Test collectVerifiedByIds: extraheert unieke non-null IDs                             | tools/utils.ts:116-118            | 016    |
| TEST-068 | Test createMcpServer: server registreert alle 10 tools                                | server.ts:13-31                   | 019    |

---

## Traceability Matrix

### Per sprint: welke requirements?

| Sprint | Requirements                                                          |
| ------ | --------------------------------------------------------------------- |
| 015    | TEST-001, TEST-002, TEST-003, TEST-004, TEST-005                      |
| 016    | TEST-011..055, TEST-065, TEST-066, TEST-067                           |
| 017    | TEST-006, TEST-007, TEST-008, TEST-009, TEST-010                      |
| 018    | TEST-056, TEST-057, TEST-058, TEST-059, TEST-060, TEST-061, TEST-062, TEST-063, TEST-064 |
| 019    | TEST-068                                                              |

### Niet-gedekte requirements

Alle requirements zijn gedekt.

---

## Statistieken

- Totaal requirements: 68
- Gedekt door sprints: 68 (100%)
- Niet gedekt: 0
