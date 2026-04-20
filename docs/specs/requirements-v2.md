# Requirements Register: v2 — Review & Dashboard

Gegenereerd uit `docs/specs/v2-review-dashboard.md` op 2026-03-31.
Totaal: 98 requirements.

> **Last verified:** 2026-04-20 (Q4b, steekproef-strategie per Q4a-5).
> **Bekende drift:** middel — review-flow grotendeels nog geldig, maar segmented summaries + board meetings (sprints 020-028, 035) hebben requirements toegevoegd die niet in dit register staan.

---

## Functionele eisen

| ID       | Beschrijving                                                                                                                    | Bron                       | Sprint |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| FUNC-001 | Turborepo monorepo opzetten met turbo.json en workspace package.json                                                            | v2-review-dashboard.md:449 | 008    |
| FUNC-002 | apps/cockpit/ aanmaken — app code verplaatsen (app/, components/, actions/, middleware, next.config)                            | v2-review-dashboard.md:450 | 008    |
| FUNC-003 | packages/database/ aanmaken — supabase clients, queries, validations, types verplaatsen                                         | v2-review-dashboard.md:451 | 008    |
| FUNC-004 | packages/ai/ aanmaken — agents, embeddings, pipeline code verplaatsen                                                           | v2-review-dashboard.md:452 | 008    |
| FUNC-005 | packages/mcp/ aanmaken — MCP server en tools verplaatsen                                                                        | v2-review-dashboard.md:453 | 008    |
| FUNC-006 | Alle imports bijwerken naar nieuwe monorepo paden (@repo/database, @repo/ai, etc.)                                              | v2-review-dashboard.md:454 | 008    |
| FUNC-007 | CLAUDE.md bijwerken met nieuwe project structuur                                                                                | v2-review-dashboard.md:455 | 008    |
| FUNC-008 | Pipeline update: nieuwe meetings/extractions starten als 'draft'                                                                | v2-review-dashboard.md:471 | 009    |
| FUNC-009 | Supabase types regenereren na migratie                                                                                          | v2-review-dashboard.md:477 | 009    |
| FUNC-010 | Review queue pagina (/review) — lijst van draft meetings als cards                                                              | v2-review-dashboard.md:497 | 010    |
| FUNC-011 | Review detail pagina (/review/[id]) — split layout: transcript links, extracties rechts                                         | v2-review-dashboard.md:498 | 010    |
| FUNC-012 | Quick approve: meeting + alle extracties naar 'verified'                                                                        | v2-review-dashboard.md:505 | 010    |
| FUNC-013 | Open detail, bewerk extracties, dan approve                                                                                     | v2-review-dashboard.md:507 | 010    |
| FUNC-014 | Reject meeting met reden — meeting + extracties naar 'rejected'                                                                 | v2-review-dashboard.md:508 | 010    |
| FUNC-015 | Inline editing van extractie content in review detail                                                                           | v2-review-dashboard.md:498 | 010    |
| FUNC-016 | Badge count in nav bar die update na approve/reject                                                                             | v2-review-dashboard.md:510 | 010    |
| FUNC-017 | Meeting detail pagina (/meetings/[id]) — read-only split layout                                                                 | v2-review-dashboard.md:523 | 011    |
| FUNC-018 | Verification badge: "Verified by [name] on [date]"                                                                              | v2-review-dashboard.md:524 | 011    |
| FUNC-019 | Shared components hergebruiken van review queue (extraction card, confidence bar, source attribution)                           | v2-review-dashboard.md:525 | 011    |
| FUNC-020 | Meeting query functie in packages/database                                                                                      | v2-review-dashboard.md:526 | 011    |
| FUNC-021 | Projects overview pagina (/projects) — project cards met status pipeline                                                        | v2-review-dashboard.md:547 | 012    |
| FUNC-022 | Project detail pagina (/projects/[id]) — header met status pipeline, secties: meetings, action items, decisions, needs/insights | v2-review-dashboard.md:548 | 012    |
| FUNC-023 | Project query functies in packages/database                                                                                     | v2-review-dashboard.md:549 | 012    |
| FUNC-024 | Dashboard home (/) — review attention zone, project cards, recent meetings, open action items                                   | v2-review-dashboard.md:568 | 013    |
| FUNC-025 | Clients pagina (/clients) — organization list met type badge, status, project count, last contact                               | v2-review-dashboard.md:569 | 013    |
| FUNC-026 | Client detail pagina (/clients/[id]) — overview met linked projects en meetings                                                 | v2-review-dashboard.md:570 | 013    |
| FUNC-027 | People pagina (/people) — team members en contacts                                                                              | v2-review-dashboard.md:571 | 013    |
| FUNC-028 | MCP tools: default filter verification_status = 'verified'                                                                      | v2-review-dashboard.md:590 | 014    |
| FUNC-029 | MCP tools: optionele include_drafts parameter                                                                                   | v2-review-dashboard.md:591 | 014    |
| FUNC-030 | MCP tools: verification status tonen in output                                                                                  | v2-review-dashboard.md:592 | 014    |
| FUNC-031 | search_all_content() SQL functie updaten met verification filter                                                                | v2-review-dashboard.md:593 | 014    |
| FUNC-032 | MCP tool descriptions updaten voor LLM clients                                                                                  | v2-review-dashboard.md:594 | 014    |
| FUNC-033 | platform-spec.md en MILESTONES.md updaten voor v2 completion                                                                    | v2-review-dashboard.md:595 | 014    |

