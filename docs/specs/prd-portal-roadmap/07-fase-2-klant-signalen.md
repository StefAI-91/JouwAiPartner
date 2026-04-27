# 7. Fase 2 — Klant-signalen

## 7.1 Doel

Klant kan per topic in "Niet geprioritiseerd"-bucket een signaal afgeven (🔥👍👎). Team ziet die signalen in DevHub en gebruikt ze als input voor sprintplanning. Geen automatische prio-toekenning — team beslist.

**Ná deze fase weet de klant**: "Ik heb invloed op wat eerst opgepakt wordt zonder dat ik P1's hoef toe te wijzen."

**Ná deze fase weet het team**: "Welke topics zijn voor klant must-haves? Welke kan ik veilig naar achter schuiven?"

## 7.2 Wat we lenen, van wie

| Bron                                | Wat we kopen                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| **Canny**                           | Knop-pattern voor klant-input (klikbare knop per item, geen vrij commentaar) |
| **Productboard**                    | Customer signals → priority input model (klant signaleert, team beslist)     |
| **Onze eigen Optie C** (sectie 4.5) | Geen quotum, signaal is geen sturing                                         |

## 7.3 Functionele scope

### 7.3.1 Portal: drie signaal-knoppen per topic

In de "Niet geprioritiseerd"-bucket krijgt elk topic-card drie knoppen:

| Knop | Label         | Actie                          |
| ---- | ------------- | ------------------------------ |
| 🔥   | Must-have     | Topic is essentieel voor ons   |
| 👍   | Zou fijn zijn | Niet kritiek, maar gewaardeerd |
| 👎   | Niet relevant | Voor ons niet nodig            |

Alleen één signaal tegelijk per klant-organisatie (per-org model uit sectie 4.8). Klant kan altijd wijzigen — laatste klikker overschrijft.

**Visualisatie**:

- Geselecteerde knop wordt visueel gemarkeerd (bijv. gevulde achtergrond)
- Subtiele tekst: "Jouw signaal: must-have, gegeven 2 dagen geleden"
- Bij `niet relevant` (👎): topic verdwijnt uit zicht na 5 sec animatie, met "Ongedaan maken"-knop
  - Topic blijft in DB, krijgt status `wont_do_proposed` (of variant — naam in fase 3 vastgelegd)
  - In fase 1-2: status blijft `awaiting_client_input` maar topic wordt verborgen via UI-filter
  - Definitieve `wont_do`-flow met reden komt in fase 3

### 7.3.2 Portal: signaal-context

Onder elk topic in "Niet geprioritiseerd" een uitklapbaar zinnetje:

> "Het JAIP-team gebruikt jouw signaal samen met technische complexiteit om sprints in te plannen. Een 🔥 betekent niet dat het altijd direct wordt opgepakt — wel dat het meeweegt."

Dit zet **expliciete verwachting**. Voorkomt dat klant denkt: "ik klikte must-have, waarom is het er niet over een week?"

### 7.3.3 DevHub: signaal-zicht op topic-detail

Topic-detail in DevHub krijgt sectie:

```
Klant-signalen
─────────────────────────────────────────
🔥 must-have   — gegeven door [user] op [datum]
              — vorige signalen: 👍 (3 dagen geleden)
```

Bij hover/uitklappen: volledige geschiedenis van signalen op dit topic.

### 7.3.4 DevHub: filter "topics met must-have"

Topic-list in DevHub krijgt filter-toggle:

- "Alle topics"
- "Met klant-signaal"
- "🔥 Must-have"
- "👎 Niet relevant" (kandidaat voor `wont_do` in fase 3)

Helpt account managers en sprint-planners snel scannen.

### 7.3.5 Portal: tonen op andere buckets

Topics in andere buckets dan "Niet geprioritiseerd" tonen het laatste signaal als badge (alleen lezen, geen knoppen).

> Reden: klant heeft op een topic in "Hoge prio daarna" 🔥 gegeven, dat blijft zichtbaar zodat de klant ziet dat zijn signaal "is meegenomen". Voorkomt dat signaal verdwijnt zodra topic-status verandert.

## 7.4 Out of scope (expliciet)

- ❌ Multi-stakeholder (per-user signalen) → v2; in fase 2 één signaal per klant-org
- ❌ Quotum ("max 5 must-haves") → eerst zien of klanten überhaupt klikken
- ❌ Comments bij signaal → eerst zien of de knoppen genoeg context geven
- ❌ Email-notificaties bij signaal-wijziging → onnodig in fase 2
- ❌ Cross-klant signaal-aggregatie ("3 klanten 🔥 op vergelijkbaar topic") → fase 5 of v2
- ❌ Sprint-board automatische re-ordering op basis van signalen → expliciet níét doen, team beslist

## 7.5 Database-veranderingen

Nieuwe tabel `topic_client_signals`:

| Kolom                | Type                                                      | Toelichting                     |
| -------------------- | --------------------------------------------------------- | ------------------------------- |
| id                   | uuid PK                                                   |                                 |
| topic_id             | uuid FK → topics                                          |                                 |
| organization_id      | uuid FK → organizations                                   | Per-org model                   |
| signal               | text CHECK IN ('must_have','nice_to_have','not_relevant') |                                 |
| set_by_profile_id    | uuid FK → profiles                                        | Welke gebruiker klikte          |
| set_at               | timestamptz                                               |                                 |
| supersedes_signal_id | uuid FK → topic_client_signals                            | Vorige signaal van dezelfde org |

