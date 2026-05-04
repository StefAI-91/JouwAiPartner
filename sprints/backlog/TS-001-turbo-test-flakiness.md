# Micro Sprint TS-001: Turbo test parallel-flakiness pragmatisch fixen

## Doel

Pre-push hook ontblokkeren door turbo's `test`-pipeline serieel te runnen (`--concurrency=1`). 5 devhub-tests falen onder parallel-uitvoering maar passen 100% direct, en blokkeren elke push. Echte root-fix (tests robuust maken tegen parallelism, of vitest-pool isolatie verbeteren) is buiten scope — komt in TS-002 als de pijn aanblijft.

## Probleem

`npm run test` (= `turbo test`) faalt structureel met 5 devhub-tests onder turbo's parallel-runner:

- `__tests__/actions/attachments.test.ts` — 2 fail
- `__tests__/actions/bulk-cleanup.test.ts` — 1 fail
- `__tests__/actions/topic-linking.test.ts` — 2 fail (variabel; eerder ook `topics.test.ts` en `review.test.ts`)

`npm test --workspace=apps/devhub` direct: **94/94 groen**. Het probleem zit dus in turbo's parallel-execution — vermoedelijk DB-state-race tussen workers in cockpit/devhub/ai die tegelijk dezelfde Supabase-test-DB raken, of memory-pressure onder gelijktijdige vitest-workers.

WG-006 push (en in principe elke push naar main) wordt nu structureel geblokkeerd. Pragmatisch oplossen, niet eerst weken in de root-fix verzinken.

## Requirements

| ID         | Beschrijving                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| TS-REQ-001 | `.husky/pre-push` runt `npx turbo test --concurrency=1` ipv `npm run test`. Inline comment legt uit waarom (referentie naar deze sprint).             |
| TS-REQ-002 | `npm run test` zelf blijft ongewijzigd — developers kunnen lokaal nog parallel draaien als ze willen. Pre-push is de enige plek met de seriële guard. |
| TS-REQ-003 | Verifieerbaar: nieuwe pre-push hook draait WG-006-push schoon, en heel turbo `test` is groen.                                                         |

## Niet-doel

- Root-cause fix van de devhub parallel-flakiness. Hoort in TS-002. Hypotheses voor latere debugging:
  - Vitest workers met shared Supabase test-client maken DB-state-race
  - Stdout-buffer overflow onder N parallel workers
  - Memory-druk → testTimeout overschrijdt op trage start

## Acceptatiecriteria

- [ ] TS-REQ-001: `.husky/pre-push` aangepast met inline-comment.
- [ ] TS-REQ-002: root `package.json` `test`-script ongewijzigd.
- [ ] TS-REQ-003: `git push origin main` slaagt zonder verdere wijzigingen.
- [ ] Sprint verplaatst naar `sprints/done/`, master-index in `sprints/backlog/README.md` bijgewerkt.

## Risico

| Risico                                                                     | Mitigatie                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pre-push wordt 10-30s trager omdat workspaces serieel ipv parallel draaien | Acceptabel — push is geen hot-path. Met 10 packages × ~5s gemiddeld zit je rond 50s ipv ~30s. Zinvolle prijs voor groen.  |
| TS-002 wordt nooit gepakt en flakiness sluipt elders door                  | Master-index entry blijft staan; iedere maandag-sync het pakken als `npm test` (zonder concurrency=1) niet schoon draait. |
