# Micro Sprint SRP-009: pipeline/steps/link-themes.ts opbreken in fases

## Doel

`packages/ai/src/pipeline/steps/link-themes.ts` is **484 regels** waarvan één enkele functie (`runLinkThemesStep`) ~310 regels beslaat. Volgens CLAUDE.md (>2× zo lang als nodig = signaal van abstractie-drift) hoort deze functie opgesplitst in herkenbare fases. Na deze sprint: orchestrator-functie + 4-5 phase-functies in eigen helper-files.

## Probleem

- 484 regels totaal
- `runLinkThemesStep` is één megafunctie van ~310 regels (regels 126-435)
- De fases zijn al duidelijk gemarkeerd met genummerde commentaren in de code:
  - **MB-1**: data-fetch (extractions, rejected pairs, themes)
  - **Step 1**: proposals resolven (merge naar bestaande verified themes)
  - **Step 2**: identified + non-merging proposals → meeting_themes rijen
  - **Step 3**: rejected-pair filter
  - Substring-fallback (`substringFallbackNames` is al apart maar wordt vanuit de monolith aangeroepen)
  - Persist-fase
- De grote functie maakt unit-testing per fase onmogelijk — je moet álles mocken of de hele pipeline opzetten

## Voorgestelde structuur

```
packages/ai/src/pipeline/steps/link-themes/
├── index.ts                       ← runLinkThemesStep orchestrator (≤ 100 regels, alleen orchestratie)
├── types.ts                       ← LinkThemesStepInput, MeetingThemeToWrite, ProposalToCreate,
│                                    SkippedDueToRejection, PreviewResult, LinkThemesResult
├── fetch-input.ts                 ← combineerde data-fetch + emptyResult helper
├── resolve-proposals.ts           ← step 1: proposals merge-detectie
├── build-meeting-themes.ts        ← step 2 + 3: identified + non-merging + rejected filter + substring fallback
├── persist.ts                     ← DB-writes + recalc stats
└── shared.ts                      ← normalizeName, substringFallbackNames
```

## Migratie-stappen

1. Lees regels 126-435 nauwkeurig en breng comments-blokken in kaart als fase-grenzen
2. Splits types naar `types.ts`
3. Maak per fase een aparte functie met expliciete input/output (geen shared mutable state)
4. `index.ts` orchestreert: roept fases sequentieel aan, plakt resultaten samen
5. **Behavioural-tests blijven leidend**: `link-themes.test.ts` mocked Supabase-grens — assertions op het samengestelde eindresultaat moeten onveranderd zijn
6. Per-fase unit-tests zijn welkom (SRP geeft die mogelijkheid) maar niet verplicht in deze sprint

## Deliverables

- [ ] `pipeline/steps/link-themes/` folder met 6-7 files
- [ ] Oude `link-themes.ts` verwijderd
- [ ] `index.ts` ≤ 120 regels, alleen orchestratie
- [ ] Geen functie > 80 regels
- [ ] Bestaande `link-themes.test.ts` groen zonder assertion-versoepeling (CLAUDE.md anti-laundering)
- [ ] Lint, type-check, test groen

## Acceptance criteria

- `runLinkThemesStep` heeft alleen sequentiële calls naar fase-functies + resultaat-samenstelling
- Geen fase-functie > 80 regels
- Externe import `from "@repo/ai/pipeline/steps/link-themes"` werkt onveranderd
- Mock-grens onveranderd: alleen DB en `listVerifiedThemes`/`listRejectedThemePairsForMeeting` (queries) gemockt, niet eigen fase-functies

## Out of scope

- Substring-fallback verwijderen of vervangen (gedragswijziging)
- Caching-strategie van `verifiedThemes` veranderen
- Prompt of detector-output schema aanpassen
- Test-coverage uitbreiden (per-fase unit tests) — welkom, maar geen acceptance-blocker
