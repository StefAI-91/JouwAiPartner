# Micro Sprint TH-005: Theme detail page + edit mode

## Doel

Wanneer je op een pill of donut-segment klikt, open je de theme detail page `/themes/[slug]` met header + 5 tabs (Overzicht / Meetings / Besluiten / Open vragen / Mensen). Inclusief edit-mode voor Stef/Wouter om name/description/matching_guide/emoji te tweaken, en archive-knop. Na deze sprint: klik een pill, zie meetings die het thema raken met evidence-quotes, pas de guide aan en zie het resultaat. Tweede "feeling"-moment: nu kunnen je naar binnen duiken.

## Requirements

| ID       | Beschrijving                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| UI-266   | Route `/themes/[slug]` als server-component page                                                                                         |
| UI-267   | Header: grote emoji (32px), name (h1), description (muted subline)                                                                       |
| UI-268   | Header-rechts: badge met 30d mention-count + laatste mention-datum                                                                       |
| UI-269   | Edit-icon rechtsboven header, zichtbaar voor Stef/Wouter (whitelist), verborgen voor overigen                                            |
| UI-270   | Tabs: Overzicht (default) / Meetings / Besluiten / Open vragen / Mensen                                                                  |
| UI-271   | Overzicht-tab: 3 stat-kaartjes (# meetings, # besluiten, # open vragen=0 in v1) + laatste 3 activities                                   |
| UI-272   | Meetings-tab: lijst gesorteerd datum desc, per rij: titel, datum, participants, confidence-badge, evidence-quote uitklapbaar `<details>` |
| UI-273   | Besluiten-tab: extractions met type='decision' uit gelinkte meetings, desc                                                               |
| UI-274   | Open vragen-tab: placeholder-tekst _"Komt in v2 — extractions type=need met status open/resolved"_                                       |
| UI-275   | Mensen-tab: unieke participants met mention-count, klikbaar naar `/people/[id]`                                                          |
| UI-276   | Edit-mode: formulier met name / description / matching_guide / emoji-picker popover                                                      |
| UI-277   | Edit-mode: alleen beschikbaar voor `status='verified'`; emerging gaan via review-flow                                                    |
| UI-278   | Archive-knop in edit-mode: zet `status='archived'` + `archived_at=now()`                                                                 |
| UI-279   | Emoji-picker: shadcn Popover met 6×7 grid uit THEME_EMOJIS, huidige selectie met primary-ring, keyboard-nav                              |
| FUNC-230 | Query `getThemeBySlug(client, slug)` — header + matching_guide                                                                           |
| FUNC-231 | Query `getThemeMeetings(client, themeId)` — join meeting_themes + meetings                                                               |
| FUNC-232 | Query `getThemeDecisions(client, themeId)` — extractions via gelinkte meetings                                                           |
| FUNC-233 | Query `getThemeParticipants(client, themeId)` — distinct participants met count                                                          |
| FUNC-234 | Mutation `updateTheme(themeId, patch)` — Zod-gevalideerd                                                                                 |
| FUNC-235 | Server Action `updateThemeAction` in `actions/themes.ts`, checkt currentUser tegen whitelist                                             |
| FUNC-236 | Server Action `archiveThemeAction` idem, met whitelist-check                                                                             |
| SEC-200  | `updateThemeAction` en `archiveThemeAction` halen whitelist uit env: STEF_EMAIL + WOUTER_EMAIL                                           |
| SEC-201  | Actions retourneren `{error: 'forbidden'}` als user geen whitelist-entry is                                                              |
| UI-280   | Edit-knop verborgen in UI voor niet-whitelist users (eerste verdedigingslinie)                                                           |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §9 theme detail page (regels 540-610)
- PRD: `docs/specs/prd-themes.md` → §7 emoji shortlist + picker
- PRD: `docs/specs/prd-themes.md` → §9.7 approve-rechten via UI+server-action check
- Prototype: `theme-lab/variants/section-c.tsx` → VariantC11

## Context

### Bestandsstructuur

```
apps/cockpit/src/app/(dashboard)/themes/[slug]/
├── page.tsx                          -- server component, fetch + render
├── loading.tsx
├── error.tsx
└── tabs/
    ├── overview-tab.tsx
    ├── meetings-tab.tsx
    ├── decisions-tab.tsx
    ├── questions-tab.tsx             -- placeholder v2
    └── people-tab.tsx

apps/cockpit/src/components/themes/
├── theme-header.tsx                  -- emoji + name + description + edit-knop
├── theme-edit-form.tsx               -- client component
├── emoji-picker-popover.tsx          -- shared: ook gebruikt in TH-006 review
└── archive-theme-dialog.tsx          -- bevestig-modal

apps/cockpit/src/actions/themes.ts    -- updateThemeAction, archiveThemeAction
```

### Zod schema voor update

```typescript
const updateThemeSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(5).max(200),
  matching_guide: z.string().min(20),
  emoji: z.enum(THEME_EMOJIS),
});
```

### Whitelist-check

```typescript
async function requireThemeApprover() {
  const user = await getCurrentUser();
  const allowed = [process.env.STEF_EMAIL, process.env.WOUTER_EMAIL];
  if (!user || !allowed.includes(user.email)) return { error: "forbidden" };
  return { user };
}
```

### Tabs — interactief

Gebruik URL-params (`?tab=meetings`) zodat tab-switch geen useState is en refresh werkt. Shadcn `Tabs` of custom links.

## Deliverables

- [ ] `/themes/[slug]/page.tsx` + 5 tabs
- [ ] `theme-header.tsx`, `theme-edit-form.tsx`, `emoji-picker-popover.tsx`
- [ ] `queries/themes.ts` uitgebreid met 4 nieuwe queries
- [ ] `mutations/themes.ts` implementatie van `updateTheme`, `archiveTheme`
- [ ] `actions/themes.ts` met whitelist-check helper + 2 Server Actions
- [ ] `archive-theme-dialog.tsx` bevestig-UI

## Acceptance criteria

- Klik pill op dashboard → detail page laadt alle 5 tabs correct.
- Meetings-tab toont evidence-quote bij uitklappen.
- Edit-form updatet DB, revalidatePath triggert, wijziging is direct zichtbaar.
- Ege (of elke non-whitelist user) ziet geen edit-knop en kan Server Action niet aanroepen (test met curl).
- Archive-knop zet status='archived' en thema verdwijnt van dashboard pills/donut.
- Open vragen-tab toont placeholder-tekst, geen lege lijst.
- Keyboard-nav werkt in emoji-picker (pijl-toetsen + enter).

## Handmatige test-stappen

1. Klik pill `ai-native-strategie-positionering` op dashboard → page laadt.
2. Check elk van de 5 tabs: data klopt, placeholders duidelijk.
3. Klik edit, wijzig matching_guide, submit → wijziging persisteert na refresh.
4. Wissel emoji via picker → pill-emoji op dashboard wijzigt.
5. Klik archive met confirm → thema verdwijnt van dashboard.
6. Log in als test-user zonder whitelist → edit-knop onzichtbaar.
7. Vanuit browser-devtools direct POST naar Server Action → krijg `{error:'forbidden'}`.

## Out of scope

- AI-narrative paragraaf (C13, v2).
- Quotes per persoon (C14, v2).
- Theme-vs-theme split view (C15, v2).
- Review-flow voor emerging themes (TH-006).
- Match rejection (TH-006).
- `/themes` index-pagina met alle themes alfabetisch (v2).
