# 5. Functionele Eisen

## 5.1 Email-OTP Login

**Beschrijving**: Klant logt in via email zonder wachtwoord. Bij invoer email ontvangt klant een 6-cijferige code via Supabase Auth (`signInWithOtp` met `shouldCreateUser: false`). Klant voert de code in op het login-scherm en wordt doorgestuurd naar de portal. Reeds geïmplementeerd in `apps/portal/src/app/login/login-form.tsx` en `apps/portal/src/app/auth/callback/route.ts`.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker bezoekt `https://portal.jouw-ai-partner.nl/`
2. Gebruiker voert email in op login-scherm
3. Systeem stuurt 6-cijferige OTP-code (`shouldCreateUser: false`, voorkomt enumeratie)
4. Bij niet-gekoppelde email: zelfde melding (security: geen email enumeration)
5. Klant voert code in → directe login → middleware route naar portal-app op basis van role
6. Sessie blijft geldig conform Supabase JWT-default (~1 jaar; geaccepteerd in v1)

**Velden/Data**:

| Veld     | Type   | Verplicht | Validatie                                    |
| -------- | ------ | --------- | -------------------------------------------- |
| Email    | email  | Ja        | Geldig email-formaat, lowercase opgeslagen   |
| OTP-code | string | Ja        | 6 cijfers, ingevoerd na ontvangst per e-mail |

**States**:

- **Leeg**: Login-scherm met email-veld en logo
- **Laden**: Spinner op submit-knop, button disabled
- **Fout**: Generieke melding "Er ging iets mis, probeer opnieuw"
- **Succes (email-stap)**: "We hebben een code gestuurd naar [email]. Vul hem hieronder in."
- **Succes (login)**: Redirect naar dashboard

**Edge cases**:

- OTP-code vervalt na korte periode (Supabase default ~1 uur) — bij verlopen: melding + nieuwe-code knop
- Email niet gekoppeld aan organisatie — toon zelfde melding (geen leak)
- Klant logt in op tweede device — beide sessies blijven actief
- Klant heeft toegang tot meerdere klantorganisaties — toon org-picker na login (edge case, kan in v1 uitgesteld worden tot het zich voordoet)

**Acceptatiecriteria**:

- [ ] Onbekende email leakt niet of er een account bestaat (`shouldCreateUser: false`)
- [ ] OTP-flow werkt op desktop en mobiel
- [ ] Logout-knop in header werkt en redirect naar login

---

## 5.2 Vier-Bucket Dashboard met Source-Switch

**Beschrijving**: Hoofdpagina van het portaal. Toont alle issues van projecten waar de klant toegang toe heeft, gegroepeerd in vier buckets. Een source-switch laat de klant kiezen tussen "Onze meldingen", "JAIP-meldingen" of "Alles". Geen verborgen issues — transparantie is het ontwerpprincipe. Bucket-namen en mapping zijn bron-van-waarheid in `packages/database/src/constants/issues.ts` (`PORTAL_STATUS_GROUPS`).

**Gebruiker**: Klant PM, klant-collega

**Bucket-mapping (DevHub status → portal bucket)**:

| Portal bucket  | DevHub status       | Bron                      |
| -------------- | ------------------- | ------------------------- |
| Ontvangen      | `triage`            | `PORTAL_STATUS_GROUPS[0]` |
| Ingepland      | `backlog`, `todo`   | `PORTAL_STATUS_GROUPS[1]` |
| In behandeling | `in_progress`       | `PORTAL_STATUS_GROUPS[2]` |
| Afgerond       | `done`, `cancelled` | `PORTAL_STATUS_GROUPS[3]` |

> Wijzigen van een mapping = aanpassen in `issues.ts` constants. Niet duplicate'n in PRD-tekst.

**Source-switch (nieuw)**:

| Tab            | Filter                            | Toelichting                                    |
| -------------- | --------------------------------- | ---------------------------------------------- |
| Alles          | _geen filter_                     | Default-view                                   |
| Onze meldingen | `source IN ('portal','userback')` | Door klant zelf gemeld                         |
| JAIP-meldingen | `source IN ('manual','ai')`       | Door JAIP-team gemeld of AI-pipeline ingelezen |

> Bron-van-waarheid voor source-mapping wordt vastgelegd als constant in `packages/database/src/constants/issues.ts` (bijv. `PORTAL_SOURCE_GROUPS`) — niet in client-side code dupliceren.

**Gedrag**:

1. Gebruiker landt op portal-dashboard na login
2. Systeem laadt alle issues waar `has_portal_access(auth.uid(), project_id)` (via bestaande RLS — geen wijziging)
3. Issues worden in vier buckets verdeeld o.b.v. `INTERNAL_STATUS_TO_PORTAL_KEY`
4. Per bucket: telling (bijv. "In behandeling (4)")
5. Source-switch (Alles / Onze meldingen / JAIP-meldingen) — default Alles
6. Type-filter (Alles / Bugs / Features) — default Alles, orthogonaal aan source-switch
7. Klik op issue → navigeert naar bestaande detail-route (`/projects/[id]/issues/[issueId]`)

**Velden/Data per issue-card in lijst**:

