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

1. Ophalen van alle `verified` themes incl. `name`, `description`,
   `matching_guide` en recente `negative_examples` (zie §5.2 voor de
   volledige input).
2. Eén Haiku-call met de complete themes-bundel, de meeting-samenvatting
   en de extractions. Prompt vraagt: _"Welke thema's raakt deze meeting
   substantieel? Gebruik de matching_guide als arbiter. Bij twijfel
   niet matchen."_
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

### 4.6 Scope — alle meetings, één globale set

ThemeTagger draait op **elke meeting die Gatekeeper doorlaat**, ongeacht
`meeting_type` of `party_type`. Er is één globale themes-tabel zonder
scope-veld — intern en client-context delen dezelfde thema's.

Gevolg: een thema als "Hiring" kan zowel een interne founders-sync
raken als een client-meeting waarin over hun hiring gesproken wordt.
Dat is bewust een simpele start. Als later blijkt dat contexts botsen
(bv. Stef's hiring vs klant-hiring), voegen we `scope` toe aan themes
(v2+).

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

**Input (per theme de volledige context):**

- Meeting-ID + samenvatting + extractions (decisions, action_items,
  insights, needs).
- Alle `verified` themes met per thema:
  - `name` (kort label)
  - `description` (1 zin, UI-display)
  - `matching_guide` (2–4 zinnen: wat valt er wél onder, wat níet)
  - Laatste 2–3 `negative_examples` uit de feedback-loop (zie §5.5)
- De gecureerde emoji-shortlist (zie §7) als enum voor proposals.

**Prompt-discipline (hard in de system prompt):**

- _"Match alleen als het thema een substantieel onderwerp van de
  meeting is — niet bij terloopse vermeldingen van één zin."_
- _"Gebruik de matching_guide als arbiter. Bij twijfel niet matchen."_
- _"Retourneer alleen matches met confidence `medium` of `high`.
  `low` filter je zelf eruit."_
- _"Max 4 matches per meeting. Als alles matcht is het over-tagging."_

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

### 5.5 Feedback-loop — leer van afwijzingen

De matching wordt scherper door menselijke feedback terug te voeren in
de prompt. In de review-UI kunnen Stef en Wouter een voorgestelde
match wegklikken met één reden (_"niet substantieel"_ / _"ander
thema"_ / _"te breed"_). Die afwijzing landt als row in
`theme_match_rejections` met de quote die de LLM als bewijs gaf.

Bij de volgende ThemeTagger-call krijgt het betreffende thema de 2–3
meest recente afwijzingen mee als `negative_examples`. Na 6–8 weken
heeft elk actief thema zo een eigen "wat valt er niet onder" paragraaf
die is gegroeid uit jullie eigen beoordelingen.

Dit is bewust simpel gehouden: geen model-training, geen embeddings,
gewoon recente tekst in de prompt. Schaalt prima tot honderden
afwijzingen per thema.

### 5.6 Wanneer wél een nieuw thema voorstellen

Match-first-create-second werkt alleen als de AI strak weet wannéer
hij mag creëren. Zonder expliciete criteria krijgt de review-queue
elke week random proposals als "Vakantie" of "Koffie-bestellingen".
Daarom gelden vier criteria die de ThemeTagger-prompt hard afdwingt:

1. **Geen match** — Geen enkel bestaand thema haalt confidence
   `medium` of hoger met dit onderwerp. Alleen een echte miss
   rechtvaardigt een voorstel.
2. **Substantie** — Het onderwerp heeft ≥2 extractions
   (decisions/needs/insights/action_items) aan zich hangen in deze
   meeting. Eén losse opmerking in het transcript is niet genoeg.
3. **Granulariteit** — Niet te breed ("werk", "business") en niet
   te smal ("deze ene bug", "de meeting van dinsdag"). Test in de
   prompt: _"Kun je je voorstellen dat dit onderwerp 3× terugkomt
   in de komende maanden?"_
4. **Expliciete afbakening** — In het `reasoning`-veld moet de
   LLM benoemen welk bestaand thema het het dichtst benaderde en
   waarom het tóch niet past. Dwingt non-luie output af.

Criteria 1 en 2 zijn mechanisch (prompt-instructie + join op
extractions-count). Criteria 3 en 4 zijn oordeelskundig — de
review-flow (§10.2) blijft het menselijke vangnet.

**Vangnet als v1 in praktijk ruisig blijkt (v1.5):** proposals
landen dan eerst in een `theme_candidates`-tabel, niet direct als
`emerging`. Pas wanneer dezelfde kandidaat in een tweede meeting
opduikt wordt hij gepromoot tot emerging. Dit filtert one-off
ruis maar kost één extra meeting voordat Stef/Wouter een nieuw
thema zien. Alleen invoeren als de pure v1-aanpak te veel review-
ballast geeft.

---

## 6. Datamodel

### 6.1 Tabel: `themes`

```sql
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏷️',     -- uit shortlist §7
  description text NOT NULL,             -- 1 zin, UI-display
  matching_guide text NOT NULL,          -- 2-4 zinnen, LLM-arbiter
  status text NOT NULL DEFAULT 'emerging'
    CHECK (status IN ('emerging', 'verified', 'archived')),
  created_by_agent text,                 -- 'theme_tagger' of NULL (seed)
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  last_mentioned_at timestamptz,         -- gedenormaliseerd, voor pills
  mention_count int NOT NULL DEFAULT 0,  -- gedenormaliseerd, voor donut
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 6.2 Tabel: `meeting_themes` (junction)

```sql
CREATE TABLE meeting_themes (
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence text NOT NULL
    CHECK (confidence IN ('medium', 'high')),  -- 'low' slaan we niet op
  evidence_quote text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, theme_id)
);
```

### 6.3 Tabel: `theme_match_rejections` (feedback-loop)

```sql
CREATE TABLE theme_match_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  evidence_quote text NOT NULL,          -- de quote die de LLM gaf
  reason text NOT NULL
    CHECK (reason IN ('niet_substantieel', 'ander_thema', 'te_breed')),
  rejected_by uuid NOT NULL REFERENCES auth.users(id),
  rejected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rejections_theme_recent
  ON theme_match_rejections (theme_id, rejected_at DESC);
```

### 6.4 Indexes

- `themes_status_idx` op `status` — pills + donut filteren op `verified`
- `themes_last_mentioned_idx` op `last_mentioned_at DESC` — top-N pills
- `meeting_themes_theme_idx` op `theme_id` — detail-page meetings-tab
- `meeting_themes_meeting_idx` op `meeting_id` — chips op meeting-card

### 6.5 RLS policies (permissive v1)

Zelfde lijn als `tasks` en andere core tabellen: RLS enabled, lees- en
schrijfrecht voor alle authenticated users. Fine-grained per-rol RLS
wordt uitgesteld tot v3 (portal), consistent met de bestaande security
audit (`docs/security/audit-report.md`).

### 6.6 Types regenereren

Na de migratie draaien: `supabase gen types typescript --local`
→ update `packages/database/src/types/database.ts`. Daarna nieuwe
queries in `packages/database/src/queries/themes.ts` en mutations in
`packages/database/src/mutations/themes.ts` (geen directe `.from()`
buiten deze folders, CLAUDE.md §Database & Queries).

---

## 7. Emoji shortlist

### 7.1 Principe

De ThemeTagger mag **alleen** uit een gecureerde shortlist kiezen.
Daarmee voorkomen we dat twee lijkende thema's verschillende emoji
krijgen (drift), dat rare emoji's opduiken (😅 als thema-icoon), of
dat een LLM-run willekeurig een andere kiest bij dezelfde prompt.
De shortlist is klein genoeg om visueel consistent te blijven, groot
genoeg om alle interne thema's te dekken. 42 emoji's, gegroepeerd in
6 clusters — clusters dienen puur voor het brein bij uitbreiden, zijn
niet functioneel in code.

### 7.2 De 42 emoji's

| Cluster            | Emoji's                 |
| ------------------ | ----------------------- |
| **Mensen & team**  | 👥 🫂 👩‍💻 🧑‍💼 🙋 🎯 🏆    |
| **Werk & proces**  | 🗂️ 📋 📊 🧭 🗺️ ⚙️ 🔁    |
| **Product & tech** | 💻 🤖 🧱 🚀 🛠️ 🐛 🎨 📱 |
| **Business**       | 💶 📈 📉 💼 🤝 💡 🏢    |
| **Klant & markt**  | 💬 📢 ❤️ 🗣️ 🌍 🧾       |
| **Operationeel**   | 🏠 🧳 📚 ⏱️ 🔐 📦 🛡️    |

Plus fallback `🏷️` — default bij nieuwe themes waar de tagger geen
keuze maakt, en visueel herkenbaar voor de reviewer als "nog kiezen".

### 7.3 Code-locatie + shape

Eén bestand: `packages/ai/src/agents/theme-emojis.ts`.

```ts
export const THEME_EMOJIS = [
  "👥",
  "🫂",
  "👩‍💻",
  "🧑‍💼",
  "🙋",
  "🎯",
  "🏆",
  "🗂️",
  "📋",
  "📊",
  "🧭",
  "🗺️",
  "⚙️",
  "🔁",
  "💻",
  "🤖",
  "🧱",
  "🚀",
  "🛠️",
  "🐛",
  "🎨",
  "📱",
  "💶",
  "📈",
  "📉",
  "💼",
  "🤝",
  "💡",
  "🏢",
  "💬",
  "📢",
  "❤️",
  "🗣️",
  "🌍",
  "🧾",
  "🏠",
  "🧳",
  "📚",
  "⏱️",
  "🔐",
  "📦",
  "🛡️",
] as const;

export const THEME_EMOJI_FALLBACK = "🏷️" as const;
export type ThemeEmoji = (typeof THEME_EMOJIS)[number] | typeof THEME_EMOJI_FALLBACK;
```

Beide apps importeren via `@repo/ai/agents/theme-emojis`:

- **ThemeTagger-prompt** geeft deze array als _"kies exact één uit deze
  lijst"_-enum mee; Zod valideert de output tegen `ThemeEmoji`.
- **Review-UI emoji-picker** (§9) rendert deze array als 6×7 grid.

### 7.4 Uitbreiden

Shortlist aanpassen = codewijziging + PR, bewust. Als jij/Wouter een
emoji mist, wordt die toegevoegd in een minor PR en geldt vanaf de
volgende ThemeTagger-run. Bestaande themes blijven ongemoeid. Niet
via UI of database muteerbaar — dat zou precies de drift uitlokken die
we wilden voorkomen.

---

## 8. UI — dashboard (A1 + B8)

### 8.1 Floating theme pills (A1)

**Positie:** horizontale strip **bovenaan de dashboard-home**, net
onder het header-blok, boven de meeting-carousel. Volle breedte.

**Data per pill:**

- Emoji (uit `themes.emoji`)
- Naam (`themes.name`)
- Mention-count als badge (mentions laatste 30 dagen, niet `mention_count`
  totaal — dat wordt anders nooit kleiner)

**Gedrag:**

- Top 8 meest actieve `verified` themes, gesorteerd op mention-count
  (tiebreak: meest recent besproken).
- Flex-wrap bij smalle viewports — nooit horizontaal scrollen.
- Klik op pill → `/themes/[slug]` (detail page C11).
- Rechtsboven de strip: _"Alle {N} thema's →"_ link naar `/themes`
  overview (out of scope v1, placeholder).
- Hover: subtiele lift + border-accent, geen tooltip in v1 (voorkomt
  flashiness).

**Tunables (bijstelbaar zonder code-wijziging zodra in prod):**

- Aantal pills (8 default, configurable via env of settings-table).
- Sortering (mention-count vs recency).
- Window voor mention-count (30d default).

### 8.2 Time-spent donut (B8)

**Positie:** in de linker-kolom van de dashboard-home, **onder** de
pills-strip, naast of onder de AI-pulse-strip. Footprint: ~340px breed,
~180px hoog.

**Data:**

- Per `verified` thema: aandeel van totaal mention-count laatste 30d.
- Segment-kleuren uit een vaste 10-palette in `theme-lab` — bewust geen
  tinten van primary; themes zijn onderscheidend bedoeld.
- Center-label: _"30 dgn"_ + totaal-% verdeeld.
- Legend: top 6 themes met kleurblokjes + percentage; rest als
  _"+ N andere thema's"_.

**Gedrag:**

- Klik op segment of legend-item → `/themes/[slug]`.
- Hover segment → opacity-highlight + percentage in tooltip (beperkte
  tooltip oké, want één datapunt).

### 8.3 Queries

Twee nieuwe read-functies in `packages/database/src/queries/themes.ts`:

- `listTopActiveThemes(client, { limit, windowDays })` → voor pills.
- `getThemeShareDistribution(client, { windowDays })` → voor donut.

Beide filteren op `status = 'verified'` en gebruiken de gedenormaliseerde
`last_mentioned_at` + aggregatie over `meeting_themes` binnen window.

### 8.4 Empty / loading / edge states

- **Pre-seed (0 verified themes):** strip + donut tonen neutrale state
  _"Nog geen thema's — loopt na eerste batch-run vanzelf vol."_
- **<3 themes:** pills tonen wat er is, donut toont één grote cirkel +
  melding _"Te weinig data voor verdeling"_.
- **Loading:** skeleton-pills (grijze pilvormen) + skeleton-donut.
- **Emerging-only:** verschijnt niet op dashboard, alleen in review.

---

## 9. UI — theme detail page (C11)

### 9.1 Route + header

`/themes/[slug]` — server-component page in
`apps/cockpit/src/app/(dashboard)/themes/[slug]/`. Vangt ook
`/themes/` als index (lijst-overzicht, v1 = alfabetisch op naam).

**Header-blok** (bovenaan de page):

- Emoji (groot, 32px) + `name` (h1) + `description` (muted subline)
- Rechts: badge met mention-count laatste 30d + laatste mention datum
- Rechts-boven: edit-icon → edit-mode (zie §9.7), zichtbaar voor
  Stef/Wouter (Ege read-only conform §3.1)

### 9.2 Tab: Overzicht (default)

Statsblok in drie kaartjes: `# meetings`, `# besluiten`,
`# open vragen` (tellers tonen 0 in v1 voor open vragen tot v2). Plus
daaronder de laatste 3 activities als mini-lijst (emojirondjes voor
type). Bewust geen AI-narrative (C13) in v1.

### 9.3 Tab: Meetings

Lijst van alle meetings die aan dit theme hangen, gesorteerd op datum
desc. Per rij: titel, datum, participants, confidence-badge
(medium/high), evidence-quote uitklapbaar (`<details>`). Klik op rij
→ `/meetings/[id]`.

### 9.4 Tab: Besluiten

Alle `extractions` met `type = 'decision'` uit de gelinkte meetings,
gesorteerd op datum desc. Per rij: besluit-tekst, source-meeting,
datum. Haakt aan op bestaande extractions-queries — geen nieuwe
data-shape nodig.

### 9.5 Tab: Open vragen (placeholder v2)

Tab zichtbaar maar toont _"Open vragen komen in v2 — we gaan dan
extractions van type `need` koppelen aan status `open`/`resolved`."_
Bewust geen lege lijst: eerlijk zijn over status voorkomt verwarring.

### 9.6 Tab: Mensen

Alle unieke participants uit de gelinkte meetings, met per persoon hun
aantal mentions in dit theme. Klik → `/people/[id]`. Geen quotes per
persoon in v1 (C14 is v2).

### 9.7 Edit mode

Inline edit-formulier toont `name`, `description`, `matching_guide`
en de emoji-picker (6×7 grid uit §7.3). Submit = Server Action
`updateTheme()` met Zod-validatie. Alleen `verified` themes kunnen
edit — `emerging` themes leven in de review-flow (§10).

**Bestaande matches blijven staan bij guide-wijziging.** Als jij de
`matching_guide` aanpast worden oude `meeting_themes`-rijen niet
opnieuw beoordeeld. Dat is consistent met hoe extractions werken (AI-
output is immutable); oude tags zijn historisch correct met de toen-
geldende definitie. Nieuwe meetings gebruiken de nieuwe guide vanaf
dat moment. Geen nachtelijke re-tag.

**Approve-rechten worden niet in RLS afgedwongen.** De edit- en
approve-knoppen zijn verborgen voor niet-primaire gebruikers, en de
Server Actions (`approveTheme`, `updateTheme`, `archiveTheme`) checken
`currentUser.email` tegen een whitelist (`STEF_EMAIL`, `WOUTER_EMAIL`
uit env). RLS blijft permissive — consistent met hoe de rest van het
platform werkt. Fine-grained role-RLS is een v3-onderwerp
(`docs/security/audit-report.md`).

Archiveren gebeurt vanuit edit-mode via een aparte knop _"Archiveer
thema"_ (zet `status = 'archived'` + `archived_at = now()`). Geen hard
delete — we willen historische meeting-links behouden.

### 9.8 Queries

In `packages/database/src/queries/themes.ts`:

- `getThemeBySlug(client, slug)` — header + matching_guide.
- `getThemeMeetings(client, themeId)` — meetings-tab, join op junction.
- `getThemeDecisions(client, themeId)` — besluiten-tab, join via meetings.
- `getThemeParticipants(client, themeId)` — mensen-tab, distinct.

Mutations in `packages/database/src/mutations/themes.ts`:
`updateTheme()`, `archiveTheme()`.

---

## 10. Review-flow

### 10.1 Uitbreiding van bestaande review

Themes krijgen geen aparte review-pagina. Ze haken aan op de bestaande
review-flow in `apps/cockpit/src/app/(dashboard)/review/`. Twee plekken:

- **Review-queue index (`/review`)** — nieuwe sectie _"Thema's om te
  bevestigen"_ boven de meetings-queue, met 1 kaart per `emerging`
  thema. Zichtbaar zodra er iets te reviewen valt.
- **Meeting-review detail (`/review/[id]`)** — per theme-link een
  kleine _"afwijzen"_-knop (§10.4).

### 10.2 Theme approval-kaart (emerging → verified)

Per `emerging` thema één kaart met:

- Grote emoji + voorgestelde naam + description (editable inline)
- `matching_guide` (textarea, editable — default wat de AI voorstelde)
- Onderaan: _"Gevonden in:"_ lijst met 2-3 meetings waar het voor het
  eerst opkwam, met de evidence-quote per meeting
- Drie knoppen:
  - **"Goedkeuren"** (primary) → `status = 'verified'` + `verified_at`
    - `verified_by = currentUser.id`
  - **"Samenvoegen met…"** (secondary) → modal met bestaande
    verified themes; target-theme kiezen → meetings mappen op target,
    huidige thema wordt `archived` (v2 feature, in v1 placeholder met
    _"Komt in v2"_ tooltip)
  - **"Afwijzen"** → `status = 'archived'` + logged reason

### 10.3 Emoji-picker

Binnen de approval-kaart (en ook in theme edit-mode, §9.7) staat
rechtsboven een emoji-picker. Gedrag:

- 6×7 grid met de 42 emoji's uit `THEME_EMOJIS` (§7.3), gegroepeerd per
  cluster met subtiele scheidslijnen.
- Huidige selectie geaccentueerd met primary-ring.
- Keyboard-navigable (pijltjes + enter).
- Popover pattern (shadcn `Popover`) i.p.v. modal — lichter voor zo'n
  kleine keuze.

### 10.4 Match rejection (feedback-loop)

In `/review/[id]` en op de theme-detail-page §9.3 (meetings-tab) krijgt
elke theme-link een kleine ⊘-icon. Klik → popover met drie radio-
buttons (`niet_substantieel` / `ander_thema` / `te_breed`) + bevestig.

Effect:

- Rij verwijderd uit `meeting_themes` (match ongedaan).
- Rij toegevoegd aan `theme_match_rejections` met `reason`,
  `rejected_by`, `evidence_quote`.
- `mention_count` en `last_mentioned_at` worden bijgewerkt op het thema.

### 10.5 Server Actions + queries

In `apps/cockpit/src/actions/themes.ts`:

- `approveTheme(themeId, patch)` — Zod-gevalideerd, zet verified + patch
- `archiveTheme(themeId, reason)` — soft-archive
- `rejectThemeMatch(meetingId, themeId, reason)` — split naar mutation
  - verwijdert match, logt rejection, herberekent counts

In `packages/database/src/queries/themes.ts`:
`listEmergingThemes(client)` — voor de review-queue sectie.

---

## 11. Seed-themes v1

### 11.1 Hoe ze tot stand kwamen

Niet verzonnen, maar **gediscoverd** op basis van alle verified meetings
van de afgelopen 6 maanden. De ontdekkings-prompt (§11.2) is via een
Claude-sessie met MCP-toegang tot de meetings-database uitgevoerd. De
output: 10 thema's die ≥5× zijn teruggekomen en scherp genoeg
begrensd zijn om matching_guide-conflicten te vermijden.

Bij eerste deploy worden deze als `status = 'verified'` geplaatst via
`supabase/seed/themes.sql`. Daarna moet de ThemeTagger matchen tegen
deze 10 — of met goede reden een nieuw `emerging` thema voorstellen.

### 11.2 Discovery-prompt (reproduceerbaar)

Deze prompt kan opnieuw worden gedraaid als de themes-set moet worden
herijkt (bv. na 6 maanden groei):

```
ROL
Je bent theme-discovery analist voor Jouw AI Partner's kennisplatform.
Je hebt via MCP toegang tot alle verified meetings, hun samenvattingen
en extractions (decisions, action_items, needs, insights).

DOEL
Stel 10-15 seed-thema's voor die we als eerste willen opnemen in de
themes-tabel — gebaseerd op wat er daadwerkelijk terugkomt in onze
meetings van de afgelopen 6 maanden.

DEFINITIE VAN EEN THEMA
- Cross-meeting onderwerp dat over tijd terugkomt (≥3 meetings).
- Heeft een eigen doorlopend verhaal: meerdere besluiten, open needs,
  of verschillende perspectieven tussen deelnemers.
- Orthogonaal aan projects. "Hiring" is een thema dat in meerdere
  projecten kan spelen; "CAi Studio" is een project, geen thema.
- Groot genoeg voor een eigen verhaal, klein genoeg om scherp te
  blijven. Niet "werk" of "business" — ook niet één feature.

ZOEKSTRATEGIE
1. Scan alle verified meetings van de laatste 6 maanden.
2. Cluster semantisch gerelateerde mentions onder één thema.
3. Splits thema's die twee verschillende dingen behandelen.
4. Sluit thema's uit die alleen binnen één project spelen.
5. Sluit thema's uit met <3 meetings.

OUTPUT (JSON array, 10-15 objecten, gesorteerd op frequency desc):
{
  "name": "...", "description": "...",
  "matching_guide": "'Valt onder als ...' + 'Valt er niet onder als
    ... (→ naburig thema)'",
  "emoji_suggestion": "één emoji uit de THEME_EMOJIS shortlist",
  "evidence": [{"meeting_id","date","quote"}, ...],  // 2-3 voorbeelden
  "estimated_frequency": 7
}

KWALITEITSREGELS
- Geen dubbele/bijna-dubbele thema's.
- Emoji's moeten uniek zijn.
- Matching_guide moet grens met aangrenzende thema's trekken.

TWEEDE OUTPUT
Rapporteer 3-5 onderwerpen die WEL vaak terugkwamen maar die je bewust
NIET als seed-thema hebt voorgesteld, met één zin waarom niet.
```

### 11.3 De 10 seed-themes

Samenvattend overzicht, gesorteerd op frequentie:

| #   | Emoji | Naam                                | Description                                                                                        | Freq |
| --- | ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | 🧭    | AI-native strategie & positionering | JAIP's eigen verhaal als langetermijn-transformatiepartner (niet bureau, niet SaaS)                | 9    |
| 2   | 🤖    | Interne platform & kennisbank       | JAIP's eigen AI-native stack: kennisbank, DevHub, MCP-server, transcriptie-pipeline                | 8    |
| 3   | 🙋    | Discovery & MVP-kickoffs            | Eerste gesprekken: behoeftes uitvragen, scope afbakenen, wel/niet instappen                        | 8    |
| 4   | 🫂    | Werkdruk & founder-capaciteit       | Stef's overbelasting, overnemen Wouter's rol tijdens verlof, capaciteit op founder-niveau          | 7    |
| 5   | 🗣️    | Founder-ritme & samenwerking        | Wekelijkse sync, 1-op-1's, rolverdeling Stef (tech-ops) vs Wouter (commercieel-strategisch)        | 7    |
| 6   | 🚀    | Klant AI-transformatie trajecten    | Klanten die hun héle bedrijf AI-native willen maken — operatiemodel, niet één feature              | 6    |
| 7   | 🧱    | Stabiliteit vs. feature-snelheid    | Terugkerende spanning tussen klantdruk om door te bouwen en technische schuld die zich opstapelt   | 5    |
| 8   | 💬    | Klantcommunicatie & verwachtingen   | Hoe JAIP voortgang, bugs en tegenslagen communiceert en wat er misgaat als dat niet loopt          | 5    |
| 9   | 🤝    | Partners & sparring-netwerk         | Externe adviseurs (Arjen, Dion, Tibor, Joep) en hoe hun rol in JAIP's ecosysteem wordt vormgegeven | 5    |
| 10  | 👥    | Team capaciteit & hiring            | Behoefte aan senior developer, rolverdeling Ege/Kenji/Myrrh, dedicated developers per klant        | 5    |

### 11.4 Matching_guides (volledig, voor seed migration)

Hieronder de matching_guide per thema zoals ze 1-op-1 naar
`supabase/seed/themes.sql` gaan. Formaat: "valt onder als X / valt er
niet onder als Y (→ naburig thema)".

**1. AI-native strategie & positionering** (🧭)
Valt onder dit thema als het gaat over JAIP's eigen verhaal naar
buiten: wat we zijn (partner, niet bureau), voor wie (MKB in
transitie), hoe we ons onderscheiden, en het grotere narratief 'je
bedrijf is over 5 jaar niet meer hetzelfde'. Valt er niet onder als
het gaat over hoe we intern onze tools bouwen (→ Interne platform &
kennisbank) of over hoe we een specifieke klant transformeren
(→ Klant AI-transformatie trajecten).

**2. Interne platform & kennisbank** (🤖)
Valt onder dit thema als het gaat over de kennisbank, de DevHub,
Gatekeeper AI, ElevenLabs/Fireflies transcriptie-keuzes, de
MCP-server, of de reviewflow van extractions. Valt er niet onder als
het gaat over een vergelijkbaar platform dat we bij een klant bouwen
(→ Klant AI-transformatie trajecten) of over de strategische
positionering erachter (→ AI-native strategie & positionering).

**3. Discovery & MVP-kickoffs** (🙋)
Valt onder dit thema als het gaat over kennismakingscalls,
discovery-sessies, scope bepalen, go/no-go met een nieuwe klant, of
het afwegen of iemand 'past'. Valt er niet onder als de klant al in
productie zit (→ Klantcommunicatie & verwachtingen) of als het over
lopende MVP-development gaat (→ project-specifiek).

**4. Werkdruk & founder-capaciteit** (🫂)
Valt onder dit thema als het gaat over persoonlijke werkdruk, slaap,
stress, verantwoordelijkheidsgevoel van Stef/Wouter, rolverdeling
tussen founders, of Wouters vaderschapsverlof dat Stef's bord raakt.
Valt er niet onder als de druk komt door een te klein team op
developer-niveau (→ Team capaciteit & hiring) of door financiële druk
van een klant (→ project-context).

**5. Founder-ritme & samenwerking** (🗣️)
Valt onder dit thema als het gaat over de 1-op-1 tussen Stef en
Wouter, daily standups, strategische sync, of hoe zij elkaar
aanvullen. Valt er niet onder als het gaat over persoonlijke
werkdruk zonder samenwerkings-aspect (→ Werkdruk &
founder-capaciteit) of over teammeetings met de bredere JAIP-crew
(→ Team capaciteit & hiring).

**6. Klant AI-transformatie trajecten** (🚀)
Valt onder dit thema als de klant zelf ambieert 'AI-native te
worden', het hele bedrijf te transformeren, of een microservices-
per-bedrijfsonderdeel aanpak kiest (Yasemin, Adstra, Brik, SureSync,
Looping). Valt er niet onder als het een afgebakende MVP of feature
is (→ Discovery & MVP-kickoffs), of over onze eigen positionering
(→ AI-native strategie & positionering).

**7. Stabiliteit vs. feature-snelheid** (🧱)
Valt onder dit thema als het gaat over refactoring uitstellen,
technical debt, platform-crashes, bugfix-prioriteit vs. nieuwe
features, of de les 'te snel doorgebouwd zonder fundament'. Valt er
niet onder als het specifiek over één klant-incident gaat
(→ project-context), of over development-proces en PRD's
(→ werkwijze-thema wat later emerging kan worden). Dit thema gaat
over de afweging zelf.

**8. Klantcommunicatie & verwachtingen** (💬)
Valt onder dit thema als het gaat over weekly updates,
Slack-kanalen met klanten, ticketsystemen, verkeerde
product-lanceringen, roadmap-verschuivingen die gecommuniceerd
moeten worden, of klanten die 'te hard pushen' in Slack. Valt er
niet onder als het gaat over de inhoud van de roadmap zelf
(→ project-specifiek) of over interne JAIP-communicatie
(→ Founder-ritme of Team capaciteit).

**9. Partners & sparring-netwerk** (🤝)
Valt onder dit thema als het gaat over de rol van Tibor
(sales/netwerk), Arjen (advies), Dion (mentor/sparringpartner),
Joep (CAI-samenwerking) of ADSTRA-partnerschap vormgeving. Valt er
niet onder als het puur over een klantproject met die persoon gaat
(→ project), of over hiring van interne medewerkers (→ Team
capaciteit & hiring).

**10. Team capaciteit & hiring** (👥)
Valt onder dit thema als het gaat over openstaande vacatures,
senior developer tekort, rolverdeling Ege/Kenji/Myrrh, dedicated
developers per klant, of team-upskilling. Valt er niet onder als
het specifiek over Stef's persoonlijke werkdruk gaat (→ Werkdruk &
founder-capaciteit) of over klant-team capaciteit (→ project-context).

