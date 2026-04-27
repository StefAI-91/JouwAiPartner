# 5. Functionele Eisen

## 5.1 Email-OTP Login

**Beschrijving**: Klant logt in via email zonder wachtwoord. Bij invoer email ontvangt klant een 6-cijferige code via Supabase Auth (`signInWithOtp` met `shouldCreateUser: false`). Klant voert de code in op het login-scherm en wordt doorgestuurd naar de portal. Reeds geïmplementeerd in `apps/portal/src/app/login/login-form.tsx` en `apps/portal/src/app/auth/callback/route.ts`.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker bezoekt portal-URL
2. Gebruiker voert email in op login-scherm
3. Systeem stuurt 6-cijferige OTP-code (`shouldCreateUser: false`, voorkomt enumeratie)
4. Bij niet-gekoppelde email: zelfde melding (security: geen email enumeration)
5. Klant voert code in → directe login → middleware-gating route's gebruiker naar portal-app op basis van role
6. Sessie blijft 30 dagen geldig (Supabase JWT-config — momenteel default; aandachtspunt)

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
- [ ] Sessie blijft 30 dagen actief op zelfde device (Supabase config aangepast)
- [ ] Logout-knop in header werkt en redirect naar login

---

## 5.2 Vier-Bucket Dashboard

**Beschrijving**: Hoofdpagina van het portaal. Toont alle issues waar `client_visible = true` van de klant gegroepeerd in vier buckets. Bucket-namen en mapping zijn bron-van-waarheid in `packages/database/src/constants/issues.ts` (`PORTAL_STATUS_GROUPS`).

**Gebruiker**: Klant PM, klant-collega

**Bucket-mapping (DevHub status → portal bucket)**:

| Portal bucket  | DevHub status       | Bron                      |
| -------------- | ------------------- | ------------------------- |
| Ontvangen      | `triage`            | `PORTAL_STATUS_GROUPS[0]` |
| Ingepland      | `backlog`, `todo`   | `PORTAL_STATUS_GROUPS[1]` |
| In behandeling | `in_progress`       | `PORTAL_STATUS_GROUPS[2]` |
| Afgerond       | `done`, `cancelled` | `PORTAL_STATUS_GROUPS[3]` |

> Wijzigen van een mapping = aanpassen in `issues.ts` constants. Niet duplicate'n in PRD-tekst.

**Gedrag**:

1. Gebruiker landt op portal-dashboard na login
2. Systeem laadt alle issues waar `client_visible = true` AND `has_portal_access(auth.uid(), project_id)` (via RLS)
3. Issues worden in vier buckets verdeeld o.b.v. `INTERNAL_STATUS_TO_PORTAL_KEY`
4. Per bucket: telling (bijv. "In behandeling (4)")
5. Tab-toggle: `Alles` / `Bugs` / `Features` (default: Alles) — nieuwe filter, naast bestaande status-filter
6. Klik op issue → navigeert naar bestaande detail-route (`/projects/[id]/issues/[issueId]`)

**Velden/Data per issue-card in lijst**:

| Veld                           | Type      | Toelichting                              |
| ------------------------------ | --------- | ---------------------------------------- |
| client_title (fallback: title) | text      | Titel die klant ziet                     |
| type                           | enum      | bug / feature_request / question (badge) |
| priority                       | enum      | urgent / high / medium / low (kleur)     |
| updated_at                     | timestamp | "Bijgewerkt 2 dagen geleden"             |
| has_production_impact          | boolean   | 🔴 indicator als true                    |

**States**:

- **Leeg (geen issues in bucket)**: "Geen items" in lichte tekst
- **Leeg (helemaal niks)**: "Er zijn nog geen items zichtbaar voor jou. Het JAIP-team werkt aan je project — kom hier later terug."
- **Laden**: Skeleton loaders per bucket
- **Fout**: "Kon issues niet laden. Ververs de pagina." met retry-knop
- **Succes**: Vier kolommen (desktop) / verticaal gestapeld (mobiel)

**Edge cases**:

- Een issue heeft tegelijkertijd meerdere statussen door state-conflict — toon in meest recente bucket o.b.v. `updated_at`
- Klant heeft geen `portal_project_access` (data integriteitsfout) — toon foutpagina, log incident
- Bucket bevat 100+ issues (CAI heeft veel backlog) — paginering binnen bucket, 25 per scroll

**Acceptatiecriteria**:

- [ ] Default-view toont vier buckets met juiste tellingen
- [ ] Tab-filter `Bugs` toont alleen `type = bug`
- [ ] Tab-filter `Features` toont alleen `type = feature_request`
- [ ] `client_title` wordt getoond als gevuld, anders fallback naar `title`
- [ ] Klant van CAI ziet alleen CAI-issues (RLS-test met testaccount andere klant)
- [ ] Mobiele weergave is leesbaar zonder horizontaal scrollen

