# Micro Sprint CC-008: Architectuur-Drift, Tests & Polish (review CC-001 t/m CC-006)

## Doel

Volgsprint op CC-007. Pak de **should-fix architectuur-drift** en **nits** uit de review op CC-001 t/m CC-006 op die geen productie-correctheidsblockers zijn maar wel:

1. drift veroorzaken in CLAUDE.md regels (cluster-thresholds, README-sync, query-discipline);
2. test-coverage gaten dichten die in de specs stonden maar niet zijn geleverd;
3. UX-polish die compose/inbox van "werkt" naar "voelt af" tilt;
4. dead/duplicate code en consistency-issues opruimen.

Geen schema-changes, geen security-impact. Pure hygiene.

## Vision-alignment

- `CLAUDE.md` "Blast radius discipline" — drift-checks (`check:readmes`, cluster-grootte) faalden bij CC-005 en CC-006 doordat README-updates en file-splitsing zijn vergeten. Dit sprint herstelt de discipline.
- `vision-customer-communication.md` **§9** — UX-polish op compose-flow (autofocus, ESC-close, project-bevestiging) sluit aan op "first-class messaging UX".
- `docs/specs/test-strategy.md` §3-4 — testrules; we vullen de twee ontbrekende integration-tests aan die de specs vroegen maar de implementatie niet leverde.

## Afhankelijkheden

- **CC-007** moet gemerged zijn (security-blockers) — sommige paden (compose, inbox) worden in beide sprints aangeraakt; volgorde voorkomt merge-conflicten.
- Geen externe deps. Geen migration.

## Open vragen vóór start

1. **`packages/database/src/queries/issues/core.ts` (501 regels) splitsen of alleen documenteren?** Aanbeveling: **splitsen**. Cluster-criterium 1 is gepasseerd, en het bestand mengt 3 sub-domeinen: list/filter, detail-fetch, stats/counts. Splits in `issues/{list,detail,stats}.ts` met re-export-barrel `issues/core.ts` voor backwards-compat (geen call-site updates nodig).
2. **`queries/inbox.ts` (439 regels) idem?** Aanbeveling: **nu plannen, in CC-008-volgsprint splitsen**. Net in twijfelzone (300+ regels, ~7 exports). Eén volgende inbox-toevoeging triggert harde drift; nu is het nog te overzien zonder rewrite.
3. **`source-badge` (devhub) ↔ `source-dot` (cockpit) consolideren naar `@repo/ui`?** Aanbeveling: **NU consolideren**. Twee apps × één concept = sterk genoeg signaal voor shared component met `variant: "dot" | "badge"`-prop. Voorkomt drift bij WG/portal als die ook source willen tonen.
4. **Compose-modal project-bevestiging: extra step of inline?** Aanbeveling: **inline**: toon project-naam in de submit-knop ("Verstuur naar `{projectName}`"). Geen extra step (meer klikken zonder echte gain), wel duidelijke laatste check.
5. **Inbox-page filter in JS → naar DB: nu of in een aparte performance-sprint?** Aanbeveling: **nu**. Het zit in dezelfde file als de pagination-fix; één diff is goedkoper dan twee.

## Taken

Bouwvolgorde **README-sync → query-splitsing → shared component → inbox-page perf → compose-UX → test-gaten → opruim-nits**. README eerst zodat `check:readmes` groen wordt vóór andere wijzigingen READMEs raken.

### 1. README-sync (`check:readmes` groen krijgen)

Pad: vier feature-READMEs. Voeg ontbrekende files toe, verwijder STALE refs.

- `apps/cockpit/src/features/inbox/README.md`
  - Voeg toe: `components/onboarding-card.tsx`, `actions/preferences.ts`, `actions/compose.ts`, `components/compose-modal.tsx`, `validations/compose.ts`.
  - Verwijder STALE: `inbox.ts` (bestaat niet meer).
- `apps/cockpit/src/features/meetings/README.md`
  - Voeg toe: `metadata-sub-modals.tsx`, `metadata-tag-selector.tsx`.
- `apps/cockpit/src/features/projects/README.md`
  - Voeg toe: `invite-client-dialog.tsx`, `project-clients-section.tsx`, `project-tabs.tsx`, `revoke-client-button.tsx`.
