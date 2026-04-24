# Use Cases & Extractie-roadmap

> **Status:** Werkdocument — ter validatie met Wouter en Ege
> **Datum:** 2026-04-17
> **Doel:** Bepalen WAT we uit meetings en emails willen halen, door eerst te kijken WAT we er later mee willen doen.

---

## Waarom dit document bestaat

We liepen vast. Niet in het bouwen, maar in het ontbreken van een gedeeld mentaal model: wat halen we uit meetings en emails, en waarom?

De valkuil was: beginnen bij **"welke velden extraheren we?"**. Dat is een output-vraag. Het goede antwoord komt alleen als je eerst de **gebruiks-vraag** beantwoordt: welke beslissing of actie moet iemand later kunnen nemen op basis van deze data?

Dit document werkt achterstevoren: van **use-case → output → extractie-veld**. Daarna zie je vanzelf welke velden, welke agents en welke infrastructuur er nog moeten komen.

---

## Drie categorieën momenten

Use-cases vallen in drie types moment:

| Categorie      | Trigger            | Vraag                                     | Voorbeeld                                |
| -------------- | ------------------ | ----------------------------------------- | ---------------------------------------- |
| **A. Ritme**   | Tijd (push)        | "Wat moet ik weten op dit vaste moment?"  | Maandagmail met weekprio's               |
| **B. Reactie** | Gebeurtenis (push) | "Iets gebeurt — wat moet er nu?"          | Meeting klaar → actie-mail draften       |
| **C. Zoek**    | Gebruiker (pull)   | "Ik heb een vraag — wat is het antwoord?" | "Wat hebben we met klant X afgesproken?" |

---

## Categorie A — Ritme-momenten

### A1. Wat moet er deze week gebeuren?

| Veld              | Inhoud                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Wie**           | Stef + Wouter (maandag 08:00)                                                                      |
| **Trigger**       | Push — automatische maandagmail of dashboard-tegel                                                 |
| **Bron**          | Meeting-extracties (acties + beslissingen), email-extracties, openstaande tasks, externe deadlines |
| **Output**        | Lijst gegroepeerd per project: acties, deadlines, verlopende offertes                              |
| **Beslissing**    | Prio's bepalen, wie pakt wat op                                                                    |
| **Nodige velden** | `actie`, `eigenaar`, `deadline`, `project`, `urgentie`                                             |
| **Status**        | ✅ Data grotendeels aanwezig — mist aggregatie-laag                                                |

### A2. Welke klanten hebben urgent onze aandacht nodig?

| Veld              | Inhoud                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Wie**           | Stef (dagelijks of maandag)                                                                                      |
| **Trigger**       | Push — alert bij rood/oranje                                                                                     |
| **Bron**          | Email sentiment, meeting-frequentie, openstaande beslissingen, deadlines, tijd sinds laatste contact             |
| **Output**        | Per klant stoplicht + reden (stil, negatieve toon, deadline, open beslissing)                                    |
| **Beslissing**    | Bellen, mailen, meeting plannen                                                                                  |
| **Nodige velden** | `sentiment_score`, `laatste_contact_datum`, `open_beslissingen_count`, `naderende_deadline`, `escalatie_signaal` |
| **Status**        | ❌ Sentiment en escalatie-signalen ontbreken volledig                                                            |

### A3. Wat moeten wij nog ontvangen van klanten?

| Veld              | Inhoud                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Wie**           | Stef + Wouter (maandag + dagelijks)                                                           |
| **Trigger**       | Pull + push (overdue alert)                                                                   |
| **Bron**          | Meeting-extracties categorie `wachten_op_extern` + emails met dezelfde categorie              |
| **Output**        | "Lieke (Marble) — intake-document, beloofd 5 april, 12 dagen over tijd"                       |
| **Beslissing**    | Reminder, escaleren, laten vallen                                                             |
| **Nodige velden** | `wat_wachten_we_op`, `bij_wie`, `beloofd_op_datum`, `verwachte_leverdatum`, `dagen_over_tijd` |
| **Status**        | ✅ Gedekt door huidige Extractor — alleen UI nog niet goed zichtbaar                          |

