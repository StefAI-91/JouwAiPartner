# Micro Sprint CP-011: End-user signals op roadmap (productie-klanten)

## Doel

Vul de leegte op die ontstond toen "Mijn feedback" werd verwijderd
(zie commit `chore(portal): remove Mijn feedback`). Voor klanten met
een productie-app (Userback / JAIP-widget actief) willen we op de
Roadmap-pagina een sectie tonen met **wat eindgebruikers melden** —
geclusterd op onderwerp, met counts per source-group.

Pre-productie klanten zien deze sectie niet — voor hen is de huidige
topic-buckets-only roadmap voldoende.

## Achtergrond

CP-010 introduceerde de actie-gerichte Briefing. Daarbij bleek "Mijn
feedback" (`/projects/[id]/issues`) overbodig voor de meeste klanten:

- Pre-productie projecten hebben geen end-user feedback → pagina was leeg
- Topics op de Roadmap dekken al "wat gebeurt er met onze feature requests"
- Cai (PM) heeft geen behoefte om zijn eigen indieningen 1-op-1 terug
  te zien — hij wil weten of het team zijn input verwerkt heeft, en dat
  staat op de Briefing of in de Roadmap

Probleem: voor klanten **mét** productie-app (en dus end-user feedback
via Userback / widget) verdwijnt nu een potentieel waardevolle view.
Specifiek: hoe weet Cai dat 5 gebruikers hetzelfde probleem melden?
Vandaag staat dat verspreid in losse issues zonder zichtbaar draagvlak.

## Requirements

| ID         | Beschrijving                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-REQ-120 | `projects` krijgt een `has_production_app` boolean (default false)                                                                                                            |
| CP-REQ-121 | Cockpit project-edit-form heeft een toggle "Heeft productie-app" (boven `Deploy & screenshot` veld)                                                                           |
| CP-REQ-122 | Roadmap-pagina toont een nieuwe sectie "Wat gebruikers ons melden" — alleen als `has_production_app=true` én er end-user issues zijn                                          |
| CP-REQ-123 | De sectie groepeert open end-user issues op gemeenschappelijke topic — issues mét topic onder die topic-titel, issues zonder topic in een aparte "Nog niet geclusterd"-bucket |
| CP-REQ-124 | Per groep tonen: titel, aantal meldingen, source-icoontjes (`Users` voor end_users), datum laatste melding                                                                    |
| CP-REQ-125 | Klikken op een geclusterd item gaat naar de topic-detail (`/roadmap/[topicId]`); ongeclusterd is read-only (geen klik)                                                        |
| CP-REQ-126 | Topic-cards op de roadmap krijgen een source-aggregaat-pill: bv. "5× van gebruikers · 1× van mijzelf"                                                                         |
| CP-REQ-127 | Topic-detail-page toont een lijst gekoppelde issues per source-group                                                                                                          |
| CP-REQ-128 | Empty-state als productie-app actief is maar nog géén end-user issues: subtiele tekst "Geen recente meldingen van gebruikers"                                                 |

## Open vragen vóór start

1. **Trigger voor "heeft productie-app"**: expliciete boolean in cockpit (CP-REQ-120) is mijn voorkeur — deterministisch, geen verrassingen. Alternatief was impliciet (`count(end_user_issues)>0`) maar dat is fragiel: één test-issue activeert de sectie. **Aanbeveling**: bevestig boolean.

2. **Clustering van ongelinkte issues**: hoe groeperen we end-user issues die nog géén topic hebben? Drie opties:
   - **a) Per type** (bug/feature/question) — simpel, weinig signaal
   - **b) Op embedding-distance** — krachtig maar vereist nieuwe pipeline
   - **c) Helemaal niet groeperen, lijst per issue tonen** — geen werk, maar verzandt bij volume

   **Aanbeveling**: start met c) als MVP, schuif naar b) zodra er een productie-klant met >50 issues is.