| Veld                           | Type      | Toelichting                                            |
| ------------------------------ | --------- | ------------------------------------------------------ |
| client_title (fallback: title) | text      | Titel die klant ziet                                   |
| type                           | enum      | bug / feature_request / question (badge)               |
| priority                       | enum      | urgent / high / medium / low (kleur)                   |
| source                         | enum      | Subtiele indicator (bv. icoon) "Onze melding" / "JAIP" |
| updated_at                     | timestamp | "Bijgewerkt 2 dagen geleden"                           |

**States**:

- **Leeg (geen issues in bucket)**: "Geen items" in lichte tekst
- **Leeg (helemaal niks)**: "Er zijn nog geen items in dit project. Het JAIP-team werkt aan je project — kom hier later terug, of dien zelf een melding in."
- **Laden**: Skeleton loaders per bucket
- **Fout**: "Kon issues niet laden. Ververs de pagina." met retry-knop
- **Succes**: Vier kolommen (desktop) / verticaal gestapeld (mobiel)

**Edge cases**:

- Klant heeft geen `portal_project_access` (data integriteitsfout) — toon foutpagina, log incident
- Bucket bevat 100+ issues (CAI heeft veel backlog) — paginering binnen bucket, 25 per scroll
- Issue heeft een onbekende `source` — valt onder "JAIP-meldingen" als default

**Acceptatiecriteria**:

- [ ] Default-view toont vier buckets met juiste tellingen op basis van álle issues van het project
- [ ] Source-switch `Onze meldingen` toont alleen issues met `source IN ('portal','userback')`
- [ ] Source-switch `JAIP-meldingen` toont alleen issues met `source IN ('manual','ai')`
- [ ] Type-filter werkt orthogonaal aan source-switch (combinaties geven verwacht resultaat)
- [ ] `client_title` wordt getoond als gevuld, anders fallback naar `title`
- [ ] Klant van CAI ziet alleen CAI-issues (RLS-test met testaccount andere klant)
- [ ] Mobiele weergave is leesbaar zonder horizontaal scrollen

---

## 5.3 Issue Detail-pagina

**Beschrijving**: Detail-weergave van één issue met klant-vriendelijke titel, beschrijving, status en metadata. Bestaande pagina (`apps/portal/src/app/(app)/projects/[id]/issues/[issueId]/`) wordt uitgebreid met `client_title`/`client_description` fallback en source-indicator.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker klikt op issue-card in dashboard
2. Navigeert naar bestaande detail-route
3. RLS controleert project-access (geen extra check meer nodig)
4. Toont detail-pagina

**Velden in weergave**:

| Veld                                       | Type      | Toelichting                             |
| ------------------------------------------ | --------- | --------------------------------------- |
| client_title (fallback: title)             | text      | Titel als heading                       |
| client_description (fallback: description) | markdown  | Beschrijving                            |
| type                                       | enum      | Badge: Bug / Functionaliteit / Vraag    |
| priority                                   | enum      | Badge: urgent / high / medium / low     |
| status                                     | enum      | Bucket-label uit `PORTAL_STATUS_LABELS` |
| source                                     | enum      | Indicator: "Onze melding" / "JAIP"      |
| created_at                                 | timestamp | Datum aangemaakt                        |
| updated_at                                 | timestamp | Laatst bijgewerkt                       |

**States**:

- **Leeg / niet gevonden**: 404-pagina "Issue niet gevonden of geen toegang"
- **Laden**: Skeleton voor heading + body
- **Fout**: Foutmelding met terug-link
- **Succes**: Volledige detail-weergave

**Edge cases**:

- Klant deeplinkt naar issue van andere klant → 404 (geen leak van bestaan)
- Description bevat afbeeldingen/bijlagen → in v1 alleen text-rendering, bijlagen v2

**Acceptatiecriteria**:

- [ ] Detailpagina rendert zonder errors voor alle types
- [ ] `client_description` wordt als markdown gerenderd
- [ ] Issue van andere klant geeft 404
- [ ] Terug-knop werkt naar dashboard met behoud van scroll-positie

---

## 5.4 Feedback-formulier (bestaand, behouden in v1)

**Beschrijving**: Klant kan via `/projects/[id]/feedback` een nieuw issue indienen. Reeds geïmplementeerd in `apps/portal/src/actions/feedback.ts` (`submitFeedback`) + bijhorende pagina. Feedback wordt opgeslagen als `issues`-rij met `source = 'portal'` en status `triage`.

**Gebruiker**: Klant PM, klant-collega

**Gedrag (bestaand)**:

1. Klant gaat naar `/projects/[id]/feedback`
2. Vult titel, beschrijving en type (`bug` / `feature_request` / `question`) in
3. Server action `submitFeedback` valideert via `portalFeedbackSchema`, controleert `hasPortalProjectAccess`, en doet `insertIssue` met `source: 'portal'`
4. Bij succes: redirect of confirmatie + issue verschijnt in dashboard onder "Onze meldingen"

**Acceptatiecriteria** (verifieer dat bestaande implementatie nog werkt na 5.2-wijzigingen):

- [ ] Ingediend issue verschijnt direct in `Ontvangen`-bucket onder "Onze meldingen"
- [ ] Zod-validatie blokkeert lege titel/beschrijving
- [ ] Klant zonder project-access kan geen feedback indienen voor dat project