### 11.5 Wat bewust géén seed werd

Drie onderwerpen die kunnen opduiken als emerging zodra ze
substantieel genoeg zijn:

- **Finance & runway** — kwam niet vaak genoeg terug als eigen
  spanningsveld de afgelopen 6 maanden.
- **Sales pipeline (lopende deals)** — Discovery-kickoffs dekken de
  voorkant; als lopende deal-gesprekken toenemen komt dit als
  emerging naar boven.
- **Onboarding proces** — nog te impliciet onder Team capaciteit.

Deze blijven NIET als seed-themes bewaard — de ThemeTagger zal ze
als emerging voorstellen zodra het patroon helder genoeg wordt.

---

## 12. Handmatig triggeren vanuit meeting-detail

### 12.1 Uitbreiding bestaande regenerate-knop

`/meetings/[id]` heeft al een regenerate-knop voor de bestaande
pipeline-stappen (summarizer, extractors). Daar wordt een optie bij
geplaatst: **"Thema's opnieuw taggen"**. Dat spaart ons een aparte UI
en blijft consistent met hoe meetings al worden bijgewerkt.

### 12.2 Waarom dit belangrijk is voor de tuning-loop

Zonder handmatige trigger moet je wachten op nieuwe meetings voordat
je ziet of een aanpassing werkt. Concrete use-cases:

