# 2. Probleem & Context

## De directe trigger

Op 23 april 2026 deelde een externe redacteur een Notion-document genaamd **"CAI Studio — Status overzicht"** dat zij zelf wekelijks samenstellen. Het document is opgebouwd uit:

- 9 bevestigd opgeloste items (categorie GEFIXT)
- 5 P0-items in actieve behandeling (blokkerend)
- ~15 P1-items op de planning (Sprint 1, Sprint 2)
- ~15 P2-items lage prio of toekomst
- Een sectie "Wat herhaalt zich in alle drie documenten" — pattern recognition over meerdere statusbronnen
- Een **kritische noot vooraf** waarin tegenstrijdigheden tussen JAIP-rapportages worden benoemd
- Een **rode vlag-sectie** over communicatie versus realiteit

Dit document bestaat omdat de huidige Portal v1 — die al 4 buckets toont — **niet leesbaar is op issue-niveau**. CAI Studio krijgt zoveel meldingen vanuit hun userbase (USR-XXX tickets in DevHub) dat de ruwe issue-lijst geen overzicht meer geeft. Ze zijn dus zelf gaan curaten.

## Het achterliggende probleem

Drie symptomen, één oorzaak:

1. **Noise-volume**: User-submitted issues groeien sneller dan het team ze technisch kan ordenen. Eén klant kan in een week 30+ issues toevoegen via Userback en feedback-formulieren.
2. **Granulariteit-mismatch**: Wat een klant wil weten ("kan ik mijn studio nu publiceren?") komt niet overeen met hoe DevHub ticket-by-ticket organiseert ("issue #234: validation error in publish endpoint").
3. **Ontbrekende narratief**: De Portal toont stand-van-zaken, maar niet de redenering. CAI's Notion-doc had juist de kritische noot en pattern-detectie — dat creëert vertrouwen, niet de status-lijst zelf.

**De kernoorzaak**: we modelleren één laag (issues) waar drie lagen nodig zijn (issues → topics → reports). Klant en team werken op verschillende abstractieniveaus en de Portal forceert ze tot één — met onleesbaarheid voor de klant en ontbrekende context voor het team als gevolg.

## Vertrouwensdimensie

Uit CAI's Notion-doc, letterlijk geciteerd:

> "De gebruikersupdate van 16 april meldt serverfouten, witte schermen en Co-Founder problemen als opgelost. Het JAIP-rapport van 23 april (vandaag, een week later) meldt publicatie-flow en landingspagina-details nog steeds als IN BEHANDELING met gebruikers die geblokkeerd zijn."

Dit is een **vertrouwens-rode-vlag**. De oorzaak is geen kwade wil, maar dat ons huidige systeem geen mechanisme heeft om "gefixt" te onderscheiden van "deels gefixt" of "fixed in een andere instantie weer terug". Topics + lifecycle-status (zie fase 3) lossen dit op: één topic blijft `in_progress` als er regressies optreden, ipv per-issue te claimen "done" terwijl de topic feitelijk leeft.

## Schaalprobleem

Huidige situatie:

- 1 actieve pilot-klant (CAI) met 60+ open issues
- Wekelijkse handmatige curatie nodig om communicatie leesbaar te houden
- Naar 5-6 klanten = onhoudbaar zonder structuur

Verwachte groei (uit `docs/specs/vision-ai-native-architecture.md`): meerdere klanten per maand. Zonder topic-laag wordt elke klant zijn eigen Notion-doc-fabriek — met copy-paste-fouten, drift en vertrouwensschade.

## Waarom het bestaande Portal v1 niet voldoet

Bestaande Portal (`apps/portal`, [`prd-client-portal/`](../prd-client-portal/)) heeft:

- ✅ Authenticatie en RLS
- ✅ Vier buckets op issue-status (Ontvangen / Ingepland / In behandeling / Afgerond)
- ✅ Source-switch (Onze meldingen / JAIP-meldingen)
- ✅ Klant-vriendelijke titel/beschrijving per issue (`client_title` / `client_description`)

Wat ontbreekt:

- ❌ Aggregatie van issues onder gemeenschappelijke noemer (één klant-probleem ≠ één ticket)
- ❌ Time-window in "Afgerond"-bucket (alle done-items op één hoop, geen "deze week vs vorig kwartaal")
- ❌ Sprint-bewustzijn ("komende week" als eigen bucket)
- ❌ Klant-input op prioritering
- ❌ Narratief / context boven de lijst
- ❌ Wegwijs voor wensen die niet doorgaan (`wont_do` met reden)

Issues die afgesloten worden zonder klant-uitleg verdwijnen nu in een zwart gat. De feedback-loop is incompleet.

## Beoogde feedbackloop (uitbreiding bestaande)

```
1. Issue komt binnen (klant via Portal feedback / JAIP via DevHub)
2. Issue wordt aan een Topic gekoppeld (handmatig of via AI in fase 5)
3. Klant ziet topic in Portal in 4-bucket-view
4. Klant geeft signaal op niet-geprioritiseerde topics (🔥👍👎)
5. Team neemt signaal mee in sprintplanning
6. Topic doorloopt lifecycle (scheduled → in_progress → done)
7. Status-changes worden zichtbaar in Portal (auto-rollup vanuit issues)
8. Wekelijks: snapshot-rapport met handgeschreven noot (fase 4)
→ Loop herhaalt
```

## Relatie met platform-vision

Past direct in [`docs/specs/vision-ai-native-architecture.md`](../vision-ai-native-architecture.md) §2.4 (trust layer / Portal):

- **Verification before truth**: topic-curatie is een verificatie-stap (mens beslist welke issues groeperen, welke beschrijving klant ziet)
- **Database als communication bus**: topic-events log past 1-op-1 op dit principe
- **AI als account manager**: fase 5 vult deze rol in (clustering + narrative drafting, mens-review)
- **Volledige loop tussen quadranten**: Portal → DevHub via klantsignalen, DevHub → Portal via status-rollup. Dit sluit de loop die in v1 alleen DevHub → Portal was.