## Datamodel eisen

| ID       | Beschrijving                                                                                                       | Bron                           | Sprint |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------ |
| DATA-001 | meetings: kolom verification_status (TEXT NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'verified', 'rejected'))    | v2-review-dashboard.md:125     | 009    |
| DATA-002 | meetings: kolom verified_by (UUID REFERENCES profiles(id))                                                         | v2-review-dashboard.md:126     | 009    |
| DATA-003 | meetings: kolom verified_at (TIMESTAMPTZ)                                                                          | v2-review-dashboard.md:127     | 009    |
| DATA-004 | Index idx_meetings_verification_status op meetings(verification_status)                                            | v2-review-dashboard.md:129     | 009    |
| DATA-005 | Migratie bestaande meetings: verification_status = 'verified', verified_at = now()                                 | v2-review-dashboard.md:132-135 | 009    |
| DATA-006 | extractions: kolom verification_status (TEXT NOT NULL DEFAULT 'draft', CHECK IN ('draft', 'verified', 'rejected')) | v2-review-dashboard.md:144     | 009    |
| DATA-007 | extractions: kolom verified_by (UUID REFERENCES profiles(id))                                                      | v2-review-dashboard.md:145     | 009    |
| DATA-008 | extractions: kolom verified_at (TIMESTAMPTZ)                                                                       | v2-review-dashboard.md:146     | 009    |
| DATA-009 | Index idx_extractions_verification_status op extractions(verification_status)                                      | v2-review-dashboard.md:148     | 009    |
| DATA-010 | Migratie bestaande extractions: verification_status = 'verified', verified_at = now()                              | v2-review-dashboard.md:150-153 | 009    |

## Rollen en permissies

| ID       | Beschrijving                                                                 | Bron                           | Sprint |
| -------- | ---------------------------------------------------------------------------- | ------------------------------ | ------ |
| AUTH-001 | API routes vereisen authenticatie (Supabase session)                         | v2-review-dashboard.md:176-187 | 009    |
| AUTH-002 | Server Actions beschermd door Supabase session cookies                       | v2-review-dashboard.md:176     | 010    |
| AUTH-003 | Pipeline (webhook, cron, agents) gebruikt admin client                       | v2-review-dashboard.md:211     | 009    |
| AUTH-004 | Dashboard pages (Server Components) gebruiken server client met user session | v2-review-dashboard.md:209     | 010    |
| AUTH-005 | MCP tools gebruiken admin client (apart process)                             | v2-review-dashboard.md:212     | 014    |

## UI/UX eisen

