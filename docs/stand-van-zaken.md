# Stand van zaken — Action Item Specialist tuning

**Branch:** `claude/update-specialist-prompt-vGFp5`
**Laatste commit:** `0a04198` (drop context_summary, kortere quotes)
**Status:** in tuning, niet productie-klaar voor v3 / two-stage

## Doel

De Action Item Specialist haalt action_items uit meeting-transcripten van JouwAIPartner (JAIP). Eindresultaat: deelnemers kunnen na elke meeting een mail krijgen met een hoog overzicht van actiepunten — wat zij JAIP nog moeten leveren én wat JAIP hen nog moet leveren. Daarom is precision en recall beide kritisch: liever niets dan ruis, maar geen echte action_items missen.

## Wat er nu draait

Drie prompts en twee orkestratie-modes naast elkaar. Productie blijft v2 single-call totdat we v3 of two-stage hebben gevalideerd.

### Productie-pad (default)

- **v2 prompt** (`packages/ai/prompts/action_item_specialist.md`, 344 regels) — vier-eis-model: rol / toezegging / concreet / agency. Gegroeid uit ~12 incrementele patches op false positives. Werkt, maar is een patchwork.
- Single-call: één Sonnet 4.6 high-effort call die transcript ziet en items uitspuugt.

### v3 prompt (parallel, harness-only)

- **v3 prompt** (`packages/ai/prompts/action_item_specialist_v3.md`, 165 regels) — drie-vragen-model:
  1. Leveren wij aan een externe? (→ type B)
  2. Wachten wij op een externe? (→ type C of D)
  3. Binnen wat voor termijn?
- Idee: minder regel-patches, het model redeneert via drie binaire vragen ipv 12+ anti-patronen. Kortere prompt = minder rationalisatie-ruimte.
- Te draaien via mode=`single` + promptVersion=`v3` in de harness.

### Two-stage mode (parallel, harness-only)

- **Stage 1 — Candidate Spotter** (`packages/ai/prompts/action_item_candidate_spotter.md`) — Haiku 4.5, scant transcript op zeven patronen (toezegging / aanwijzing / werkbeschrijving / wachtende_uitspraak / beslissing / reminder_verzoek / klantverzoek). Doel: hoge recall, geen filter.
- **Stage 2 — Judge** (`packages/ai/prompts/action_item_judge.md`) — Sonnet 4.6 plain (geen high-effort). Krijgt candidates + transcript in één batch, beslist accept/reject per kandidaat tegen de drie vragen.
- Voordeel: judge weegt één kandidaat tegelijk = minder rationalisatie-ruis dan single-call die 30 turns voor 5 outputs moet wegen.
- Te draaien via mode=`two-stage`.

### Spotter-only mode (debug)

- mode=`spotter-only` draait alleen Haiku-stage zonder de judge — bedoeld om de spotter-prompt te tunen zonder elke iteratie ~30-60s judge-latency.

## Harness

`/dev/action-items/run` (cockpit, admin-only). UI heeft drie dropdowns:

- **Prompt** (v2 / v3) — alleen actief bij mode=single
- **Mode** (single / two-stage / spotter-only)
- **Confidence ≥** en **Match-similarity ≥** voor filter-knobs

Resultaat-panels:

- Precision/Recall/F1 vs golden dataset
- Per-item diff: match (groen), false positive (amber), false negative (rood)
- Reasoning per geëxtraheerd item (komt uit `reasoning` veld dat alle prompts vragen)
- Two-stage debug-panel: candidates list met pattern_type + accept/reject status + rejection_reason

## Schema

`packages/ai/src/validations/action-item-specialist.ts` — single-call output. type_werk = `A | B | C | D` (E is in deze branch verwijderd; migratie `20260425120000_drop_type_werk_e.sql`).

`packages/ai/src/validations/action-item-two-stage.ts` — split in twee arrays:

- `accepts: ActionItemAccepted[]` — volle action_item velden + candidate_index
- `rejects: ActionItemRejected[]` — alleen candidate_index + rejection_reason

(Anthropic strict-mode accepteert geen omitted velden, daarom split ipv één discriminator-schema.)

## Lessons learned tijdens deze iteratie

- Anthropic strict-mode is allergisch voor `.int().min(1)` numeric constraints. Gebruik `z.number()` en post-clamp.
- High-effort thinking + structured output cap je response. Bij parse-failures: drop high-effort eerst, dan bump maxOutputTokens.
- Haiku is breed in candidate-spotting tot je de hard-uitsluiting-lijst zeer expliciet maakt (smalltalk, gezinszaken, pitch-tekst, logistieke side-notes).
- Tijdsankers zijn geen condities ("in week van 4 mei" = deadline, niet voorwaardelijk). Telkens als ik een passief-wachten-filter aanscherpte, sloeg het terug op datum-commitments.
- Tibor en Dion behandelen als gewone externen werkt beter dan een aparte type E "partner-levering". Dat label gaf het model een open deur om ervoor te kiezen bij twijfel.

## Bekend probleem nu

**Spotter is traag op grote meetings.** ~4 min latency, deels door:

1. Output-grootte: zelfs na drop van `context_summary` en quote-trim van 200→120 chars heeft Haiku nog veel tekst te schrijven bij brede meetings.
2. Sequentieel typen: Haiku schrijft de hele JSON-response token-voor-token, geen streaming-UI in de harness.

**Volgende stap als hij nog te traag blijft:** chunked transcript-processing. Transcript in stukken (bv. per 5-10k chars), spotter parallel op elk stuk, candidates samenvoegen met dedup. Of: streaming output naar UI zodat je candidates ziet binnenkomen.

## Open vragen

- Is v3 (drie-vragen) beter dan v2 (vier-eis) op de golden dataset? Geen vergelijkings-data nog.
- Is two-stage de moeite waard qua precision-winst vs ~2x cost en latency? Zelfde — niet gevalideerd.
- Of we per-candidate parallel calls moeten doen ipv één batch judge call (judge ziet nu wel alle candidates samen, kan dedupliceren maar moet veel afwegen).

## Belangrijke files

```
packages/ai/prompts/
  action_item_specialist.md          # v2, productie default
  action_item_specialist_v3.md       # v3, drie-vragen
  action_item_candidate_spotter.md   # stage 1 (Haiku)
  action_item_judge.md               # stage 2 (Sonnet)

packages/ai/src/agents/action-item-specialist.ts
  - runActionItemSpecialist (single-call, v2 of v3)
  - runActionItemCandidateSpotter (standalone stage 1)
  - runActionItemSpecialistTwoStage (orchestrator)
  - getActionItemSpecialistSystemPrompt(version)
  - getActionItemCandidateSpotterPrompt()
  - getActionItemJudgePrompt()

packages/ai/src/validations/
  action-item-specialist.ts          # single-call schema
  action-item-two-stage.ts           # candidate + judgement schemas

apps/cockpit/src/actions/dev-action-item-runner.ts  # runner action
apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx  # harness UI

supabase/migrations/20260425120000_drop_type_werk_e.sql
```

## Productie-status

Niets in deze branch zit in productie. v2 single-call blijft de default voor de bestaande pipeline (de gatekeeper-pipeline gebruikt nog de v1-extraction-flow zoals opgenomen in de hoofd-action-item-runner). Pas mergen als we de prompt-keuze (v2/v3/two-stage) op de golden dataset hebben gevalideerd.
