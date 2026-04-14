# Style Guide: Jouw AI Partner Cockpit

> Based on the "Playful Assistant" prototype (revieuw-que.html)
> Adjusted for brand consistency and professional tone

---

## 1. Design Personality

The cockpit has an **AI assistant character** — a friendly robot mascot that communicates with the user. The interface feels like a conversation with a helpful colleague, not like navigating a generic SaaS tool.

**Tone:** Warm, professional, casual. Think "a calm colleague who has your back" — not "an excited app that celebrates everything."

**Language:** The entire UI is in Dutch. Technical identifiers (DB columns, CHECK constraint values, code) stay in English. Content (transcripts, extractions) stays in whatever language the meeting was in (usually Dutch). See section 11 for the full language convention (RULE-007).

**Examples of good tone:**

- "Hoi! All caught up." (not "Your review queue is sparkling clean!")
- "5 meetings verified today" (not "Fun Fact #1: Verified 5 meetings today!")
- "8 meetings awaiting review" (not "Your intelligent queue prioritizes entries with high decision-impact")

**The mascot** (rounded white square with two dot-eyes) appears in empty states and key moments. It does NOT appear on every page — only when the system "speaks" to the user (empty states, first-time experiences, completion moments).

---

## 2. Color Palette

### Brand Primary

The primary brand color is **#006B3F** (deep green), NOT the purple (#6366F1) from the prototype. All primary actions, active nav states, and brand elements use this green.

```
Primary:        #006B3F (brand green)
Primary Light:  #81D9A2 (for backgrounds, highlights)
Primary Subtle: #DCFCE7 (pastel green, for cards and accents)
```

### Semantic Colors (for extraction types)

```
Decisions:    Blue   — #3B82F6 / pastel: #DBEAFE
Action Items: Green  — #16A34A / pastel: #DCFCE7
Needs:        Purple — #A855F7 / pastel: #F3E8FF
Insights:     Gray   — #6B7280 / pastel: #F3F4F6
```

### Confidence Indicators (extraction detail only)

Confidence is shown per extraction in the detail view (thin bar + left border on extraction cards), NOT on queue cards.

```
High (>0.8):  Green — #006B3F
Medium (0.5-0.8): Amber — #F59E0B
Low (<0.5):   Red — #EF4444
```

### Surface Colors

```
Background:     Linear gradient — #fdfbfb to #ebedee (keep from prototype)
Cards:          #FFFFFF with subtle shadow
Surface Low:    #F2F4F6
On Surface:     #1E293B (dark text)
On Surface Var: #475569 (secondary text)
```

---

## 3. Typography

### Fonts (from prototype — these work well)

```
Headlines: Fredoka (rounded, friendly, has personality)
Body:      Nunito (clean, readable, warm)
```

### Usage

```
Page titles:     Fredoka, 3xl (30px), font-bold
Card titles:     Fredoka, xl (20px), font-semibold
Body text:       Nunito, base (16px), font-normal
Small labels:    Nunito, xs (12px), font-semibold, uppercase, tracking-widest
Metadata:        Nunito, sm (14px), text-on-surface-variant
```

---

## 4. Component Patterns

### Cards

