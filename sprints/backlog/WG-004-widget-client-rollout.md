# Micro Sprint WG-004: Widget Client-App Rollout

## Doel

Eigen feedback-widget uitrollen op de eerste klant-app. Vision §Delivery is _juist_ de klant-app — cockpit-dogfooding (WG-003) was fase 1, dit is de échte test. Sprint dekt: admin-UI om whitelist-domains te beheren, klant-onboarding-flow (project_id + script-tag genereren), Userback-route harmoniseren met dezelfde Upstash-util (drift-fix), en cutover-decision op basis van WG-003-data.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-070 | Admin-UI in DevHub: pagina `/admin/widget-domains` waar jaip_admin per project domains kan toevoegen/verwijderen via `widget_allowed_projects`-tabel                                                                                    |
| WG-REQ-071 | Snippet-generator: per project een copy-paste-`<script>`-tag met juiste `data-project={uuid}` en optionele `data-user-email`-instructie. Toon in de admin-UI                                                                            |
| WG-REQ-072 | Klant-onboarding-doc in `docs/ops/widget-installation-clients.md`: stappenplan voor klant om script-tag te plaatsen, hoe email/identify werkt, wat klant-zijdig nodig is (geen build-stap, alleen `<script>`)                           |
| WG-REQ-073 | Eerste klant-pilot: kies één live klant-app, voeg domein toe aan whitelist, plaats script-tag in samenwerking met klant. Documenteer welke klant in `docs/ops/widget-migration.md`                                                      |
| WG-REQ-074 | **Userback-route harmoniseren**: `apps/devhub/src/app/api/ingest/userback/route.ts` gebruikt nu in-memory rate-limit. Vervang door dezelfde Upstash-util uit WG-001 (drift-fix). Beide routes delen `apps/devhub/src/lib/rate-limit.ts` |
| WG-REQ-075 | **Cutover-beslissing op cockpit**: na 14+ dagen parallel-run (WG-REQ-055), evalueer cutover-criteria uit WG-REQ-056. Als groen: verwijder Userback-script uit `apps/cockpit/src/app/layout.tsx` en stop polling-job van DH-007          |
| WG-REQ-076 | Audit-trail op whitelist-mutaties: insert/delete in `widget_allowed_projects` schrijft naar bestaande `audit_events` tabel (wie, wanneer, welk domein toegevoegd)                                                                       |
| WG-REQ-077 | Status-page-link: als Upstash of ingest-endpoint down is, geeft de error-response een link naar `https://status.jouw-ai-partner.nl` (placeholder URL — apart sprint voor echte status-page)                                             |

## Afhankelijkheden

- **WG-001** + **WG-002** + **WG-003** moeten af zijn én cockpit-dogfooding ≥ 14 dagen schoon
- Bestaand: `audit_events`-tabel
- Bestaand: jaip_admin-rol in `profiles`

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Welke klant krijgt de eerste rollout?** Aanbeveling: kies een klant met (a) actieve relatie, (b) eenvoudige web-app (één domein), (c) bereid om te dogfooden. Niet: eerste roll-out op een klant met strikt change-management.
- **Q2: Userback-cutover: nu of na klant-rollout?** Aanbeveling: **na**. Eerst klant-rollout valideren met cockpit-Userback nog actief als veilige fallback. Pas Userback eruit als beide rollouts (cockpit + 1 klant) ≥ 14 dagen schoon.
- **Q3: Identify-API voor klant-apps zonder server-rendering?** Klant kan `<script>data-user-email="…"</script>` server-side niet altijd vullen. Aanbeveling: ondersteun ook `window.__JAIPWidgetIdentify({ email })` runtime-call zodat SPA's na auth de email kunnen meegeven. Toevoegen aan loader.

## Taken

### 1. Admin-UI (DevHub feature)

`apps/devhub/src/features/widget/` (nieuwe feature):

- `components/widget-domains-table.tsx` — lijst projects + domains
- `components/add-domain-dialog.tsx` — modal met project-select + domain-input
- `actions/widget-domains.ts` — `addDomain`, `removeDomain` server actions, Zod-gevalideerd, schrijft via mutation-helper + audit_event
- `validations/widget-domains.ts` — Zod schema (domain regex: hostname only, geen protocol of pad)

Update CLAUDE.md feature-registry: DevHub krijgt nieuwe feature `widget`.

### 2. Snippet-generator

In `widget-domains-table.tsx` per rij een "Snippet" knop die toont:

```html
<script src="https://widget.jouw-ai-partner.nl/loader.js" data-project="<uuid>" async></script>
```

Met copy-button en uitleg: "Voor ingelogde gebruikers: voeg `data-user-email='…'` toe of roep `window.__JAIPWidgetIdentify({ email })` aan na login."

### 3. Loader-update: identify-API

`apps/widget/src/loader/index.ts` — voeg toe:

