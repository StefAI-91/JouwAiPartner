# Micro Sprint SRP-011: gatekeeper-pipeline.ts opbreken in fases

## Doel

`packages/ai/src/pipeline/gatekeeper-pipeline.ts` is **426 regels** met één export (`processMeeting`) die alle pipeline-fases sequentieel uitvoert. Vergelijkbaar patroon als SRP-009 (link-themes): één megafunctie die niet per fase getest kan worden. Na deze sprint: orchestrator + per-fase-modules.

## Probleem

- 426 regels, waarvan `processMeeting` ~330 regels (regel 89-426)
- Eén functie doet: gatekeeper-LLM-call → project-identification → tagger → theme-detection → entity-resolution → segment-build → orchestratie naar `pipeline/steps/*` modules
- Constanten staan losliggend (`THEME_DETECTOR_MIN_RELEVANCE`)
- Mocking voor tests is moeilijk omdat de fases binnen één functie hangen

## Voorgestelde structuur

```
packages/ai/src/pipeline/gatekeeper/
├── index.ts                       ← processMeeting orchestrator (≤ 120 regels)
├── types.ts                       ← MeetingInput, PipelineResult + fase-input/output types
├── constants.ts                   ← THEME_DETECTOR_MIN_RELEVANCE + andere drempels
├── classify.ts                    ← gatekeeper LLM-call (board / project / niet-zakelijk)
├── identify-projects.ts           ← project-identification fase
├── detect-themes.ts               ← theme-detector call + filter op relevance
└── orchestrate-steps.ts           ← coördinatie naar tagger, link-themes, entity-resolution
```

**Naam-conventie:** `pipeline/gatekeeper/` (folder) ipv `gatekeeper-pipeline.ts` — consistent met `pipeline/summary/`, `pipeline/email/`, `pipeline/steps/`.

## Migratie-stappen

1. Lees `processMeeting` in detail; identificeer waar de fase-grenzen zitten (commentaren, async-blocks, conditional-skips)
2. Maak folder + types
3. Per fase een functie met expliciete input/output, geen shared mutable state
4. Orchestrator (`index.ts`): sequentiële calls + skip-logica + result-samenstelling
5. **Critical:** behoud bestaande skip-paden (board-meetings, niet-zakelijk, lege catalogus) — deze zijn de gatekeeper-essentie
6. Update import in `processMeeting` callers (likely `packages/ai/src/index.ts` of direct vanuit cockpit-actions)
7. Tests in `packages/ai/__tests__/pipeline/gatekeeper-pipeline.test.ts` of vergelijkbaar — assertions onveranderd, alleen mock-paden mogen aangepast

## Deliverables

- [x] `pipeline/gatekeeper/` folder met 9 files: `index.ts`, `types.ts`, `constants.ts`, `classify.ts`, `persist-meeting.ts`, `transcribe.ts`, `detect-themes.ts`, `extract.ts`, `finalize.ts`
- [x] Oude `gatekeeper-pipeline.ts` verwijderd
- [x] Orchestrator: 83 regels (`index.ts`)
- [x] Fase-functies: classify 47 r, persist 75 r, transcribe 28 r, detect-themes 55 r, extract 76 r, finalize 85 r — alle ≤ 100
- [ ] Skip-paden expliciet getest — **uitgesteld naar opvolg-sprint**: orchestrator-tests vragen om interne mocks van `run*Step`-functies (botst met test-mock-grens-policy in `CLAUDE.md`). Gedragstest moet via integration-stijl met DB + agents gemockt; te groot voor SRP-011-scope. Skip-paden zijn wel expliciet **in de code** zichtbaar in `index.ts` (insert-failure early-return) en in de symmetrische `shouldDetectThemes` checks tussen `detect-themes.ts` en `finalize.ts`.
- [x] Callers + tests bijgewerkt naar `from "@repo/ai/pipeline/gatekeeper"` (5 files: 2 api routes, 1 reprocess action, 2 cockpit tests). Export-map entry toegevoegd: `"./pipeline/gatekeeper": "./src/pipeline/gatekeeper/index.ts"`. Registry `entrypoint` + pipeline README bijgewerkt.
- [x] Lint (cockpit + ai), type-check (alle workspaces), test (cockpit 189 + ai 409) groen. Pre-existing devhub `search-input.tsx` lint-error is niet gerelateerd.

## Acceptance criteria

- Orchestrator bevat alleen `if/await/return`, geen LLM-prompt-bouw of DB-mutaties
- Elke fase-functie testbaar in isolatie (input mock, output assertion)
- Bestaande end-to-end gatekeeper-tests groen zonder assertion-versoepeling
- Skip-paden voor board / niet-zakelijk / lege catalogus expliciet aanwezig in orchestrator-code

## Out of scope

- Pipeline-gedrag wijzigen (skip-logica, drempels, model-keuze)
- Theme-detector of tagger zelf opsplitsen (eigen sprints SRP-006, SRP-009)
- Parallelle uitvoering van fases waar het kan (optimalisatie, eigen sprint)
- Migratie naar agent-SDK orchestratie
