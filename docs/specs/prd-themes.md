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

---

## 4. Aanpak in hoofdlijnen

### 4.1 Match-first, create-second

Het grootste risico bij emergent themes is **drift**: zonder discipline
krijg je binnen een maand "hiring", "hiring junior", "junior devs",
"werving" als vier aparte thema's. Daarom geldt één hoofdregel: de AI
**probeert eerst te matchen** tegen bestaande themes, en stelt pas
daarna een nieuw thema voor.

Concreet flowbeeld per meeting:

1. `SELECT id, name, description FROM themes WHERE status = 'verified'`
   — alle bekende thema's (realistisch ~30–50 stuks).
2. Eén Haiku-call met de complete themes-lijst + transcript als
   context. Prompt vraagt: _"Welke bestaande thema's raakt deze
   meeting? Of, als er echt geen passend thema is, stel één nieuw
   thema voor met naam + emoji + korte beschrijving."_
3. Match → link via `meeting_themes` (status bestaand thema blijft
   ongewijzigd).
4. Geen match → nieuw thema met status `emerging` → review-queue.

**Bewust geen embeddings in v1.** Bij jullie realistische schaal
(tientallen themes, geen honderden) past de complete lijst makkelijk in
een Haiku-context en is een simpele `SELECT` + LLM-call goedkoper én
minder bewegende delen dan een vector-lookup. Embedding-based matching
wordt pas relevant bij ~100+ themes of als er een "find similar themes"
feature bijkomt — uitgesteld naar v3. Zie §4.5 upgrade-trigger.

### 4.2 Verification-first, ook voor themes

Nieuwe themes worden niet direct "waar". Een `emerging` thema:

- Verschijnt **niet** in de dashboard pills (A1) of donut (B8).
- Verschijnt **wel** in de review-queue met emoji-picker.
- Wordt pas `verified` na approve door Stef of Wouter.
- Blijft anders na 14 dagen automatisch op `emerging` → Curator kan
  voorstellen tot archiveren.

Dit sluit aan op het bestaande verification-model van extractions en
meetings ("verification before truth", CLAUDE.md §Key Design Principles).

### 4.3 Seed vooraf, niet vanuit nul

Bij de eerste deploy wordt een seed van 10–15 bekende thema's geplaatst
(hiring, sales pipeline, productstrategie, etc.). Dit voorkomt dat de
eerste 20 meetings allemaal nieuwe emerging-themes genereren en geeft
de ThemeTagger meteen iets om tegen te matchen. Seed-themes krijgen
direct status `verified` en worden per supabase migration geplaatst
(`supabase/seed/themes.sql`).

### 4.4 Retroactieve batch-run bij launch

Direct na deploy wordt er eenmalig een batch-run over alle bestaande
verified meetings uitgevoerd. Zonder deze stap is de eerste 4–6 weken
de themes-data te dun om iets zinnigs te tonen (dashboard blijft leeg).
De batch draait via een one-off script in `packages/ai/src/pipeline/`.

### 4.5 Wanneer wél embeddings (upgrade-trigger)

Drie signalen die zeggen "tijd om embeddings toe te voegen":

- Aantal `verified` themes > 100 → LLM-context wordt te vol / te duur.
- Haiku-kwaliteit daalt merkbaar (vaker missed matches) → semantic
  similarity helpt dan echt.
- Feature-verzoek "themes zoals dit thema" of "similar themes" in UI.

Tot dan: gewoon `SELECT`, Haiku en klaar. Niet prematuur optimaliseren.

---

## 5. Agent-architectuur

### 5.1 ThemeTagger — positie in de pipeline

Nieuwe agent (Haiku 4.5), draait **na** de extractors en parallel aan
het embed-en-save stuk. Waarom die positie:

- Loopt **na** Gatekeeper zodat je geen tokens verspilt aan meetings
  die we sowieso weggooien (relevance_score laag).
- Loopt **na** Summarizer/Extractor zodat ThemeTagger het rijkere
  signaal kan gebruiken (samenvatting + extractions), niet alleen de
  ruwe transcript. Dat geeft betere matches met minder ruis.
- Is **geen onderdeel van Gatekeeper** zelf (zie §5.3).

Registreren in `packages/ai/src/agents/registry.ts` als 13e agent zodat
hij op de `/agents` observability pagina verschijnt.

### 5.2 ThemeTagger — input en output

**Input:**

- Meeting-ID + samenvatting + extractions (decisions, action_items,
  insights, needs).
- Volledige lijst `verified` themes uit de database (id, name,
  description).
- De gecureerde emoji-shortlist (zie §7) als enum.

**Output** (Zod-gevalideerd, JSON schema):

```ts
{
  matches: [
    { themeId: string, confidence: "low"|"medium"|"high", evidenceQuote: string }
  ],  // 0–4 stuks; meer dan 4 duidt op over-tagging
  proposals: [
    { name: string, description: string, emoji: Emoji, evidenceQuote: string, reasoning: string }
  ],  // 0–2 stuks; proposals spammen we nooit
  meta: { themesConsidered: number, skipped?: string }
}
```

- Per match gaat één rij naar `meeting_themes` met de `evidenceQuote`
  als argument voor waarom. Die quote is goud voor de detail-UI (C11).
- Elk `proposal` wordt een nieuwe theme-row met status `emerging` en
  landt in de review-queue met de `reasoning` als toelichting.
- `confidence` is bewust **categorisch**, niet numeriek — LLM's zijn
  slecht gekalibreerd op 0–1 scores, drie buckets zijn scherp genoeg.

### 5.3 Waarom niet in Gatekeeper

Gatekeeper beantwoordt één vraag (_doorlaten ja/nee_) en moet snel en
goedkoop blijven. ThemeTagger is een verrijkingsstap die pas zin heeft
nadat we weten dat de meeting erin blijft — en hij heeft de extracties
nodig die Gatekeeper nog niet heeft. Single responsibility blijft
gehandhaafd (CLAUDE.md: _"elk bestand doet één ding"_).

### 5.4 Curator — uitgesteld naar v2/v3

Nachtelijke agent (Sonnet) die het groeiende veld gezond houdt:
dedupe, merge-voorstellen, archivering van stille themes. Niet nodig in
v1 zolang het aantal themes klein is en jullie in de review-queue zelf
kunt ingrijpen. Eerste Curator-taak: voorgestelde merges zichtbaar
maken in review-UI (v2).