- `apps/devhub/src/features/topics/README.md`
  - Voeg toe: `topic-pill.tsx`, `topic-resolution-editor.tsx`, `topic-test-instructions-editor.tsx`.
  - Verwijder STALE: `topics-actions.test.ts`.

**Verifieer:** `npm run check:readmes` → groen.

### 2. Query-splitsing: `queries/issues/core.ts`

Pad: `packages/database/src/queries/issues/`.

```
queries/issues/
├── core.ts           ← wordt re-export-barrel (5 regels)
├── list.ts           ← listIssues, countFilteredIssues, parseSearchQuery
├── detail.ts         ← getIssueById + helpers
└── stats.ts          ← getIssueCounts, getWeeklyIssueIntake, countCriticalUnassigned
```

`core.ts` na refactor:

```ts
export * from "./list";
export * from "./detail";
export * from "./stats";
```

Geen call-site updates nodig. Verifieer `npm run check:queries` + `npm test` groen. Update `packages/database/src/queries/issues/README.md` met de nieuwe structuur.

**Tegelijk de CC-003 should-fix b oplossen:** `countFilteredIssues` divergeert van `listIssues` op `assignedTo`-fallback. In `list.ts` kopieer de empty-uuid-sentinel-truc naar beide functies (extracteer naar shared helper `applyAssignedToFilter`).

### 3. Shared `SourceIndicator` component

Pad: `packages/ui/src/components/source-indicator.tsx` (nieuw).

```tsx
export interface SourceIndicatorProps {
  source: string | null;
  variant?: "dot" | "badge";
  size?: "sm" | "md";
}
export function SourceIndicator({ source, variant = "badge", size = "md" }: SourceIndicatorProps) {
  // Resolve via shared resolver in @repo/database/constants/issues
  // Render dot of badge naargelang variant
}
```

**Replace:**

- `apps/devhub/src/components/shared/source-badge.tsx` → wrapper of directe import.
- `apps/cockpit/src/features/inbox/components/source-dot.tsx` → wrapper of directe import.

Beide bestanden mogen blijven als 1-line re-exports voor stabiliteit, of helemaal weg (callers updaten). Aanbeveling: weg — call-sites zijn beperkt, refactor in dezelfde PR.

Test: `packages/ui/__tests__/source-indicator.test.tsx` met snapshot voor beide varianten + alle source-keys.

### 4. Inbox-page perf-fixes (CC-001 should-fix #5, #6, #7)

Pad: `apps/cockpit/src/features/inbox/components/inbox-page.tsx` + `packages/database/src/queries/inbox.ts`.

**4a. Filter naar DB.** Voeg `filter` parameter toe aan `listInboxItemsForTeam`:

```ts
type InboxFilter = "alles" | "wacht_op_mij" | "wacht_op_klant";
listInboxItemsForTeam({ profileId, filter, limit }: {...}): Promise<...>
```

Push de filter-logica naar de query (`.in("status", [...])` of joined check). Verwijder de JS `applyFilter`-switch uit `inbox-page.tsx`.

**4b. Pagination.** Voeg `.limit(200)` toe; toon UI-cue ("toon meer") als de resultaten op het maximum zitten. Niet meteen full pagination — alleen ceiling.

**4c. Project-naam i.p.v. UUID-prefix.** Join `projects(name)` in de query. Update `inbox-row.tsx:88` en `:88` (thread-variant) om `item.project.name` te tonen, fallback naar prefix als naam ontbreekt.

**4d. revalidatePath preciezer.** In `pm-review.ts:85` en `replies.ts:54`: vervang `revalidatePath("/", "layout")` door `revalidatePath("/inbox")` + `revalidatePath("/projects/[id]/inbox", "page")`.

**4e. Exhaustive switch-default** in `applyFilter` (als die nog bestaat na 4a) of in andere kind-switches: `default: const _: never = x; throw new Error("..." + x)`.

Tests: gedragstest dat `listInboxItemsForTeam({filter: "wacht_op_mij"})` geen items teruggeeft die op `wacht_op_klant` staan; project-naam render-test.

