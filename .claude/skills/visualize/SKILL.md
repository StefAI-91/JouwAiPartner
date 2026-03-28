---
name: visualize
description: >
  Maakt snelle visuele schetsen en mockups als standalone HTML met Tailwind CSS.
  Gebruik deze skill wanneer de gebruiker iets wil visualiseren, schetsen, of een
  mockup wil zien. Triggers: "visualiseer", "schets", "hoe ziet dit eruit", "maak
  een mockup", "toon een voorbeeld", "prototype", "wireframe", "laat zien hoe dit
  werkt", "hoe zou X eruitzien", "kun je een scherm tekenen", "maak een flow",
  "toon het datamodel", "architectuuroverzicht". Ook bruikbaar als iemand twijfelt
  over een UI-beslissing of een concept wil valideren vóór implementatie.
---

# Visualize Skill

Maak snelle, interactieve HTML-schetsen om concepten te valideren voordat er code geschreven wordt. Geen React, geen build stap — puur een HTML-bestand met Tailwind CDN dat je opent en direct ziet.

De kracht van deze skill zit in snelheid: liever een ruwe schets in 30 seconden dan een pixel-perfect design na een uur. Het doel is altijd **validatie**, niet design.

## Wanneer gebruiken

- **Vóór een sprint** — valideer of jouw beeld van een feature klopt
- **Tijdens design** — schets hoe een component zich gedraagt
- **Bij overleg** — laat snel zien wat je bedoelt aan een klant of stakeholder
- **Bij twijfel** — "ik weet niet hoe dit eruit moet zien" → schets het

## Workflow

### Stap 1: Bepaal het type visualisatie

Vraag de gebruiker via meerkeuze welk type ze willen. Sla deze stap over als het type al duidelijk is uit de context.

**Vraag 1: Wat wil je visualiseren?**

| Optie                   | Wanneer                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| 🧩 **Component**        | Eén los UI-element: tabel, formulier, kaart, modal, navigatie. Toont alle states. |
| 📄 **Pagina / Feature** | Een compleet scherm met layout, componenten en dummy data.                        |
| 🔀 **Flow / Proces**    | Een gebruikersflow van stap tot stap, inclusief beslismomenten.                   |
| 📊 **Datamodel**        | Visueel ER-diagram van tabellen, kolommen en relaties.                            |
| 🏗️ **Architectuur**     | Hoe systemen met elkaar communiceren: API's, services, databases.                 |
| 🔄 **State diagram**    | Toestanden van een object en de transities daartussen.                            |

**Vraag 2: Hoe gedetailleerd?**

| Optie                | Wat je krijgt                                                   |
| -------------------- | --------------------------------------------------------------- |
| ✏️ **Snelle schets** | Lo-fi, grijs/wit, focus op structuur. Klaar in 1 minuut.        |
| 🎨 **Styled mockup** | Met kleuren, branding, iconen. Ziet eruit als een echt ontwerp. |

### Stap 2: Verzamel context

Verzamel net genoeg context om te bouwen — niet meer. Stel alleen vragen die je nog niet kunt afleiden uit de conversatie of beschikbare project-docs.

Lees `references/context-per-type.md` voor de specifieke vragen per type visualisatie.

### Stap 3: Bouw de HTML

Lees `references/html-template.md` voor het standaard HTML-template en de technische richtlijnen.

Lees `references/type-guidelines.md` voor de specifieke richtlijnen per visualisatie-type.

Belangrijke principes bij het bouwen:

- **Realistische data.** Gebruik echte namen, emails, datums, bedragen. "Lorem ipsum" vertelt niets over hoe iets voelt in gebruik.
- **Interactief waar nuttig.** Tabs moeten switchen, modals moeten openen, hover states moeten werken. Maar het is een schets — niet overdrijven.
- **Standalone.** Geen dependencies behalve Tailwind CDN. Eén HTML-bestand, openen in browser, klaar.
- **Schets-indicator altijd zichtbaar.** De gele balk bovenaan maakt duidelijk dat dit geen eindproduct is.

### Stap 4: Opleveren

1. Sla op met een beschrijvende naam:

   ```
   sketch-[type]-[beschrijving].html
   ```

   Voorbeelden: `sketch-component-leads-table.html`, `sketch-flow-onboarding.html`

2. Presenteer het bestand aan de gebruiker.

3. Vraag: "Klopt dit met wat je in gedachten had? Wat wil je aanpassen?"

4. Itereer tot de gebruiker tevreden is.

### Stap 5: Koppelen aan project (optioneel)

Als het project een `docs/specs/` folder heeft:

- Sla de definitieve schets op in `docs/specs/sketches/`
- Verwijs ernaar vanuit de PRD of het design doc
- Sprint-agents kunnen de schets gebruiken als referentie bij UI-gerelateerde taken

## Regels

- **Snelheid boven perfectie.** Een schets hoeft niet pixel-perfect te zijn.
- **Vraag eerst, bouw dan.** Altijd eerst type en context bepalen voordat je bouwt — tenzij de context al volledig duidelijk is.
- **Primary color aanpasbaar.** Gebruik de projectkleur als die bekend is (uit CLAUDE.md of projectinfo), anders default Flowwijs groen `#006B3F`.
- **Geen externe dependencies.** Alleen Tailwind CDN. Geen React, geen npm, geen build tools.
