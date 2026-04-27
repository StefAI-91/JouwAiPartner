# 5. Functionele Eisen

## 5.1 Magic Link Login

**Beschrijving**: Klant logt in via email zonder wachtwoord. Bij invoer email ontvangt klant een magic link die direct inlogt en de juiste portal-context laadt.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker bezoekt `portal.jouwaipartner.nl` (of subdomein TBD)
2. Gebruiker voert email in op login-scherm
3. Systeem checkt of email gekoppeld is aan een klant-organisatie in Supabase
4. Bij gekoppelde email: magic link wordt verstuurd, melding "Check je inbox"
5. Bij niet-gekoppelde email: zelfde melding (security: geen email enumeration)
6. Klant klikt link → directe login → redirect naar `/dashboard`
7. Sessie blijft 30 dagen geldig

**Velden/Data**:

| Veld  | Type  | Verplicht | Validatie                                  |
| ----- | ----- | --------- | ------------------------------------------ |
| Email | email | Ja        | Geldig email-formaat, lowercase opgeslagen |

**States**:

- **Leeg**: Login-scherm met email-veld en logo
- **Laden**: Spinner op submit-knop, button disabled
- **Fout**: Generieke melding "Er ging iets mis, probeer opnieuw"
- **Succes**: "We hebben een link gestuurd naar [email]. Klik in je inbox om in te loggen."

**Edge cases**:

- Magic link vervalt na 24 uur — bij verlopen link: melding + nieuwe-link knop
- Email niet gekoppeld aan organisatie — toon zelfde melding (geen leak)
- Klant logt in op tweede device — beide sessies blijven actief
- Klant heeft toegang tot meerdere klantorganisaties — toon org-picker na login (edge case, kan in v1 uitgesteld worden tot het zich voordoet)

**Acceptatiecriteria**:

- [ ] Onbekende email leakt niet of er een account bestaat
- [ ] Magic link werkt op desktop en mobiel
- [ ] Sessie blijft 30 dagen actief op zelfde device
- [ ] Logout-knop in header werkt en redirect naar login

---

## 5.2 Vier-Bucket Dashboard

**Beschrijving**: Hoofdpagina van het portaal. Toont alle `client_visible: true` issues van de klant gegroepeerd in vier buckets die corresponderen met Stefan's gewenste rapportagevorm: `Opgelost`, `Komende week`, `Daarna`, `Backlog`.

**Gebruiker**: Klant PM, klant-collega

**Bucket-mapping (DevHub status → portal bucket)**:

| Portal bucket | DevHub status                       | Tijdvenster      |
| ------------- | ----------------------------------- | ---------------- |
| Opgelost      | `done`, `cancelled` (alleen `done`) | Laatste 14 dagen |
| Komende week  | `in_progress`                       | n.v.t.           |
| Daarna        | `todo`                              | n.v.t.           |
| Backlog       | `backlog`                           | n.v.t.           |

`triage` issues worden niet getoond (zijn nog niet beoordeeld).

**Gedrag**:

1. Gebruiker landt op `/dashboard` na login
2. Systeem laadt alle issues waar `client_visible = true` AND `organization_id = current_user.org_id`
3. Issues worden in vier buckets verdeeld o.b.v. status-mapping
4. Per bucket: telling (bijv. "Komende week (4)")
5. Tab-toggle: `Alles` / `Bugs` / `Features` (default: Alles)
6. Klik op issue → navigeert naar `/issue/[id]`

**Velden/Data per issue-card in lijst**:

| Veld                           | Type      | Toelichting                   |
| ------------------------------ | --------- | ----------------------------- |
| client_title (fallback: title) | text      | Titel die klant ziet          |
| type                           | enum      | bug / feature_request (badge) |
| priority                       | enum      | P1/P2/P3 (kleur indicator)    |
| updated_at                     | timestamp | "Bijgewerkt 2 dagen geleden"  |
| has_production_impact          | boolean   | 🔴 indicator als true         |

**States**:

- **Leeg (geen issues in bucket)**: "Geen items" in lichte tekst
- **Leeg (helemaal niks)**: "Er zijn nog geen items zichtbaar voor jou. Het JAIP-team werkt aan je project — kom hier later terug."
- **Laden**: Skeleton loaders per bucket
- **Fout**: "Kon issues niet laden. Ververs de pagina." met retry-knop
- **Succes**: Vier kolommen (desktop) / verticaal gestapeld (mobiel)

**Edge cases**:

- Een issue heeft tegelijkertijd meerdere statussen door state-conflict — toon in meest recente bucket o.b.v. `updated_at`
- Klant heeft geen `organization_id` (data integriteitsfout) — toon foutpagina, log incident
- Bucket bevat 100+ issues (CAI heeft veel backlog) — paginering binnen bucket, 25 per scroll

**Acceptatiecriteria**:

- [ ] Default-view toont vier buckets met juiste tellingen
- [ ] Tab-filter `Bugs` toont alleen `type = bug`
- [ ] Tab-filter `Features` toont alleen `type = feature_request`
- [ ] `client_title` wordt getoond als gevuld, anders fallback naar `title`
- [ ] Klant van CAI ziet alleen CAI-issues (RLS-test)
- [ ] Mobiele weergave is leesbaar zonder horizontaal scrollen

---

## 5.3 Issue Detail-pagina

**Beschrijving**: Detail-weergave van één issue met klant-vriendelijke titel, beschrijving, status en metadata.

**Gebruiker**: Klant PM, klant-collega

**Gedrag**:

1. Gebruiker klikt op issue-card in dashboard
2. Navigeert naar `/issue/[id]`
3. Systeem laadt issue, controleert `client_visible = true` AND organisatie-match
4. Toont detail-pagina

**Velden in weergave**:

| Veld                                       | Type      | Toelichting                                          |
| ------------------------------------------ | --------- | ---------------------------------------------------- |
| client_title (fallback: title)             | text      | Titel als heading                                    |
| client_description (fallback: description) | markdown  | Beschrijving                                         |
| type                                       | enum      | Badge: Bug / Feature                                 |
| priority                                   | enum      | Badge: P1 / P2 / P3                                  |
| status                                     | enum      | Bucket-naam (Opgelost / Komende week / etc.)         |
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

1. **Manuele override** wint altijd: als JAIP-admin in Cockpit `client_visible` expliciet zet (true of false), wordt automatisering genegeerd voor dat issue
2. **Productie-impact**: issue met label `production` of `customer-impact` → `client_visible = true`
3. **Klant-bron**: issue aangemaakt door user met role `client` → `client_visible = true`
4. **Default**: `client_visible = false`

**Implementatie**: Postgres trigger op `issues` tabel bij `INSERT` en `UPDATE` van `labels`. Trigger vult `client_visible` alleen als `client_visible_override = false`.

**Edge cases**:

- Issue krijgt eerst geen labels, later `production` → trigger update `client_visible` automatisch
- Admin zet handmatig `client_visible = false` op productie-issue → blijft verborgen ondanks regel
- Label-wijziging in DevHub → trigger reageert in zelfde transactie

**Acceptatiecriteria**:

- [ ] Nieuw issue met label `production` is direct zichtbaar in portal
- [ ] Issue zonder labels en aangemaakt door JAIP-dev is niet zichtbaar
- [ ] Manuele override blokkeert automatische regel
- [ ] Bij verwijderen van `production`-label valt issue terug naar default-regel (tenzij override)