### A4. Wat hebben WIJ aan klanten beloofd?

| Veld              | Inhoud                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Wie**           | Stef + Wouter                                                                           |
| **Trigger**       | Push + pull                                                                             |
| **Bron**          | Meetings + emails — beloften van JAIP-zijde                                             |
| **Output**        | Schuldenboek vanuit jullie kant                                                         |
| **Beslissing**    | Leveren, uitstellen communiceren, delegeren                                             |
| **Nodige velden** | `belofte`, `door_wie_van_jaip`, `aan_wie`, `beloofd_op`, `verwachte_levering`, `status` |
| **Status**        | ❌ Extractor filtert dit nu expliciet weg — moet heroverwogen                           |

### A5. Pre-meeting brief (1 uur voor klantmeeting)

| Veld              | Inhoud                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **Wie**           | De interne deelnemer(s) van de komende meeting                                                  |
| **Trigger**       | Push — 1u voor meeting in agenda                                                                |
| **Bron**          | Alle eerdere meetings + emails met die klant/project                                            |
| **Output**        | Briefing: laatste meeting, open acties, open beslissingen, sentiment, aandachtspunten           |
| **Beslissing**    | Voorbereid een meeting ingaan                                                                   |
| **Nodige velden** | `samenvatting`, `open_acties`, `open_beslissingen`, `laatste_sentiment`, `timeline_per_project` |
| **Status**        | ⚠️ Project Summarizer geeft deels — mist sentiment + agenda-koppeling                           |

### A6. Daily digest (ochtend)

| Veld              | Inhoud                                                                |
| ----------------- | --------------------------------------------------------------------- |
| **Wie**           | Stef + Wouter                                                         |
| **Trigger**       | Push — elke ochtend 08:00                                             |
| **Bron**          | Nieuwe meetings + emails laatste 24u, status-veranderingen op tickets |
| **Output**        | "3 nieuwe meetings verwerkt, 2 emails van klanten, ticket Y gemerged" |
| **Beslissing**    | Focus voor de dag                                                     |
| **Nodige velden** | Metadata op bestaande tabellen                                        |
| **Status**        | ✅ Data aanwezig — nog geen delivery-mechanisme                       |

### A7. Stille klanten (vrijdag)

| Veld              | Inhoud                                                               |
| ----------------- | -------------------------------------------------------------------- |
| **Wie**           | Stef                                                                 |
| **Trigger**       | Push — wekelijks, vrijdag                                            |
| **Bron**          | `laatste_contact_datum` per klant                                    |
| **Output**        | "Bedrijf Z: 6 weken geen contact, lopend project — contact opnemen?" |
| **Beslissing**    | Contact leggen of niet                                               |
| **Nodige velden** | `last_contact_at`, `client_phase` op organizations                   |
| **Status**        | ❌ Pure query + dispatcher — niet gebouwd                            |

---

## Categorie B — Reactie-momenten

### B1. Email komt binnen van klant — wat is dit?

| Veld              | Inhoud                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Wie**           | Stef / Wouter (later: AI-agent zelf)                                                    |
| **Trigger**       | Push — Gmail webhook of poll                                                            |
| **Bron**          | Eén nieuwe email + alle eerdere meetings/emails over deze klant                         |
| **Output**        | Tag + 1-zinnige duiding + koppeling aan open items                                      |
| **Beslissing**    | Zelf antwoorden, doorzetten, ticket maken, uitstellen                                   |
| **Nodige velden** | `intent`, `urgentie`, `verwijst_naar_extractie_id`, `sentiment`                         |
| **Status**        | ⚠️ Email Classifier doet type/relevance, mist `intent` en koppeling aan bestaande items |

