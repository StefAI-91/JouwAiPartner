# 4. Conceptueel Model — De Drie Lagen

## 4.1 Het kernidee

Het probleem: één laag (issues) waar drie lagen nodig zijn. De oplossing: een expliciete drie-lagen-architectuur waarin elke laag zijn eigen doel, taalgebruik en publiek heeft.

```
┌─────────────────────────────────────────────────────────────────┐
│ LAAG 3: Status Reports (snapshots)                              │
│ • Wekelijkse digest, bevroren op datum                          │
│ • Narratief + handgeschreven kritische noot                     │
│ • Publiek: klant + account manager                              │
│ • Voorbeelden: CAI's Notion-doc, Stripe weekly changelog        │
├─────────────────────────────────────────────────────────────────┤
│ LAAG 2: Topics (curatielaag)                                    │
│ • Aggregaat van 1..N issues onder klant-vriendelijke noemer     │
│ • Eigen lifecycle-status, priority, target_sprint               │
│ • Klant-signalen (must-have/nice/not-relevant)                  │
│ • Publiek: klant (in Portal) + team (in DevHub)                 │
│ • Voorbeelden: "Publicatie-flow", "Inlog-stabiliteit"           │
├─────────────────────────────────────────────────────────────────┤
│ LAAG 1: Issues (raw tickets)                                    │
│ • Granulaire technische units                                   │
│ • Gekoppeld aan 0..1 topic                                      │
│ • Eigen status volgt DevHub-lifecycle                           │
│ • Publiek: team primair, klant via topic-aggregatie             │
│ • Bestaat al in `apps/devhub` + `packages/database`             │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Waarom drie lagen, niet twee

Tussenoptie: één laag (issues) met klant-vriendelijke titels. Dit is wat de huidige Portal v1 doet via `client_title` / `client_description`. Het werkt voor lage volumes maar breekt zodra:

- Eén klant-probleem leidt tot 5-10 issues (bijv. "publicatie-flow" omvat publish, sync, taal, logo, koppeling)
- Issues worden afgesloten terwijl het achterliggende probleem blijft (regressie)
- Klant ziet 60+ items in een bucket en verzuipt

De topic-laag lost dit op door **te clusteren op klant-impact in plaats van technisch ticket**. Eén topic kan over meerdere sprints lopen, kan deels-fix verdragen, en heeft een eigen narratieve identiteit.

De Status Report-laag (3) lost een ander probleem op: **klanten waarderen narratief méér dan status-lijsten**. CAI's Notion-doc was waardevol niet omdat het accuraat was, maar omdat het _uitlegde_. Een live-view alleen biedt geen uitleg — een snapshot met `narrative_note` wel.

## 4.3 Bidirectionele loop tussen lagen

```
        ┌──────────────────────┐
        │  Cockpit / DevHub    │
        │  (team, internal)    │
        └──────────┬───────────┘
                   │ Issues + topics worden hier gemaakt
                   ▼
        ┌──────────────────────┐
        │  Topic curated       │  ◄── Mens (of AI in fase 5)
        │  awaiting_client_input│      groepeert issues in topic
        └──────────┬───────────┘
                   │ Topic verschijnt in Portal "Niet geprioritiseerd"
                   ▼
        ┌──────────────────────┐
        │  Portal (klant)      │
        │  Geeft signaal 🔥👍👎 │
        └──────────┬───────────┘
                   │ Signaal komt terug in DevHub
                   ▼
        ┌──────────────────────┐
        │  Team plant in       │  ◄── Mens kiest op basis van
        │  scheduled / sprint  │      signaal + complexity
        └──────────┬───────────┘
                   │ Werk gebeurt
                   ▼
        ┌──────────────────────┐
        │  Issues → done       │
        │  Topic auto-rolled   │
        │  → done              │
        └──────────┬───────────┘
                   │ Auto-update in Portal
                   ▼
        ┌──────────────────────┐
        │  Portal "Recent      │
        │  gefixt" (14d window)│
        └──────────────────────┘
