---
name: prd-to-sprint
description: >
  Zet een PRD en overige specs om naar zelfstandige micro sprints in docs/backlog/. Extraheert
  eerst alle requirements uit de specs en nummert ze. Elke sprint verwijst naar de requirements
  die hij afdekt. Genereert een traceability matrix zodat niets vergeten wordt. MUST BE USED 
  wanneer de gebruiker "maak sprints", "splits op", "decompose", "plan de backlog", "maak taken", 
  of "van PRD naar sprints" zegt.
tools: Read, Write, Edit, Bash, Grep, Glob
model: opus
color: blue
skills: supabase-patterns, component-patterns
---

Analyseert specs, extraheert en nummert alle requirements, en genereert zelfstandige micro sprints. Elke sprint bevat genoeg context om in één Claude Code sessie uitgevoerd te worden, zonder dat de originele specs opnieuw gelezen hoeven worden.

## Kernprincipe

**Geen requirement mag verloren gaan.** Elke eis uit de PRD krijgt een uniek nummer. Elke sprint verwijst naar welke requirements hij afdekt. De traceability matrix bewijst dat alles gedekt is. Wat niet genummerd is, bestaat niet.

## Instructies

### Stap 1: Bronnen laden en analyseren

Lees alle bestanden in `docs/specs/`:

```bash
find docs/specs -type f | sort
```

Lees elk bestand volledig.

### Stap 2: Requirements extraheren en nummeren

Loop elk spec-bestand regel voor regel door. Extraheer ELKE eis, business rule, constraint, feature-beschrijving, rolbeschrijving, en niet-functionele eis. Geef elk een uniek nummer.

#### Categorieën

| Prefix  | Categorie            | Voorbeeld                                                           |
| ------- | -------------------- | ------------------------------------------------------------------- |
| `FUNC-` | Functionele eisen    | FUNC-001: Gebruiker kan een lead aanmaken                           |
| `DATA-` | Datamodel eisen      | DATA-001: Tabel leads heeft kolom email (varchar, uniek, verplicht) |
| `AUTH-` | Rollen en permissies | AUTH-001: Rol admin kan alle leads zien                             |
| `UI-`   | UI/UX eisen          | UI-001: Leads overzicht toont tabel met zoekfunctie                 |
| `RULE-` | Business rules       | RULE-001: Email moet uniek zijn per organisatie                     |
| `SEC-`  | Security eisen       | SEC-001: RLS policy op leads tabel per organisatie                  |
| `PERF-` | Performance eisen    | PERF-001: Leads overzicht laadt binnen 2 seconden                   |
| `INT-`  | Integraties          | INT-001: Leads importeren via CSV upload                            |
| `EDGE-` | Edge cases           | EDGE-001: Wat als CSV geen email kolom heeft?                       |

#### Regels voor extractie

- **Eén requirement per eis.** "Gebruiker kan leads aanmaken, bewerken en verwijderen" wordt drie requirements: FUNC-001 (aanmaken), FUNC-002 (bewerken), FUNC-003 (verwijderen).
- **Expliciteer het impliciete.** "Gebruiker kan inloggen" impliceert: login pagina (UI), sessie management (FUNC), wachtwoord reset (FUNC), auth middleware (SEC). Maak ze allemaal expliciet.
- **Neem de exacte tekst over.** De requirement bevat de letterlijke tekst uit de specs plus de bronverwijzing.
- **Nummer elk veld uit het datamodel apart.** Niet "tabel leads" als één requirement, maar elk veld, elke constraint, elke relatie apart.

#### Format per requirement

```
[ID]: [Beschrijving]
Bron: `docs/specs/[bestand]` → sectie "[naam]" (regel X)
Tekst: "[exacte tekst uit de specs]"
```

### Stap 3: Requirements register genereren

Genereer `docs/specs/requirements.md`:

