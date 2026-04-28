# roadmap-preview

Dit is een **design-preview voor PRD `prd-portal-roadmap`**. Niet productie.

Acht views uit de PRD (fase 1 t/m 4) zijn hier gevisualiseerd met hardgecodeerde mock-data, zodat de visuele identiteit van het klantportaal kan worden gevalideerd vóór de eerste sprint begint.

## Locatie en bereikbaarheid

- Route: [`/design-preview/roadmap`](../../app/design-preview/roadmap/page.tsx)
- Layout: [`/design-preview/layout.tsx`](../../app/design-preview/layout.tsx) — laadt Newsreader + Geist + Geist Mono fonts, scoped tot deze subtree
- Middleware: `/design-preview` is toegevoegd aan `publicPaths`, dus geen login vereist
- Editorial design tokens leven in `apps/portal/src/app/globals.css` onder de class `.preview-editorial`

## Wat is hier wel en niet

**Wel:**

- Visuele compositie van alle Portal-views (8 secties, ~14 mock-topics, 4 mock-rapporten)
- Echte typografie, kleurkeuzes, spacing en hiërarchie
- Drie interactieve staten van de signaal-knoppen (client component, geen DB)
- Mobiele en desktop varianten waar relevant

**Niet:**

- Geen DB-verbinding, geen Supabase-imports, geen server actions die persisteren
- Geen RLS, geen auth (publicPaths)
- Geen tests
- Geen feature-folder-structuur — dit is een compositiepagina-mock

## Bestanden

| Bestand              | Doel                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `mock-data.ts`       | Alle hardcoded content (topics, rapporten, narrative-noot, etc.) |
| `preview-shell.tsx`  | Sticky masthead + sticky TOC + footer chrome                     |
| `section-header.tsx` | Genummerde § sectie-headers                                      |
| `roadmap-board.tsx`  | 4-bucket roadmap (desktop + mobile varianten)                    |
| `topic-card.tsx`     | Herbruikbare topic-card                                          |
| `topic-detail.tsx`   | Read-only detailweergave van één topic                           |
| `signal-buttons.tsx` | Client component met 🔥👍👎 + undo-state + tooltip               |
| `rejected-panel.tsx` | "Bekijk afgewezen wensen" met verplichte redenen                 |
| `audit-timeline.tsx` | Klantversie van de audit-log (geen team-actor-namen)             |
| `reports-list.tsx`   | Archief-lijst van wekelijkse rapporten                           |
| `report-detail.tsx`  | Editorial centerpiece — drop cap, romeinse cijfers, patterns     |
| `badges.tsx`         | TypeBadge / PriorityBadge / SignalBadge / MetaItem helpers       |

## Opheffen / migreren

Na implementatie van de echte feature:

1. Migreer relevante stijl-keuzes naar `apps/portal/src/components/roadmap/` (productie-naam)
2. Verwijder `apps/portal/src/app/design-preview/`
3. Verwijder deze map (`roadmap-preview/`)
4. Verwijder `/design-preview` uit `middleware.ts` `publicPaths`
5. Verwijder de `.preview-editorial` scoping in `globals.css` of promoveer relevante tokens naar de top-level Portal-tokens
