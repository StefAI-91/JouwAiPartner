# 3. Doelgroep & Gebruikers

## 3.1 Klant Project Manager (primaire gebruiker v1)

- **Wie**: Persoon bij de klantorganisatie die verantwoordelijk is voor de samenwerking met JAIP. Voor CAI: Stefan Roevros.
- **Aantal**: 1-3 per klantorganisatie, naar verwachting 5-15 totaal in de eerste 6 maanden
- **Technisch niveau**: Gemiddeld tot hoog (begrijpt issue trackers, software development cycles)
- **Primaire taken**:
  - Status van bugs en features bekijken in vier buckets
  - Begrijpen welke productie-issues actief zijn die hun eindgebruikers raken
  - Issues filteren en zoeken
- **Device**: Desktop primair, mobiel secundair (read-only)

## 3.2 Klant-collega (secundaire gebruiker v1)

- **Wie**: Andere medewerkers bij de klant die meekijken (voor CAI: Joep, Chloë)
- **Technisch niveau**: Variabel
- **Primaire taken**: Meekijken, geen actieve interactie in v1

## 3.3 JAIP Team (admin)

- **Wie**: Stef, Wouter, Kenji, Myrrh, Ege
- **Toegang**: Via bestaande Cockpit-app, niet via deze portal
- **Primaire taken in relatie tot portal**: Bepalen welke issues `client_visible` zijn (manuele override + automatische regels)

## Rechtenmatrix

| Actie                                     | Klant PM | Klant-collega | JAIP Admin       |
| ----------------------------------------- | -------- | ------------- | ---------------- |
| Issues bekijken (alleen `client_visible`) | ✅       | ✅            | ✅               |
| Issues van andere klanten bekijken        | ❌       | ❌            | ✅               |
| Issue als `client_visible` markeren       | ❌       | ❌            | ✅ (via Cockpit) |
| Comments plaatsen                         | v2       | v2            | v2               |
| Voting                                    | v2       | v2            | v2               |
| Sign-off geven                            | v2       | ❌            | v2               |