### B2. Meeting net afgelopen — draft actie-mails

| Veld              | Inhoud                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Wie**           | Interne deelnemer(s) van de meeting                                                                  |
| **Trigger**       | Push — na menselijke verificatie van meeting                                                         |
| **Bron**          | Verse extracties + eerdere emails + eerdere meetings met zelfde klant/project                        |
| **Output**        | Per externe contactpersoon: drafted email, klaar voor bewerking en verzending                        |
| **Beslissing**    | Verzenden, aanpassen, weglaten                                                                       |
| **Nodige velden** | `actie`, `eigenaar_extern`, `deadline`, `gespreksverwijzing`                                         |
| **Status**        | ⚠️ Data is er — draft-agent bestaat nog niet. **Dit is de eerste agent die we bouwen (Sprint 038).** |

### B3. Klant te lang stil — chase up?

| Veld              | Inhoud                                                 |
| ----------------- | ------------------------------------------------------ |
| **Wie**           | De accounteigenaar van de klant                        |
| **Trigger**       | Push — wanneer `dagen_sinds_laatste_contact > drempel` |
| **Bron**          | DB-metadata (geen extractie)                           |
| **Output**        | Samenvatting + drafted reminder                        |
| **Beslissing**    | Verzenden, bellen, wegklikken                          |
| **Nodige velden** | `last_contact_at`, `client_phase` op organizations     |
| **Status**        | ❌ Niet gebouwd                                        |

### B4. Escalatie-signaal in tekst — alarm

| Veld              | Inhoud                                                           |
| ----------------- | ---------------------------------------------------------------- |
| **Wie**           | Stef — direct, geen review-vertraging                            |
| **Trigger**       | Push — realtime bij `high_alert` sentiment                       |
| **Bron**          | Email of meeting-transcript                                      |
| **Output**        | "ALERT: in mail van klant Z staat '...'. Bel hen vandaag."       |
| **Beslissing**    | Bellen, intern overleggen, niets doen                            |
| **Nodige velden** | `escalatie_signaal` (boolean + reden + quote), `sentiment_swing` |
| **Status**        | ❌ Sentiment-extractie ontbreekt volledig                        |

### B5. Cross-sell / behoefte-signaal

| Veld              | Inhoud                                                             |
| ----------------- | ------------------------------------------------------------------ |
| **Wie**           | Stef / Wouter (sales)                                              |
| **Trigger**       | Push — wekelijkse digest of realtime bij sterke signalen           |
| **Bron**          | Meetings + emails — uitspraken als "we zoeken nog iemand voor X"   |
| **Output**        | "Marble noemde: 'we zoeken iemand die helpt met automatisering'"   |
| **Beslissing**    | Vervolggesprek, voorstel, niets                                    |
| **Nodige velden** | `behoefte_signaal` (categorie + quote + organisatie)               |
| **Status**        | ❌ Needs Scanner doet intern, niet klant-behoeften als opportunity |

### B6. Tegenstrijdigheid tussen bronnen

| Veld              | Inhoud                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Wie**           | Stef + eigenaar van de bron                                                         |
| **Trigger**       | Push — Curator-agent nightly run                                                    |
| **Bron**          | Extracties over hetzelfde onderwerp uit verschillende meetings/emails               |
| **Output**        | "Conflict: meeting 12/4 zegt deadline X is 30/4. Email 15/4 zegt 7/5. Welke klopt?" |
| **Beslissing**    | Bron als waarheid kiezen of klant bevragen                                          |
| **Nodige velden** | Geen nieuwe extractie — Curator-agent                                               |
| **Status**        | ❌ Curator gepland in Phase E                                                       |

---

## Categorie C — Zoek-momenten

### C1. Wat hebben we ooit afgesproken met klant X?

