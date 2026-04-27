# 3. Marktonderzoek — Hoe doen anderen dit?

Vóórdat we bouwen: wat doen vergelijkbare teams en welke patronen kunnen we lenen of moeten we expliciet vermijden? Vier dominante categorieën in de markt.

## 3.1 Public voting boards

**Voorbeelden**: Canny ($100/mnd), Featurebase, Frill, Sleekplan, Productboard

**Hoe het werkt**:

- Eindgebruikers schieten feature requests in
- Anderen kunnen upvoten
- Team zet status: _Under Review → Planned → In Progress → Complete_
- Roadmap is publiek of gated achter login

**Sterk**:

- Klant voelt zich gehoord
- Lage onderhoud — community doet de prioritering
- Bekende UX-conventies, klanten kennen de patronen

**Zwak**:

- Populariteit ≠ prioriteit (luidruchtige minderheid wint)
- Alle klanten zien elkaars wensen — privacy-probleem voor consultancy-model
- Geen aggregatie — 100 user requests blijven 100 items
- "All clients see all features" past niet bij JAIP's per-klant model

**Wat we lenen**:

- ✅ Knop-pattern voor klant-input (knop op item in plaats van vrij commentaar)
- ✅ Statussen-vocabulaire (Planned / In Progress / Complete)
- ❌ Stem-aggregatie over klanten heen
- ❌ Public roadmap

## 3.2 Changelog feeds

**Voorbeelden**: Linear changelog, Stripe changelog, Vercel changelog, Headway, Beamer

**Hoe het werkt**:

- Eén-richting digest van wat is opgeleverd
- Gecategoriseerd: New / Improved / Fixed
- Wekelijks of per release
- Vaak Markdown of CMS-driven

**Sterk**:

- Lage onderhoud
- Klanten zien progressie
- Editorial keuze welke items uitlichten — voorkomt overload

**Zwak**:

- Geen vooruitkijk (alleen verleden)
- Geen klant-inspraak
- Werkt slecht voor niet-geprioritiseerde backlog

**Wat we lenen**:

- ✅ Digest-stijl ipv ticket-stijl voor "Recent gefixt"-bucket
- ✅ Editorial keuze (niet alle done-issues hoeven uitgelicht)
- ✅ Periodieke snapshot-format (fase 4)

## 3.3 Public GitHub issues / OSS-stijl

**Voorbeelden**: VS Code, Tailwind CSS, Node.js, de meeste open-source projecten

**Hoe het werkt**:

- Klant ziet de echte tickets
- Volledig publiek issue-tracker
- Labels en milestones voor structuur

**Sterk**:

- Maximale transparantie
- Gebruikers met technische kennis kunnen meedenken
- Audit trail is automatisch

**Zwak**:

- Technische noise
- Niet schaalbaar voor non-developer klanten
- Status updates zijn niet klanttaal

**Wat we lenen**:

- ✅ Audit-trail principe (alle transities zichtbaar)
- ✅ "Niemand verdwijnt in zwart gat" — elk issue heeft een traceerbaar einde
- ❌ Granulariteit per ticket
- ❌ Technische taalgebruik

## 3.4 Linear's Customer Requests + Projects

**Voorbeelden**: Linear (Cycles + Projects + Customer Requests), Height

**Hoe het werkt**:

- Issues worden gegroepeerd in **Projects** (= onze "Topics")
- **Customer Requests** koppelen externe feedback aan interne issues
- Public project pages per klant
- Voting van externe users telt mee in prioritering
- Cycles zijn sprints

**Sterk**:

- Drie-laags model precies zoals wij ontwerpen
- Audit-events zichtbaar
- Customer-request → issue-link is expliciet

**Zwak**:

- Geen ingebouwde AI-clustering
- Geen aparte "awaiting_client_input"-status
- Customer-side UI is minimaal
- Vereist Linear als source of truth voor de hele organisatie

**Wat we lenen**:

- ✅ Topic-laag bovenop issues (fase 1)
- ✅ Customer-request-koppeling aan issues
- ✅ Audit-events per record (fase 3)
- ✅ Project = topic abstractie

> Linear is conceptueel het dichtst bij wat wij willen bouwen. Het verschil zit in: per-klant siloing, expliciete `awaiting_client_input` lifecycle-status, AI-clustering en narratieve snapshots.

## 3.5 Productboard

**Voorbeelden**: Productboard

**Hoe het werkt**:

- "Insights" = ruwe customer feedback
- Insights worden handmatig gekoppeld aan "Features"
- Roadmap wordt gegenereerd uit features
- Voting + segments

**Sterk**:

- Insight → Feature mapping is conceptueel correct (= onze issue → topic mapping)
- Heavy support voor multi-stakeholder
- Roadmap-templating

**Zwak**:

- Brittle in praktijk — handmatige koppeling werkt niet bij volume
- Zwaar tool, hoge instapdrempel
- Roadmap-views zijn rigide

**Wat we lenen**:

