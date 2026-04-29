# Micro Sprint SRP-006: pipeline/tagger.ts splitsen per concern

## Doel

`packages/ai/src/pipeline/tagger.ts` is **504 regels** en doet drie dingen: theme-resolution, project-resolution, en de eigenlijke tagger-orchestratie (kernpunten + vervolgstappen). Na deze sprint: drie files met heldere concerns, plus shared types in eigen file.

## Probleem

- 504 regels — 1.7× cluster-drempel
- Drie concerns lopen door elkaar:
  - **Theme-refs**: `parseThemesAnnotation`, `resolveThemeRefs`, `ThemeRef` type
  - **Project-resolution**: `parsePrefix`, `resolvePrefixProject`, `matchItemAgainstProjects`, `ruleBasedMatch`, `KnownProject` type
  - **Tagging-orchestratie**: `tagKernpunten`, `tagVervolgstappen`, `runTagger`, `contentFromResolution`, `TaggedItem`, `TaggerInput`, `TaggerOutput`
- `CONFIDENCE_THRESHOLD`, `normalize` helpers liggen los

## Voorgestelde structuur

```
packages/ai/src/pipeline/tagger/
├── index.ts                       ← re-export, runTagger als hoofd-entrypoint
├── types.ts                       ← TaggedItem, KnownProject, TaggerInput, TaggerOutput, ThemeRef
├── themes.ts                      ← parseThemesAnnotation, resolveThemeRefs
├── projects.ts                    ← parsePrefix, resolvePrefixProject, matchItemAgainstProjects, ruleBasedMatch
└── tag.ts                         ← tagKernpunten, tagVervolgstappen, runTagger, contentFromResolution,
                                     CONFIDENCE_THRESHOLD, normalize
```

## Migratie-stappen

1. Verhuis types naar `types.ts`
2. Splits theme-resolution naar `themes.ts`
3. Splits project-resolution naar `projects.ts`
4. Verhuis tagger-orchestratie naar `tag.ts` (importeert uit themes + projects)
5. `index.ts` re-export — let op: huidige imports verwijzen naar `pipeline/tagger.ts`, na refactor wordt dat `pipeline/tagger/index.ts` (Node resolveert dat automatisch)
6. Verifieer dat `pipeline/steps/tag-themes.ts` en gatekeeper-pipeline correcte exports houden

## Deliverables

- [ ] `pipeline/tagger/` folder met 5 files
- [ ] Oude `pipeline/tagger.ts` verwijderd
- [ ] Elke nieuwe file < 250 regels
- [ ] Tests in `packages/ai/__tests__/pipeline/tagger.test.ts` blijven groen, mock-pad mag aangepast als de import-path is veranderd (markeer in commit-message dat dit GEEN gedragswijziging is)
- [ ] Lint, type-check, test groen

## Acceptance criteria

- Elke sub-file < 250 regels
- `themes.ts` heeft geen project-imports, `projects.ts` heeft geen theme-imports (concern-isolation)
- `tag.ts` is de enige file die uit beide importeert
- `from "@repo/ai/pipeline/tagger"` werkt onveranderd

## Out of scope

- Tagging-algoritme verbeteren (rule-based vs LLM-based)
- `CONFIDENCE_THRESHOLD` data-driven maken (database-config)
- `pipeline/steps/link-themes.ts` (484 r) — eigen sprint SRP-009
