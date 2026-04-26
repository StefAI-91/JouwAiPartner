# Stand van zaken — Action Item Specialist tuning

**Branch:** `claude/open-status-document-gHnli`
**Laatste commit:** `e20577a` (v5 prompt — sales-context-nuance + lead-vervolg)
**Status:** in tuning, niet productie-klaar — vier prompts + drie filter-lagen + harness met validator-toggle

## Doel

De Action Item Specialist haalt action_items uit meeting-transcripten van JouwAIPartner (JAIP). Eindresultaat: deelnemers krijgen na elke meeting een mail met een hoog overzicht van actiepunten — wat zij JAIP nog moeten leveren én wat JAIP hen nog moet leveren. Precision en recall beide kritisch: liever niets dan ruis, maar geen echte action_items missen.

## Architectuur — drie filter-lagen

Iedere accept moet door drie poorten:

1. **Extractor (Sonnet 4.6 high-effort)** — kiest items uit transcript en classificeert ze. Vier prompt-versies parallel beschikbaar; v5 is de scherpste.
2. **Mechanische gate (code)** — checkt drie verplichte velden voor type C/D: `recipient_per_quote = stef_wouter`, `jaip_followup_quote` niet leeg, `jaip_followup_action = productive`. Items die hier vallen worden automatisch gerejecteerd met expliciete reason.
3. **Stage 3 — Action Validator (Haiku, adversarieel)** — voor élk type C/D-item dat de gate haalt: één extra Haiku-call die alleen oordeelt of `jaip_followup_action: productive` klopt. Streng ingesteld, default consumptive bij twijfel. Bij verdict consumptive → item gerejecteerd met `validator-override:` reason.

De validator vangt rationalisatie door de extractor: zelfs als het model `productive` invult voor een feitelijk consumptief vervolg ("ik kom langs"), corrigeert de Haiku-validator dat omdat hij smal getuned is op één vraag.

## Prompts

| Versie | Stijl                                                    | Lengte      | Wanneer                              |
| ------ | -------------------------------------------------------- | ----------- | ------------------------------------ |
| **v2** | Vier-eis-model met regels + contrast-paren               | 344 regels  | Productie default (bestaand)         |
| **v3** | Drie-vragen-model + gate-velden + voorbeelden            | ~280 regels | Aangescherpt rule-based              |
| **v4** | Voorbeeld-zwaar (~22 voorbeelden) + minimaal kader       | ~280 regels | Voorbeeld-driven                     |
| **v5** | v4 + sales-context-nuance + lead-vervolg-voorbeeld (A12) | ~290 regels | Nieuwste, gericht op type B coverage |

Alle prompts gebruiken dezelfde gate-velden in het schema. Stef tunet primair v5; v4 staat als vergelijkingsbaseline.

## Modes

- **single** — één extractor-call (v2/v3/v4/v5)
- **two-stage** — Spotter (Haiku) + Judge (Sonnet); judge gebruikt eigen `action_item_judge.md` prompt
- **spotter-only** — alleen Haiku-spotter zonder judge (debug-mode)

## Schema

`packages/ai/src/validations/action-item-specialist.ts` heeft naast de bestaande velden drie gate-velden voor élk item:

- `recipient_per_quote: "stef_wouter" | "third_party" | "own_sphere" | "from_jaip" | "unclear"`
- `jaip_followup_quote: string` — letterlijk citaat met Stef/Wouter als actor, of leeg
- `jaip_followup_action: "productive" | "consumptive" | "n/a"`

`packages/ai/src/validations/action-item-action-validator.ts` — schema voor stage 3 validator (verdict + reason).

`packages/ai/src/validations/action-item-two-stage.ts` — splitting in `accepts` + `rejects` arrays voor judge-output.

`type_werk = A | B | C | D` (E is verwijderd; migratie `20260425120000_drop_type_werk_e.sql`).

## Harness

`/dev/action-items/run` (cockpit, admin-only). UI heeft:

- **Prompt-dropdown** (v2 / v3 / v4 / v5) — alleen actief in single mode
- **Mode-dropdown** (single / two-stage / spotter-only)
- **Validator-checkbox** — stage 3 aan/uit voor vergelijking met/zonder
- **Confidence ≥** en **Match-similarity ≥** filter-knobs

Result-panels:

- Precision/Recall/F1 vs golden dataset
- Per-item diff: match (groen), false positive (amber), false negative (rood)
- **GatedPanel** (single-call) — items die door auto-gate of validator zijn afgewezen, met visueel onderscheid tussen auto-gate (amber) en validator-override (purple). Toont source_quote, jaip_followup_quote, action-classificatie, reden + validator-uitleg.
- **TwoStagePanel** — candidates list met pattern_type + accept/reject status. Reject-rendering kleurcodeert per type (model-reject = rose, auto-gate = amber, validator-override = purple).

## Reeks aanpassingen deze sessie

Iteratief de Robert/Tibor/WhatsApp/Pisma rationalisatie-cases dichtgemaakt:

