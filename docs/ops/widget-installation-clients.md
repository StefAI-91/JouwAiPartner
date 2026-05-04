# JAIP Widget — Installatie voor klant-apps

> Voor klanten die de JAIP feedback-widget op hun eigen app willen plaatsen.
> Voor JAIP-eigen apps (cockpit/devhub/portal) zie `widget-migration.md`.

## Wat het is

Eén `<script>`-tag die een feedback-knop rechtsonder toevoegt. De
gebruiker klikt, kiest type (bug/idee/vraag), typt een korte beschrijving,
verstuurt. Wij ontvangen het in DevHub triage en handelen het af.

- Laad-impact: ±0,9 KB gzip op pageload (de loader). De modal-bundle (±11
  KB gzip) wordt pas gehaald na de eerste klik.
- Geen build-stap nodig — alleen één regel HTML toevoegen.
- Werkt op Chrome, Edge, Firefox, Safari (laatste 2 versies + iOS Safari 16+).

## Stappen

### 1. JAIP geeft je een snippet

Een DevHub-admin (Stef/Wouter/Ege) voegt jouw productie-domein toe aan de
whitelist in DevHub `/settings/widget`. Daarna krijg je een snippet zoals:

```html
<script
  src="https://widget.jouw-ai-partner.nl/loader.js"
  data-project="00000000-0000-4000-8000-XXXXXXXXXXXX"
  async
></script>
```

De `data-project`-UUID is voor jou — die mapt feedback aan jouw project in
onze backend.

### 2. Plaats de snippet vóór `</body>`

In je root layout / template, vlak voor de afsluitende `</body>`. Voor
Next.js, Vue, Angular: in de root template; voor een SPA na een client-
side route-change is geen herinitialisatie nodig.

### 3. (Optioneel) Stuur het email-adres mee

Zo zien we wie er feedback gaf — handig voor follow-up. Twee opties:

**Optie A — server-side (bij SSR-frameworks):**

```html
<script
  src="https://widget.jouw-ai-partner.nl/loader.js"
  data-project="..."
  data-user-email="ingelogd-email@klant.nl"
  async
></script>
```

**Optie B — runtime (bij SPA's die het email pas na hydration weten):**

```js
// Nadat je auth-state geladen is:
window.__JAIPWidgetIdentify({ email: user.email });
```

Beide laat je weg voor anonieme submissions.

### 4. CSP (Content Security Policy)

Als je een strikte CSP hebt: voeg toe aan je directives —

```
script-src 'self' https://widget.jouw-ai-partner.nl;
connect-src 'self' https://devhub.jouw-ai-partner.nl;
```

`script-src` voor de loader, `connect-src` voor de POST naar het ingest-
endpoint. De modal zelf draait in een Shadow DOM, dus je `style-src`
hoeft niet aangepast.

### 5. Test

1. Open je app in productie (of staging als je daar test).
2. Klik rechtsonder op de zwarte "Feedback"-knop.
3. Vul "Bug" + "Test bug — eerste integratie test" in en verstuur.
4. Stem af met JAIP — wij zien de issue in DevHub triage en geven het
   label `'test'` zodat hij niet bij jouw eigen klanten zichtbaar wordt
   in het Portal.

## Wat de gebruiker ziet

- Zwarte knop rechtsonder, rond, met tekst "Feedback".
- Klik opent een modal met type-keuze (bug/idee/vraag), beschrijving (min
  10 tekens), **Screenshot toevoegen** (optioneel), Versturen / Annuleren.
  Op mobile (<640 px) opent hij als bottom-sheet.
- Toetsenbord-bediening: Tab loopt rond binnen de modal, Escape sluit.
- Bij succes: groen vinkje + "Bedankt! Je feedback is ontvangen." Modal
  sluit na 2 seconden.

### Screenshot-feature (WG-006)

De "Screenshot toevoegen"-knop maakt een afbeelding van het zichtbare
viewport (geen full-page) en toont een preview vóór submit. Geen
permission-prompt — wij gebruiken `html2canvas` (DOM-render), niet de
browser's screen-share API.

- Geen actie nodig vanuit de klant-developer — werkt zodra de widget-
  bundle ververst (cache-TTL 5 min).
- CSP: geen extra directives nodig boven wat in §4 staat. De capture-
  bundle `widget-screenshot.js` wordt via dezelfde `script-src
https://widget.jouw-ai-partner.nl` geladen.
- Cross-origin images zonder `crossorigin="anonymous"` worden niet
  meegerenderd — dat is een html2canvas-beperking, niet onze keuze.
- Privacy: cijferinvoer / wachtwoorden / persoonsgegevens worden
  gewoon meegescreenshot. Wil je elementen uitsluiten? Voeg
  `data-html2canvas-ignore` attribuut toe aan die element(en).

## Wat JAIP ontvangt

Bij elke submission:

- Type (bug/idea/question)
- Beschrijving
- URL waar de gebruiker stond (`window.location.href`)
- Viewport-grootte + user-agent (voor reproductie)
- Email als je dat meegegeven hebt

We ontvangen **geen** screenshots, **geen** session-recordings, **geen**
DOM-state, **geen** console-logs. Bewust — minder data, minder zorgen
voor jou.

## Wat de klant in zijn Portal ziet

Submissies komen voor jou + je teamleden in `/projects/[id]/feedback` +
`/projects/[id]/issues` (bucket "Onze meldingen") in het JAIP klant-portal.
Test-submissies (label `'test'`) zijn standaard verborgen. Geen `viewport`,
`user_agent` of `reporter_email` — die zijn intern voor JAIP-triage.

## Limieten en SLA

- **Rate-limit (vanaf WG-005)**: max 30 POST's per uur per Origin. Boven
  de limit krijgt de gebruiker een nette foutmelding. Limiet kan omhoog
  als je legitiem volume hoger ligt — laat het weten.
- **Geen SLA op uptime** — best-effort. Bij 5xx-fouten geeft de modal een
  link naar `https://status.jouw-ai-partner.nl`.
- **Geen rate-limit-bypass via runtime-`Identify`** — die wijzigt alleen
  het email-veld, niet de Origin. Origin-whitelist + rate-limit blijven
  altijd gelden.

## Snippet weghalen

Loader-tag verwijderen volstaat. We laten het project + historie
gewoon staan — als je later weer wil aanzetten, ping ons om je domein
weer op de whitelist te zetten.

## Vragen / problemen

Mail Stef of open een issue in jouw klant-portal. Bij echte uitval
(widget laadt niet, knop verschijnt niet): check eerst de browser
console voor `[JAIP Widget]`-warnings — die wijzen vaak meteen naar de
oorzaak (verkeerd `data-project`, CSP-blok, of script-src foutief).