```

Dit sluit de loop tussen quadranten uit de [vision-doc](../vision-ai-native-architecture.md): Cockpit → DevHub → Portal → terug naar DevHub. Geen marktool combineert alle vier de quadranten.

## 4.4 De vier buckets — verfijning

Vier buckets is een UI-vorm; de onderliggende logica is **lifecycle-status van topics, gefilterd op tijd**. Concreet:

| Bucket                   | Topic-conditie                                                                               | Toelichting                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Recent gefixt**        | `status = done` AND `closed_at >= now() - 14d`                                               | Editorial keuze: 14d voorkomt dat de bucket eindeloos groeit. Oudere `done`-topics blijven in archief. |
| **Komende week**         | `status IN (in_progress, scheduled)` AND in huidige of eerstvolgende sprint                  | Klant ziet alleen wat realistisch deze of volgende week komt. Verder weg = "Hoge prio daarna".         |
| **Hoge prio daarna**     | `status = prioritized` (handmatig P1 gezet)                                                  | Topics met expliciete prio die nog geen sprint hebben.                                                 |
| **Niet geprioritiseerd** | `status = awaiting_client_input` OR (`status = clustering` AND `published_to_portal = true`) | Topics die wachten op klant-signaal. Hier verschijnen de 🔥👍👎-knoppen (vanaf fase 2).                |

Topics in `clustering` (nog niet gepubliceerd) zijn onzichtbaar voor klant. Topics in `wont_do` zijn standaard verborgen, met een uitklapper "Bekijk afgewezen wensen" (zie fase 3).

> Mapping is bron-van-waarheid in `packages/database/src/constants/topics.ts` (analoog aan bestaande `PORTAL_STATUS_GROUPS` voor issues).

## 4.5 Klant signaleert, team beslist

**De ontwerpkeuze**: klanten zetten geen P1/P2/P3 zelf. Ze geven een signaal, het team vertaalt naar prioriteit.

Drie opties zijn afgewogen:

### Optie A — Klant prioriteert vrij

- Klant kan elk topic op P1 zetten
- Simpel, maximale klant-controle

**Probleem**: klant kent technische complexiteit niet. Resultaat: 20 P1's die het team niet kan inplannen → vertrouwensverlies wanneer "P1" toch een maand wacht.

### Optie B — Klant heeft budget

- Max N must-haves tegelijk (bijv. 5)
- Dwingt echte keuzes

**Probleem**: voelt beperkend. Klant met legitieme 7 must-haves moet er 2 wegcijferen, raakt gefrustreerd. Werkt voor consumer-tools, minder voor consultancy.

### Optie C — Klant signaleert, team beslist ✅

- Klant kiest 🔥 must-have / 👍 zou fijn / 👎 niet relevant per topic
- Geen quotum
- Team gebruikt signaal als input bij sprintplanning, samen met technische complexity
- Team communiceert prio-keuze terug in topic-narrative ("we begrijpen dat dit must-have is, we plannen het in sprint X omdat...")

**Waarom deze**: meest eerlijk, voorkomt prio-inflatie, klant houdt stem. Past bij JAIP's adviseurs-positie ("we luisteren én adviseren") in plaats van pure leverancier ("u bestelt, wij voeren uit").

> Deze keuze is niet definitief; sectie 13 noemt validatie-criteria om dit later te herzien.

## 4.6 Bug vs Feature: andere defaults in lifecycle

Bugs en features lopen door dezelfde topic-lifecycle, maar **starten anders**:

| Type                             | Default startpunt                                 | Reden                                                                                                                           |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Bug**                          | direct `prioritized` (skip awaiting_client_input) | Team kent severity, klant hoeft niet te stemmen of een bug "nice-to-have" is. Een bug die niemand belangrijk vindt is geen bug. |
| **Feature**                      | `awaiting_client_input`                           | Feature-prio is intrinsiek subjectief, klant-stem maakt verschil.                                                               |
| **Bug met klant-impact-twijfel** | `awaiting_client_input` met severity-vraag        | Bijvoorbeeld: "hoe vaak raakt jou dit?" Sommige bugs raken alle klanten gelijk, andere alleen specifieke workflows.             |

Type wordt expliciet gezet bij topic-creatie (overgeërfd van linked issues, override mogelijk).

## 4.7 De `wont_do` status — verplicht expliciet

Topics die niet doorgaan moeten **een reden hebben**, en die reden moet **zichtbaar zijn voor de klant**. Zonder dit verdwijnen klant-wensen in een zwart gat → vertrouwensverlies.

Implementatie:

- Status `wont_do` heeft verplicht `wont_do_reason` (text, min 10 chars)
- Reden zichtbaar in Portal als klant doorklikt op afgewezen-wensen-uitklapper
- Voorbeeld-redenen: "Buiten scope huidige contract", "Technisch niet haalbaar zonder major refactor", "Vervangen door topic X (gemerged)", "Klant heeft 👎 gegeven"

Dit is een **harde regel**, niet optioneel — anders is `wont_do` semantisch identiek aan een `done` met onbekende uitkomst.

## 4.8 Multi-stakeholder per klantorganisatie

Eén klant-organisatie kan meerdere stakeholders hebben (PM, CTO, marketing). Drie modellen:

| Model                   | Hoe werkt het                                        | Trade-off                                       |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **Per-org één signaal** | Laatste klikker overschrijft                         | Simpel, maar interne klant-discussie verdwijnt  |
| **Per-user signaal**    | Topic toont alle stemmen                             | Volledig transparant, maar team moet aggregeren |
| **Hybride**             | Per-user opslaan, team-view aggregeert (% must-have) | Beste van beide, maar complexer                 |

**v1 keuze**: per-org één signaal (model 1). Reden: minder complexiteit, voldoet aan CAI-pilot. Migreren naar model 3 in v2 is non-breaking (data-laag groeit, UI verandert).

## 4.9 Snapshot vs live-view — beide

Twee Portal-views naast elkaar (vanaf fase 4):

- **Live**: realtime topic-statussen, altijd up-to-date — voor klant die "nu wat speelt" wil weten
- **Snapshot**: bevroren wekelijks rapport met narrative_note — voor klant die de context wil

Default is live; snapshot bereikbaar via "Bekijk vorige rapporten". Beide views, zelfde data, andere temporal lens.

> Dit is een directe les uit CAI's Notion-doc: zij maakten snapshots juist omdat live-view ontbrekende context had.

## 4.10 Audit als waarheid

Elke topic-state-transitie wordt gelogd in `topic_events`. Dit dient drie doelen:

1. **Vertrouwen**: klant kan zien dat status niet stilletjes is gewijzigd
2. **Debugging**: team kan reconstrueren waarom een topic in een bepaalde state belandde
3. **Pattern-detectie** (fase 4/5): events maken het mogelijk om "topics die telkens herstarten" te identificeren

Past op platform-vision principe: _"Database als communication bus, all agent coordination via DB rows"_.

## 4.11 Wat dit conceptueel niet is

- **Geen kanban-tool voor klanten** — klanten verplaatsen niets, ze signaleren
- **Geen vervanging van DevHub** — DevHub blijft de plek waar issues leven en ontwikkelaars werken
- **Geen autonoom AI-systeem** — agent stelt voor, mens beslist (gatekeeper-pattern uit vision-doc)
- **Geen public roadmap** — per-klant siloed, klant A ziet niet de topics van klant B
- **Geen SLA-tool** — geen hard deadlines op topics, alleen "huidige sprint" / "volgende sprint" / "later"