### 5. Compose-modal UX-polish (CC-006 nits)

Pad: `apps/cockpit/src/features/inbox/components/compose-modal.tsx`.

- **Autofocus** op textarea bij open (`useEffect` + `ref.current?.focus()`).
- **ESC-key sluit modal** (`keydown` listener, cleanup in return).
- **Focus-trap** met `useFocusTrap` hook of `inert` op achtergrond.
- **Project-naam in submit-knop**: `Verstuur naar {selectedProject?.name ?? "..."}`.

Snapshot-test op de ge-update modal.

### 6. Ontbrekende test-coverage uit specs

**6a. CC-001 non-regression-test (spec taak 11).**
Pad: `apps/cockpit/__tests__/actions/issues-pm-review-non-regression.test.ts`.
Inhoud: assertie dat DevHub `updateIssueAction` op een issue dat in PM-review-state staat, niet de PM-review-flags reset (de fix uit CC-001).

**6b. CC-006 RLS-integration-test (spec acceptatiecriterium).**
Pad: `packages/database/__tests__/rls/cc006-client-root.test.ts`.
Inhoud: integration-test (`describeWithDb`) die verifieert:

- klant A in project A1 kan eigen root-message inserten ✅
- klant A kan géén root-message inserten op project B1 (andere org) ❌
- klant A kan géén root-message inserten op project A2 zonder portal-assignment ❌
- klant A kan reply van klant B in zelfde project lezen (mits team het zichtbaar maakte)

### 7. Notification-template hygiene

Pad: `packages/notifications/src/`.

