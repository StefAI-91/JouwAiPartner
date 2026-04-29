# Micro Sprint SRP-003: action-item-specialist.ts splitsen per pipeline-variant

## Doel

`packages/ai/src/agents/action-item-specialist.ts` is **851 regels** en bevat drie volledig aparte pipelines: single-stage specialist (v2-v5), two-stage spotter+judge, en de standalone action validator. Plus shared helpers (transcript-context, gate-check, participant-formatting). Na deze sprint: één folder `agents/action-item-specialist/` met aparte files per variant en gedeelde utilities; publieke API onveranderd via re-export.

## Probleem

- 851 regels — bijna 3× cluster-drempel
- 35+ exports/interfaces door elkaar
- Drie onafhankelijke pipelines:
  - **Single-stage**: `runActionItemSpecialist`, prompt-versies v2-v5 (regels 47-373)
  - **Two-stage**: `runActionItemCandidateSpotter`, `runActionItemSpecialistTwoStage`, judge-prompt (regels 375-718)
  - **Validator**: `validateFollowupAction` (regels 720-825)
- Shared utilities versmelten met pipeline-specifieke logica: `extractTranscriptContext`, `sliceAround`, `formatParticipantBlock`, `applyFollowUpResolver`, `normaliseActionItemSpecialistOutput`, `checkActionItemGate`

## Voorgestelde structuur

```
packages/ai/src/agents/action-item-specialist/
├── index.ts                       ← re-export voor backward compat
├── types.ts                       ← shared types (Participant, Context, RunOptions, RunResult, GatedItem)
├── shared.ts                      ← formatParticipantBlock, extractTranscriptContext, sliceAround,
│                                    applyFollowUpResolver, normaliseActionItemSpecialistOutput,
│                                    checkActionItemGate, loadSystemPrompt
├── single-stage.ts                ← runActionItemSpecialist + v2-v5 prompts + getActionItemSpecialistSystemPrompt
├── two-stage.ts                   ← runActionItemCandidateSpotter, runActionItemSpecialistTwoStage,
│                                    candidate spotter + judge prompts, two-stage types
└── validator.ts                   ← validateFollowupAction + ValidatorInput/Result types + prompt
```

## Migratie-stappen

1. Maak folder aan; kopieer types naar `types.ts`
2. Verhuis shared helpers naar `shared.ts` (interne, niet-public)
3. Splits drie pipelines naar eigen files; ze importeren uit `./shared` en `./types`
4. `index.ts` re-export ALLE huidige publieke namen — `from "@repo/ai/agents/action-item-specialist"` blijft werken
5. Verifieer dat `packages/ai/src/pipeline/steps/action-item-specialist.ts` (186 r — pipeline-stap) en de tests in `packages/ai/__tests__/agents/action-item-specialist*.test.ts` zonder mock-pad-aanpassing groen blijven
6. Update `packages/ai/src/agents/registry.ts` als specialist-entry expliciet pad noemt

## Deliverables

- [ ] `packages/ai/src/agents/action-item-specialist/` folder met 6 files
- [ ] Oude `action-item-specialist.ts` verwijderd
- [ ] `index.ts` exporteert alle huidige publieke namen identiek
- [ ] Elke nieuwe file < 350 regels
- [ ] Bestaande tests groen zonder mock-pad-update (mock-grens beleid: alleen Anthropic SDK gemockt, niet interne agents)
- [ ] `npm run lint`, `npm run type-check`, `npm run test` groen

## Acceptance criteria

- `single-stage.ts`, `two-stage.ts`, `validator.ts` elk < 350 regels
- `shared.ts` < 200 regels en bevat geen pipeline-specifieke logica
- Geen file met meer dan één pipeline-variant
- Externe imports onveranderd: `from "@repo/ai/agents/action-item-specialist"` werkt zonder pad-suffix

## Out of scope

- Prompt-versies consolideren of v3/v4 deprecaten (gedragswijziging, geen refactor)
- Two-stage logic verder optimaliseren
- `pipeline/steps/action-item-specialist.ts` (186 r) — al klein genoeg
- Test-laundering: tests mogen niet versoepeld worden om mock-pad-fix te omzeilen
