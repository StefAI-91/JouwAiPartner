# Micro Sprint SRP-013: Database god-files splitsen (inbox / emails / meetings)

## Doel

Drie files in `packages/database/src/` overschrijden de cluster-drempel uit CLAUDE.md (criterium 1 of 2). Na deze sprint zijn alle drie gesplitst in coherente sub-clusters met behoud van publieke API via `index.ts` re-exports.

## Probleem

| File                                               | Regels | Exports | Sub-domeinen                                                          |
| -------------------------------------------------- | -----: | ------: | --------------------------------------------------------------------- |
| `packages/database/src/queries/inbox.ts`           |    537 |      21 | list+counts, conversation threads (feedback/questions), notifications |
| `packages/database/src/mutations/emails.ts`        |    295 |      17 | Google accounts (oauth), email rows (insert/delete/status)            |
| `packages/database/src/mutations/meetings/core.ts` |    343 |      19 | CRUD, classification, project linking, pipeline state                 |

Elke file heeft ≥2 sub-domeinen die elk ≥3 functies bevatten (criterium 2). Inbox + emails-mutations corresponderen ook met `features/inbox/` en `features/emails/` in cockpit (criterium 3).

## Voorgestelde structuur

### 1. `queries/inbox/`

```
packages/database/src/queries/inbox/
├── index.ts          ← re-exports (21 publieke exports onveranderd)
├── list.ts           ← listInboxItemsForTeam, countInboxItemsForTeam, list-helpers
├── detail.ts         ← getConversationThread, getInboxItemForDetail
├── notifications.ts  ← markInboxItemRead + notification helpers
├── types.ts          ← InboxItem, InboxFilter, shared row types
└── README.md         ← bestaat al, bijwerken met nieuwe layout
```

### 2. `mutations/emails/`

```
packages/database/src/mutations/emails/
├── index.ts          ← re-exports (17 publieke exports onveranderd)
├── accounts.ts       ← upsertGoogleAccount, updateTokens, updateLastSync, deactivate
├── rows.ts           ← insertEmails, deleteEmails, updateEmailStatus, bulkUpdateStatus
├── types.ts          ← shared types (indien nodig)
└── README.md         ← bestaat al, bijwerken
```

### 3. `mutations/meetings/core.ts` → meerdere files

```
packages/database/src/mutations/meetings/
├── core.ts           ← BLIJFT bestaan voor backward compat OF wordt index.ts;
│                       herverdeel inhoud:
├── crud.ts           ← insertMeeting, insertManualMeeting, updateMeeting*, deleteMeeting
├── classification.ts ← updateMeetingType, updateMeetingPartyType, updateMeetingTitle
├── linking.ts        ← linkMeetingProject, unlinkMeetingProject, linkAllMeetingProjects
├── pipeline.ts       ← updateMeetingElevenLabs, updateMeetingNamedTranscript,
│                       markEmbeddingStale, parkMeeting, restoreMeeting
└── README.md         ← bestaat al, bijwerken met nieuwe split
```

> Note: `mutations/meetings/` is al een cluster met andere files. Hier splitsen we alleen `core.ts` zelf.

## Migratie-stappen (per file, los committen)

**Per sub-task (3×):**

1. Maak nieuwe submap of files binnen bestaand cluster.
2. Verhuis functies naar de juiste sub-file. Behoud signatures.
3. Maak/update `index.ts` met re-exports zodat externe imports (`from "@repo/database/queries/inbox"`, etc.) onveranderd blijven.
4. Run `grep -r "from .@repo/database/queries/inbox" apps/ packages/` — alle imports moeten nog werken.
5. Update README per cluster met nieuwe layout.
6. Run testsuite voor die scope (`vitest packages/database`).
7. Run `npm run check:queries`, lint, type-check.

## Bonus deliverable: ontbrekende READMEs

- `packages/database/src/queries/widget/README.md` — ontbreekt
- `packages/database/src/mutations/widget/README.md` — ontbreekt

Schrijf beide volgens patroon van `queries/inbox/README.md`.

## Deliverables

- [ ] `queries/inbox/` cluster met 4-5 files + README
- [ ] `mutations/emails/` cluster met 3 files + README
- [ ] `mutations/meetings/core.ts` gesplitst in `crud.ts`, `classification.ts`, `linking.ts`, `pipeline.ts` (+ index/re-export)
- [ ] Elke nieuwe file < 200 regels
- [ ] `queries/widget/README.md` + `mutations/widget/README.md` toegevoegd
- [ ] Externe imports onveranderd (re-exports via `index.ts`)
- [ ] Tests groen zonder versoepeling
- [ ] `npm run check:queries`, lint, type-check, test groen

## Acceptance criteria

- Geen file binnen de drie scopes >200 regels.
- Alle 21 + 17 + 19 = 57 publieke exports beschikbaar via dezelfde import-paden als nu.
- Dependency-graph (`npm run dep-graph`) regenereert zonder errors.
- Geen `select('*')` geïntroduceerd.

## Out of scope

- Query-optimalisaties of N+1-fixes binnen de gesplitste functies.
- Andere SRP-kandidaten uit `SRP-matrix.md` (SRP-002 t/m SRP-012 staan los).
- `mutations/meetings/` andere files dan `core.ts` (al onder drempel).

## Volgorde-advies

Eén sprint, drie sub-tasks. PR per sub-task aanbevolen voor kleine reviews:

1. `queries/inbox/` (grootste, meest impactvol)
2. `mutations/emails/`
3. `mutations/meetings/core.ts` split
