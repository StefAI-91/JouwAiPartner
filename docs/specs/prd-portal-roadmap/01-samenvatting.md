# 1. Samenvatting

## Wat we bouwen

Een **roadmap- en changelog-laag** in de Portal die klanten in vier buckets laat zien wat er gefixt is, wat komende week aan de beurt komt, wat hoge prioriteit heeft en wat nog niet geprioriteerd is. Niet op ruwe issue-tickets — op **topics**: een curatielaag waarin meerdere issues samenkomen onder één klant-vriendelijke noemer.

Concreet voor de klant:

- **Recent gefixt** — wat is in de laatste 14 dagen opgeleverd
- **Komende week** — wat zit in de huidige of eerstvolgende sprint
- **Hoge prio daarna** — geprioriteerd maar nog geen sprint
- **Niet geprioritiseerd** — wachtend op klantsignaal

Klant geeft per topic in "Niet geprioritiseerd" een signaal: 🔥 must-have / 👍 zou fijn zijn / 👎 niet relevant. Het team beslist met dat signaal als input — niet als directe sturing. Dit voorkomt het bekende prio-inflatie-probleem ("alles is P1") dat tools als Canny hebben.

## Waarom we dit bouwen

CAI Studio (huidige pilot-klant) maakt zelf wekelijkse **Notion-digests** waarin ze 60+ ruwe DevHub-issues samenvatten in 15 leesbare topics, met een handgeschreven kritische noot erbij. Onze huidige Portal v1 toont 4 buckets op issue-niveau, wat onleesbaar is bij volume. Tegelijk klagen klanten dat ze hun ingediende issues niet terugzien als "behandeld" — terwijl het JAIP-team intern wel werkt aan het achterliggende probleem.

Het probleem schaalt slecht: bij 5+ actieve klanten is de huidige workflow (handmatige rapportages per week) niet vol te houden.

## Hoe we het bouwen — 5 fases

| Fase | Naam                 | Wat                                                 | Indicatie   |
| ---- | -------------------- | --------------------------------------------------- | ----------- |
| 1    | Basis                | Topics + 4-bucket Portal (read-only)                | 1 sprint    |
| 2    | Klant-signalen       | 🔥👍👎 knoppen + DevHub-zicht                       | 1 sprint    |
| 3    | Lifecycle automation | Auto status-rollup + audit + `wont_do` met reden    | 1-2 sprints |
| 4    | Narratieve snapshots | Wekelijkse status-rapporten met handgeschreven noot | 1 sprint    |
| 5    | AI-acceleratie       | Topic-curator agent (mens-in-de-loop)               | 2-3 sprints |

Elke fase is **standalone shippable**. Als we na fase 2 stoppen, hebben we nog steeds een werkend product. Tussen elke fase een verplicht **leermoment** met klantinterview of metingen, voordat we doorbouwen.

## Wat dit níet is

- Geen vervanging van de bestaande Portal v1 — bouwt erbovenop. De huidige source-switch (Onze meldingen / JAIP-meldingen) blijft, alleen verschuift de basis-eenheid van _issue_ naar _topic_.
- Geen public roadmap zoals Canny — per-klant siloed (consultancy-model)
- Geen volledig autonome AI — agent stelt voor, mens beslist (gatekeeper-pattern)
- Geen sign-off / comments / voting in deze PRD — die staan als v2-uitbreidingen in de bestaande Portal-PRD

## Belangrijkste ontwerpkeuze

**Klant signaleert, team beslist** (in plaats van klant prioriteert direct). Drie opties zijn overwogen (vrije voting / budget van max 5 / signaal-team-beslist) en we kiezen optie 3. Reden: klant kent technische complexiteit niet, dus laat die het team afwegen — anders krijg je gepubliceerde "P1's" die toch een maand wachten, met vertrouwensschade als gevolg.

> Zie sectie 4 voor de volledige reasoning achter deze keuze en sectie 13 voor de open vragen die nog beantwoord moeten worden vóór fase 1-implementatie.