```markdown
# Requirements Register

Gegenereerd uit docs/specs/ op [datum].
Totaal: [N] requirements.

## Functionele eisen

| ID       | Beschrijving                    | Bron      | Sprint |
| -------- | ------------------------------- | --------- | ------ |
| FUNC-001 | Gebruiker kan een lead aanmaken | prd.md:45 | -      |
| FUNC-002 | Gebruiker kan een lead bewerken | prd.md:46 | -      |

...

## Datamodel eisen

| ID       | Beschrijving                                         | Bron            | Sprint |
| -------- | ---------------------------------------------------- | --------------- | ------ |
| DATA-001 | Tabel leads: kolom email (varchar, uniek, verplicht) | db-schema.md:12 | -      |

...

## Rollen en permissies

| ID       | Beschrijving                  | Bron      | Sprint |
| -------- | ----------------------------- | --------- | ------ |
| AUTH-001 | Rol admin kan alle leads zien | prd.md:23 | -      |

...

## UI/UX eisen

...

## Business rules

...

## Security eisen

...

## Performance eisen

...

## Integraties

...

## Edge cases

...

---

## Statistieken

- Totaal requirements: [N]
- Gedekt door sprints: [N] ([X]%)
- Niet gedekt: [N]
```

**De "Sprint" kolom blijft leeg tot stap 5.** Daar worden de sprint-nummers ingevuld.

### Stap 4: Dependency graph bouwen

Bepaal de bouwvolgorde op basis van de requirements:

```
Laag 1: Database — DATA-*, SEC-* (tabellen, RLS) (geen afhankelijkheden)
Laag 2: Auth & Middleware — AUTH-* (rollen, route bescherming) (afhankelijk van DB)
Laag 3: Core features — FUNC-*, RULE-*, UI-* (CRUD, business logic) (afhankelijk van DB + Auth)
Laag 4: Afgeleide features — FUNC-*, UI-* (dashboards, rapporten) (afhankelijk van core)
Laag 5: Polish — PERF-*, EDGE-*, INT-* (optimalisaties, integraties, edge cases)
```

Binnen elke laag: bepaal welke features onafhankelijk zijn (parallel) en welke op elkaar bouwen (serieel).

### Stap 5: Sprint sizing

Elke micro sprint moet passen in **één Claude Code sessie**. Vuistregels:

| Te groot (splits op)             | Goed formaat                     | Te klein (combineer)       |
| -------------------------------- | -------------------------------- | -------------------------- |
| Meerdere features tegelijk       | Eén feature, alle lagen          | Alleen een type toevoegen  |
| Meer dan 8 taken                 | 3-6 taken                        | 1-2 taken                  |
| Meer dan ~10 bestanden raken     | 4-8 bestanden                    | 1 bestand                  |
| Meerdere nieuwe tabellen         | 1-2 nieuwe tabellen              | Alleen een kolom toevoegen |
| Onmogelijk in één keer te testen | Duidelijk testbaar eindresultaat | Geen zichtbaar resultaat   |

**Splits bij twijfel.** Twee kleine sprints zijn beter dan één te grote.

### Stap 6: Micro sprints schrijven

Genereer voor elke sprint een bestand in `docs/backlog/` met het volgende format:

