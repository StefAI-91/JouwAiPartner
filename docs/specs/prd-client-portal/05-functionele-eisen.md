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