1. V2-criteria aangescherpt op JAIP-relevantie (commit `bc845cd`)
2. Grounding-eis voor JAIP-vervolgstap (passief = leeg) (`c6ec25e`)
3. Mechanische gate met `recipient_per_quote` + `jaip_followup_quote` (`34feea8`)
4. Collectief ≠ stef_wouter, passief = leeg citaat (`dde263d`)
5. Externen onderling niet extraheren (`25d43a3`)
6. Anti-rationalisatie-toets bij externen-onderling (`432ae68`)
7. `jaip_followup_action` enum (productive/consumptive) + gate (`d91b02f`)
8. Same-day + agenda-uitnodiging niet extraheren (`e4ff83e`)
9. v4 voorbeeld-zware prompt (`fc534f9`)
10. Stage 3 action-validator (Haiku, adversarial) (`7c3ac03`)
11. Validator: consultatief gesprek = productive (recall fix) (`9b7755c` / `8b13c67`)
12. UI zichtbaarheid: GatedPanel + kleurcodes
13. Actief boven passief regel voor jaip_followup_quote (`51ea1e1`)
14. Modaal+tijdsanker = toezegging (v4 only) (`79c7cd8`)
15. v5 prompt — v4 + sales-nuance + lead-vervolg-voorbeeld (`e20577a`)

## Lessons learned

- **Anthropic strict-mode** is allergisch voor `.int().min(1)` constraints. Gebruik `z.number()` en post-clamp.
- **High-effort thinking + structured output** cap je response. Bij parse-failures: drop high-effort eerst, dan bump maxOutputTokens.
- **Tijdsankers zijn geen condities** ("in week van 4 mei" = deadline, niet voorwaardelijk).
- **Tibor en Dion** behandelen als gewone externen werkt beter dan een aparte type E.
- **Prompt-tuning heeft een asymptoot.** Modellen rationaliseren rond regels door hun eigen velden zo in te vullen dat ze technisch valide lijken. Mechanische code-checks helpen, maar pas met een aparte adversariële validator-call krijg je echte druk op de classificatie.
- **Voorbeelden boven regels.** Sinds v4 plakken we nieuwe edge cases als voorbeelden in een groeiend `## VOORBEELDEN` blok ipv abstracte regels te stapelen. Stef kan dit zelf onderhouden — geen prompt-engineering meer.
- **Validator moet zowel filteren als doorlaten.** Eerste versie was te streng (mistte consultancy-werk dat productive ís). Verfijnd met expliciet onderscheid: inhoudelijke rol (advies geven) = productive, toehoorder-rol (langskomen) = consumptive.
- **Modaal werkwoord + concrete tijdsanker = toezegging.** "Ik zal je dat kunnen delen in week van X" is geen wens, het is een commitment met datum. Zonder tijdsanker = wens.
- **Cold sales vs lead-vervolg** zijn verschillende dingen. Cold contact (eerste mail/call) = buiten scope. Vervolgactie op bestaande lead (meeting inplannen, voorstel sturen) = wel trackbaar.

## Bekend probleem

**Spotter (two-stage)** is traag op grote meetings (~4 min). Zie `Volgende stap` hieronder. Single-call met v5 is sneller en even goed; two-stage blijft als experiment.

## Open vragen

- Welke prompt is best op de golden dataset: v2 / v3 / v4 / v5? Geen vergelijkings-data per cohort.
- Is two-stage waardevol genoeg vs single-call? Niet gevalideerd.
- Is stage 3 validator aan vs uit netto winst (precision-winst > recall-verlies)? Te meten in harness.
- Welke combinatie wordt productie? (Voorlopige aanname: single-call + v5 + validator aan.)

## Volgende stap

1. **Golden-set draaien** met v3, v4, v5 (single-call) + validator aan/uit voor elk → precision/recall/F1 per cohort.
2. **Productie-default kiezen** op basis van die data.
3. Eventueel **two-stage parkeren** als single-call+v5+validator vergelijkbaar of beter scoort.

## Belangrijke files

```
packages/ai/prompts/
  action_item_specialist.md             # v2, productie default
  action_item_specialist_v3.md          # v3, drie-vragen + gate-velden
  action_item_specialist_v4.md          # v4, voorbeeld-zwaar
  action_item_specialist_v5.md          # v5, v4 + sales-nuance
  action_item_candidate_spotter.md      # two-stage stage 1 (Haiku)
  action_item_judge.md                  # two-stage stage 2 (Sonnet) + gate-velden
  action_item_action_validator.md       # stage 3 (Haiku, adversarial)

packages/ai/src/agents/action-item-specialist.ts
  - runActionItemSpecialist             # single-call (v2/v3/v4/v5) + gate + validator
  - runActionItemCandidateSpotter       # standalone stage 1
  - runActionItemSpecialistTwoStage     # spotter + judge + gate + validator
  - validateFollowupAction              # stage 3 Haiku-validator
  - checkActionItemGate                 # mechanische check
  - extractTranscriptContext            # ±1500 chars rond quote voor validator
  - getActionItemSpecialistSystemPrompt(version)
  - getActionItemCandidateSpotterPrompt()
  - getActionItemJudgePrompt()
  - getActionItemActionValidatorPrompt()

packages/ai/src/validations/
  action-item-specialist.ts             # single-call schema + 3 gate-velden
  action-item-two-stage.ts              # candidate + judgement schemas
  action-item-action-validator.ts       # validator-output schema

apps/cockpit/src/actions/dev-action-item-runner.ts
  # harness runner: prompt-versie, mode, validator-toggle

apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx
  # harness UI: dropdowns + GatedPanel + TwoStagePanel + diff-view

supabase/migrations/20260425120000_drop_type_werk_e.sql
```

## Productie-status

Niets uit deze branch zit in productie. v2 single-call blijft de productie-default voor de gatekeeper-pipeline. Pas mergen na golden-set validatie van v5 + validator versus de huidige v2.