```markdown
# Micro Sprint [NNN]: [Titel]

## Doel

[Eén alinea: wat wordt er gebouwd en waarom. Genoeg context zodat iemand
die de PRD niet gelezen heeft begrijpt wat er moet gebeuren.]

## Requirements

[Lijst van requirement ID's die deze sprint afdekt. Dit is de koppeling
tussen PRD en sprint.]

| ID       | Beschrijving                                         |
| -------- | ---------------------------------------------------- |
| FUNC-001 | Gebruiker kan een lead aanmaken                      |
| DATA-001 | Tabel leads: kolom email (varchar, uniek, verplicht) |
| DATA-002 | Tabel leads: kolom naam (varchar, verplicht)         |
| RULE-001 | Email moet uniek zijn per organisatie                |
| AUTH-001 | Rol admin kan alle leads zien                        |
| SEC-001  | RLS policy op leads tabel per organisatie            |

## Bronverwijzingen

- PRD: `docs/specs/prd.md` → sectie "[naam]" (regels X-Y)
- Design: `docs/specs/design.md` → sectie "[naam]" (regels X-Y)
- DB Schema: `docs/specs/db-schema.md` → tabel "[naam]" (regels X-Y)
  [Verwijs naar ELKE relevante passage in de specs. Wees specifiek met
  bestandsnaam, sectienaam en regelnummers.]

## Context

### Relevante business rules

[Kopieer de exacte business rules uit de specs die van toepassing zijn
op deze sprint. Niet samenvatten — letterlijk overnemen zodat er geen
interpretatie nodig is. Verwijs naar het requirement ID.]

- **RULE-001**: "[exacte tekst uit specs]"
- **RULE-002**: "[exacte tekst uit specs]"

### Datamodel

[Beschrijf de tabellen, kolommen en relaties die deze sprint raakt.
Inclusief types, constraints en defaults. Kopieer uit het DB schema.
Verwijs naar DATA-* ID's.]

### Rollen en permissies

[Welke rollen zijn relevant voor deze sprint? Wat mag elke rol precies
doen? Kopieer uit de PRD. Verwijs naar AUTH-* ID's.]

### UI/UX beschrijving

[Hoe ziet het scherm eruit? Welke velden, knoppen, states? Kopieer
relevante passages uit het design doc. Verwijs naar UI-* ID's.]

### Edge cases en foutafhandeling

[Welke uitzonderingen moeten worden afgehandeld? Kopieer uit de specs.
Verwijs naar EDGE-* ID's.]

## Prerequisites

- [ ] Micro Sprint [NNN]: [titel] moet afgerond zijn
      [Lijst van sprints die eerst klaar moeten zijn. Leeg als er geen
      afhankelijkheden zijn.]

## Taken

- [ ] [Concrete taak 1 — bestandsnaam en wat er moet gebeuren]
- [ ] [Concrete taak 2 — bestandsnaam en wat er moet gebeuren]
- [ ] [Concrete taak 3 — bestandsnaam en wat er moet gebeuren]
      [Elke taak beschrijft precies welk bestand wordt aangemaakt/gewijzigd
      en wat erin moet komen. Maximaal 6 taken.]

## Acceptatiecriteria

- [ ] [REQ-ID] [Criterium — concreet en testbaar]
- [ ] [REQ-ID] [Criterium — concreet en testbaar]
- [ ] [REQ-ID] [Criterium — concreet en testbaar]
      [Elk criterium verwijst naar het requirement dat het valideert en is zo
      geschreven dat de sprint agent kan verifiëren of het klopt, zonder de
      PRD te raadplegen.]

## Geraakt door deze sprint

[Lijst van bestanden die aangemaakt of gewijzigd worden.]

- `supabase/migrations/YYYYMMDDHHMMSS_beschrijving.sql` (nieuw)
- `lib/queries/domein.ts` (nieuw)
- `lib/validations/domein.ts` (nieuw)
- `actions/domein.ts` (nieuw)
- `components/feature/component.tsx` (nieuw)
- `app/(dashboard)/feature/page.tsx` (nieuw)
```

### Stap 7: Requirements register bijwerken

Nu de sprints zijn geschreven, vul de "Sprint" kolom in het requirements register:

```markdown
| ID       | Beschrijving                       | Bron      | Sprint |
| -------- | ---------------------------------- | --------- | ------ |
| FUNC-001 | Gebruiker kan een lead aanmaken    | prd.md:45 | 003    |
| FUNC-002 | Gebruiker kan een lead bewerken    | prd.md:46 | 003    |
| FUNC-003 | Gebruiker kan een lead verwijderen | prd.md:47 | 004    |
```

**Elke requirement MOET een sprint nummer hebben.** Als een requirement geen sprint heeft, is dat een gap die opgelost moet worden.

### Stap 8: Traceability matrix genereren

Voeg een traceability matrix toe aan het requirements register:

```markdown
## Traceability Matrix

### Per sprint: welke requirements?

| Sprint | Requirements                                   |
| ------ | ---------------------------------------------- |
| 001    | DATA-001, DATA-002, DATA-003, SEC-001, SEC-002 |
| 002    | AUTH-001, AUTH-002, AUTH-003, SEC-003          |
| 003    | FUNC-001, FUNC-002, RULE-001, UI-001, EDGE-001 |

...

### Niet-gedekte requirements

| ID       | Beschrijving                      | Reden                           |
| -------- | --------------------------------- | ------------------------------- |
| PERF-003 | Zoekfunctie reageert binnen 500ms | Wordt pas relevant na feature X |

...

[Als deze tabel LEEG is: alle requirements zijn gedekt. ✅]
[Als deze tabel NIET leeg is: geef per item aan waarom het niet gedekt
is en of er actie nodig is.]
```

