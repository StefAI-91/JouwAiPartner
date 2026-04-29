# Micro Sprint WG-003: Widget UI + Cockpit Rollout

## Doel

De dummy-modal uit WG-002 vervangen door een echte feedback-modal: type-keuze (bug / idee / vraag), description-textarea, submit-knop, success/error-feedback. Bij submit POST naar het ingest-endpoint uit WG-001 met de auto-context (URL, viewport, userAgent). Daarna de widget uitrollen op cockpit door één `<script>`-tag in de root layout te plakken — zo dogfooden Stef + Wouter + Ege de eigen widget vóór klanten 'm zien.

## Requirements

| ID         | Beschrijving                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-040 | Modal-component in `apps/widget/src/widget/modal.tsx`: type-radio (bug/idee/vraag), textarea (min 10 tekens), submit-knop, close-knop                                                 |
| WG-REQ-041 | Type-keuze als 3 grote knoppen (niet dropdown) — visueel duidelijk, één klik. Iconen: bug/lightbulb/question-mark                                                                     |
| WG-REQ-042 | Form-validatie client-side: submit-knop disabled tot beschrijving ≥ 10 tekens en type gekozen                                                                                         |
| WG-REQ-043 | Auto-context bij submit: `url = window.location.href`, `viewport = { width, height }`, `user_agent = navigator.userAgent`                                                             |
| WG-REQ-044 | POST naar `apiUrl` (uit `mount`-config), body = `widgetIngestSchema`-payload, `Content-Type: application/json`                                                                        |
| WG-REQ-045 | States: idle → submitting (knop loading) → success (groene toast "Bedankt! Je feedback is ontvangen") → modal sluit na 2s. Error → rode toast met server-bericht                      |
| WG-REQ-046 | Modal sluit ook bij Escape-toets en klik buiten (overlay)                                                                                                                             |
| WG-REQ-047 | Styling: Shadow-scoped CSS, JAIP-design-tokens (kleuren matchen cockpit), responsive (mobile <640px = full-screen modal)                                                              |
| WG-REQ-048 | Geen client-side state-leak naar host-pagina: alle event listeners cleanup bij unmount                                                                                                |
| WG-REQ-049 | Cockpit root layout (`apps/cockpit/src/app/layout.tsx`) krijgt `<script src="https://widget.jouw-ai-partner.nl/loader.js" data-project={NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID} async>` |
| WG-REQ-050 | Env-var `NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID` toegevoegd aan cockpit (waarde = UUID uit WG-001 migratie)                                                                             |
| WG-REQ-051 | Documenteer in `docs/ops/deployment.md` welke env-vars per app gezet moeten worden                                                                                                    |
| WG-REQ-052 | Smoke-test: na deploy, klik op widget op cockpit, vul "Test bug — dit is een test" in, submit → row verschijnt in DevHub triage met label `'test'`                                    |

## Afhankelijkheden