- **Guide bijgewerkt** — je verscherpt de `matching_guide` van een
  thema en wil meteen op 2–3 meetings testen of de ThemeTagger nu
  anders beslist.
- **Nieuw thema goedgekeurd** — een emerging thema is net verified.
  Retroactief taggen van meetings die al door de pipeline waren zou
  anders pas bij volgende nieuwe meetings gebeuren.
- **Match voelt verkeerd** — een meeting is aan een thema gehangen dat
  er niet bij hoort. Rejection (§10.4) haalt één match weg, maar soms
  wil je alles opnieuw laten taggen voor die meeting.
- **Debug-reflex** — als je twijfelt over de output op één meeting,
  gewoon opnieuw draaien.

### 12.3 Gedrag

Klik op _"Thema's opnieuw taggen"_ → Server Action
`regenerateMeetingThemes(meetingId)`:

1. Verwijder alle bestaande rows in `meeting_themes` voor deze
   meeting.
2. Draai de ThemeTagger opnieuw met de huidige verified-themes set
   en actuele `matching_guide` + `negative_examples`.
3. Schrijf nieuwe `meeting_themes`-rijen en eventuele nieuwe
   `emerging` proposals weg.
4. Werk `mention_count` en `last_mentioned_at` bij op alle
   betrokken themes.

**Bewust geen rejections opruimen.** Als je eerder een match voor
deze meeting hebt afgewezen met een reden, blijft die rejection
staan in `theme_match_rejections` — anders verlies je de feedback.
De ThemeTagger leest die rejections bij de re-run weer als
`negative_examples` en wordt dus scherper.

### 12.4 Rechten

Alleen zichtbaar voor Stef + Wouter (zelfde whitelist als
approve/edit, §9.7). Verborgen voor Ege — re-tagging muteert data
en hoort bij de beheerslaag.
