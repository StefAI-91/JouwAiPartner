# Micro Sprint AD-001: Cockpit cross-feature ontkoppeling + cleanup

## Doel

Cockpit heeft 8 cross-feature import-leaks (vooral `features/review/` ↔ `features/meetings/`), één dead-code duplicate (`features/agents/components/`), en drie ongeregistreerde dev-actions in `apps/cockpit/src/actions/`. Na deze sprint zijn shared widgets opgetild naar `components/shared/`, dead code verwijderd, en de registry klopt weer.

## Probleem

### A. Dead-code duplicate

- `apps/cockpit/src/features/agents/components/{activity-feed,agent-card,quadrant-styles,system-overview}.tsx` zijn **byte-identiek** aan `apps/cockpit/src/components/agents/*`.
- Productie importeert uit `components/agents/`. De feature-folder is dood.
- Registry zegt: `agents` is compositiepagina, dus thuis in `components/agents/`. Feature-folder mag weg.

### B. Cross-feature import-leaks (8×)

| Importerende file                                            | Importeert uit                                                                                                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/review/components/review-detail.tsx`               | `features/meetings/components` (7×: RiskList, EditableTitle, MeetingTypeSelector, PartyTypeSelector, PeopleSelector, ProjectLinker, CopyMeetingButton) + `features/meetings/actions` (updateMeetingSummaryAction) |
| `features/review/components/proposals-list.tsx`              | `features/themes/actions` (confirmThemeProposalAction, rejectThemeProposalAction)                                                                                                                                 |
| `features/emails/components/email-review-detail.tsx`         | `features/review/components/review-action-bar`                                                                                                                                                                    |
| `features/meetings/components/create-project-sub-modal.tsx`  | `features/projects/actions/projects` (createProjectAction)                                                                                                                                                        |
| `features/meetings/components/project-linker.tsx`            | `features/projects/actions/projects` (createProjectAction)                                                                                                                                                        |
| `features/meetings/components/create-organization-modal.tsx` | `features/directory/actions/organizations`                                                                                                                                                                        |
| `features/meetings/components/create-person-sub-modal.tsx`   | `features/directory/actions/people`                                                                                                                                                                               |
| `features/meetings/components/people-selector.tsx`           | `features/directory/actions/people`                                                                                                                                                                               |

`review-detail.tsx` is hierin het zwaarst — 7 imports uit één andere feature is een sterk signaal dat die widgets shared zijn.

### C. Verkeerd horizontale shared-component

- `apps/cockpit/src/components/shared/regenerate-menu.tsx` bevat hardcoded meeting/theme regenerate-logica (Thema's opnieuw taggen, Title genereren, Risks regenereren). Hoort niet in `shared/`.

### D. Registry-drift: dev-actions

Drie files in `apps/cockpit/src/actions/` staan niet in de CLAUDE.md-registry:

- `dev-action-item-runner.ts` (299 r) — alleen door `/dev/action-items/run` gebruikt
- `dev-speaker-mapping.ts` (228 r) — alleen door `/dev/speaker-mapping`
- `golden-action-items.ts` (176 r) — alleen door `/dev/action-items/golden`

### E. Inconsistente validations-folder (DevHub)

- `apps/devhub/src/features/issues/` heeft **geen** `validations/` folder, terwijl `features/topics/` die wel heeft. Inline schemas in actions blijven werken, maar consistentie ontbreekt.

## Voorgestelde aanpak

### A. Dead-code cleanup

1. Verwijder `apps/cockpit/src/features/agents/components/` (4 files).
2. Verwijder `apps/cockpit/src/features/agents/README.md` als die map daarmee leeg is — én verwijder de map.
3. Bevestig dat geen import meer naar `@/features/agents/components` verwijst.

### B. Cross-feature widgets oplichten naar `components/shared/`

Trek deze 7 widgets uit `features/meetings/components/` naar `apps/cockpit/src/components/shared/`:

- `risk-list.tsx`
- `editable-title.tsx`
- `meeting-type-selector.tsx`
- `party-type-selector.tsx`
- `people-selector.tsx`
- `project-linker.tsx`
- `copy-meeting-button.tsx`

**Criterium voor de move:** worden in ≥2 features gebruikt (meetings + review). Imports vanuit de oude feature-pad updaten.

> **Niet oplichten:** `create-project-sub-modal.tsx`, `create-organization-modal.tsx`, `create-person-sub-modal.tsx`. Deze zijn meeting-specifiek qua context. Het feit dat ze actions uit andere features aanroepen is OK — features mogen elkaars **actions** consumeren (compositie). Het probleem zat alleen bij gedeelde **UI-componenten**.

> **Action-imports laten staan:** `features/review/components/proposals-list.tsx` mag `confirmThemeProposalAction` blijven aanroepen — review is de proposals-UI, themes bezit de mutatie. Dit is bedoelde compositie.

> **`email-review-detail` → `review-action-bar`:** beslis tijdens uitvoer of `review-action-bar.tsx` shared moet worden of dat `email-review-detail` naar `features/review/` migreert. Default: tilt `review-action-bar` op naar `components/shared/` als hij in ≥2 features wordt gebruikt.

### C. `regenerate-menu.tsx` herclassificeren

Verplaats `apps/cockpit/src/components/shared/regenerate-menu.tsx` naar `apps/cockpit/src/features/meetings/components/regenerate-menu.tsx`. Update de import-locatie(s).

### D. Dev-actions classificeren — registry-update

Kies één van twee opties (vraag aan gebruiker bij start):

**Optie 1 (snel, lage diff):** Update CLAUDE.md registry en voeg de drie dev-actions toe aan de cockpit platform-actions lijst:

- `tasks`, `management-insights`, `summaries`, `segments`, `scan-needs`, `weekly-summary`, `team`, `dev-detector`, `dev-action-item-runner`, `dev-speaker-mapping`, `golden-action-items`, `_utils`

**Optie 2 (cleaner, meer diff):** Maak `apps/cockpit/src/features/dev-tools/` met `actions/{dev-action-item-runner,dev-speaker-mapping,golden-action-items,dev-detector}.ts`. Verplaats ook `dev-detector.ts` (gebruikt alleen door `/dev/detector`). Update registry: nieuwe feature `dev-tools` (cockpit-only).

**Aanbeveling:** Optie 1 — dev-actions zijn geen klassieke feature (geen klant-flow), het is een grab-bag van admin-tools. Registry uitbreiden is eerlijker dan een fake-feature optuigen.

### E. `features/issues/validations/` toevoegen

1. Maak `apps/devhub/src/features/issues/validations/issue.ts`.
2. Verplaats inline Zod-schemas uit `features/issues/actions/*.ts` naar deze file.
3. Re-export volgens patroon van `features/topics/validations/topic.ts`.

## Migratie-stappen

1. **Voer A uit (dead code):** simpele delete + grep-verificatie.
2. **Voer B uit (shared lift):** per widget — `git mv`, imports updaten, lint+test.
3. **Voer C uit (regenerate-menu):** `git mv` + import-update.
4. **Voer D uit (dev-actions):** beslissen + registry-update.
5. **Voer E uit (issues validations):** schemas extraheren, actions importeren.
6. Run `npm run check:features` — moet groen blijven.
7. Run dependency-graph (`npm run dep-graph`) en visueel-check op cross-package edges.

## Deliverables

- [ ] `apps/cockpit/src/features/agents/components/` verwijderd
- [ ] 7 shared widgets in `apps/cockpit/src/components/shared/` (van features/meetings/)
- [ ] `regenerate-menu.tsx` verplaatst naar `features/meetings/components/`
- [ ] Dev-actions geclassificeerd (registry uitgebreid OF naar features/dev-tools/)
- [ ] `apps/devhub/src/features/issues/validations/issue.ts`
- [ ] CLAUDE.md registry-tabel bijgewerkt
- [ ] `npm run check:features`, lint, type-check, test groen

## Acceptance criteria

- Geen import in `apps/cockpit/src/features/X/` van `@/features/Y/components/` (cross-feature UI).
- Cross-feature imports van **actions** mogen blijven (compositie).
- `apps/cockpit/src/features/agents/components/` bestaat niet.
- CLAUDE.md registry beschrijft exact wat in de codebase staat (`npm run check:features` is daarvan de gatekeeper).

## Out of scope

- DevHub-features `review` + `questions` promoveren — staat in DH-021.
- Database splits — staat in SRP-013.
- AI-pipeline groeperingen (`pipeline/themes/`, `pipeline/actions/`) — separate sprint indien gewenst.
- N+1 of performance-optimalisaties.