| ID     | Beschrijving                                                                                                                                                                                                  | Bron                           | Sprint |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| UI-001 | Light theme (bevestigd)                                                                                                                                                                                       | v2-review-dashboard.md:238     | 010    |
| UI-002 | Background: subtiel gradient (#fdfbfb naar #ebedee)                                                                                                                                                           | v2-review-dashboard.md:239     | 010    |
| UI-003 | Fonts: Fredoka (headlines, warm + rounded), Nunito (body, clean + readable)                                                                                                                                   | v2-review-dashboard.md:240     | 010    |
| UI-004 | Primary color: #006B3F (brand green, NIET purple van prototype)                                                                                                                                               | v2-review-dashboard.md:241     | 010    |
| UI-005 | Border radius: rounded/bubble (2rem voor cards, full voor buttons en badges)                                                                                                                                  | v2-review-dashboard.md:242     | 010    |
| UI-006 | Bottom nav bar (fixed, centered, frosted glass effect) met 6 items                                                                                                                                            | v2-review-dashboard.md:243     | 010    |
| UI-007 | Nav items: Home (dashboard), Review (rate_review + badge count), Projects (folder_open), Meetings (calendar_today), Clients (corporate_fare), People (group)                                                  | v2-review-dashboard.md:249-255 | 010    |
| UI-008 | Active nav item: brand green background, white icon, rounded-full met shadow                                                                                                                                  | v2-review-dashboard.md:257     | 010    |
| UI-009 | Extraction type kleuren: Decisions=Blue #3B82F6, Action items=Green #16A34A, Needs=Purple #A855F7, Insights=Gray #6B7280                                                                                      | v2-review-dashboard.md:262-267 | 010    |
| UI-010 | Meeting type badge kleuren per type (sales=blue, discovery=purple, etc.)                                                                                                                                      | v2-review-dashboard.md:270-277 | 010    |
| UI-011 | Confidence indicators per extraction in detail view only (>0.8=Green #006B3F, 0.5-0.8=Amber #F59E0B, <0.5=Red #EF4444) — NOT on queue cards                                                                   | v2-review-dashboard.md:280-284 | 010    |
| UI-012 | Empty state: mascot (rounded white square met dot-eyes) + chat-bubble message                                                                                                                                 | v2-review-dashboard.md:288     | 010    |
| UI-013 | Empty state: toont real stats ("5 verified today, 142 total")                                                                                                                                                 | v2-review-dashboard.md:288     | 010    |
| UI-014 | Empty state: filter pills om verified content te revisiten per org, meeting type, party type                                                                                                                  | v2-review-dashboard.md:288     | 010    |
| UI-015 | Review queue cards: metadata row (org + type + party + time ago), title, participant names (via people join), extraction summary as colored dots with counts, approve/review buttons — NO confidence on cards | v2-review-dashboard.md:293     | 010    |
| UI-016 | Cards vary visually: more extractions = more height                                                                                                                                                           | v2-review-dashboard.md:294     | 010    |
| UI-017 | Review detail: split layout (55% transcript links, 45% extracties rechts)                                                                                                                                     | v2-review-dashboard.md:295     | 010    |
| UI-018 | Review detail: inline editing, sticky bottom action bar                                                                                                                                                       | v2-review-dashboard.md:295     | 010    |
| UI-019 | Meeting detail: read-only, zelfde split layout als review                                                                                                                                                     | v2-review-dashboard.md:299     | 011    |
| UI-020 | Meeting detail: verification badge "Verified by [name] on [date]"                                                                                                                                             | v2-review-dashboard.md:300     | 011    |
| UI-021 | Meeting detail: transcript met highlighted quotes matching extraction transcript_refs                                                                                                                         | v2-review-dashboard.md:301     | 011    |
| UI-022 | Projects overview: cards met project name, client, status als visual pipeline indicator, last meeting, open action count                                                                                      | v2-review-dashboard.md:305     | 012    |
| UI-023 | Project detail: header met status pipeline, tabbed sections (meetings, action items, decisions, needs/insights)                                                                                               | v2-review-dashboard.md:306     | 012    |
| UI-024 | Dashboard top: attention zone met review count, kleur indiceert urgency (green=0, amber=few, red=many)                                                                                                        | v2-review-dashboard.md:308     | 013    |
| UI-025 | Dashboard middle: project cards met name, client, status, open actions, last meeting                                                                                                                          | v2-review-dashboard.md:309     | 013    |
| UI-026 | Dashboard bottom: twee kolommen — recent verified meetings (links), open action items across projects (rechts)                                                                                                | v2-review-dashboard.md:310     | 013    |
| UI-027 | Shadows: soft en subtle (shadow-sm voor cards, shadow-xl voor feature elements)                                                                                                                               | v2-review-dashboard.md:244     | 010    |

## Business rules

| ID       | Beschrijving                                                                                                                                      | Bron                                        | Sprint |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| RULE-001 | Quick approve zet meeting + ALLE extracties naar 'verified'                                                                                       | v2-review-dashboard.md:328                  | 010    |
| RULE-002 | Reject zet meeting + extracties naar 'rejected' met reden                                                                                         | v2-review-dashboard.md:329                  | 010    |
| RULE-003 | Nieuwe pipeline content start als 'draft'                                                                                                         | v2-review-dashboard.md:319-322              | 009    |
| RULE-004 | Bestaande meetings/extractions migreren naar 'verified' (zijn impliciet goedgekeurd)                                                              | v2-review-dashboard.md:131-135              | 009    |
| RULE-005 | MCP tools filteren standaard op verification_status = 'verified'                                                                                  | v2-review-dashboard.md:414                  | 014    |
| RULE-006 | MCP tools accepteren optionele include_drafts parameter voor intern gebruik                                                                       | v2-review-dashboard.md:418-421              | 014    |
| RULE-007 | Migratiestrategie: kolommen toevoegen → bestaande data migreren → pipeline updaten → UI deployen → MCP updaten (deze volgorde voor zero downtime) | v2-review-dashboard.md:160-168              | 009    |
| RULE-008 | Review queue toont draft meetings, nieuwste eerst                                                                                                 | v2-review-dashboard.md:385                  | 010    |
| RULE-009 | Tone: warm, professional, casual English — "a calm colleague who has your back". Entire UI in English, content stays in original language         | v2-review-dashboard.md:229-231              | 010    |
| RULE-010 | Mascot verschijnt ALLEEN in empty states en key moments, niet op elke pagina                                                                      | v2-review-dashboard.md:288 (style-guide:19) | 010    |
| RULE-011 | Project status waarden: lead, discovery, proposal, negotiation, won, kickoff, in_progress, review, completed, on_hold, lost, maintenance          | platform-spec.md:184-186                    | 012    |

## Security eisen

| ID      | Beschrijving                                                                                                            | Bron                           | Sprint |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| SEC-001 | Auth op alle API routes — getUser() check, 401 bij geen user                                                            | v2-review-dashboard.md:176-187 | 009    |
| SEC-002 | CRON_SECRET verplicht — falen als env var ontbreekt OF token niet klopt                                                 | v2-review-dashboard.md:192-199 | 009    |
| SEC-003 | Security headers in next.config.ts: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Referrer-Policy | v2-review-dashboard.md:203-204 | 009    |
| SEC-004 | Server client voor dashboard queries, NIET admin client                                                                 | v2-review-dashboard.md:207-213 | 009    |
| SEC-005 | SQL injection fix: whitelist voor table parameter in dynamic queries                                                    | v2-review-dashboard.md:216-217 | 009    |

## Performance eisen

| ID       | Beschrijving                                                                     | Bron                           | Sprint |
| -------- | -------------------------------------------------------------------------------- | ------------------------------ | ------ |
| PERF-001 | Zero downtime tijdens migratie — volgorde: kolommen → data → pipeline → UI → MCP | v2-review-dashboard.md:160-168 | 009    |

## Integraties

| ID      | Beschrijving                                                                   | Bron                           | Sprint |
| ------- | ------------------------------------------------------------------------------ | ------------------------------ | ------ |
| INT-001 | search_all_content() SQL functie krijgt verified_only parameter (default true) | v2-review-dashboard.md:437-438 | 014    |

## Edge cases

| ID       | Beschrijving                                                                          | Bron                                 | Sprint |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------ | ------ |
| EDGE-001 | 404 voor niet-bestaand meeting ID                                                     | v2-review-dashboard.md:533           | 011    |
| EDGE-002 | Empty states met appropriate messaging voor projects (geen mascot, clean empty state) | v2-review-dashboard.md:555           | 012    |
| EDGE-003 | loading.tsx en error.tsx voor elke feature-route                                      | v2-review-dashboard.md:527, 550, 572 | 011    |

## Validatie eisen

| ID      | Beschrijving                                                                           | Bron                           | Sprint |
| ------- | -------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| VAL-001 | Zod schema: verifyMeetingSchema — meetingId: z.string().uuid()                         | v2-review-dashboard.md:336-338 | 010    |
| VAL-002 | Zod schema: verifyMeetingWithEditsSchema — meetingId + optioneel extractionEdits array | v2-review-dashboard.md:341-348 | 010    |
| VAL-003 | Zod schema: rejectMeetingSchema — meetingId + reason (min 1 char)                      | v2-review-dashboard.md:351-354 | 010    |

---

## Statistieken

- Totaal requirements: 98
- Gedekt door sprints: 98 (100%)
- Niet gedekt: 0

---

## Traceability Matrix

### Per sprint: welke requirements?

| Sprint | Titel                               | Requirements                                                                                       |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| 008    | Monorepo Setup                      | FUNC-001..007                                                                                      |
| 009    | Database Migration + Security Fixes | DATA-001..010, FUNC-008..009, SEC-001..005, AUTH-001, AUTH-003, RULE-003..004, RULE-007, PERF-001  |
| 010    | Review Queue                        | FUNC-010..016, UI-001..018, UI-027, RULE-001..002, RULE-008..010, VAL-001..003, AUTH-002, AUTH-004 |
| 011    | Meeting Detail                      | FUNC-017..020, UI-019..021, EDGE-001, EDGE-003                                                     |
| 012    | Projects Overview + Detail          | FUNC-021..023, UI-022..023, RULE-011, EDGE-002                                                     |
| 013    | Dashboard + Clients + People        | FUNC-024..027, UI-024..026                                                                         |
| 014    | MCP Verification Filter             | FUNC-028..033, RULE-005..006, AUTH-005, INT-001                                                    |

### Niet-gedekte requirements

Geen. Alle 98 requirements zijn gedekt.
