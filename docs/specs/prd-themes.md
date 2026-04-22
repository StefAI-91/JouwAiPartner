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
