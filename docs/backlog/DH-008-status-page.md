# Micro Sprint DH-008: Status Page app (FASE 2)

> **Verplaatst naar fase 2.** Status page is niet nodig voor het acute probleem (bugs triagen). Wordt gebouwd nadat de core DevHub app (DH-001 t/m DH-007) stabiel is.

## Doel

De publieke status page bouwen als aparte Next.js app `apps/statuspage/`. Dit is een read-only, niet-authenticated pagina die clients kunnen bezoeken om de voortgang van hun project te zien. Toont open issues (titel + status) en recent opgeloste items. Toegang via een unieke project_key in de URL. Na deze sprint kan een client `status.jouwaipartner.nl/proj_abc123` bezoeken en zien welke bugs open staan en wat recent opgelost is.

## Requirements

| ID       | Beschrijving                                                       |
| -------- | ------------------------------------------------------------------ |
| FUNC-133 | Toont open issues per project (titel + status)                     |
| FUNC-134 | Toont recent opgeloste items                                       |
| FUNC-135 | Toont project naam + samenvatting (X open, Y opgelost deze maand)  |
| FUNC-136 | Geen login vereist, toegang via project_key in URL                 |
| FUNC-137 | Read-only, geen interactie                                         |
| FUNC-138 | Automatisch actueel, leest direct uit issues tabel                 |
| SEC-115  | Gebruikt admin client (service role)                               |
| SEC-116  | Filtert server-side: alleen titel, status, type, datum naar client |
| UI-130   | Minimale layout, JAIP branding                                     |
| UI-131   | Open issues lijst (titel + status)                                 |
| UI-132   | Resolved issues lijst                                              |
| UI-133   | Status header met project naam + samenvatting                      |
| UI-134   | Responsive (mobiel en desktop)                                     |
| UI-135   | Route: /[project_key]                                              |
| UI-136   | Fallback: / toont 404 of "Voer een project key in"                 |
| EDGE-104 | Ongeldige project_key toont 404                                    |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "Status Page app structuur" (regels 868-890)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Wat de client ziet" (regels 892-919)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Kenmerken" (regels 921-927)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Queries" (regels 928-935)
- PRD: `docs/specs/prd-devhub.md` -> sectie "RLS" (regels 937)

## Context

### App structuur

```
apps/statuspage/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 -- Minimale layout, JAIP branding
│   │   ├── page.tsx                   -- 404 / "Voer een project key in"
│   │   └── [project_key]/
│   │       └── page.tsx               -- Status overzicht voor project
│   ├── components/
│   │   ├── open-issues-list.tsx       -- Lijst open bugs (titel + status)
│   │   ├── resolved-issues-list.tsx   -- Recent opgeloste items
│   │   └── status-header.tsx          -- Project naam + samenvatting
│   └── lib/
│       └── utils.ts
├── next.config.ts
├── tailwind.css
├── tsconfig.json
└── package.json
```

### Wat de client ziet

```
┌──────────────────────────────────────────────────────────┐
│  Jouw AI Partner -- Project Status                       │
│                                                          │
│  CAi Studio                                              │
│  12 open issues - 8 opgelost deze maand                  │
│                                                          │
│  Open                                                    │
│  ────                                                    │
│  ● Studio opslaan verliest content          In progress  │
│  ● Login crash op Safari 18.2               In progress  │
│  ● Co-founder slaat fases over              Todo         │
│  ● Upload timeout bij grote bestanden       Todo         │
│  ● ...                                                   │
│                                                          │
│  Recent opgelost                                         │
│  ───────────────                                         │
│  v Chat response tijd verbeterd (40s -> 4s)  7 apr 2026  │
│  v Claude model integratie                  6 apr 2026   │
│  v Image generation fix                     5 apr 2026   │
│  v ...                                                   │
│                                                          │
│  Powered by Jouw AI Partner                              │
└──────────────────────────────────────────────────────────┘
```

### Queries

De status page gebruikt queries uit `packages/database/src/queries/status-page.ts` (aangemaakt in DH-002):

```typescript
function getProjectByKey(projectKey: string): Promise<{ id: string; name: string } | null>;
function listPublicIssues(projectId: string): Promise<
  {
    title: string;
    status: string;
    type: string;
    created_at: string;
    closed_at: string | null;
  }[]
>;
function getPublicIssueCounts(projectId: string): Promise<{
  open: number;
  resolved_this_month: number;
}>;
```