- Background: white (#FFFFFF)
- Border-radius: 2rem (bubble radius from prototype)
- Shadow: `shadow-xl` for prominent cards (chat bubbles), `shadow-sm` for list items
- No confidence indicators on queue cards (confidence is per extraction in detail view only)
- Padding: `p-6` standard, `p-8` for feature cards

### Buttons

**Primary action (Approve):**

```
Background: gradient from #006B3F to #005A35
Text: white
Border-radius: rounded-full (pill shape)
Shadow: shadow-lg with brand green glow (shadow-[#006B3F]/20)
Hover: slight scale (hover:scale-105)
Active: scale down (active:scale-95)
```

**Secondary action (Review, Reject):**

```
Background: white
Border: 2px solid #E2E8F0
Text: #475569
Hover: border color changes to brand green
```

**Destructive (Reject):**

```
Background: white
Border: 2px solid #FCA5A5
Text: #DC2626
Hover: bg-red-50
```

### Badges (meeting type, party type)

```
Shape: rounded-full (pill)
Padding: px-3 py-1
Font: xs, font-semibold
Background: pastel color per type
Border: 2px solid white (for layered feel)
```

Meeting type badge colors:

```
sales:         bg-blue-100    text-blue-700
discovery:     bg-purple-100  text-purple-700
internal_sync: bg-gray-100    text-gray-700
review:        bg-green-100   text-green-700
strategy:      bg-amber-100   text-amber-700
partner:       bg-pink-100    text-pink-700
general:       bg-slate-100   text-slate-700
```

Party type badge colors:

```
client:   bg-blue-50   text-blue-600   border-blue-200
partner:  bg-pink-50   text-pink-600   border-pink-200
internal: bg-gray-50   text-gray-600   border-gray-200
```

### Navigation

**Bottom navigation bar** (from prototype — keep this pattern):

```
Position: fixed bottom-6, centered
Background: white/80 with backdrop-blur
Border-radius: rounded-full
Shadow: shadow-2xl
Active item: bg-[#006B3F] text-white rounded-full with shadow
```

Navigation items (use correct labels):

```
Home      — dashboard icon
Review    — rate_review icon (with badge count)
Projects  — folder_open icon
Meetings  — calendar_today icon
Clients   — corporate_fare icon
People    — group icon
```

### Filter Pills (from "Want to revisit something?")

```
Shape: rounded-full
Background: white
Border: 2px solid pastel color
Text: colored to match border
Icon: right-aligned, matching color
Hover: border darkens
Focus: ring in matching color
```

---

## 5. Empty States

The mascot appears with a message in a "chat bubble" card.

**Structure:**

1. Mascot illustration (floating animation, subtle)
2. White chat-bubble card with:
   - Headline in brand green (Fredoka)
   - One sentence body text (Nunito, not overly enthusiastic)
   - Stats cards showing real data from the system
3. Optional: contextual actions below (filters, links to other pages)

**Tone rules for empty states:**

- One greeting word max ("Hoi!" or "Nice!")
- No exclamation marks in body text
- No emoji in body text (headline may have one subtle one)
- Stats use real data, not "fun facts" — just show the numbers
- No motivational language ("Ready for the next adventure?" becomes simply nothing, or "Check back later")

**Example rewrite:**

```
Before: "Hoi! All caught up! 🎉 Your review queue is sparkling clean.
         I've processed everything and synced it up with your workspace.
         Ready for the next adventure?"

After:  "All caught up ✓
         No meetings waiting for review. Here's what happened today."
```

---

## 6. Review Queue Cards (when queue has items)

Each meeting in the queue is a card that balances scannability with personality.

**Card structure:**

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  Ordus · discovery · client           [3 hours ago]       │
│                                                           │
│  Discovery call Q2 planning                               │
│  Bart Nelissen, Wouter van den Heuvel                     │
│                                                           │
│  ● 2 decisions  ● 3 action items  ● 1 need               │
│                                                           │
│                              [Review]  [Approve]          │
└───────────────────────────────────────────────────────────┘
```

**Participant names** are resolved via `meeting_participants` → `people.full_name` join. Show as comma-separated list below the title.

**Visual hierarchy on cards:**

1. Meeting title is the largest text (Fredoka, xl)
2. Organization + type + party as small metadata above the title
3. Participant names below the title (Nunito, sm, secondary text)
4. Extraction summary as colored dots with counts below
5. Buttons right-aligned at bottom

**No confidence on queue cards.** Confidence is shown per extraction in the detail view only, not aggregated on card level.

**Cards should vary visually based on content:**

- More extractions = slightly more padding/height (the card breathes)

---

## 7. Review Detail Page

**Split layout:** Left 55% transcript, Right 45% extractions.

**Transcript panel:**

- Clean reading experience (Nunito, base size, generous line-height)
- Highlighted quotes: `bg-yellow-100/50` subtle background on transcript_ref matches
- Participants listed as pills at the top

**Extraction cards in right panel:**

- Grouped by type with section headers
- Each card has a thin left border in the type color (blue/green/purple/gray)
- Content text is editable on click (inline, no modal)
- Confidence bar is thin and subtle under each card
- Transcript ref shown as indented blockquote in lighter text

**Bottom action bar (sticky):**

- Left: count ("Approving 1 meeting + 7 extractions")
- Right: Reject button (secondary) + Approve All button (primary, prominent)

---

## 8. Animation & Motion

Keep it minimal. The prototype's floating animation on the mascot is the most animation the system should have.

**Allowed:**

- `floating` keyframe on mascot (3s ease-in-out infinite)
- `transition-all duration-200` on buttons and interactive elements
- `hover:scale-105` on primary buttons
- `active:scale-95` on all clickable elements
- Cards fading out softly when approved (opacity transition, not slide)

**Not allowed:**

- No confetti, no particle effects
- No slide-in animations on page load
- No bouncing badges
- No animated gradients

---

## 9. Spacing System

Use Tailwind's default spacing scale consistently:

```
Card padding:       p-6 (24px) standard, p-8 (32px) feature cards
Gap between cards:  gap-4 (16px)
Section spacing:    mt-12 (48px) between major sections
Page padding:       px-6 (24px) on mobile, px-12 (48px) on desktop
```

---

## 10. Key Differences from Prototype

| Prototype                             | Style Guide                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Purple primary (#6366F1)              | Green primary (#006B3F)                                                  |
| "Fun Fact #1", "Fun Fact #2"          | Just show the numbers with labels                                        |
| "sparkling clean", "next adventure"   | Calm, factual language                                                   |
| Party popper emoji                    | Subtle checkmark or nothing                                              |
| Nav: Home, Review, Files, Dates, Team | Home, Review, Projects, Meetings, Clients, People                        |
| Sidebar (left) in earlier versions    | Bottom nav bar (from this prototype)                                     |
| "Intensity Level: HIGH/MED/LOW"       | Confidence shown per extraction in detail view only (not on queue cards) |
| Generic meeting names                 | Real data: Ordus, Fleur op zak, HelperU                                  |
| No participant names on cards         | Participant names shown via people join                                  |
| Dutch/English mixed UI                | Full Dutch UI, technical identifiers (DB) stay English (RULE-007)        |

---

## 11. Language Convention (RULE-007)

The platform follows a strict two-layer language split.

### Dutch (gebruikersgericht)

Everything a user, team member or reviewer sees or reads is in Dutch:

- Route paths (`/administratie`, `/klanten`, `/projecten`, `/vergaderingen`)
- Navigation labels ("Administratie", "Klanten", "Projecten")
- Button text, form labels, field names, placeholders
- Error messages, toasts, empty-state copy, tooltips
- Page titles, headings, breadcrumbs, badges
- Label-mappings for technical enum values — e.g. DB `type = 'advisor'` renders as "Adviseur" in the UI

### English (technisch)

Everything that lives below the UI layer stays in English:

- Database column names (`email_type`, `party_type`, `meeting_type`, `organization_id`)
- CHECK constraint values (`'client'`, `'advisor'`, `'internal'`, `'legal_finance'`)
- Code identifiers: function names, variables, types, props, component names
- File and folder names (kebab-case English, e.g. `organization-card.tsx`)
- Git branch names, commit messages (imperative English, e.g. `feat(db): add advisor type`)
- Test names, error codes, log output

### Waarom deze split

- **Classifier-output is stabiel**: CHECK-constraint waardes worden direct door AI-agents geproduceerd (`email_type='legal_finance'`). Nederlandse waardes ('financieel_juridisch') zouden alle prompts en validaties raken.
- **Consistentie met Supabase/Postgres**: snake_case English column names zijn de facto standaard; tooling (types, admin UI, migraties) gaat daarvan uit.
- **Onderhoud door niet-coders**: UI-wijzigingen kunnen worden gedaan zonder DB-begrip; DB-werk raakt geen gebruikerstekst.

### UI-labels voor `organizations.type`

| DB-waarde  | NL-label    |
| ---------- | ----------- |
| `client`   | Klant       |
| `partner`  | Partner     |
| `supplier` | Leverancier |
| `advisor`  | Adviseur    |
| `internal` | Intern      |
| `other`    | Overig      |

Deze mapping leeft als constante in de UI-laag (vervolg-sprint 033), niet in de database.
