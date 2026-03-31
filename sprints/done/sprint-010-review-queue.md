# Sprint 010: Review Queue (v2-003)

## Doel

Het team kan binnenkomende meetings visueel verifiëren via een review queue. Dit is het hart van het verificatiemodel: content wordt beoordeeld voordat het queryable truth wordt. De queue toont draft meetings als gestylde cards. Reviewers kunnen quick approven, detail bekijken met inline editing, of rejecten met reden. Dit is ook de sprint waar de visuele fundatie van het cockpit wordt gelegd (bottom nav, kleuren, fonts, design tokens).

## Requirements

| ID       | Beschrijving                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FUNC-010 | Review queue pagina (/review) — lijst van draft meetings als cards                                                                                                      |
| FUNC-011 | Review detail pagina (/review/[id]) — split layout: transcript links, extracties rechts                                                                                 |
| FUNC-012 | Quick approve: meeting + alle extracties naar 'verified'                                                                                                                |
| FUNC-013 | Open detail, bewerk extracties, dan approve                                                                                                                             |
| FUNC-014 | Reject meeting met reden — meeting + extracties naar 'rejected'                                                                                                         |
| FUNC-015 | Inline editing van extractie content in review detail                                                                                                                   |
| FUNC-016 | Badge count in nav bar die update na approve/reject                                                                                                                     |
| UI-001   | Light theme (bevestigd)                                                                                                                                                 |
| UI-002   | Background: subtiel gradient (#fdfbfb naar #ebedee)                                                                                                                     |
| UI-003   | Fonts: Fredoka (headlines), Nunito (body)                                                                                                                               |
| UI-004   | Primary color: #006B3F (brand green)                                                                                                                                    |
| UI-005   | Border radius: rounded/bubble (2rem cards, full buttons/badges)                                                                                                         |
| UI-006   | Bottom nav bar (fixed, centered, frosted glass effect) met 6 items                                                                                                      |
| UI-007   | Nav items: Home, Review (+badge), Projects, Meetings, Clients, People                                                                                                   |
| UI-008   | Active nav item: brand green bg, white icon, rounded-full met shadow                                                                                                    |
| UI-009   | Extraction type kleuren: Decisions=Blue, Actions=Green, Needs=Purple, Insights=Gray                                                                                     |
| UI-010   | Meeting type badge kleuren per type                                                                                                                                     |
| UI-011   | Confidence indicators: per extraction in detail view only (>0.8=Green, 0.5-0.8=Amber, <0.5=Red) — NOT on queue cards                                                    |
| UI-012   | Empty state: mascot + chat-bubble message                                                                                                                               |
| UI-013   | Empty state: toont real stats                                                                                                                                           |
| UI-014   | Empty state: filter pills                                                                                                                                               |
| UI-015   | Review cards: metadata (org + type + party + time ago), title, participant names (via people join), extraction summary, approve/review buttons — NO confidence on cards |
| UI-016   | Cards vary visually: more extractions = more height                                                                                                                     |
| UI-017   | Review detail: split layout 55%/45%                                                                                                                                     |
| UI-018   | Review detail: inline editing, sticky bottom action bar                                                                                                                 |
| UI-027   | Shadows: soft en subtle                                                                                                                                                 |
| RULE-001 | Quick approve zet meeting + ALLE extracties naar 'verified'                                                                                                             |
| RULE-002 | Reject zet meeting + extracties naar 'rejected' met reden                                                                                                               |
| RULE-008 | Review queue toont draft meetings, nieuwste eerst                                                                                                                       |
| RULE-009 | Tone: warm, professional, Dutch-casual                                                                                                                                  |
| RULE-010 | Mascot verschijnt ALLEEN in empty states                                                                                                                                |
| VAL-001  | Zod schema: verifyMeetingSchema                                                                                                                                         |
| VAL-002  | Zod schema: verifyMeetingWithEditsSchema                                                                                                                                |
| VAL-003  | Zod schema: rejectMeetingSchema                                                                                                                                         |
| AUTH-002 | Server Actions beschermd door Supabase session cookies                                                                                                                  |
| AUTH-004 | Dashboard pages gebruiken server client met user session                                                                                                                |

## Bronverwijzingen

- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "6. Review Queue" (regels 314-355)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "7. Dashboard Pages" (regels 357-408) — /review routes
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "5. Design Direction" (regels 222-310)
- PRD: `docs/specs/v2-review-dashboard.md` -> sectie "9. Sprints — v2-003" (regels 489-511)
- Style guide: `docs/specs/style-guide.md` -> alle secties (regels 1-308)
- Prototype: `docs/specs/revieuw-que.html`

## Context

### Relevante business rules

- **RULE-001**: "Quick approve zet meeting + ALLE extracties naar 'verified'. Eén klik op 'Approve' op de queue card verifieert de meeting en al zijn extracties in één transactie."
- **RULE-002**: "Reject zet meeting + extracties naar 'rejected' met reden. De reden is verplicht (min 1 karakter). Alle extracties van die meeting worden ook rejected."
- **RULE-008**: "Review queue toont draft meetings, nieuwste eerst. Sortering op meetings.date DESC."
- **RULE-009**: "Tone is warm, professional, casual English. 'A calm colleague who has your back.' Good: 'All caught up' / '8 meetings awaiting review'. Bad: 'Your intelligent queue prioritizes entries with high decision-impact'. Entire UI in English, content (transcripts, extractions) stays in original language."
- **RULE-010**: "Mascot (rounded white square met dot-eyes) verschijnt ALLEEN in empty states en key moments, niet op elke pagina."

### Datamodel

Gebruikt de in sprint 009 toegevoegde kolommen:

- `meetings.verification_status` ('draft' | 'verified' | 'rejected')
- `meetings.verified_by` (UUID FK -> profiles)
- `meetings.verified_at` (TIMESTAMPTZ)
- `extractions.verification_status` (idem)
- `extractions.verified_by` (idem)
- `extractions.verified_at` (idem)

Bestaande kolommen die de UI nodig heeft:

- `meetings.title`, `meetings.date`, `meetings.meeting_type`, `meetings.party_type`, `meetings.transcript`
- `meetings.organization_id` -> `organizations.name` (JOIN)
- `meeting_participants` -> `people.name` (JOIN) — for participant names on cards
- `extractions.type`, `extractions.content`, `extractions.confidence`, `extractions.transcript_ref`, `extractions.metadata`

### Server Actions en Zod schemas

```typescript
// Quick approve
verifyMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

// Approve met edits
verifyMeetingWithEditsSchema = z.object({
  meetingId: z.string().uuid(),
  extractionEdits: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        content: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
});

// Reject
rejectMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().min(1),
});
```

### UI/UX beschrijving

**App shell — bottom nav bar:**

- Position: fixed bottom-6, centered
- Background: white/80 met backdrop-blur (frosted glass)
- Border-radius: rounded-full
- Shadow: shadow-2xl
- 6 items: Home (dashboard), Review (rate_review + badge count), Projects (folder_open), Meetings (calendar_today), Clients (corporate_fare), People (group)
- Active item: bg-[#006B3F] text-white rounded-full met shadow

**Design tokens (globals.css):**

- Background gradient: #fdfbfb naar #ebedee
- Primary: #006B3F
- Fonts: Fredoka (headlines), Nunito (body)
- Card radius: 2rem, button/badge radius: full
- Shadows: shadow-sm (cards), shadow-xl (feature elements)

**Review queue cards:**

```
+----------------------------------------------------------------+
|                                                                |
|  Ordus . discovery . client              [3 hours ago]         |
|                                                                |
|  Discovery call Q2 planning                                    |
|  Bart Nelissen, Wouter van den Heuvel                          |
|                                                                |
|  * 2 decisions  * 3 action items  * 1 need                     |
|                                                                |
|                                   [Review]  [Approve]          |
+----------------------------------------------------------------+
```

- NO confidence on queue cards (confidence is per extraction in detail view only)
- Meeting title: Fredoka, xl
- Metadata boven titel: org + type + party als small text
- Participant names below title: via `meeting_participants` → `people.full_name` join (Nunito, sm, secondary text)
- Extraction summary: gekleurde dots met counts
- Cards vary: more extractions = more height
- Buttons right-aligned

**Review detail pagina:**

- Split layout: links 55% transcript, rechts 45% extracties
- Transcript: clean reading (Nunito, base, generous line-height), highlighted quotes op transcript_ref matches (bg-yellow-100/50)
- Participants als pills bovenaan
- Extractie cards: gegroepeerd per type met section headers, thin left border in type kleur
- Content is editable on click (inline, geen modal)
- Confidence bar thin en subtle onder elke card
- Transcript ref als indented blockquote in lichter text
- Sticky bottom action bar: links count ("Approving 1 meeting + 7 extractions"), rechts Reject (secondary) + Approve All (primary, prominent)

**Empty state:**

- Mascot illustratie (floating animatie, subtiel)
- White chat-bubble card with headline in brand green (Fredoka), body text (Nunito)
- Stats cards with real data ("5 verified today, 142 total")
- Filter pills to revisit verified content by org, meeting type, party type
- Tone: "All caught up" + stats, no "sparkling clean" or "next adventure"
- All UI text in English

**Extraction type kleuren:**
| Type | Color | Pastel |
|------|-------|--------|
| Decisions | Blue #3B82F6 | #DBEAFE |
| Action items | Green #16A34A | #DCFCE7 |
| Needs | Purple #A855F7 | #F3E8FF |
| Insights | Gray #6B7280 | #F3F4F6 |

**Meeting type badge kleuren:**
| Type | Style |
|------|-------|
| sales | bg-blue-100 text-blue-700 |
| discovery | bg-purple-100 text-purple-700 |
| internal_sync | bg-gray-100 text-gray-700 |
| review | bg-green-100 text-green-700 |
| strategy | bg-amber-100 text-amber-700 |
| partner | bg-pink-100 text-pink-700 |

**Buttons:**

- Primary (Approve): gradient #006B3F to #005A35, white text, rounded-full, shadow-lg, hover:scale-105, active:scale-95
- Secondary (Review): white bg, 2px border #E2E8F0, text #475569, hover border green
- Destructive (Reject): white bg, 2px border #FCA5A5, text #DC2626, hover bg-red-50

### Edge cases en foutafhandeling

- Empty queue: mascot + stats (niet: "geen meetings gevonden")
- Server Action fout: toast notification met foutmelding
- Zod validatie fouten: terug naar formulier als field errors

## Prerequisites

- [ ] Sprint 009: Database Migration + Security Fixes moet afgerond zijn

## Taken

- [ ] Design tokens configureren in globals.css (@theme): fonts (Fredoka, Nunito), kleuren (#006B3F primary, gradients), border radius, shadows
- [ ] App shell bouwen: dashboard layout met bottom nav bar (6 items, badge count, active state, frosted glass effect)
- [ ] Review queue pagina (/review): query voor draft meetings, cards met confidence border, metadata, extraction summary, approve/review buttons
- [ ] Review detail pagina (/review/[id]): split layout, transcript met highlighted refs, extractie cards per type, inline editing, sticky action bar
- [ ] Server Actions + Zod schemas: verifyMeeting, verifyMeetingWithEdits, rejectMeeting — met auth check en database transacties
- [ ] Empty state component: mascot, chat-bubble, real stats, filter pills

## Acceptatiecriteria

- [ ] [FUNC-010] /review toont draft meetings als gestylde cards met participant names en extraction summaries (geen confidence op cards)
- [ ] [FUNC-012] Quick approve zet meeting + alle extracties naar verified
- [ ] [FUNC-011] /review/[id] toont transcript met highlighted refs, extracties gegroepeerd per type
- [ ] [FUNC-015] Extractie content is inline editable in review detail
- [ ] [FUNC-013] Edit extractie + approve slaat wijzigingen correct op
- [ ] [FUNC-014] Reject markeert meeting als rejected met reden
- [ ] [FUNC-016] Badge count in nav bar update na approve/reject
- [ ] [UI-006] Bottom nav bar is fixed, centered, frosted glass, met alle 6 items
- [ ] [UI-012] Lege queue toont mascot + stats
- [ ] [VAL-001..003] Zod schemas valideren input correct (uuid, min length reason)

## Geraakt door deze sprint

- `apps/cockpit/src/app/globals.css` (gewijzigd — design tokens, fonts, gradient)
- `apps/cockpit/src/app/(dashboard)/layout.tsx` (gewijzigd — bottom nav bar)
- `apps/cockpit/src/components/layout/bottom-nav.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/review/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/review/[id]/page.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/review/loading.tsx` (nieuw)
- `apps/cockpit/src/app/(dashboard)/review/error.tsx` (nieuw)
- `apps/cockpit/src/components/review/review-card.tsx` (nieuw)
- `apps/cockpit/src/components/review/review-detail.tsx` (nieuw)
- `apps/cockpit/src/components/review/extraction-card.tsx` (nieuw)
- `apps/cockpit/src/components/review/empty-state.tsx` (nieuw)
- `apps/cockpit/src/components/shared/confidence-bar.tsx` (nieuw — used in extraction detail only, not on queue cards)
- `apps/cockpit/src/components/shared/meeting-type-badge.tsx` (nieuw)
- `packages/database/src/queries/review.ts` (nieuw)
- `packages/database/src/validations/review.ts` (nieuw)
- `apps/cockpit/src/actions/review.ts` (nieuw)
