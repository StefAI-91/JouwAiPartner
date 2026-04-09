# PRD: Feedback Widget & Feedback Module

> **Status:** Draft
> **Date:** 2026-04-09
> **Owner:** Stef Banninga
> **Version:** 1.0

---

## 1. Context & Probleem

### 1.1 Waarom dit bestaat

Jouw AI Partner bouwt applicaties voor klanten. Na oplevering komt feedback binnen via losse kanalen: email, meetings, WhatsApp, mondeling. Dit leidt tot:

- **Vergeten feedback** — bugs en ideeën raken kwijt tussen kanalen
- **Geen overzicht** — per project is onduidelijk welke issues open staan
- **Geen koppeling** — feedback zit niet in het kennisplatform, dus AI kan er niet mee werken
- **Handmatig werk** — alles moet handmatig bijgehouden worden

### 1.2 Wat we oplossen

Een eigen feedback-systeem dat:

1. Klanten een simpele manier geeft om bugs en ideeën te melden vanuit de applicatie
2. Feedback automatisch koppelt aan het juiste project in het cockpit
3. Feedback onderdeel maakt van de kennisbank (doorzoekbaar, analyseerbaar)

### 1.3 Waarom eigen systeem (niet Userback)

- Userback API/webhooks vereisen Business+ plan (niet beschikbaar op huidig plan)
- Alle data blijft in eigen Supabase — direct queryable via MCP
- Past in het verificatiemodel en AI pipeline
- Geen externe afhankelijkheid voor kernfunctionaliteit
- Kostenefficiënt bij groei

---

## 2. Gebruikers

| Gebruiker           | Rol                                      | Interactie                                             |
| ------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **Klant-gebruiker** | Eindgebruiker van opgeleverde applicatie | Meldt bugs en deelt ideeën via widget                  |
| **Stef**            | Platform owner                           | Beheert feedback, wijzigt statussen, plant oplossingen |
| **Wouter**          | Commercieel                              | Ziet feedback per klant als signaal voor relatiebeheer |
| **Ege**             | Engineer                                 | Ziet bugs per project, pakt issues op                  |
| **Kenji/Myrrh**     | Outsource developers                     | Zien bugs voor hun projecten                           |

---

## 3. Scope

### 3.1 V1 — In scope

**Widget (apps/widget/):**

- Floating button (rechtsonder) in klant-applicaties
- Twee feedback types: Bug en Idee
- Formulier: type + beschrijving + optioneel email
- Automatisch meesturen: pagina URL, browser/OS, schermgrootte, tijdstip
- Geïdentificeerd via project_key (data-attribuut op script tag)
- Lichtgewicht: < 30kb gebundeld
- Responsive (desktop + mobiel)

**Database (packages/database/):**

- `feedback` tabel in Supabase
- project_key kolom op `projects` tabel
- Queries: listFeedbackByProject, getFeedbackById, getFeedbackCounts
- Mutations: createFeedback, updateFeedbackStatus

**API (apps/cockpit/):**

- `POST /api/feedback` — publiek endpoint voor widget submissions (rate limited)
- Validatie via Zod
- CORS configuratie voor klant-domeinen

**Cockpit UI (apps/cockpit/):**

- Feedback tab per project met lijst (type, status, datum, beschrijving)
- Status wijzigen: nieuw → in behandeling → opgelost / afgewezen
- Detail view per feedback item
- Embed script kopiëren bij project instellingen
- Project aanmaken genereert automatisch een project_key

### 3.2 V1 — Niet in scope (later)

- Screenshot capture (html2canvas)
- Bestand uploads / bijlagen
- Widget styling configureerbaar per project (kleur, positie, taal)
- Email notificaties bij nieuwe feedback
- Slack integratie
- AI classificatie / prioritering van feedback
- MCP tool voor feedback queries
- Feedback embeddings (doorzoekbaar via vector search)
- Publieke status pagina per project ("known issues")
- Reactie/reply naar klant vanuit cockpit

---

## 4. User Flows

### 4.1 Project setup (eenmalig)

```
Stef maakt project aan in cockpit
    ↓
Systeem genereert unieke project_key (bijv. "proj_a1b2c3d4")
    ↓
Cockpit toont embed script:
  <script src="https://widget.jouwaipartner.nl/v1/feedback.js" data-key="proj_a1b2c3d4"></script>
    ↓
Developer plakt script in klant-applicatie
    ↓
Widget verschijnt — klaar voor gebruik
```

### 4.2 Klant meldt bug