- **WG-001** (ingest endpoint moet werken)
- **WG-002** (widget app gedeployed, loader+widget bundle live)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Reporter-identificatie?** Cockpit-gebruikers zijn ingelogd (Stef/Wouter/Ege). Willen we hun email/profiel meegeven aan de feedback (zodat triage weet wie 't was), of laten we 'm anoniem? Aanbeveling: **meesturen via een optionele `data-user-email` attribuut** of via een `window.__JAIPWidgetIdentify({ email })`-call. Voor V0: simpel — Cockpit zet `data-user-email={session.user.email}` op de script-tag bij Server Component-render. Klant-apps later: anoniem default.
- **Q2: Widget zichtbaar op alle cockpit-pagina's of alleen op specifieke?** Aanbeveling: alle pagina's (root layout). Als 't lastig wordt op specifieke flows, kunnen we `data-disabled-paths` toevoegen.
- **Q3: Modal-positionering bij mobile?** Aanbeveling: full-screen sheet vanaf onderkant op <640px viewport.

## Taken

### 1. Modal-component

`apps/widget/src/widget/modal.tsx`:

```tsx
import { useState } from "react";

type Type = "bug" | "idea" | "question";
type Status = "idle" | "submitting" | "success" | "error";

export function Modal({ projectId, apiUrl, userEmail, onClose }: {
  projectId: string;
  apiUrl: string;
  userEmail?: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<Type | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = type && description.trim().length >= 10 && status === "idle";

  async function submit() {
    if (!canSubmit) return;
    setStatus("submitting");
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          type,
          description: description.trim(),
          context: {
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            user_agent: navigator.userAgent,
          },
          reporter_email: userEmail ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "submit_failed");
      }
      setStatus("success");
      setTimeout(onClose, 2000);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Onbekende fout");
    }
  }

  return (/* JSX met overlay, type-knoppen, textarea, submit-knop */);
}
```

### 2. Styles

`apps/widget/src/widget/styles.css` — Shadow-scoped, design-tokens via CSS-variabelen die later overridable zijn per host.

### 3. Mount-update

`src/widget/index.tsx` — vervang dummy door `<Modal>`-render. `mount()` accepteert nu ook `userEmail` uit de loader-config.

### 4. Loader-update

`src/loader/index.ts` — lees ook `data-user-email` van de script-tag, geef door aan `mount()`.

### 5. Cockpit-integratie

`apps/cockpit/src/app/layout.tsx` (Server Component):

```tsx
import { getCurrentUser } from "@/lib/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const projectId = process.env.NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID;

  return (
    <html>
      <body>
        {children}
        {projectId ? (
          <script
            src="https://widget.jouw-ai-partner.nl/loader.js"
            data-project={projectId}
            data-user-email={user?.email ?? undefined}
            async
          />
        ) : null}
      </body>
    </html>
  );
}
```

### 6. Env-var

- `apps/cockpit/.env.example` krijgt `NEXT_PUBLIC_JAIP_PLATFORM_PROJECT_ID=00000000-0000-0000-0000-00000000aa01`
- Vercel cockpit-project: idem (production + preview)

### 7. Documentatie

- `docs/ops/deployment.md`: nieuwe env-var vermelden, stappen om widget op een nieuwe app te installeren
- `apps/widget/README.md` updaten met sectie "Installatie op een JAIP-app"

### 8. Smoke-test (handmatig)

1. Deploy WG-001, WG-002, WG-003 naar staging
2. Open `https://cockpit.jouw-ai-partner.nl` (of staging-equivalent)
3. Klik op "Feedback"-button rechtsonder
4. Selecteer "Bug", typ "Test bug — dit is een test om de pipeline te checken"
5. Submit
6. Open DevHub → triage → controleer:
   - Nieuwe issue met `source = jaip_widget`
   - `source_url` = de cockpit-pagina-URL
   - `source_metadata.viewport` en `user_agent` aanwezig
   - `reporter_email` = ingelogde user
   - Label `'test'` aanwezig (test-pattern matcht)

## Acceptatiecriteria

- [ ] WG-REQ-040..042: modal opent, 3 type-knoppen werken, validatie blokkeert submit < 10 tekens
- [ ] WG-REQ-043..044: payload bevat correcte `context` en POST naar widget-endpoint
- [ ] WG-REQ-045: success-flow toont toast + sluit modal; error-flow toont rode toast
- [ ] WG-REQ-046: Escape sluit modal; klik op overlay sluit modal
- [ ] WG-REQ-047: styling werkt op desktop (modal centered) én mobile (bottom-sheet)
- [ ] WG-REQ-048: na sluiten zijn er geen residual event-listeners op `window`/`document` (DevTools-check)
- [ ] WG-REQ-049: script-tag aanwezig in HTML van elke cockpit-pagina
- [ ] WG-REQ-050: env-var staat in `.env.example` en op Vercel
- [ ] WG-REQ-052: smoke-test slaagt end-to-end op staging
- [ ] Bundle-size CI: widget.js nog steeds < 50KB gzip
- [ ] Type-check + lint slagen op alle gewijzigde apps

## Risico's

| Risico                                                               | Mitigatie                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cockpit-layout breekt door extra `<script>` (CSP, etc.)              | Cockpit heeft nog geen strikte CSP. Toevoegen aan deployment-doc als toekomstig CSP-werk        |
| Reporter-email lekt naar widget-bundle bij niet-ingelogde gebruikers | Server Component checkt session vóór render; geen email = `undefined` attribuut, niets gestuurd |
| Test-pattern detecteert echte bug-rapporten als test                 | Patronen zijn streng (max 80 tekens + matcht "test", "dit is een test"). Voor V0 oké            |
| Modal opent achter andere fixed elements op cockpit                  | `z-index: 2147483647` op host, Shadow DOM zorgt voor isolatie van overige styling               |
| Submit faalt door rate-limit als team een demo doet                  | Rate-limit is 30/uur per Origin — voor demo aanpassen of verhogen tijdens preview               |

## Bronverwijzingen

- WG-001: ingest-endpoint specs
- WG-002: widget-app foundation
- CLAUDE.md: feature-structuur (cockpit root layout — platform code, niet feature)

## Vision-alignment

Vision §Delivery → §Cockpit-loop: zelfs interne tooling (cockpit) is een "shipped product" voor het JAIP-team. Door de eigen widget eerst op cockpit te dogfooden, valideren we de loop voordat klant-apps 'm krijgen. Zelfde principe als verification-first: niet uitrollen wat we niet zelf gebruiken.