| Veld              | Inhoud                                                        |
| ----------------- | ------------------------------------------------------------- |
| **Wie**           | Stef / Wouter — vóór meeting of offerte                       |
| **Trigger**       | Pull — zoekbalk, MCP, klant-detailpagina                      |
| **Bron**          | Alle verified meetings + emails + extracties per organization |
| **Output**        | Samenvatting per tijdvak, geen ruwe lijst                     |
| **Beslissing**    | Context gebruiken in volgend contact                          |
| **Nodige velden** | Bestaande extracties + tijdlijn-synthese + `topic_tags`       |
| **Status**        | ⚠️ Data is er, synthesis-agent ontbreekt                      |

### C2. Wat is de stand van project Y?

| Veld              | Inhoud                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Wie**           | Intern + klant (via portal) + AI-agents                                               |
| **Trigger**       | Pull                                                                                  |
| **Bron**          | Extracties per project + issues + timeline + laatste sentiment                        |
| **Output**        | Project-dashboard: fase, laatste mijlpaal, open beslissingen, blokkades, risico-score |
| **Beslissing**    | Prio, klant bijpraten, bijsturen                                                      |
| **Nodige velden** | `milestone`, `project_phase`, `blokkades`, `volgende_mijlpaal`                        |
| **Status**        | ⚠️ Project Summarizer deels — mist blokkade- en milestone-extractie                   |

### C3. Hebben we dit eerder opgelost? (kennis-hergebruik)

| Veld              | Inhoud                                                                             |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Wie**           | Wouter, Ege, Kenji, Myrrh                                                          |
| **Trigger**       | Pull — bij nieuw issue of klant-vraag                                              |
| **Bron**          | Alle projecten cross-klant                                                         |
| **Output**        | "Vergelijkbaar probleem 6 maanden geleden bij klant A opgelost — aanpak + PR-link" |
| **Beslissing**    | Aanpak kopiëren, aanpassen, opnieuw bedenken                                       |
| **Nodige velden** | `topic_tags`, `oplossingstype`, kruis-project-embedding                            |
| **Status**        | ❌ Embeddings er, categorisering niet — Analyst-agent (Phase E)                    |

### C4. Wie weet iets over X?

| Veld              | Inhoud                                                               |
| ----------------- | -------------------------------------------------------------------- |
| **Wie**           | Ieder teamlid met een vraag                                          |
| **Trigger**       | Pull — MCP of zoekbalk                                               |
| **Bron**          | Meetings + emails × person-participation                             |
| **Output**        | "Wouter had 4 meetings over X, Ege schreef 2 insights over Y"        |
| **Beslissing**    | Juiste collega betrekken                                             |
| **Nodige velden** | `topic_tags`, `speaker_attribution` per extractie                    |
| **Status**        | ❌ Tags ontbreken, speaker-attribution niet vastgelegd per extractie |

### C5. Wat rekenden we voor vergelijkbaar werk?

| Veld              | Inhoud                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| **Wie**           | Stef, Wouter — vóór offerte                                              |
| **Trigger**       | Pull                                                                     |
| **Bron**          | Sales-meetings + offerte-emails + project-scope + gedraaide uren         |
| **Output**        | "Vergelijkbaar traject bij klant A: scope X, prijs €Y, doorlooptijd Z"   |
| **Beslissing**    | Pricing van nieuwe offerte                                               |
| **Nodige velden** | `scope_items`, `pricing`, `geoffreerde_uren`, `werkelijke_uren`, `marge` |
| **Status**        | ❌ Commerciële laag bestaat niet                                         |

### C6. Portal — klant: waar staan we nu?

| Veld              | Inhoud                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| **Wie**           | Klant zelf — via portal                                                     |
| **Trigger**       | Pull                                                                        |
| **Bron**          | Verified extracties + summaries + issue-status, gescoped op hun organisatie |
| **Output**        | AI-drafted antwoord in natuurlijke taal, human-reviewed vóór verzending     |
| **Beslissing**    | Stef/Wouter reviewen → klant ziet antwoord                                  |
| **Nodige velden** | Geen nieuwe extractie — RLS + Communicator-agent                            |
| **Status**        | ❌ Portal niet gebouwd — hangt op C2                                        |