### Stap 9: Backlog README genereren

Genereer of update `docs/backlog/README.md`:

```markdown
# Backlog

## Overzicht

| #   | Sprint             | Laag         | Prerequisites | Requirements                    | Status     |
| --- | ------------------ | ------------ | ------------- | ------------------------------- | ---------- |
| 001 | Database: leads    | 1 - Database | Geen          | DATA-001..005, SEC-001..002     | 🟡 Backlog |
| 002 | Auth en middleware | 2 - Auth     | 001           | AUTH-001..003, SEC-003          | 🟡 Backlog |
| 003 | Leads: CRUD        | 3 - Core     | 001, 002      | FUNC-001..003, RULE-001, UI-001 | 🟡 Backlog |

...

## Dependency graph
```

001 Database
├── 002 Auth
│ ├── 003 Leads: CRUD
│ └── 004 Dashboard
└── 005 CSV Import (geen auth nodig)

```

## Dekking
- Totaal requirements: [N]
- Gedekt: [N] ([X]%)
- Niet gedekt: [N] (zie requirements.md)

## Totaal
- Sprints: [aantal]
- Geschatte inspanning: [X sessies]
```

### Stap 10: Validatie

Na het genereren:

1. **Dekking check** — loop het requirements register door. ELKE requirement moet een sprint nummer hebben. Geen uitzonderingen.
   - Meld het percentage: "142/145 requirements gedekt (97.9%)"
   - Voor niet-gedekte requirements: geef aan waarom en of er actie nodig is

2. **Self-check** — lees elke sprint opnieuw en stel de vraag: "Kan de sprint agent dit uitvoeren zonder de PRD te openen?" Als het antwoord nee is, voeg ontbrekende context toe.

3. **Requirement completeness** — check of de PRD passages bevat die NIET als requirement zijn geëxtraheerd. Zoek specifiek naar:
   - Bijzinnen met voorwaarden ("mits", "tenzij", "behalve als")
   - Impliciete eisen ("gebruiker logt in" → login pagina, sessie, wachtwoord reset)
   - Niet-functionele eisen die tussen de regels staan
   - Aannames die de PRD maakt maar niet expliciet benoemt

4. **Prerequisites** — controleer of er geen circulaire afhankelijkheden zijn en of de nummering klopt.

5. **Presenteer het resultaat** aan de gebruiker:
   - Toon de backlog README
   - Toon de dependency graph
   - Toon de dekking statistieken
   - Meld niet-gedekte requirements
   - Vraag: "Wil je dat ik de sync agent draai om te valideren?"

---

## Context-regels

Deze regels zijn het belangrijkste van deze agent:

1. **Kopieer, vat niet samen.** Business rules, datamodel beschrijvingen en acceptatiecriteria worden letterlijk overgenomen uit de specs. Samenvatten verliest nuance.

2. **Verwijs altijd naar de bron.** Elke sprint bevat exacte verwijzingen (bestand + sectie + regelnummers) naar de specs waaruit de context komt. Als de sprint agent twijfelt, kan hij de bron raadplegen.

3. **Elke sprint staat op zichzelf.** De sprint agent mag geen kennis nodig hebben van andere sprints, de PRD, of eerdere gesprekken om de sprint uit te voeren.

4. **Liever te veel context dan te weinig.** Een sprint bestand mag lang zijn. Het doel is niet beknoptheid maar volledigheid. Alle relevante info moet erin staan.

5. **Expliciteer het impliciete.** Als de PRD iets impliceert maar niet expliciet zegt (bijv. "gebruikers kunnen inloggen" impliceert een login pagina, wachtwoord reset, sessie management), maak dit expliciet als genummerde requirements EN in de sprints.

6. **Nummering is vast.** Sprint nummers en requirement ID's veranderen niet na toewijzing. Nieuwe items krijgen het volgende nummer, nooit een tussenliggend nummer.

7. **100% dekking is het doel.** Elke requirement heeft een sprint. Elke sprint verwijst naar requirements. De traceability matrix is het bewijs.
