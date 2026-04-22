# PRD: Themes — Thematische clustering van gesprekken

> **Status:** Draft
> **Datum:** 2026-04-22
> **Owner:** Stef Banninga
> **Versie:** 1.0
> **App:** `apps/cockpit/` (quadrant: Cockpit — Strategy & PM)
> **Prototype:** `/theme-lab` (19 varianten, sample data)

---

## 1. Context & Probleem

### 1.1 De aanleiding

Stef en Wouter hebben wekelijks meerdere interne sync-meetings, 1-op-1's
en founders-gesprekken. Alle meetings worden via de gatekeeper-pipeline
verwerkt en als verified meetings in het platform opgeslagen. Project-
gerelateerde meetings zijn makkelijk terug te vinden via de projects-
navigatie, maar **intern overleg** (hiring, cultuur, strategie, finance,
remote-beleid) heeft nu geen goede plek. De bestaande management-pagina
is te plat en te simpel: je ziet losse meetings maar geen doorlopend
verhaal.

Resultaat: belangrijke onderwerpen verliezen hun context. Een discussie
over junior-dev-werving die over 4 meetings verdeeld is, oogt als
4 losse gesprekken in plaats van één lopend verhaal met besluiten,
tegenstellingen en open vragen. Stef en Wouter krijgen geen _feeling_
voor wat er écht speelt — alleen een platte lijst van wat er gezegd is.

### 1.2 Waarom dit nu urgent is

- Het platform verwerkt al wekenlang meetings — de data is er, maar niet
  op een manier die denkhulp biedt.
- Interne thema's worden vaak herhaald zonder dat iemand doorheeft dat
  ze recurring zijn → geen progress, alleen herhaling.
- Tegenstrijdige besluiten over dezelfde onderwerpen blijven onopgemerkt
  omdat niemand alle gerelateerde meetings terugleest.
- Zonder deze laag blijft het platform een archief in plaats van een
  denkpartner — precies het omgekeerde van de vision in
  `vision-ai-native-architecture.md`.

### 1.3 Waarom een apart concept naast projects

- **Projects** = scope-dimensie: _in welk project speelt dit?_
  (CAi Studio, Portal-bouw, interne infra)
- **Themes** = onderwerp-dimensie: _waar gaat het inhoudelijk over?_
  (hiring, finance, team-cultuur, productstrategie)
- Deze dimensies zijn orthogonaal. Een meeting kan tegelijk project
  CAi Studio zijn én themes "tech debt" en "client communicatie" raken.
- Projects zijn handmatig aangemaakt en stabiel. Themes moeten juist
  **emergent** zijn — ze volgen wat jullie bespreken, niet wat jullie
  vooraf hebben bedacht.

---

## 2. Visie

### 2.1 Themes als denkhulp, niet als index

De bedoeling is niet om meetings op een nieuwe manier te labelen. De
bedoeling is dat het platform zelf een laag toevoegt die voelt als een
meedenkende collega: _"Jullie hebben dit onderwerp al 3 weken op tafel,
er is nog geen besluit; wil je de open vragen zien?"_ Themes zijn het
vehikel om die laag te dragen — elk thema is een bundel van meetings,
besluiten, open vragen en quotes die samen een **doorlopend verhaal**
vormen.

Vanuit de vision-doc uitgedrukt: themes zijn het mechanisme waarmee
Knowledge In (cockpit) transformeert van losse records naar
_samenhangend inzicht_ — stap 1 van de volledige loop.

### 2.2 Plek in het quadranten-model

Themes leven **volledig in de cockpit**. Geen directe koppeling met
DevHub of Portal in v1. Later denkbaar:

- **DevHub:** issues kunnen aan themes hangen (bv. "Onboarding proces"
  issue-cluster).
- **Portal:** client-themes (bv. per klant de top-3 onderwerpen van de
  afgelopen maand).

Dat zijn expliciet v2/v3 discussies. In deze PRD blijft scope: **intern
overleg tussen Stef en Wouter** — niet projecten, niet klanten.

---

## 3. Gebruikers & Scope

### 3.1 Gebruikers

| Rol           | Wie             | Wat                                                     |
| ------------- | --------------- | ------------------------------------------------------- |
| **Primair**   | Stef, Wouter    | Bekijken thema's, approve nieuwe thema's, edit emoji    |
| **Secundair** | Ege (Tech Lead) | Leest mee, geen approve-rechten op thema's              |
| **Systeem**   | ThemeTagger     | Matcht meetings aan bestaande themes, stelt nieuwe voor |
| **Systeem**   | Curator         | Nachtelijke dedupe, merge-suggesties, archivering       |

### 3.2 In scope (v1)

- `themes` tabel met status (`emerging` / `verified` / `archived`)
- `meeting_themes` junction (many-to-many) met confidence
- `ThemeTagger` agent (Haiku) in de pipeline
- Gecureerde emoji shortlist (~45 stuks, vastgelegd in code)
- Dashboard: floating theme pills (A1) + time-spent donut (B8)
- Detail page `/themes/[slug]` met tabs (C11)
- Review-flow: nieuwe themes approven + emoji-picker override
- Retroactieve batch-run op bestaande meetings (eenmalig bij launch)

### 3.3 Expliciet OUT of scope (v1)

- Threads (doorlopend gesprek binnen een thema) → v2
- Open-questions tracking → v2
- Narrative-paragraaf (C13) → v2, pas als themes stabiel zijn
- Contradiction detection (D18) → v2/v3, vraagt Curator-agent
- Weekly digest email (D16) → v3
- Hiërarchische themes (parent/child) → later, niet in v1
- Cross-app themes (DevHub/Portal) → v2+