---

## De synthese — wat ons nog ontbreekt

### Ontbrekende extractie-types (aanvulling op bestaande)

| Veld                              | Aanleiding | Prio      |
| --------------------------------- | ---------- | --------- |
| `beslissing` (apart van actie)    | A1, C1, C2 | 🔴 Hoog   |
| `belofte_van_jaip`                | A4         | 🔴 Hoog   |
| `sentiment` + `escalatie_signaal` | A2, B4     | 🔴 Hoog   |
| `intent` (op emails)              | B1         | 🟡 Medium |
| `behoefte_signaal` / cross-sell   | B5, C5     | 🟡 Medium |
| `topic_tags[]`                    | C3, C4     | 🟡 Medium |
| `scope_item` / `pricing_mention`  | C5         | 🟢 Later  |
| `milestone` / `blokkade`          | C2         | 🟡 Medium |

### Ontbrekende agents

| Agent                       | Rol                                                      | Prio      |
| --------------------------- | -------------------------------------------------------- | --------- |
| **Follow-up Drafter**       | Drafted mails na meetings (cockpit) — **Sprint 038**     | 🔴 Nu     |
| **Signal Extractor**        | Sentiment, escalatie, behoeften uit meetings/emails      | 🔴 Hoog   |
| **Dispatcher**              | Bepaalt wanneer en hoe iemand getikt wordt (Slack, mail) | 🟡 Medium |
| **Communicator / Answerer** | Synthesis-laag: extracties → lopende tekst (portal)      | 🟡 Medium |
| **Curator**                 | Contradicties, staleness, dedup (Phase E)                | 🟢 Later  |

### Ontbrekende DB-velden op organizations/projects

- `client_phase` (prospect / actief / pauze / afgerond)
- `last_contact_at` — voor A7 en B3
- `health_score` — agregatie van sentiment + blokkades + deadlines

---

## Aanbevolen fasering

### Fase 1 — Quick wins (2-3 sprints)

- **Sprint 038: Follow-up Drafter** (B2). Agent + DB-tabel + 2 MCP-tools. Geen UI. Bewerken via Claude Desktop.
- Extractie uitbreiden met `beslissing` en `belofte_van_jaip` (apart sprint)
- B3 (stille klanten) als puur query-sprint — geen nieuwe AI

### Fase 2 — Signaal-laag (2-3 sprints)

- Signal Extractor (sentiment, escalatie, behoefte)
- B4 (escalatie-alert) + B1 (email-intent-verrijking)
- Dispatcher MVP (Slack + mail routing)

### Fase 3 — Portal MVP

- C2 (project snapshot) + C6 (klant-vraag antwoord). RLS + Communicator-agent + portal-app.

### Fase 4 — Intelligentie

- C3, C4, C5, B6 — knowledge reuse, Curator, commercial memory. Komt overeen met Phase E in `vision-ai-native-architecture.md`.

---

## Openstaande discussies (voor Wouter + Ege)

1. Welke use-cases vallen af voor jullie? (doel: 18 → ±12)
2. Kloppen mijn prio-inschattingen (Hoog/Medium/Later)?
3. Mis ik een reactie-moment dat nu handmatig pijn doet?
4. Akkoord met Sprint 038 als startpunt?

---

## Verhouding tot andere docs

- **`vision-ai-native-architecture.md`** — overkoepelende noord-ster; dit document concretiseert de _waarom-kolom_.
- **`meeting-extraction-strategy.md`** — extractie-aanpak per meeting (summary-first). Dit document bouwt daar op voort met nieuwe extractie-types.
- **`sprints/backlog/sprint-038-followup-drafter-agent.md`** — eerste concrete sprint uit deze roadmap.