---

## 5.3 Issue Detail-pagina

**Beschrijving**: Detail-weergave van één issue met klant-vriendelijke titel, beschrijving, status en metadata. Bestaande pagina (`apps/portal/src/app/(app)/projects/[id]/issues/[issueId]/`) wordt uitgebreid met `client_title`/`client_description` fallback en productie-impact-banner.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker klikt op issue-card in dashboard
2. Navigeert naar bestaande detail-route
3. Systeem laadt issue, RLS controleert `client_visible = true` AND project-access
4. Toont detail-pagina

**Velden in weergave**:

| Veld                                       | Type      | Toelichting                                          |
| ------------------------------------------ | --------- | ---------------------------------------------------- |
| client_title (fallback: title)             | text      | Titel als heading                                    |
| client_description (fallback: description) | markdown  | Beschrijving                                         |
| type                                       | enum      | Badge: Bug / Functionaliteit / Vraag                 |
| priority                                   | enum      | Badge: urgent / high / medium / low                  |
| status                                     | enum      | Bucket-label uit `PORTAL_STATUS_LABELS`              |
| created_at                                 | timestamp | Datum aangemaakt                                     |
| updated_at                                 | timestamp | Laatst bijgewerkt                                    |
| has_production_impact                      | boolean   | Banner als true: "Dit issue raakt je eindgebruikers" |

**States**:

- **Leeg / niet gevonden**: 404-pagina "Issue niet gevonden of geen toegang"
- **Laden**: Skeleton voor heading + body
- **Fout**: Foutmelding met terug-link
- **Succes**: Volledige detail-weergave

**Edge cases**:

- Klant deeplinkt naar issue van andere klant → 404 (geen leak van bestaan)
- Issue is na bezoek `client_visible = false` gezet door JAIP → 404 bij refresh
- Description bevat afbeeldingen/bijlagen → in v1 alleen text-rendering, bijlagen v2

**Acceptatiecriteria**:

- [ ] Detailpagina rendert zonder errors voor alle types
- [ ] `client_description` wordt als markdown gerenderd
- [ ] Niet-zichtbaar issue geeft 404 (geen 403, geen leak)
- [ ] Terug-knop werkt naar dashboard met behoud van scroll-positie

---

## 5.4 Automatische Client-Visibility-Regels

**Beschrijving**: Backend-logica die bepaalt welke issues automatisch `client_visible = true` worden zonder handmatige actie. Dit is geen UI-feature maar een gedrag van het systeem.

**Gebruiker**: Geen directe interactie. Wordt getriggerd bij issue-creatie en bij label-wijzigingen.

**Regels (in volgorde van precedentie)**:

1. **Manuele override** wint altijd: als JAIP-admin in DevHub `client_visible_override = true` zet, blijft de waarde van `client_visible` zoals expliciet gezet — automatisering wordt genegeerd voor dat issue
2. **Productie-impact**: issue met label `production` of `customer-impact` → `client_visible = true`, `has_production_impact = true`
3. **Klant-bron**: issue aangemaakt met `source = 'portal'` (klant heeft het zelf ingediend in v2; in v1 onmogelijk) → `client_visible = true`
4. **Default**: `client_visible = false`

**Implementatie**: Postgres trigger op `issues` tabel bij `INSERT` en `UPDATE` van `labels` of `source`. Trigger respecteert `client_visible_override`.

**Admin-toggle**: in de bestaande issue-editor in `apps/devhub/src/features/issues/` worden drie velden toegevoegd:

- `client_visible` (boolean toggle)
- `client_visible_override` (boolean — checkbox "handmatig beheerd")
- `client_title` + `client_description` (optionele tekstvelden)

**Edge cases**:

- Issue krijgt eerst geen labels, later `production` → trigger update `client_visible` automatisch (mits geen override)
- Admin zet handmatig `client_visible = false` + `override = true` op productie-issue → blijft verborgen ondanks regel
- Label-wijziging in DevHub → trigger reageert in zelfde transactie

**Acceptatiecriteria**:

- [ ] Nieuw issue met label `production` is direct zichtbaar in portal
- [ ] Issue zonder labels en aangemaakt door JAIP-dev is niet zichtbaar
- [ ] Manuele override blokkeert automatische regel
- [ ] Bij verwijderen van `production`-label valt issue terug naar default-regel (tenzij override)
- [ ] DevHub issue-editor toont en bewerkt de drie nieuwe velden