```
Klant ziet bug in applicatie
    ↓
Klikt op floating feedback button (rechtsonder)
    ↓
Kiest "Bug"
    ↓
Typt beschrijving: "Factuur download werkt niet op Safari"
    ↓
Optioneel: vult email in voor follow-up
    ↓
Klikt "Versturen"
    ↓
Widget toont bevestiging: "Bedankt! We kijken ernaar."
    ↓
Data wordt verstuurd naar POST /api/feedback
    ↓
Feedback verschijnt in cockpit onder project
```

### 4.3 Team behandelt feedback

```
Stef/Ege opent cockpit → Project "Klant X Portal" → Feedback tab
    ↓
Ziet: 3 nieuwe bugs, 2 ideeën
    ↓
Opent bug: "Factuur download werkt niet op Safari"
  → Ziet: beschrijving, pagina URL, browser (Safari 18.2), datum
    ↓
Wijzigt status: nieuw → in behandeling
    ↓
Bug wordt opgelost
    ↓
Wijzigt status: in behandeling → opgelost
```

---

## 5. Data Model

### 5.1 Nieuwe tabel: `feedback`

```sql
feedback
  id UUID PK DEFAULT gen_random_uuid()
  project_id UUID NOT NULL FK -> projects ON DELETE CASCADE
  type TEXT NOT NULL                     -- 'bug' | 'idea'
  status TEXT NOT NULL DEFAULT 'new'     -- 'new' | 'in_progress' | 'resolved' | 'dismissed'
  description TEXT NOT NULL
  reporter_email TEXT                    -- optioneel, voor follow-up
  page_url TEXT                          -- automatisch: window.location.href
  user_agent TEXT                        -- automatisch: navigator.userAgent
  screen_size TEXT                       -- automatisch: "1920x1080"
  metadata JSONB DEFAULT '{}'           -- toekomstige extensie (screenshots, custom fields)
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

### 5.2 Wijziging: `projects` tabel

```sql
ALTER TABLE projects ADD COLUMN project_key TEXT UNIQUE;
```

- Wordt automatisch gegenereerd bij project aanmaak
- Format: `proj_` + 12 random alfanumerieke tekens (bijv. `proj_a1b2c3d4e5f6`)
- Gebruikt door widget om feedback aan project te koppelen
- Publiek zichtbaar (in script tag), maar niet gevoelig — alleen voor routing

### 5.3 RLS Policies

```sql
-- Feedback: publiek inserten (widget), authenticated lezen/updaten
CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view feedback" ON feedback FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update feedback" ON feedback FOR UPDATE USING (auth.role() = 'authenticated');
```

---

## 6. Technische Architectuur

### 6.1 Widget (apps/widget/)

```
apps/widget/
├── src/
│   ├── index.ts              -- Entry point: leest data-key, mount widget
│   ├── widget.ts             -- Floating button + formulier logica
│   ├── api.ts                -- POST naar /api/feedback
│   └── styles.ts             -- CSS-in-JS (geen externe stylesheet nodig)
├── build.config.ts           -- Bundler config (output: single JS file)
└── package.json
```

**Technische keuzes:**

- **Vanilla TypeScript** — geen framework, minimale bundle size
- **Shadow DOM** — widget styling lekt niet naar klant-app en vice versa
- **CSS-in-JS** — styles gebundeld in het script, geen apart CSS bestand
- **Single file output** — één `feedback.js` bestand, hosted op CDN/Vercel

**Bundle size budget:** < 30kb gzipped

### 6.2 API Endpoint

```
POST /api/feedback
Content-Type: application/json

{
  "project_key": "proj_a1b2c3d4e5f6",
  "type": "bug" | "idea",
  "description": "...",
  "reporter_email": "...",        // optioneel
  "page_url": "...",
  "user_agent": "...",
  "screen_size": "1920x1080"
}