```ts
(window as any).__JAIPWidgetIdentify = (info: { email: string }) => {
  // Update interne config; volgende mount() gebruikt nieuwe email
  internalConfig.userEmail = info.email;
};
```

### 4. Userback-route harmoniseren

- Verplaats Upstash-util uit `apps/devhub/src/lib/rate-limit.ts` naar gedeelde signature
- `apps/devhub/src/app/api/ingest/userback/route.ts` gebruikt zelfde `rateLimitOrigin()` — alleen prefix-key verschilt (`userback_ingest` vs `widget_ingest`)
- Verwijder oude in-memory rate-limit code uit userback-route

### 5. Audit-events op whitelist-mutaties

Wrap `addDomain` en `removeDomain` zodat ze ook een rij in `audit_events` schrijven:

```ts
{ event_type: "widget_domain_added", target_id: project_id, metadata: { domain }, actor_id: session.user.id }
```

### 6. Cutover-beslissing (cockpit)

**Niet uitvoeren tot na go/no-go-meeting.** Stappen wanneer go:

1. Verwijder `<script src="https://userback.io/…">` uit `apps/cockpit/src/app/layout.tsx`
2. Pause de Userback-polling-job (DH-007) — niet verwijderen, voor het geval rollback nodig
3. Update `docs/ops/widget-migration.md` met cutover-datum
4. Communicatie naar team: "Userback is uit, gebruik nu de zwarte Feedback-button"

### 7. Klant-rollout (handmatig + gedocumenteerd)

1. Kies klant (zie Q1)
2. Voeg domein toe via admin-UI
3. Stuur snippet naar klant met installatie-uitleg
4. Bevestig dat first feedback binnenkomt in DevHub triage
5. Documenteer in `docs/ops/widget-migration.md` welke klant + datum + eerste-feedback-id

### 8. Status-page-link in error responses

Update WG-001-route en userback-route: bij 5xx errors include `{ status_page: "https://status.jouw-ai-partner.nl" }` in body. Echte status-page is aparte sprint — voor V0 is een "we werken eraan"-pagina genoeg.

## Acceptatiecriteria

- [ ] WG-REQ-070: admin kan domein toevoegen/verwijderen in DevHub UI
- [ ] WG-REQ-071: snippet-generator toont correcte script-tag, copy-button werkt
- [ ] WG-REQ-072: `docs/ops/widget-installation-clients.md` bestaat
- [ ] WG-REQ-073: eerste klant-app heeft live widget; eerste echte feedback-issue zichtbaar in DevHub
- [ ] WG-REQ-074: Userback-route en widget-route delen één rate-limit-util — `apps/devhub/src/lib/rate-limit.ts` heeft één export, beide routes importeren ervan
- [ ] WG-REQ-075: Userback-script weg uit cockpit-layout (na go-beslissing); `git log` toont commit met cutover-datum
- [ ] WG-REQ-076: audit_events bevat rijen voor whitelist-mutaties; gefilterd zichtbaar in admin-UI
- [ ] WG-REQ-077: 5xx-responses bevatten status_page-link
- [ ] `npm run check:queries` blijft groen
- [ ] Type-check + lint + e2e (uit WG-003) slagen

## Risico's

| Risico                                                              | Mitigatie                                                                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Klant-app heeft strikte CSP die script.jouw-ai-partner.nl blokkeert | Documenteer in installation-doc welke CSP-directive nodig is (`script-src 'self' https://widget.jouw-ai-partner.nl`)       |
| Userback-cutover te vroeg → feedback-volume zakt in                 | Cutover-criteria zijn data-driven (≥ 14 dagen, vergelijkbare submission-rate). Niet gokken — meten                         |
| Klant verandert van domein zonder ons in te lichten                 | Whitelist-CRUD is snel, admin-UI maakt 't 1-minuut-aanpassing. Reactief acceptabel voor V0                                 |
| Identify-API misbruikt om andermans email te spoofen                | Reporter_email is informatief, niet authenticatief. Triage gebruikt 't als hint, niet als bewijs. Documenteer in audit-doc |
| Eerste klant ervaart bug die we op cockpit niet zagen               | Userback blijft op cockpit aan tot na klant-rollout (Q2). Rollback-pad: domein uit whitelist verwijderen = widget dood     |

## Bronverwijzingen

- WG-001..WG-003: alle voorgaande widget-sprints
- DH-007: Userback API-integratie (te deprecaten)
- `docs/ops/widget-migration.md`: cutover-criteria

## Vision-alignment

Vision §Delivery: feedback-widget op klant-apps is dé brug van Delivery → DevHub. WG-001..003 was JAIP-eigen platform; WG-004 is de échte vision-realisatie. Userback-cutover sluit de loop: één tool, één pipeline, volledig eigendom van de feedback-stroom.
