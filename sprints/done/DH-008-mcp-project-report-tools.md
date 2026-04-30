# Micro Sprint DH-008: MCP tools voor project-rapportage

## Doel

Vier nieuwe MCP-tools toevoegen waarmee Claude Desktop alle relevante project-data kan ophalen. Samen met de Anthropic PDF-skill genereert Claude Desktop dan autonoom een warm-persoonlijk rapport per project over een instelbaar tijdvenster (default 14 dagen). **Geen UI in DevHub** — alleen data-access via MCP. De 5 rapportsecties (gevraagde features, openstaande to-do's, opgeloste issues, huidige issues, vragen van gebruikers) worden door Claude Desktop zelf geschreven op basis van deze data.

Na deze sprint kan je in Claude Desktop typen:

> "Maak een warm-persoonlijk rapport voor Loyalty App over de laatste 14 dagen en exporteer het als PDF."

…en krijg je een PDF terug zonder dat DevHub of Portal één nieuwe route heeft.

## Requirements

| ID       | Beschrijving                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------- |
| MCP-R01  | `get_project_issues` tool: issues per project binnen tijdvenster, met optionele filters             |
| MCP-R02  | `days_back` parameter op alle tijd-gebonden tools, default 14, max 365                              |
| MCP-R03  | OR-logica op datumvenster: `created_at` OR `updated_at` OR `closed_at` binnen venster               |
| MCP-R04  | Filters op `status` en `type` optioneel, los en gecombineerd bruikbaar                              |
| MCP-R05  | Output bevat volledige namen voor `assigned_to`, `actor_id`, `author_id` — niet UUIDs               |
| MCP-R06  | `get_issue_detail` tool: één issue met alle comments én volledige activity-log                      |
| MCP-R07  | `get_project_activity` tool: status-wijzigingen en events binnen venster, chronologisch gegroepeerd |
| MCP-R08  | `get_project_context` tool: project-meta + organisatie + laatste `context` en `briefing` summary    |
| MCP-R09  | Alle tools geregistreerd in `createMcpServer()`                                                     |
| MCP-R10  | Output in gestructureerde markdown (niet ruwe JSON) voor betere AI-verwerking                       |
| RULE-200 | Usage tracking via `trackMcpQuery()` per tool-call (bestaand patroon)                               |
| RULE-201 | `ilike`-filters escapen met `escapeLike()` (bestaand patroon, security)                             |
| EDGE-200 | Lege resultaten: expliciete "Geen data gevonden" tekst in plaats van lege lijst                     |
| SKILL-01 | Claude Desktop skill-template afleveren die de workflow + toon + PDF-stap vastlegt                  |
| SKILL-02 | Skill-template bevat concrete voorbeeld-prompt + verwachte output-structuur                         |
| SKILL-03 | Skill-template stuurt Claude om de PDF-skill aan te roepen als laatste stap                         |

## Bronverwijzingen

- Bestaand patroon: `packages/mcp/src/tools/projects.ts` (zelfde stijl aanhouden)
- Bestaand patroon: `packages/mcp/src/tools/utils.ts` (`escapeLike`, `sanitizeForContains`)
- Bestaand patroon: `packages/mcp/src/tools/usage-tracking.ts` (`trackMcpQuery`)
- Database types: `packages/database/src/types/database.ts` — tabellen `issues`, `issue_comments`, `issue_activity`, `projects`, `organizations`, `profiles`, `summaries`
- Issue constants: `packages/database/src/constants/issues.ts`
- Server registratie: `packages/mcp/src/server.ts`

## Context

### Tool 1: `get_project_issues`

**Parameters (Zod):**

```typescript
{
  project_id: z.string().uuid().describe("UUID van het project"),
  days_back: z.number().int().min(1).max(365).optional().default(14)
    .describe("Aantal dagen terug vanaf nu. Default 14."),
  status: z.enum(["triage", "backlog", "todo", "in_progress", "done", "cancelled"])
    .optional().describe("Filter op interne status"),
  type: z.enum(["bug", "feature_request", "question"])
    .optional().describe("Filter op issue-type"),
  include_description: z.boolean().optional().default(true)
    .describe("Descriptions meenemen in output. Zet uit bij brede queries om tokens te besparen."),
  limit: z.number().int().min(1).max(200).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
}
```

**Datumvenster logica:**

```typescript
const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
// Een issue is relevant als het BINNEN venster is aangemaakt, bewerkt, OF gesloten.
// Alleen op created_at filteren zou issues missen die al open stonden maar nu afgerond zijn.
query = query.or(`created_at.gte.${cutoff},updated_at.gte.${cutoff},closed_at.gte.${cutoff}`);
```

**Output formaat (markdown, gegroepeerd per status):**

```markdown
# Issues voor Loyalty App (laatste 14 dagen)

Totaal: 23 issues — 8 open, 4 in behandeling, 11 afgerond

## In behandeling (4)

### #142: Login mislukt met Apple sign-in op iOS 17.4

- Type: bug | Priority: urgent | Severity: high | Component: frontend
- Reporter: lisa@acme.nl | Assigned: Wouter Banninga
- Aangemaakt: 2026-04-15 | Laatst bewerkt: 2026-04-19 | Gesloten: —
- Bron: userback

**Beschrijving:**
Gebruikers op iOS 17.4 kunnen niet meer inloggen via Apple sign-in. Het scherm knippert en valt terug op login-scherm...

---

## Afgerond (11)

### #139: Profielfoto upload werkt niet op Android

- Type: bug | Priority: medium | Component: frontend
- Reporter: bram@acme.nl | Assigned: Ege Yıldız
- Aangemaakt: 2026-04-03 | Gesloten: 2026-04-18
  ...
```

### Tool 2: `get_issue_detail`

**Parameters (Zod):**

```typescript
{
  issue_id: z.string().uuid().describe("UUID van het issue"),
}
```

**Output formaat (markdown, volledig):**

```markdown
# Issue #142: Login mislukt met Apple sign-in

**Project:** Loyalty App (Acme Retail B.V.)
**Type:** bug | **Status:** in_progress | **Priority:** urgent
**Component:** frontend | **Severity:** high
**Reporter:** lisa@acme.nl (Lisa Jansen)
**Assigned:** Wouter Banninga
**Aangemaakt:** 2026-04-15 10:12 | **Laatst bewerkt:** 2026-04-19 14:32
**Bron:** userback | **Source URL:** https://app.acme.nl/login

## Beschrijving

Gebruikers op iOS 17.4 kunnen niet meer inloggen via Apple sign-in...

## Comments (3)

### Wouter Banninga — 2026-04-16 14:32

Ik heb de sign-in flow gechecked, lijkt op een bug in de iOS 17.4 Safari...

### Lisa Jansen — 2026-04-16 15:01

Dank! We zien het bij ongeveer 15% van onze gebruikers terugkomen...

## Activity (5)

- 2026-04-15 10:12 · **Userback** · aangemaakt
- 2026-04-15 10:13 · **AI Classifier** · geclassificeerd (confidence 0.92, type=bug)
- 2026-04-16 09:00 · **Wouter Banninga** · toegewezen aan Wouter Banninga
- 2026-04-16 14:33 · **Wouter Banninga** · status gewijzigd: triage → in_progress
- 2026-04-19 14:32 · **Wouter Banninga** · priority gewijzigd: high → urgent
```

### Tool 3: `get_project_activity`

**Parameters (Zod):**

```typescript
{
  project_id: z.string().uuid(),
  days_back: z.number().int().min(1).max(365).optional().default(14),
}
```

Join op `issue_activity` → `issues` (via `issue_id`) → filter op `project_id`. Actor-naam uit `profiles` join.

**Output formaat (markdown, chronologisch gegroepeerd per dag):**

```markdown
# Activity voor Loyalty App (laatste 14 dagen)

## 2026-04-19

- **Wouter Banninga** wijzigde #142 "Login mislukt..." priority: high → urgent
- **Stef Banninga** sloot #138 "Verjaardagsbeloning automatiseren" (in_progress → done)

## 2026-04-18

- **Ege Yıldız** sloot #139 "Profielfoto upload Android" (in_progress → done)
- **Wouter Banninga** wees #141 "Top-10 producten widget" toe aan Stef Banninga
  ...
```

### Tool 4: `get_project_context`

**Parameters (Zod):**

```typescript
{
  project_id: z.string().uuid(),
}
```

Leest project-row, organisatie, owner/contact, én de laatste `summaries`-rows met `entity_type='project'`, `entity_id=projectId`, `summary_type IN ('context', 'briefing')` — hoogste `version` per type.

**Output formaat:**

```markdown
# Loyalty App

**Organisatie:** Acme Retail B.V.
**Status:** active
**Startdatum:** 2025-11-15
**Deadline:** 2026-06-30
**Owner:** Wouter Banninga
**Contactpersoon:** Lisa Jansen (lisa@acme.nl)

## Huidige context (AI-samenvatting)

De Loyalty App is een customer retention platform voor Acme Retail...
[content uit summaries waar summary_type='context']

## Briefing

Het team werkt deze sprint vooral aan stabiliteit van de login-flow na de iOS 17.4 update...
[content uit summaries waar summary_type='briefing']
```

### Queries

Nieuwe file `packages/database/src/queries/reports.ts` met vier functies. Deze zijn bewust generiek zodat een latere UI-route ze kan hergebruiken zonder MCP-koppeling:

```typescript
export interface IssueReportRow {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  component: string | null;
  severity: string | null;
  source: string;
  reporter_name: string | null;
  reporter_email: string | null;
  source_url: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export async function getProjectIssuesForReport(
  projectId: string,
  daysBack: number,
  filters?: { status?: IssueStatus; type?: IssueType; limit?: number; offset?: number }
): Promise<IssueReportRow[]> { ... }

export interface IssueDetailReport extends IssueReportRow {
  comments: Array<{ author_name: string; body: string; created_at: string }>;
  activity: Array<{
    actor_name: string | null;
    action: string;
    field: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    metadata: unknown;
  }>;
}

export async function getIssueDetailForReport(issueId: string): Promise<IssueDetailReport | null>;

export interface ProjectActivityEvent {
  issue_number: number;
  issue_title: string;
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export async function getProjectActivityForReport(
  projectId: string,
  daysBack: number
): Promise<ProjectActivityEvent[]>;

export interface ProjectContextReport {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  deadline: string | null;
  description: string | null;
  organization: { id: string; name: string } | null;
  owner_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  summaries: {
    context: string | null;
    briefing: string | null;
  };
}

export async function getProjectContextForReport(
  projectId: string
): Promise<ProjectContextReport | null>;
```

### MCP tool registratie

Nieuwe bestanden:

- `packages/mcp/src/tools/issues.ts` — exporteert `registerIssueTools(server)` met `get_project_issues` + `get_issue_detail`
- `packages/mcp/src/tools/project-report.ts` — exporteert `registerProjectReportTools(server)` met `get_project_activity` + `get_project_context`

In `packages/mcp/src/server.ts`:

```typescript
import { registerIssueTools } from "./tools/issues";
import { registerProjectReportTools } from "./tools/project-report";

// ... binnen createMcpServer():
registerIssueTools(server);
registerProjectReportTools(server);
```

### System-prompt update

De bestaande `kennisbasis-context` prompt in `server.ts` noemt alleen meetings/besluiten/acties. Voeg één alinea toe over de nieuwe rapportage-tools zodat Claude Desktop weet dat hij deze kan gebruiken:

```
Voor project-rapportages gebruik je get_project_context (meta + samenvatting),
get_project_issues (lijst met filters), get_project_activity (status-wijzigingen)
en get_issue_detail (verdieping per issue). Standaard venster is 14 dagen tenzij
de gebruiker iets anders vraagt.
```

### Claude Desktop skill-template

De feature wordt pas end-to-end bruikbaar als Claude Desktop weet _hoe_ hij de tools moet combineren tot een rapport. Daarvoor leveren we een skill-template op die de gebruiker als **Project-instructie in Claude Desktop** plakt (of als custom skill-bestand opneemt). Deze template stuurt de workflow, legt toon vast en triggert de PDF-skill.

**Bestand:** `docs/specs/claude-desktop-skills/project-report-skill.md`

**Volledige inhoud:**

```markdown
# Project Report Skill

Je bent een account manager die een warm-persoonlijk statusrapport schrijft voor een klant van Jouw AI Partner. Je werkt op basis van de JouwAIPartner MCP-kennisbasis en de Anthropic PDF-skill.

## Wanneer activeren

Activeer deze workflow wanneer de gebruiker vraagt om een rapport, status-update, statusrapport, voortgangsrapport of samenvatting van een project. Voorbeelden:

- "Maak een rapport voor Loyalty App"
- "Ik wil een statusupdate voor Acme Retail over de laatste maand"
- "Kun je een samenvatting maken van wat we de afgelopen 2 weken voor project X hebben gedaan"

## Workflow

Volg deze volgorde strikt — stap 2 mag pas beginnen als stap 1 klaar is, etc.

### Stap 1 — Project identificeren

- Als de gebruiker een projectnaam noemt: roep `get_projects` aan met die naam.
- Als er meerdere matches zijn: vraag de gebruiker welk project bedoeld wordt.
- Als er geen match is: zeg dat het project niet gevonden is en stop.

### Stap 2 — Tijdvenster vaststellen

- Default is **14 dagen terug**.
- Als de gebruiker een ander venster noemt ("laatste maand", "vorig kwartaal", "sinds 1 maart"): gebruik dat. Reken om naar aantal dagen voor `days_back`.

### Stap 3 — Data ophalen

Roep deze MCP-tools in deze volgorde aan:

1. `get_project_context(project_id)` — voor project-meta, organisatie en bestaande AI-samenvattingen
2. `get_project_issues(project_id, days_back)` — voor de volledige lijst met alle issues in het venster
3. `get_project_activity(project_id, days_back)` — voor wat er is bewogen in het venster (status-wijzigingen, afrondingen)
4. `get_issue_detail(issue_id)` — **alleen** voor 3-5 issues die saillant zijn (urgent, hoge impact, of veel beweging). Niet voor alle issues — dat overschrijdt context.

### Stap 4 — Rapport schrijven

Schrijf een Nederlandstalig rapport met deze structuur:

#### 1. Persoonlijke inleiding (2-3 zinnen)

Warm, persoonlijk, refererend aan de klant en het project. Niet formeel. Voorbeeld: _"Beste team van Acme, in de afgelopen twee weken hebben we flink doorgepakt op de Loyalty App. Hieronder praten we jullie bij over wat we hebben opgelost, waar we nu aan werken, en welke wensen er op de plank liggen."_

#### 2. Gevraagde features

Geen opsomming van alles. Kies 3-5 features die echt relevant zijn, beschrijf per feature kort wat het is en wat de status is. Noem waar strategische keuzes liggen. Geen issue-nummers in de lopende tekst, hooguit tussen haakjes aan het eind.

#### 3. Openstaande to-do's

Wat er nu op de planning staat. Maak onderscheid tussen "deze week" en "binnenkort". Benoem blockers expliciet. Niet elke to-do opsommen — alleen wat de klant moet weten.

#### 4. Opgeloste issues

Highlights van wat is afgerond in het venster. Focus op klantimpact ("Dankzij deze fix werken pushmeldingen nu ook op Android 14"), niet op technische details. Noem wie er aan gewerkt heeft als dat relevant is.

#### 5. Vragen van gebruikers

Cluster vergelijkbare vragen tot thema's. Signaleer waar klanten hetzelfde vragen — dat wijst op een UX-probleem of documentatie-gat. Geef per cluster 1-2 voorbeelden van letterlijke vragen.

#### 6. Korte afsluiting (1-2 zinnen)

Optioneel vooruitkijkend. Geen formele afmelding.

### Stap 5 — PDF genereren

Roep direct na het schrijven de **PDF-skill** aan om het rapport te renderen. Gebruik:

- Titel: "Statusrapport {project_naam} — {maand jaar}"
- Subtitel: "{organisatie_naam}"
- Bodytekst: het hierboven geschreven rapport
- Footer: "Gegenereerd op {datum} · jouw-ai-partner.nl"

Lever de PDF als bijlage in de chat.

## Toon

- **Warm** — alsof je met de klant aan tafel zit, niet alsof je een corporate-memo schrijft
- **Persoonlijk** — noem mensen bij naam waar passend ("Wouter heeft deze week...")
- **Concreet** — geen vaagheden. "We werken aan stabiliteit" is slecht; "We hebben drie iOS-loginbugs gefixt" is goed
- **Eerlijk** — als er weinig gebeurd is, verbloem het niet. Rapporteer gewoon.
- **Geen jargon** — technische termen (RLS, webhook, queue) vertalen naar klanttaal

## Wat NIET doen

- Geen issue-nummers in kopregels. Alleen in bijlage/haakjes als referentie.
- Geen opsommingen van alle issues. De klant heeft het MCP niet — jij interpreteert.
- Geen aanbevelingen verzinnen die niet uit de data volgen. Als je iets niet weet, zeg dat.
- Geen percentages of cijfers verzinnen. Als de data ze niet geeft, geef ze niet.
- Geen productieve-modus-aggregaten (trends, week-over-week) — alleen als de data daar ruim genoeg voor is.

## Voorbeeld-interactie

**Gebruiker:** _"Maak een rapport voor Loyalty App over de laatste 14 dagen."_

**Jij (intern, niet tonen):**

1. `get_projects(search: "Loyalty App")` → project_id gevonden
2. `get_project_context(project_id)` → context, organisatie
3. `get_project_issues(project_id, days_back: 14)` → 23 issues
4. `get_project_activity(project_id, days_back: 14)` → 47 events
5. `get_issue_detail` voor 4 saillante issues
6. Schrijf rapport (6 secties, warm-persoonlijk)
7. Roep PDF-skill aan met titel/body/footer
8. Lever PDF in chat + korte samenvatting van wat er in zit
```

**Instructie voor gebruiker** (in README deliverable): kopieer de inhoud bovenaan naar Claude Desktop → Projects → [project aanmaken] → "Custom instructions". Of plak 'm als systeem-prompt in een losse chat. Test met de voorbeeld-interactie.

## Prerequisites

- [x] `issues`, `issue_comments`, `issue_activity` tabellen bestaan (DH-001)
- [x] `summaries` tabel met project-summaries aanwezig (core cockpit)
- [x] MCP server-basis met `getAdminClient`, `trackMcpQuery`, `escapeLike` (bestaand)

## Taken

- [ ] Maak `packages/database/src/queries/reports.ts` met de vier query-functies
- [ ] Maak `packages/mcp/src/tools/issues.ts` met `get_project_issues` + `get_issue_detail`
- [ ] Maak `packages/mcp/src/tools/project-report.ts` met `get_project_activity` + `get_project_context`
- [ ] Registreer beide tool-bestanden in `packages/mcp/src/server.ts`
- [ ] Update `kennisbasis-context` system-prompt met korte uitleg over de nieuwe tools
- [ ] Maak `docs/specs/claude-desktop-skills/project-report-skill.md` met de volledige skill-template (zie "Context → Claude Desktop skill-template")
- [ ] Maak `docs/specs/claude-desktop-skills/README.md` met korte uitleg hoe de skill in Claude Desktop te installeren
- [ ] Handmatig testen in Claude Desktop met de skill geladen: genereer een compleet rapport voor één echt project inclusief PDF-output

## Acceptatiecriteria

- [ ] [MCP-R01] `get_project_issues` retourneert issues binnen venster, gegroepeerd per status
- [ ] [MCP-R02] `days_back` default 14, accepteert 1-365
- [ ] [MCP-R03] Issue dat 2 maanden geleden is aangemaakt maar 3 dagen geleden gesloten staat in resultaat
- [ ] [MCP-R04] `status=done` retourneert alleen afgeronde; `type=feature_request` alleen features; gecombineerd werkt ook
- [ ] [MCP-R05] Output toont "Assigned: Wouter Banninga" of "Assigned: Niemand" — nooit UUIDs
- [ ] [MCP-R06] `get_issue_detail` toont comments met `author_name` en activity met `actor_name` + `old → new`
- [ ] [MCP-R07] `get_project_activity` groepeert per dag, chronologisch (nieuwste boven)
- [ ] [MCP-R08] `get_project_context` toont organisatie, owner, contactpersoon, context én briefing uit summaries
- [ ] [MCP-R09] Tools zijn aanroepbaar in Claude Desktop na server-herstart
- [ ] [MCP-R10] Output is leesbare markdown; geen ruwe JSON, geen UUIDs tenzij nodig voor vervolg-call
- [ ] [RULE-200] Elke tool-call registreert een rij in `mcp_queries`
- [ ] [RULE-201] Search/name-filters worden door `escapeLike()` gehaald
- [ ] [EDGE-200] Bij 0 resultaten: expliciete "Geen issues/activity gevonden in het venster van X dagen"
- [ ] `npm run lint` en `npm run type-check` passen
- [ ] [SKILL-01] Skill-template bestand bestaat op `docs/specs/claude-desktop-skills/project-report-skill.md`
- [ ] [SKILL-02] Skill-template bevat de 5-stappen workflow, toon-richtlijnen, en een voorbeeld-interactie
- [ ] [SKILL-03] Skill-template instrueert expliciet de PDF-skill aan te roepen als laatste stap
- [ ] **Integratietest:** met de skill geladen in Claude Desktop, vraag om "Maak een rapport voor [project]" → Claude roept de juiste MCP-tools aan, schrijft een warm-persoonlijk rapport met de 6 secties, en levert een PDF als bijlage

## Geraakt door deze sprint

- `packages/database/src/queries/reports.ts` (nieuw)
- `packages/mcp/src/tools/issues.ts` (nieuw)
- `packages/mcp/src/tools/project-report.ts` (nieuw)
- `packages/mcp/src/server.ts` (bijgewerkt — registreer nieuwe tools + system-prompt update)
- `docs/specs/claude-desktop-skills/project-report-skill.md` (nieuw — skill-template die in Claude Desktop geplakt wordt)
- `docs/specs/claude-desktop-skills/README.md` (nieuw — installatie- en gebruiksinstructie)