### Security

- **Geen login** — de URL met project_key IS de toegang
- **Admin client** — status page queries gebruiken `getAdminClient()` (service role) om issues op te halen. Dit voorkomt dat de issues tabel publiek leesbaar hoeft te zijn via RLS
- **Server-side filtering** — de queries selecteren alleen publieke velden: titel, status, type, datum. Geen comments, activity, toewijzing, labels, of interne details worden doorgestuurd naar de client
- **project_key** — een unieke, moeilijk te raden string per project (bijv. `proj_a1b2c3d4`). Wordt opgeslagen in `projects.project_key`

### Gefilterde data

De status page toont ALLEEN:

- Issue titel
- Issue status (als beschrijvende tekst, niet de enum)
- Issue type (voor icoon: bug vs feature request)
- Aanmaakdatum
- Sluitdatum (voor opgeloste items)

NIET getoond: comments, activity, toewijzing, labels, severity, component, reporter info, AI classificatie, source metadata.

### Responsive

De pagina moet werken op mobiel en desktop. Simpele single-column layout die goed schaalt.

## Prerequisites

- [ ] Micro Sprint DH-001: Database (issues tabel, projects.project_key kolom)
- [ ] Micro Sprint DH-002: Queries (getProjectByKey, listPublicIssues, getPublicIssueCounts)

## Taken

- [ ] Initialiseer `apps/statuspage/` als Next.js 16 app (package.json, tsconfig.json, next.config.ts, tailwind.css)
- [ ] Maak `src/app/layout.tsx` met minimale layout en JAIP branding
- [ ] Maak `src/app/page.tsx` met fallback ("Voer een project key in" of 404)
- [ ] Maak `src/app/[project_key]/page.tsx` — Server Component die project ophaalt en issues toont
- [ ] Maak components: `open-issues-list.tsx`, `resolved-issues-list.tsx`, `status-header.tsx`
- [ ] Update root `package.json` workspaces met `apps/statuspage`

## Acceptatiecriteria

- [ ] [FUNC-133] Open issues worden getoond met titel en status
- [ ] [FUNC-134] Recent opgeloste items worden getoond met sluitdatum
- [ ] [FUNC-135] Header toont project naam, aantal open issues, en opgelost deze maand
- [ ] [FUNC-136] Pagina is bereikbaar zonder login via /[project_key]
- [ ] [FUNC-137] Er zijn geen interactieve elementen (read-only)
- [ ] [FUNC-138] Data is real-time (geen cache, leest direct uit DB)
- [ ] [SEC-115] Queries gebruiken admin client (service role)
- [ ] [SEC-116] Alleen titel, status, type en datum worden naar de client gestuurd
- [ ] [UI-130] Layout heeft JAIP branding en minimalistisch design
- [ ] [UI-131] Open issues lijst toont titel + status badge
- [ ] [UI-132] Resolved issues lijst toont titel + sluitdatum
- [ ] [UI-133] Status header toont project naam + samenvattende counts
- [ ] [UI-134] Pagina is responsive op mobiel en desktop
- [ ] [EDGE-104] Ongeldige project_key toont een 404 pagina
- [ ] `npm run build` slaagt voor de statuspage app

## Geraakt door deze sprint

- `apps/statuspage/package.json` (nieuw)
- `apps/statuspage/tsconfig.json` (nieuw)
- `apps/statuspage/next.config.ts` (nieuw)
- `apps/statuspage/tailwind.css` (nieuw)
- `apps/statuspage/src/app/layout.tsx` (nieuw)
- `apps/statuspage/src/app/page.tsx` (nieuw)
- `apps/statuspage/src/app/[project_key]/page.tsx` (nieuw)
- `apps/statuspage/src/components/open-issues-list.tsx` (nieuw)
- `apps/statuspage/src/components/resolved-issues-list.tsx` (nieuw)
- `apps/statuspage/src/components/status-header.tsx` (nieuw)
- `apps/statuspage/src/lib/utils.ts` (nieuw)
- `package.json` (root — workspaces bijwerken)
