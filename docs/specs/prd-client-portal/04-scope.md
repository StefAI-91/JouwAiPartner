# 4. Scope

## Reeds opgeleverd in eerdere sprints (zie `docs/archive/portal-mvp.md`)

- `apps/portal` Next.js 16 + Tailwind v4 scaffolding (CP-002)
- Email-OTP login + auth callback (CP-002)
- Client role op `profiles` + `portal_project_access` koppeltabel (CP-001)
- RLS-policies: clients zien alleen eigen org-projecten + verified content (CP-001)
- Middleware role-gating `["admin","client"]`, members → DevHub (CP-002)
- Project-overzicht en project-dashboard (CP-003)
- Basis issue-lijst en detail-pagina (`apps/portal/src/app/(app)/projects/[id]/issues/`) (CP-004)
- Feedback-formulier + `submitFeedback` action met `source: 'portal'` (CP-005, `apps/portal/src/app/(app)/projects/[id]/feedback/` + `apps/portal/src/actions/feedback.ts`)

## In scope (MVP — Stefan First)

- **Vier-bucket overzicht**: `Ontvangen` / `Ingepland` / `In behandeling` / `Afgerond` (mapping bestaat in `PORTAL_STATUS_GROUPS`)
- **Source-switch**: tab/toggle in de issue-list tussen
  - **Onze meldingen** = `source IN ('portal','userback')`
  - **JAIP-meldingen** = `source IN ('manual','ai')`
  - **Alles** (default)
- **Type-filter tabs**: `Alles` / `Bugs` / `Features` (orthogonaal aan de source-switch)
- **Optionele klant-vriendelijke titels/beschrijvingen**: `client_title` en `client_description` op `issues`. Fallback naar `title` / `description` als leeg.
- **DevHub issue-editor uitbreiden** met twee velden voor `client_title` en `client_description`
- **Read-only mobiele weergave** voor het dashboard
- **Productie-deploy** op `https://portal.jouw-ai-partner.nl/`

## Expliciet buiten scope (v1)

- **Per-issue zichtbaarheids-toggle (`client_visible`)** — _Geschrapt na review 2026-04-27._ Alle issues van een project waar de klant toegang toe heeft zijn zichtbaar; de switch maakt de bron transparant in plaats van issues te verbergen.
- **Automatische `client_visible`-regels (label-based)** — Geschrapt; geen visibility-mechanisme in v1.
- **`audit_log` tabel + visibility-trigger** — Geschrapt; geen visibility-changes om te loggen.
- **`has_production_impact` indicator** — Geschrapt; alle issues zichtbaar dus geen aparte uitlichting nodig in v1.
- **Voting/prioritering door klant** — v2.
- **Sign-off flow op deliverables** — v2.
- **Comments per issue** — v2 (vereist notificaties + threading).
- **SLA-overzicht en responstijden** — v2 (vraagt SLA-definitie per klant).
- **Meeting-samenvattingen via JAIP MCP** — v2.
- **Sprint-roadmap-weergave** — v2 (bucket-weergave dekt al "wanneer komt het?").
- **Document-delen (voorstellen, AV, oplevering)** — v2.
- **AI-powered Q&A (Communicator agent)** — uitgesteld.
- **Notificaties (email/push)** — uitgesteld.
- **Klant-specifieke branding/theming** — uitgesteld.

## Toekomstige uitbreidingen (v2+)

> Deze v1 dekt alleen het issue-stuk van het portaal. De volledige portal-laag uit
> [`docs/specs/vision-ai-native-architecture.md`](../vision-ai-native-architecture.md) §2.4 ("trust layer")
> wordt fasegewijs opgebouwd. De punten hieronder zijn de bouwstenen die daarna volgen.

- **Voting** — Voorwaarde: v1 valideert dat klanten het overzicht waarderen.
- **Sign-off** — Voorwaarde: v1 toont dat klant de portal actief gebruikt.
- **Comments** — Voorwaarde: v1 levert engagement; commentstroom vereist notificatie-infrastructuur.
- **AI-hertaling van `client_title` / `client_description`** — Aparte spec. In v1 vullen JAIP-admins de velden handmatig in via DevHub.
- **Portal-uitbreiding naar volledige transparantielaag** (vision §2.4) — meeting-summaries (datum + samenvatting, geen transcripts), open action items, decisions en project-milestones. Voorwaarde: v1-bucketview heeft Stefan-validatie gehad én datamodel voor projectfases bestaat.
- **AI Account Manager-laag** (vision §2.4) — Q&A op verified content (klant stelt vraag, AI drafts antwoord, mens reviewt vóór verzending), weekly status drafts, klant-sentiment-flagging richting team. Vereist verifier-gate analoog aan Cockpit-pipelines (zie `vision-ai-native-architecture.md` §"Verification before truth"). Aparte spec.
- **Productie-issues sectie** (eindgebruiker error logging zoals Sentry) — Voorwaarde: error logging-koppeling per klant project.
- **Milestones / timeline** — Voorwaarde: datamodel voor projectfases.