- ✅ Insights → Features model als inspiratie voor onze issue → topic
- ✅ Klant-segments (verschillende klanten verschillende prio's)
- ❌ Het tool zelf — te zwaar

## 3.6 Basecamp Shape Up

**Voorbeelden**: Basecamp 3, kleine product-teams die "Shape Up" methodiek gebruiken

**Hoe het werkt**:

- Geen backlog tonen, alleen "wat we deze 6 weken doen"
- Hill charts ipv burndown — fuzzy progress
- Pitches in plaats van tickets
- Cycle/cooldown structuur

**Sterk**:

- Dwingt scope-discipline
- Geen valse precisie ("80% klaar" is bullshit, "over de heuvel" is eerlijk)
- Voorkomt promise-inflatie ("dit komt zeker volgende week")
- Narratief leidend, lijst secundair

**Zwak**:

- Klanten zien geen vooruitkijk (alleen huidige cycle)
- Voelt soms als "black box" voor stakeholders
- Geen klant-input op pitches

**Wat we lenen**:

- ✅ Narratief leidend (snapshot in fase 4 met kritische noot)
- ✅ Fuzzy progress (status `in_progress` zonder percentage)
- ✅ Geen valse precisie ("Komende week" als bucket, geen exact deadline-veld)
- ❌ Volledige backlog-onzichtbaarheid (klant moet "Niet geprioritiseerd" wel zien om signaal te kunnen geven)

## 3.7 De CAI Studio Notion-doc als referentie

Dit is geen markttool, maar een **klant-gegenereerd voorbeeld** dat letterlijk laat zien wat onze klant wil zien. Patronen die we direct kopiëren:

| Patroon                    | Hoe in CAI's doc                                                     | Hoe wij implementeren                     |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Snapshot-datum             | "Samengesteld op 23 april 2026"                                      | `compiled_at` op status reports (fase 4)  |
| Kritische noot vooraf      | "Dit patroon (vroeg als opgelost claimen, later toch terugkomen)..." | `narrative_note` veld op report (fase 4)  |
| Per-item korte uitleg      | 1-3 zinnen klanttaal per item                                        | `client_description` op topic             |
| Status inline met item     | "Status: IN BEHANDELING (JAIP 23 april)"                             | Lifecycle-status op topic (fase 3)        |
| Sprint-references          | "(Sprint 1)", "(Sprint 2)"                                           | `target_sprint` op topic                  |
| "Wat herhaalt zich" sectie | 6 patronen genoemd                                                   | Pattern-detectie in fase 4/5              |
| Rode vlag-sectie           | Communicatie vs realiteit                                            | Audit-events maken dit zichtbaar (fase 3) |
| 4 hoofdcategorieën         | GEFIXT / P0 / P1 / P2                                                | 4 buckets in Portal (fase 1)              |

## 3.8 Marktpositie van wat wij bouwen

```
                                     ┌─────────────────────┐
                                     │  Wat wij ontwerpen  │
                                     │  (per-klant + AI)   │
                                     └──────────▲──────────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       │                        │                        │
              ┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
              │  Linear         │      │  Productboard   │      │  Canny + GitHub │
              │  Projects +     │      │  Insights →     │      │  changelog +    │
              │  Customer       │      │  Features       │      │  voting         │
              │  Requests       │      │                 │      │                 │
              └─────────────────┘      └─────────────────┘      └─────────────────┘
                  + AI clustering         + per-klant silo         + topic-aggregatie
                  + awaiting_input        + AI clustering          + lifecycle states
                  + per-klant silo        + lifecycle states       + per-klant silo
```

Wat wij bouwen = **Linear's drie-laags model + Canny's klant-input + Basecamp's narratieve discipline + AI-curatie + per-klant siloing**. Geen enkele tool combineert deze vier; daarom bouwen we het zelf.

## 3.9 Build vs buy — eerlijke afweging

Wij kunnen ~80% benaderen door **Canny ($100/mnd) + Linear ($80/mnd voor team) + Zapier-koppeling**. Dat is ~$200/mnd in plaats van 5 sprints engineering. De **legitieme vraag**: rechtvaardigt de AI-native curatie (fase 5) en de per-klant siloing de bouwkeuze?

**Ja, om twee redenen**:

1. **AI-clustering met gatekeeper-discipline** is de differentiator. Canny en Productboard hebben hier brittle implementaties. Onze gatekeeper-pipeline ([`packages/ai/src/pipeline/`](../../../packages/ai/src/pipeline/)) past hier 1-op-1 op.
2. **Consultancy-model**: we hebben meerdere klanten met aparte projecten en commerciële relaties. Public Canny-style schaadt onze positionering.

**Risico van bouwen** (zie sectie 13):

- Wekelijkse curatielast wordt operationeel commitment, niet vrijblijvend
- Re-clustering (issues splitsen/mergen tussen topics) is harder dan eerste clustering — onderschat dit niet
- Snapshot-narratief schrijven kost tijd zelfs met AI-suggesties (fase 5)

**Conclusie**: bouwen, maar fase 1 minimaal en strikt aan validatie-gates houden. Als fase 1 niet werkt, is ons probleem niet de tool — is het de discipline van wekelijkse curatie. Dat zou geen duurder tool oplossen.