> **Geen DELETE op signalen** — wijziging wordt nieuwe rij, oude rij blijft voor audit. Huidige signaal = `LATEST(set_at) WHERE supersedes_signal_id IS NULL OR is most recent`.
>
> Alternatief simpler model: één rij per (topic_id, organization_id) met UPDATE; audit via aparte `topic_signal_history`-tabel. Wat handiger is, beslis vóór implementatie. Aanbevolen: latter (eenvoudiger queries).

**RLS**:

- SELECT: org leden + JAIP-admins
- INSERT: alleen client-rol met `has_portal_access(auth.uid(), topic.project_id)`
- UPDATE/DELETE: alleen JAIP-admins (via service role of admin-role)

## 7.6 Code-organisatie

```
packages/database/src/
├── queries/topics/
│   └── signals.ts               ← getCurrentSignalForTopic, listSignalsByOrg
└── mutations/topics/
    └── signals.ts               ← setClientSignal (upsert + history)

apps/portal/src/components/roadmap/
├── signal-buttons.tsx           ← klant-component
└── signal-context-tooltip.tsx

apps/portal/src/actions/
└── topic-signals.ts             ← server action setSignal

apps/devhub/src/features/topics/
├── components/
│   ├── client-signals-panel.tsx
│   └── topic-list-filter.tsx    ← uitbreiding bestaand met signaal-filters
└── actions/
    └── topics.ts                ← bestaand, geen wijziging
```

> Klant-signalen zijn een **uitbreiding van de bestaande topics feature**, niet een eigen feature. Past in de feature-structuur regel: één domein = één feature.

## 7.7 Acceptatiecriteria

### Portal

- [ ] Drie signaal-knoppen verschijnen op topic-cards in "Niet geprioritiseerd"-bucket
- [ ] Klikken op een knop slaat het signaal op (Server Action) en toont confirmatie
- [ ] Geselecteerde knop is visueel gemarkeerd
- [ ] Klant kan signaal wijzigen — laatste klikker overschrijft
- [ ] 👎 (niet relevant) verbergt topic uit zicht met undo-optie binnen 5 sec
- [ ] Tooltip met "wat doet JAIP met dit signaal" is uitklapbaar
- [ ] Topics in andere buckets tonen huidig signaal als badge (geen knoppen)

### DevHub

- [ ] Topic-detail toont huidig klant-signaal + datum + signaal-historie
- [ ] Topic-list heeft filter-toggle voor "met must-have", "met not-relevant"
- [ ] Filter werkt orthogonaal aan bestaande filters (project, type, status)

### Cross-cutting

- [ ] RLS-tests: klant van org A kan geen signaal zetten op topic van project van org B
- [ ] Signaal-historie blijft bewaard bij wijziging (audit)
- [ ] Geen N+1 queries in topic-list (signaal mee in initial query, niet per-topic)
- [ ] `npm run type-check` en `npm run lint` slagen

## 7.8 Verificatie-momenten in deze fase

### Tijdens implementatie

- Na deploy: één test-organisatie geeft op 3 topics een signaal, controleer DevHub-zichtbaarheid
- Test edge case: organisatie heeft 2 actieve users — laatste klikker wint, beide zien dezelfde state

### Acht weken na go-live (gate naar fase 3)

Zie sectie 5.4 — meet:

| Metric                             | Drempel          |
| ---------------------------------- | ---------------- |
| % topics met klant-signaal         | ≥30%             |
| Tijd tot eerste signaal            | ≤7 dagen mediaan |
| Aantal 👎 signalen                 | >0               |
| Klacht "geen respons op must-have" | 0                |

**Als drempels niet gehaald**: niet door naar fase 3. Eerst UX-onderzoek naar waarom klanten niet klikken.

## 7.9 Geschatte sprint-omvang

**1 sprint** (5-7 werkdagen). Verdeling:

- DB migratie + types: ~0.5 dag
- Queries + mutations + Zod: ~1 dag
- Portal-knoppen + UX: ~1.5 dagen
- DevHub-zicht + filter: ~1 dag
- RLS-tests + integration: ~0.5 dag
- Buffer: ~0.5-1 dag

## 7.10 Risico's in fase 2

| Risico                                                 | Mitigatie                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Klant klikt nooit (knoppen onvindbaar)                 | UX-test in fase 1.5 of vroege week 1 fase 2                                    |
| Klant klikt 100% must-have op alles                    | Tooltip + transparantie helpt; v2 quotum als nodig                             |
| Team voelt klant-signaal als sturing, niet input       | Onboarding voor team: "signaal = input, jij beslist"                           |
| Signaal verdwijnt bij topic-status-verandering         | Topic in andere bucket toont huidig signaal als badge                          |
| Race condition bij 2 stakeholders die tegelijk klikken | Latest-write-wins met timestamp; UI laat laatste signaal direct zien           |
| 👎 verbergt topic, klant denkt dat hij verdwenen is    | Undo-knop binnen 5 sec; daarna te vinden in "Bekijk afgewezen wensen" (fase 3) |