- **UTF-16 surrogate slice-bug** (CC-002 #8 + CC-006 N5):
  ```ts
  // VOOR:
  body.slice(0, 200);
  // NA:
  Array.from(body).slice(0, 200).join("");
  ```
  In `notify/question-reply.ts:30` en `templates/new-team-message.ts:25`.
- **Exhaustive `default: never`** in `templates/index.ts:30-52` (`pickTemplateForStatus`).
- **`__tests__/architecture.test.ts`**: regex uitbreiden voor dynamic imports en re-exports (CC-002 #6).

### 8. DRY-fix: `messageBodySchema`

Pad: `packages/database/src/validations/client-questions.ts`.

```ts
export const messageBodySchema = z.string().min(10).max(5000);
```

Replace duplicates in:

- `apps/cockpit/src/features/inbox/validations/compose.ts:10`
- `apps/portal/src/actions/inbox.ts:76`

### 9. Cleanup-nits

- `apps/cockpit/vitest.config.ts`: verwijder `passWithNoTests: true` (er zijn nu tests).
- `apps/cockpit/src/app/(dashboard)/inbox/error.tsx` + `apps/portal/src/app/(app)/projects/[id]/inbox/error.tsx`: accepteer `error`-prop en `console.error(error)`.
- `apps/portal/__tests__/actions/send-message.test.ts:26-29`: verwijder dode mock voor `replyToQuestion`.
- `apps/cockpit/src/features/inbox/components/inbox-page.tsx:64-66`: verwarrend comment opschonen.
- `apps/cockpit/src/features/inbox/validations/pm-review.ts`: 1-line re-export — verwijder en update callers naar directe import van `@repo/database/validations/issues`.
- `packages/database/__tests__/queries/issues.test.ts`: vervang hardcoded c00x-UUIDs door `seedIssue(TEST_IDS.issue)`-pattern, of voeg prefix-cleanup toe aan `afterEach`.

### 10. Cluster-drempel monitoring

Pad: `packages/database/src/queries/inbox.ts` (439 regels).

Geen splitsing nu, maar voeg een **header-comment** toe:

```ts
// CLUSTER-WATCH: 439 regels (CLAUDE.md threshold 300). Volgende toevoeging:
// splits in queries/inbox/{list,counts,thread}.ts.
```

Plan in `sprints/backlog/README.md` als CC-009 of als folow-up-ticket noteren.

### 11. Docs

- Update `packages/database/src/queries/issues/README.md` met nieuwe sub-files.
- Update `packages/ui/README.md` (of maak aan) met `SourceIndicator`-component.
- Update `apps/cockpit/src/features/inbox/README.md` na compose-modal en inbox-page wijzigingen.
- Verplaats sprint naar `sprints/done/` na merge en update `sprints/backlog/README.md`.

## Acceptatiecriteria

- [ ] `npm run check:readmes` groen (0 issues).
- [ ] `packages/database/src/queries/issues/core.ts` is een re-export-barrel ≤10 regels; sub-files `list.ts`, `detail.ts`, `stats.ts` bestaan.
- [ ] `countFilteredIssues` en `listIssues` produceren identieke resultaten op `assignedTo: ["bogus-uuid"]` (test bewijst).
- [ ] `SourceIndicator` in `@repo/ui` met `variant: "dot" | "badge"`; cockpit en devhub gebruiken het.
- [ ] `listInboxItemsForTeam` filtert in DB; geen JS-filter-switch in `inbox-page.tsx` meer.
- [ ] `listInboxItemsForTeam` returnt max 200 items; UI toont cue bij ceiling.
- [ ] `inbox-row.tsx` toont project-naam (geen UUID-prefix-fallback bij aanwezig naam).
- [ ] `revalidatePath` in pm-review/replies is route-specifiek, niet `"/"`.
- [ ] Compose-modal: autofocus textarea, ESC sluit, project-naam in submit-knop.
- [ ] `apps/cockpit/__tests__/actions/issues-pm-review-non-regression.test.ts` bestaat en groen.
- [ ] `packages/database/__tests__/rls/cc006-client-root.test.ts` bestaat en groen (4 cases hierboven).
- [ ] `Array.from(body).slice(0,200).join("")` in beide notify-templates.
- [ ] `pickTemplateForStatus` heeft exhaustive `default: never`.
- [ ] `messageBodySchema` één plek (`@repo/database/validations/client-questions`); duplicaten weg.
- [ ] `error.tsx` (cockpit-inbox + portal-inbox) loggen `error.digest`.
- [ ] `apps/cockpit/vitest.config.ts` heeft geen `passWithNoTests` meer.
- [ ] `npm run type-check`, `npm run lint`, `npm test`, alle `check:*` scripts groen.
- [ ] CC-008 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                              | Mitigatie                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Query-splitsing breekt imports onverwacht ondanks barrel.                                           | Re-export-barrel houdt de public API identiek. Verifieer met `npm run type-check` + `npm test` direct na splitsing.                           |
| `SourceIndicator` consolidatie heeft visuele drift (badge in devhub ziet er ineens anders uit).     | Snapshot-tests én visuele check op beide apps in dev-server vóór merge. Neem desnoods de meest gebruikte variant (devhub badge) als baseline. |
| Filter-naar-DB introduceert subtiele filter-bug bij overgang.                                       | Eerst gedrags-test schrijven die de huidige JS-filter-output vergelijkt met de nieuwe DB-output op identieke seed-data.                       |
| Pagination-ceiling van 200 verbergt items zonder dat de PM het ziet.                                | UI-cue ("Er zijn meer dan 200 items — verfijn filter") is acceptatiecriterium; test op aanwezigheid.                                          |
| RLS-integration-test (taak 6b) raakt productie-Supabase als `describeWithDb` mis-geconfigureerd is. | Standaard `describeWithDb` draait tegen de test-DB; verifieer in CI dat `SUPABASE_TEST_URL` gezet is.                                         |

## Niet in scope

- `queries/inbox.ts`-splitsing (alleen comment-watch, echte splitsing in eigen sprint).
- Volledige pagination op inbox (alleen ceiling van 200, niet `range()`-pagination met "load more").
- Rate-limit-tuning op klant-compose (CC-007 levert minimal versie; eventuele tuning op data komt later).
- DevHub `search-input.tsx` lint-error (pre-existing, geen CC-scope).
- Pre-existing `format:check`-failures op 37 files (sketches, oude pipeline-tests, MCP tools) — apart cleanup-sprint.
- Real-time / Supabase-realtime-subscription op nieuwe inbox-items.
- Audit-events-log voor `_actorId` ongebruikte parameters (CC-001 #10).
