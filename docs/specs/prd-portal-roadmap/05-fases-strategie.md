# 5. Fase-strategie & Verificatie-momenten

## 5.1 Waarom in fases bouwen

Vijf redenen om dit niet als één grote release op te leveren:

1. **Curatielast is onbekend**. We weten niet of wekelijkse topic-curatie 30 minuten of 4 uur per klant kost. Pas na fase 1 weten we dit.
2. **Klant-gedrag is onbekend**. Klikt een klant überhaupt op signaal-knoppen? Of negeert hij ze? Pas na fase 2 weten we dit.
3. **AI-suggesties hebben grond-truth nodig**. We kunnen geen agent trainen op clustering-keuzes die nog niet gemaakt zijn. Eerst handmatig clusteren (fase 1-3), dan agent in fase 5.
4. **Sunk cost-risico vermijden**. Als fase 1 niet werkt, willen we niet 5 sprints in iets onnodigs gestoken hebben.
5. **Klant-feedback per fase aanscherpt scope**. Fase 4 (snapshots) zou kunnen vervallen als klanten in fase 1-3 al voldoende vertrouwen hebben.

## 5.2 De drie tests per fase

Elke fase moet voldoen aan:

### Test 1 — Standalone shippable

Na deze fase werkt het voor klanten, ook als we hier stoppen. Geen feature flags voor toekomstige states. Geen half-functionele knoppen die "binnenkort meer doen".

### Test 2 — Leert iets

Dwingt ons keuzes te maken die de volgende fase informeren. Als een fase geen leereffect heeft, voegen we waarde toe maar geen kennis — risicovol omdat fase N+1 dan ongeïnformeerd is.

### Test 3 — Slaat iets bewust over

Scope-discipline. Per fase een lijst "wat we expliciet níét bouwen". Voorkomt drive-by-additions die de fase opblazen.

## 5.3 De vijf fases in één tabel

| Fase | Naam                 | Kern-deliverable                       | Sprint-omvang | Verificatie-gate                           |
| ---- | -------------------- | -------------------------------------- | ------------- | ------------------------------------------ |
| 1    | Basis                | Topics + 4-bucket Portal (read-only)   | 1 sprint      | Klant-interview na 4-6 weken: "Helpt dit?" |
| 2    | Klant-signalen       | 🔥👍👎 knoppen + DevHub-zicht          | 1 sprint      | Signaal-gebruik meten: ≥30% klanten klikt  |
| 3    | Lifecycle automation | Auto status-rollup + audit + `wont_do` | 1-2 sprints   | Curatielast meten: ≤2 uur/klant/week       |
| 4    | Narratieve snapshots | Wekelijkse status-rapporten            | 1 sprint      | Klant haalt rapport actief op              |
| 5    | AI-acceleratie       | Topic-curator agent (mens-in-de-loop)  | 2-3 sprints   | Agent-suggestie acceptance ≥70%            |

**Totale doorlooptijd**: 6-8 sprints (12-16 weken) als alle fases doorgaan en validatie-gates groen zijn.

**Realistisch scenario**: fase 1-3 doorgaan, fase 4 of 5 vervalt of wordt sterk vereenvoudigd op basis van learnings.

## 5.4 Verificatie-momenten — verplicht, niet vrijblijvend

### Tussen fase 1 en fase 2 (week 4-6)

**Activiteit**: klant-interview met 2-3 actieve klanten (CAI als primaire, plus 1-2 anderen als ze er zijn).

**Vragen**:

1. Helpt deze view? Sluit dit Slack-berichten en ad-hoc rapportages uit?
2. Wat mis je? (open vraag, niet leiden)
3. Begrijp je wat een "topic" is in deze context, of voelt het abstract?

**Beslismomenten**:

- ✅ Positief signaal → door naar fase 2
- ⚠️ Lauw signaal → eerst UX-iteratie op fase 1, dan pas fase 2
- ❌ Negatief signaal → fundamentele review; misschien is topic-laag verkeerd model

**Tegelijk meten**:

- Hoeveel topics zijn er gecreëerd?
- Hoeveel issues zijn er gekoppeld?
- Hoeveel ungrouped issues blijven hangen?
- Hoeveel tijd kostte topic-creatie (handmatig)?

### Tussen fase 2 en fase 3 (week 8-10)

**Activiteit**: meet signaal-gebruik in productie.

**Metrics**:

| Metric                                           | Drempel voor doorgaan                        |
| ------------------------------------------------ | -------------------------------------------- |
| % topics met klant-signaal                       | ≥30% van actieve topics                      |
| Tijd tussen topic-publicatie en eerste signaal   | ≤7 dagen mediaan                             |
| Aantal 👎 (niet relevant) signalen               | >0 (anders durft klant niet "nee" te zeggen) |
| Klacht "ik klikte must-have en er gebeurde niks" | 0 (anders breekt vertrouwen)                 |