3. **Alleen open issues of ook closed?** Aanbeveling: alleen open (status ≠ done/cancelled). Closed end-user issues horen in de "Recent gefixt"-bucket van de Roadmap zelf.

4. **Cockpit vs DevHub-zichtbaarheid**: deze sprint raakt alleen Portal. DevHub heeft al eigen issue-views; geen sync nodig.

## Afhankelijkheden

- **CP-010** (Briefing v2) — voltooid, Mijn feedback verwijderd
- **WG-004** (widget client-rollout) — `jaip_widget` source bestaat
- **PR-001..003** (topics foundation) — topics + issue-koppeling

## Taken

### 1. Database

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS has_production_app boolean NOT NULL DEFAULT false;
```

Daarna `gen:types` of types-file met de hand bijwerken.

### 2. Cockpit form

`apps/cockpit/src/features/projects/components/edit-project.tsx`:

- Checkbox-toggle "Heeft productie-app" boven het `Deploy & screenshot` fieldset
- `updateProjectAction` + `updateProjectSchema` uitbreiden

### 3. Portal queries

In `packages/database/src/queries/portal/`:

- **`signals.ts`** (nieuw):
  - `listEndUserSignals(projectId, client)` — open issues met `source IN ('userback','jaip_widget')`, gegroepeerd per topic + ongeclusterde rest
  - `getTopicSourceBreakdown(topicIds, client)` — per topic: count issues per source-group (voor CP-REQ-126)

### 4. Portal UI

`apps/portal/src/components/roadmap/`:

- `end-user-signals.tsx` — nieuwe sectie onder de buckets
- `source-aggregate-pill.tsx` — kleine pill voor topic-cards
- Topic-detail uitbreiden met "Bron van deze melding"-sectie

### 5. Tests

- Query: `listEndUserSignals` filtert correct op source + status
- UI: sectie verschijnt alleen als `has_production_app=true`
- UI: source-pill rendert correct met diverse mixes (alleen end-users, mixed, alleen pm)

## Acceptatiecriteria

- [ ] CP-REQ-120: kolom bestaat, types gegenereerd
- [ ] CP-REQ-121: cockpit form heeft toggle, save werkt
- [ ] CP-REQ-122/128: sectie verschijnt/verbergt correct op Roadmap
- [ ] CP-REQ-123/124: groepering werkt voor zowel geclusterde als ongeclusterde issues
- [ ] CP-REQ-125: links naar topic-detail werken
- [ ] CP-REQ-126: source-pill op topic-cards toont correcte aggregatie
- [ ] CP-REQ-127: topic-detail toont source-breakdown
- [ ] Tests groen, type-check + check:queries slagen

## Risico's

| Risico                                                              | Mitigatie                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Geen productie-klant om tegen te valideren                          | Wacht met starten tot er minimaal 1 productie-klant met ≥10 end-user issues is — anders bouw je voor een hypothese |
| `has_production_app` toggle wordt vergeten te activeren bij kickoff | Documenteer in onboarding-checklist; cockpit project-form prominent                                                |
| Ongeclusterde issues-lijst groeit te snel                           | Cap op N=20 in eerste versie, pagineer later wanneer nodig                                                         |
| Source-pill op alle topic-cards wordt visueel druk                  | Alleen tonen als topic ≥2 issues heeft; één-issue-topics zonder pill                                               |

## Niet in scope

- Klant-input op topics (comment / prioriteit) — aparte sprint waard
- Vervangen van clustering-flow door AI-suggesties
- DevHub UI-aanpassingen (deze sprint is portal-only)

## Vision-alignment

Past in vision §2.4 (Portal als trust layer): de klant ziet niet alleen
de gecureerde topics maar óók de ruwe stem van zijn eindgebruikers. Het
topic-concept blijft de primaire curatie-laag, maar wordt verrijkt met
draagvlak-signaal — wat helpt om eerlijke prioriteringsgesprekken te
voeren met de klant.
