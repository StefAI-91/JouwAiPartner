# Micro Sprint SRP-002: queries/meetings/core.ts splitsen per sub-domein

## Doel

`packages/database/src/queries/meetings/core.ts` is **892 regels** met 33+ exports. Volgens CLAUDE.md cluster-regel: >300 regels of >15 exports = splitsbaar op naamgeving. De file bevat zes duidelijke sub-domeinen die nu door elkaar staan. Na deze sprint: elke sub-file ≤ 250 regels, helder gegroepeerd, importpaden bijgewerkt zonder breaking changes (re-exports via `index.ts`).

## Probleem

- 892 regels — bijna 3× de drempel
- 33+ exports in één file
- Zes herkenbare sub-domeinen lopen door elkaar:
  - **Lijst/detail base**: `getVerifiedMeetingById`, `listVerifiedMeetings`, `listVerifiedMeetingIdsOrderedByDate`, `listBoardMeetings`
  - **Lookup**: `getMeetingByFirefliesId`, `getExistingFirefliesIds`, `getExistingMeetingsByTitleDates`, `getMeetingByTitleAndDate`
  - **Pipeline-fetches**: `listMeetingsForReclassify`, `listMeetingsWithTranscript`, `getMeetingForDevExtractor`, `getMeetingForEmbedding`, `getExtractionIdsAndContent`, `getMeetingExtractions`, `getMeetingExtractionsBatch`, `getVerifiedMeetingsWithoutSegments`, `getMeetingForTitleGeneration`
  - **Regenerate/reprocess**: `getMeetingForRegenerate`, `getMeetingForRegenerateRisks`, `getMeetingForReprocess`, `getMeetingForBackfill`, `getMeetingByFirefliesIdForReprocess`
  - **Metadata/relaties**: `getMeetingOrganizationId`, `listMeetingProjectIds`, `listMeetingParticipantIds`
  - **Speaker mapping**: `getSpeakerMappingTranscriptCounts`, `countSpeakerMappingBackfillRemaining`, `listSpeakerMappingBackfillCandidates`, `getMeetingParticipantsForSpeakerMapping`

## Voorgestelde structuur

```
packages/database/src/queries/meetings/
├── index.ts                       ← re-exports voor backward compat (bestaande importpaden blijven werken)
├── core.ts                        ← list/get verified, listBoardMeetings, MeetingDetail type (~150 r)
├── lookup.ts                      ← fireflies/title/date lookups (~80 r)
├── pipeline-fetches.ts            ← reclassify, dev-extractor, embedding, segmentation, title-gen (~250 r)
├── regenerate.ts                  ← regenerate/reprocess/backfill fetches (~200 r)
├── metadata.ts                    ← org id, project ids, participant ids (~80 r)
└── speaker-mapping.ts             ← speaker mapping queries (~180 r)
```

## Migratie-stappen

1. Inventariseer huidige import-paden: `grep -r "queries/meetings/core" apps packages | wc -l`
2. Maak nieuwe files aan, kopieer relevante exports + bijbehorende interfaces (let op: `MeetingDetail`, `RecentMeeting`, `VerifiedMeetingListItem` etc. moeten meeverhuizen)
3. `index.ts` re-export alle publieke namen — eerst om callers niet te breken
4. Update `packages/database/src/queries/meetings/index.ts` (als die bestaat) of maak hem
5. Type-check + tests draaien
6. Optioneel later: callers migreren naar specifieke imports (`queries/meetings/lookup`) en `index.ts` afslanken

## Deliverables

- [ ] 6 nieuwe files in `queries/meetings/` met de sub-domein verdeling
- [ ] `core.ts` ≤ 250 regels
- [ ] `queries/meetings/index.ts` re-export voor backward compatibility
- [ ] Geen circular imports
- [ ] Bestaande tests in `packages/database/__tests__/queries/meetings*.test.ts` blijven groen zonder mock-pad aanpassingen
- [ ] `npm run check:queries`, `npm run type-check`, `npm run lint`, `npm run test` groen

## Acceptance criteria

- Elke nieuwe file < 300 regels
- Elke nieuwe file < 15 exports
- `grep -rn "from \"@repo/database/queries/meetings/core\"" apps packages` — alle bestaande callers blijven werken via re-export
- `grep -rn "from \"@repo/database/queries/meetings/speaker-mapping\"" apps packages` — minstens één nieuwe import (uit `apps/cockpit/.../dev/speaker-mapping/`) gebruikt het specifieke pad

## Out of scope

- `queries/meetings/project-summaries.ts` (215 r) — al apart, prima zo
- N+1 of query-efficiency fixes — pure file-split sprint
- Type-renames of API-breaking changes
- `mutations/meetings/core.ts` (343 r) — eigen sprint waard maar kleinere overschrijding (zie SRP-matrix)
