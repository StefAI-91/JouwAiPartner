# Sprint 011: Meeting Detail (v2-004)

## Doel

Het team kan geverifieerde meetings bekijken met transcript en extracties in een read-only weergave. Dit hergebruikt de componenten uit de review queue (sprint 010) maar dan zonder edit-functionaliteit. Een verification badge toont wie de meeting heeft geverifieerd en wanneer. Transcript highlights matchen extraction transcript_refs.

## Requirements

| ID       | Beschrijving                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------- |
| FUNC-017 | Meeting detail pagina (/meetings/[id]) — read-only split layout                                       |
| FUNC-018 | Verification badge: "Verified by [name] on [date]"                                                    |
| FUNC-019 | Shared components hergebruiken van review queue (extraction card, confidence bar, source attribution) |
| FUNC-020 | Meeting query functie in packages/database                                                            |
| UI-019   | Meeting detail: read-only, zelfde split layout als review                                             |
| UI-020   | Meeting detail: verification badge                                                                    |
| UI-021   | Meeting detail: transcript met highlighted quotes matching extraction transcript_refs                 |
| EDGE-001 | 404 voor niet-bestaand meeting ID                                                                     |
| EDGE-003 | loading.tsx en error.tsx voor elke feature-route                                                      |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-004" (regels 516-535)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "7. Dashboard Pages — Meeting Detail" (regels 390-392)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "5.6 Design Per Sprint — v2-004" (regels 298-301)

## Context

### Relevante business rules

Er zijn geen specifieke business rules voor deze sprint. De meeting detail is een read-only weergave van al geverifieerde content.

### Datamodel

Query haalt op uit:

- `meetings` — title, date, meeting_type, party_type, transcript, verification_status, verified_by, verified_at
- `profiles` (via verified_by JOIN) — full_name voor verification badge
- `organizations` (via organization_id JOIN) — name
- `extractions` (via meeting_id) — type, content, confidence, transcript_ref, metadata, verification_status
- `meeting_participants` + `people` (via JOIN) — participant names (full_name, resolved from emails)

### UI/UX beschrijving

**Layout:** Zelfde split layout als review detail maar read-only:

- Links 55%: meeting metadata + transcript
- Rechts 45%: extracties gegroepeerd per type

**Verification badge:**

- "Verified by Stef Banninga on March 16, 2026"
- Badge stijl: subtle, niet prominent — het is bevestiging, niet het hoofdonderwerp

**Transcript panel:**

- Clean reading experience (Nunito, base size, generous line-height)
- Highlighted quotes: `bg-yellow-100/50` subtle achtergrond op transcript_ref matches
- Participants als pills bovenaan

**Extractie cards (rechts):**

- Gegroepeerd per type met section headers (Decisions, Action Items, Needs, Insights)
- Elke card: thin left border in type kleur (blue/green/purple/gray)
- Content text is NIET editable (read-only, anders dan review detail)
- Confidence bar thin en subtle onder elke card
- Transcript ref als indented blockquote in lichter text

**Hergebruikte componenten uit sprint 010:**

- `extraction-card.tsx` (met read-only mode)
- `confidence-bar.tsx`
- `meeting-type-badge.tsx`
- Transcript highlighting logica

### Edge cases en foutafhandeling

- **EDGE-001**: Niet-bestaand meeting ID -> 404 pagina (Next.js notFound())
- **EDGE-003**: loading.tsx voor Suspense fallback, error.tsx voor error boundary
- Meeting zonder extracties: toon rechts "No extractions" bericht
- Meeting zonder transcript: toon links "No transcript available"

## Prerequisites

- [ ] Sprint 010: Review Queue moet afgerond zijn (componenten worden hergebruikt)

## Taken

- [ ] Meeting query functie schrijven in `packages/database/src/queries/meetings.ts` — meeting + extracties + org + participants + verifier profile ophalen
- [ ] Meeting detail pagina bouwen: `/meetings/[id]/page.tsx` — Server Component, data ophalen via query, split layout renderen
- [ ] Verification badge component: "Verified by [name] on [date]" — hergebruikt profiles data
- [ ] Shared extraction-card uitbreiden met read-only mode prop (geen edit buttons/inline editing)
- [ ] loading.tsx + error.tsx + 404 handling voor /meetings/[id]

## Acceptatiecriteria

- [ ] [FUNC-017] Navigeren naar geverifieerde meeting toont full transcript en extracties in split layout
- [ ] [FUNC-018] Verification badge toont "Verified by [naam] on [datum]" correct
- [ ] [FUNC-019] Extraction card, confidence bar en source attribution zijn hergebruikt van review queue
- [ ] [FUNC-020] Meeting query functie bestaat in packages/database en selecteert alleen benodigde kolommen
- [ ] [UI-021] Extracties tonen confidence bar, transcript_ref als highlighted quote, type kleur
- [ ] [EDGE-001] Niet-bestaand meeting ID geeft 404 pagina
- [ ] [EDGE-003] loading.tsx toont skeleton/spinner, error.tsx toont foutmelding

## Geraakt door deze sprint

- `packages/database/src/queries/meetings.ts` (nieuw of gewijzigd)
- `apps/cockpit/src/app/(dashboard)/meetings/[id]/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/meetings/[id]/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/meetings/[id]/error.tsx` (nieuw)
- `apps/cockpit/src/components/shared/verification-badge.tsx` (nieuw)
- `apps/cockpit/src/components/review/extraction-card.tsx` (gewijzigd — read-only mode prop)
