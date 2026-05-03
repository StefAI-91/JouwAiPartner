# Micro Sprint DH-021: `review` + `questions` promoveren naar features

## Doel

`apps/devhub/src/actions/review.ts` (140 r) en `apps/devhub/src/actions/questions.ts` (101 r) muteren beide (DB inserts + revalidate), maar staan als platform-action geregistreerd. CLAUDE.md-test: "heeft dit domein eigen server actions die muteren? Ja → feature." Na deze sprint zijn `review` en `questions` volwaardige features in `apps/devhub/src/features/`, conform het patroon van `issues` en `topics`.

## Probleem

- `actions/review.ts` bevat `generateProjectReview` — haalt issues op, roept `runIssueReviewer()` AI-agent aan, INSERT via `saveProjectReview`, `revalidatePath`. Dit is feature-mutatie, geen cross-cutting platform-actie.
- `actions/questions.ts` bevat `askQuestionAction` + `replyAsTeamAction` — DB inserts + revalidate. Idem.
- `components/review/action-items-list.tsx` en `components/questions/{ask-question-modal,question-thread,open-questions-block}.tsx` zijn nu compositiepagina-componenten, maar roepen feature-mutaties aan vanuit `@/actions/`.
- Registry-conflict: beide staan **zowel** als compositiepagina (`components/review`, `components/questions`) **én** als platform-action genoteerd. Onmogelijke dubbele classificatie.

## Voorgestelde structuur

```
apps/devhub/src/features/
├── review/
│   ├── README.md
│   ├── actions/
│   │   └── review.ts                ← van apps/devhub/src/actions/review.ts
│   └── components/
│       └── action-items-list.tsx    ← van apps/devhub/src/components/review/
└── questions/
    ├── README.md
    ├── actions/
    │   └── questions.ts             ← van apps/devhub/src/actions/questions.ts
    └── components/
        ├── ask-question-modal.tsx   ← van apps/devhub/src/components/questions/
        ├── question-thread.tsx
        └── open-questions-block.tsx
```

## Migratie-stappen

1. Maak `features/review/{actions,components}/` en `features/questions/{actions,components}/`.
2. `git mv` de 1 + 3 component-files naar `features/{review,questions}/components/`.
3. `git mv` de 2 action-files naar `features/{review,questions}/actions/`.
4. Update imports in:
   - Pages onder `apps/devhub/src/app/` (zoek met grep op oude paden `@/components/review`, `@/components/questions`, `@/actions/review`, `@/actions/questions`).
   - `apps/devhub/src/components/dashboard/dashboard-header.tsx` (rendert `ActionItemsList`).
   - Eventuele cross-feature imports vanuit `features/issues/` of `features/topics/`.
5. Schrijf `features/review/README.md` en `features/questions/README.md` volgens patroon van `features/issues/README.md` (menu per laag).
6. Update CLAUDE.md registry-tabel (DevHub-kolom):
   - **Features:** `issues`, `topics`, **`review`**, **`questions`**
   - **Compositiepagina's:** `dashboard` (review + questions verwijderen)
   - **Platform actions:** review + questions verwijderen uit lijst
7. Run `npm run check:features` — moet groen blijven na registry-update.
8. Run `npm run check:queries` — geen directe `.from()` introduceren.

## Deliverables

- [ ] `apps/devhub/src/features/review/` met actions, components, README
- [ ] `apps/devhub/src/features/questions/` met actions, components, README
- [ ] `apps/devhub/src/actions/review.ts` en `actions/questions.ts` verwijderd
- [ ] `apps/devhub/src/components/review/` en `components/questions/` verwijderd
- [ ] CLAUDE.md registry-tabel bijgewerkt
- [ ] `npm run check:features`, lint, type-check, test groen

## Acceptance criteria

- DevHub-features zijn nu 4: `issues`, `topics`, `review`, `questions` — allen met README.
- Geen file in `apps/devhub/src/actions/` muteert review/questions data.
- `apps/devhub/src/components/{review,questions}/` bestaan niet meer.
- Bestaande tests (vitest) draaien zonder versoepeling.

## Out of scope

- Refactor van AI-flow `runIssueReviewer` (blijft in `@repo/ai/agents`).
- `features/issues/validations/` toevoegen — staat in AD-001.
- `bulk-cluster-cleanup.ts` herclassificatie — blijft platform (orkestreert features).