Response: 201 { success: true }
```

**Beveiliging:**

- Rate limiting: max 10 submissions per IP per minuut
- Zod validatie op alle velden
- CORS: beperkt tot geregistreerde domeinen (of wildcard in v1)
- project_key moet bestaan in database
- Beschrijving: min 10, max 2000 tekens
- Geen auth vereist (publiek endpoint)

### 6.3 Cockpit UI

Nieuwe feedback sectie onder projecten:

```
/projects/[id]                    -- bestaande project detail pagina
/projects/[id]/feedback           -- feedback lijst (nieuw)
/projects/[id]/feedback/[id]      -- feedback detail (nieuw)
/projects/[id]/settings           -- embed script + project_key (nieuw)
```

---

## 7. Embed Ervaring

### 7.1 Script tag

```html
<script src="https://widget.jouwaipartner.nl/v1/feedback.js" data-key="proj_a1b2c3d4e5f6"></script>
```

### 7.2 Alternatief: npm package (later)

```bash
npm install @jouwaipartner/feedback-widget
```

```typescript
import { FeedbackWidget } from "@jouwaipartner/feedback-widget";
FeedbackWidget.init({ projectKey: "proj_a1b2c3d4e5f6" });
```

### 7.3 Kopieer-ervaring in cockpit

Bij project settings:

```
┌─────────────────────────────────────────────┐
│  Feedback Widget                            │
│                                             │
│  Plak dit script in je applicatie:          │
│  ┌─────────────────────────────────────┐    │
│  │ <script src="https://widget..." /> │    │
│  └─────────────────────────────────────┘    │
│  [Kopiëren]                                 │
│                                             │
│  Status: Actief (3 feedback items)          │
└─────────────────────────────────────────────┘
```

---

## 8. Widget UI Specificatie

### 8.1 Floating Button

- Positie: rechtsonder (fixed, 24px van rand)
- Vorm: rond, 48px diameter
- Kleur: primary brand color
- Icoon: chat/feedback icoon
- Hover: lichte schaal-animatie
- Mobiel: zelfde positie, iets kleiner (40px)

### 8.2 Feedback Formulier (na klik)

```
┌──────────────────────────────────┐
│  Feedback                    ✕   │
│                                  │
│  Wat wil je delen?               │
│                                  │
│  [ Bug ]  [ Idee ]              │
│                                  │
│  Beschrijving *                  │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  Email (optioneel)               │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  └──────────────────────────┘    │
│                                  │
│  [     Versturen     ]           │
│                                  │
│  Powered by Jouw AI Partner      │
└──────────────────────────────────┘
```

### 8.3 States

| State            | Gedrag                                          |
| ---------------- | ----------------------------------------------- |
| **Gesloten**     | Alleen floating button zichtbaar                |
| **Open**         | Formulier zichtbaar, button wordt sluit-icoon   |
| **Versturen**    | Button disabled, loading spinner                |
| **Succes**       | "Bedankt! We kijken ernaar." — sluit na 2 sec   |
| **Error**        | "Er ging iets mis. Probeer het opnieuw."        |
| **Rate limited** | "Even geduld, probeer over een minuut opnieuw." |

---

## 9. Succes Criteria

### V1 Launch

- [ ] Widget laadt correct in een externe applicatie via script tag
- [ ] Bug en idee feedback komt aan in Supabase
- [ ] Cockpit toont feedback per project met correcte status flow
- [ ] Project aanmaken genereert automatisch project_key
- [ ] Embed script is kopieerbaar vanuit cockpit
- [ ] Widget bundle < 30kb gzipped
- [ ] Rate limiting werkt (max 10/min per IP)
- [ ] Widget werkt op mobiel en desktop
- [ ] Shadow DOM voorkomt CSS conflicten

### Metrics (na 1 maand)

- Aantal projecten met widget geïnstalleerd
- Aantal feedback items per project
- Gemiddelde tijd van nieuw → opgelost
- Verdeling bugs vs. ideeën

---

## 10. Risico's & Mitigatie

| Risico                            | Impact                    | Mitigatie                                          |
| --------------------------------- | ------------------------- | -------------------------------------------------- |
| Spam via publiek endpoint         | Veel noise in feedback    | Rate limiting + beschrijving minimumlengte         |
| Widget conflicteert met klant-CSS | Broken UI bij klant       | Shadow DOM isolatie                                |
| Klant vergeet script te plaatsen  | Geen feedback binnenkomst | Cockpit toont "geen data" + herinneringsinstructie |
| CORS issues bij klant-domeinen    | Widget kan niet posten    | Wildcard CORS in v1, whitelist in v2               |

---

## 11. Toekomstige Iteraties

| Versie | Features                                                |
| ------ | ------------------------------------------------------- |
| **V2** | Screenshot capture (html2canvas), bestand uploads       |
| **V3** | Widget theming per project (kleur, positie, taal)       |
| **V4** | Email/Slack notificaties bij nieuwe feedback            |
| **V5** | AI classificatie, prioritering, duplicate detectie      |
| **V6** | MCP tool: "welke bugs voor project X?", vector search   |
| **V7** | Reply naar klant vanuit cockpit, publieke status pagina |
