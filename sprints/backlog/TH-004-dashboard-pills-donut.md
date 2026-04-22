# Micro Sprint TH-004: Dashboard UI — floating pills + time-spent donut

## Doel

De eerste zichtbare UI-deliverable: de dashboard-home krijgt bovenaan een horizontale strip met de top-8 meest actieve thema's (A1) en daaronder een time-spent donut die laat zien waar de gespreksvolume naartoe gaat (B8). Klik op een pill of segment → placeholder route `/themes/[slug]` (de echte detail-page komt in TH-005). Na deze sprint: Stef en Wouter openen de dashboard en zien de eerste voelbare feedback van het platform over welke thema's hot zijn. Eerste "feeling"-moment.

## Requirements

| ID       | Beschrijving                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| UI-250   | Horizontale pill-strip bovenaan dashboard-home, boven meeting-carousel                                       |
| UI-251   | Top 8 verified themes gesorteerd op 30d mention-count (tiebreak: last_mentioned_at)                          |
| UI-252   | Per pill: emoji + name + mention-count-badge (alleen laatste 30d, niet totaal)                               |
| UI-253   | Flex-wrap: nooit horizontaal scrollen, pills wikkelen netjes op smallere viewports                           |
| UI-254   | Hover: subtiele lift + border-accent, geen tooltip (voorkomt flashiness)                                     |
| UI-255   | Klik op pill → navigeert naar `/themes/[slug]` (route komt in TH-005, nu 404/placeholder)                    |
| UI-256   | Rechtsboven strip: _"Alle {N} thema's →"_ link (target v2)                                                   |
| UI-257   | Time-spent donut linker-kolom onder pills, ~340×180px                                                        |
| UI-258   | Donut segmenten in vaste 10-palette (geen primary-tinten)                                                    |
| UI-259   | Center-label: _"30 dgn"_ + totaal-%                                                                          |
| UI-260   | Legend: top 6 themes met kleurblokje + %, rest als _"+ N andere thema's"_                                    |
| UI-261   | Hover segment → percentage tooltip; klik → `/themes/[slug]`                                                  |
| UI-262   | Empty state `0 verified themes`: neutraal blok _"Nog geen thema's — loopt na eerste batch-run vanzelf vol."_ |
| UI-263   | `<3 themes`: donut toont één cirkel + melding _"Te weinig data voor verdeling"_                              |
| UI-264   | Loading: skeleton-pills en skeleton-donut                                                                    |
| UI-265   | `emerging` themes verschijnen NIET op dashboard, alleen `verified`                                           |
| FUNC-220 | Query `listTopActiveThemes({limit, windowDays})` in `queries/themes.ts`                                      |
| FUNC-221 | Query `getThemeShareDistribution({windowDays})` in `queries/themes.ts`                                       |
| FUNC-222 | Beide queries filteren op `status = 'verified'` en aggregeren op `meeting_themes` binnen window              |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §8 dashboard UI (regels 467-536)
- Prototype: `apps/cockpit/src/app/(dashboard)/theme-lab/variants/section-a.tsx` → VariantA1
- Prototype: `apps/cockpit/src/app/(dashboard)/theme-lab/variants/section-b.tsx` → VariantB8
- Repo: `apps/cockpit/src/app/(dashboard)/page.tsx` — bestaande dashboard-home

## Context

### Componenten-structuur

```
apps/cockpit/src/components/themes/
├── theme-pills-strip.tsx         -- A1: server component, haalt data via listTopActiveThemes
├── theme-pill.tsx                -- shared: één pill (klikbaar, emoji + name + badge)
├── time-spent-donut.tsx          -- B8: client component (SVG + hover-state)
├── theme-pills-skeleton.tsx      -- loading-skeleton
└── time-spent-donut-skeleton.tsx -- loading-skeleton
```

### Data-vorm

```typescript
type TopActiveTheme = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  mentions30d: number;
  lastMentionedAt: Date;
};

type ShareDistribution = {
  theme: { id; slug; name; emoji };
  share: number; // 0..1
}[];
```

### Query — 30d window

```typescript
// listTopActiveThemes: join meeting_themes op themes, filter created_at >= now() - 30d, group by theme_id, order by count desc limit 8
// getThemeShareDistribution: zelfde join, return share = count(*) / total_count per thema
```

### Dashboard-layout

In `apps/cockpit/src/app/(dashboard)/page.tsx` boven bestaande carousel:

```tsx
<section className="mb-8">
  <ThemePillsStrip />
</section>
<div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
  <MeetingCarousel />  {/* bestaand */}
  <TimeSpentDonut />
</div>
```

## Deliverables

- [ ] `packages/database/src/queries/themes.ts` — `listTopActiveThemes`, `getThemeShareDistribution` implementatie
- [ ] `apps/cockpit/src/components/themes/theme-pills-strip.tsx` + `theme-pill.tsx`
- [ ] `apps/cockpit/src/components/themes/time-spent-donut.tsx`
- [ ] Loading-skeletons voor beide
- [ ] `apps/cockpit/src/app/(dashboard)/page.tsx` — integratie boven carousel
- [ ] Placeholder route `apps/cockpit/src/app/(dashboard)/themes/[slug]/page.tsx` met "Komt in TH-005"

## Acceptance criteria

- Na `supabase db reset` + seed (geen meeting_themes yet): empty-state verschijnt correct.
- Na een paar getagde meetings: pills tonen correct, sortering klopt.
- Klik op pill → navigeert naar placeholder; klik op segment idem.
- Lighthouse: geen layout-shift van pills-strip (reserveer hoogte tijdens loading).
- Geen horizontaal scrollen op 768px viewport.

## Handmatige test-stappen

1. Open `/` op lokale cockpit met seed + ≥3 getagde meetings.
2. Check: pills + donut verschijnen bovenaan.
3. Wis alle `meeting_themes` → refresh → empty-state verschijnt.
4. Hover op pill: subtiele lift, geen tooltip.
5. Resize naar 480px: pills wrap netjes.
6. Klik op pill `hiring-junior-devs` → route toont "Komt in TH-005".

## Out of scope

- Echte detail-page `/themes/[slug]` (TH-005).
- `/themes` overzicht-pagina (alfabetische lijst) — uitgesteld naar v2.
- Edit-mode voor themes (TH-005).
- Review-flow voor emerging themes (TH-006).
