# 3. Doelgroep & Gebruikers

## 3.1 Klant Project Manager (primaire gebruiker v1)

- **Wie**: Persoon bij de klantorganisatie die verantwoordelijk is voor de samenwerking met JAIP. Voor CAI: Stefan Roevros.
- **Aantal**: 1-3 per klantorganisatie, naar verwachting 5-15 totaal in de eerste 6 maanden
- **Technisch niveau**: Gemiddeld tot hoog (begrijpt issue trackers, software development cycles)
- **Primaire taken**:
  - Status van bugs en features bekijken in vier buckets
  - Switchen tussen eigen meldingen en JAIP-meldingen
  - Eigen issues indienen via feedback-formulier
  - Issues filteren en zoeken
- **Device**: Desktop primair, mobiel secundair (read-only)

## 3.2 Klant-collega (secundaire gebruiker v1)

- **Wie**: Andere medewerkers bij de klant die meekijken (voor CAI: Joep, Chloë)
- **Technisch niveau**: Variabel
- **Primaire taken**: Meekijken + eventueel feedback indienen, geen verdere interactie in v1

## 3.3 JAIP Team (admin)

- **Wie**: Stef, Wouter, Kenji, Myrrh, Ege
- **Toegang**: Via bestaande DevHub-app voor issue-beheer (Cockpit blijft voor knowledge/projecten/themes); niet via deze portal
- **Primaire taken in relatie tot portal**: Optioneel `client_title` / `client_description` invullen op issues om technische titels naar klant-taal te hertalen. Geen `client_visible`-mechanisme — alle issues van een project zijn voor de klant zichtbaar in de portal (gefilterd via bestaande `has_portal_access`-RLS).

## Rechtenmatrix

| Actie                                          | Klant PM | Klant-collega | JAIP Admin      |
| ---------------------------------------------- | -------- | ------------- | --------------- |
| Alle issues van eigen project(en) bekijken     | ✅       | ✅            | ✅              |
| Issues van andere klanten bekijken             | ❌       | ❌            | ✅              |
| Switchen tussen "Onze meldingen" / "JAIP"      | ✅       | ✅            | ✅              |
| Feedback / nieuw issue indienen                | ✅       | ✅            | n.v.t.          |
| `client_title` / `client_description` invullen | ❌       | ❌            | ✅ (via DevHub) |
| Comments plaatsen                              | v2       | v2            | v2              |
| Voting                                         | v2       | v2            | v2              |
| Sign-off geven                                 | v2       | ❌            | v2              |