**Beslismomenten**:

- ✅ Drempels gehaald → door naar fase 3
- ⚠️ <30% klikt → vóór fase 3 eerst UX-onderzoek (waarom niet?)
- ❌ Klacht over geen-respons → eerst transparantie-toevoeging maken (fase 3 acceptance-flow naar voren halen)

### Tussen fase 3 en fase 4 (week 12-14)

**Activiteit**: meet curatielast in echte uren.

**Metrics**:

| Metric                                         | Drempel      |
| ---------------------------------------------- | ------------ |
| Uur per klant per week aan topic-curatie       | ≤2 uur       |
| % issues binnen 7 dagen aan topic gekoppeld    | ≥80%         |
| Triage-queue >20 ungrouped issues              | 0 incidenten |
| Topic-status klopt zonder handmatige correctie | ≥95%         |

**Beslismomenten**:

- ✅ Curatielast onder 2u/klant/week → door naar fase 4 (narratief)
- ❌ Curatielast boven 2u/klant/week → **fase 5 (AI) prioriteren boven fase 4**. Anders schaalt het niet bij meer klanten.

### Tussen fase 4 en fase 5

**Activiteit**: bepaal of AI-acceleratie échte waarde toevoegt.

**Metrics**:

| Metric                                             | Drempel                        |
| -------------------------------------------------- | ------------------------------ |
| Klant haalt status-rapport actief op               | ≥50% van klanten 1+ keer/maand |
| Account managers gebruiken rapport in klantgesprek | ≥60% van gesprekken            |
| Curatielast (incl. rapport-schrijven)              | nog steeds ≤2u/klant/week      |
| Signaal-acceptance bij wijziging suggesties        | meten als baseline voor fase 5 |

**Beslismomenten**:

- ✅ Curatielast oké, narratief gewaardeerd → door naar fase 5 voor verdere acceleratie
- ⚠️ Narratief weinig gebruikt → fase 5 vervalt; of we definiëren "AI" anders (alleen clustering, geen narrative drafting)

## 5.5 Wat we expliciet níét doen tussen fases

- **Geen "vooruit-ontwikkelen"**. Tussen fase 1 en 2 niet stiekem het signaal-systeem voorbouwen. Wachten op de validatie-gate.
- **Geen scope-uitbreidingen onderweg**. Als klant in fase 1 zegt "wil je ook comments?", noteer voor v2, niet inbouwen in fase 1.
- **Geen feature-flags voor toekomst-states**. Database mag wel velden hebben die later vullen; logica nooit aanwezig zonder UI om hem te gebruiken.
- **Geen impliciete koppeling**. Fase 3 mag niet veronderstellen dat fase 2 al gefaseerd is. Elke fase moet bovenop de vorige werken zonder cross-fase-aannames.

## 5.6 De ingebakken push-back

Als ik (Claude) tijdens implementatie merk dat een fase groter wordt dan de geschatte sprint-omvang, **stop ik en vraag opnieuw scope**. Dit volgt de CLAUDE.md-regel:

> "Als je een file/functie >2× zo lang maakt als nodig lijkt voor het doel, stop en herschrijf korter."

Toegepast op fases: als fase 1 plotseling 3 sprints kost, is iets mis met de scope-aanname. Dan eerst herschalen (wat halen we eruit?), niet onderweg uitbreiden.

## 5.7 Wat als een validatie-gate rood wordt?

Drie scenario's:

### Scenario A: gate is rood door UX-fout

**Voorbeeld**: signaal-knoppen worden niet gebruikt omdat ze onvindbaar zijn in mobile.

**Actie**: UX-fix in een tussenfase (1.5, 2.5), opnieuw meten, dan pas door.

### Scenario B: gate is rood door fundamentele aanname

**Voorbeeld**: klanten begrijpen niet wat topics zijn, willen issue-niveau zien.

**Actie**: stop met fase-progressie. Herzie conceptueel model (sectie 4). Mogelijk: drop topic-laag of houd hem alleen voor team-zicht (klant ziet nog steeds issues).

### Scenario C: gate is rood door externe factor

**Voorbeeld**: CAI heeft net zijn eigen Notion-doc-proces gebouwd en heeft de Portal niet meer nodig.

**Actie**: andere klant interviewen voor signaal. Als geen klant de waarde ziet, geen reden om door te bouwen.

> Geen enkel scenario is "doordrukken want we hebben al geïnvesteerd". Sunk cost is geen argument.
