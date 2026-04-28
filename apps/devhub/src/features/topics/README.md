# Feature: Topics (DevHub)

Topics zijn de curatielaag tussen losse issues en de Portal-roadmap. Een topic
bundelt N issues onder één klant-zichtbaar item met eigen titel, beschrijving
en lifecycle-status. Deze feature is de bron-UI: zonder topics aanmaken in
DevHub heeft de Portal niets te tonen.

In fase 1 (deze sprint) is status handmatig en zonder transitie-validatie —
auto-rollup volgt in PR-007, won't-do-flow met verplichte reden in PR-009/10.

## Routes

| Pad                 | Wat                                                                    |
| ------------------- | ---------------------------------------------------------------------- |
| `/topics?project=…` | Lijst voor één project, gefilterd op type en/of lifecycle-status       |
| `/topics/new`       | Aanmaak-form (vereist `?project=<uuid>` in de query)                   |
| `/topics/[id]`      | Detail: meta, klant-velden, status-select, linked-issues-panel, delete |
| `/topics/[id]/edit` | Edit-form (status NIET hier — status muteert via detail-pagina)        |

## Menu per laag

### `actions/`

Server Actions — Zod-validate, `assertProjectAccess`, mutate, `revalidatePath`.
Info-leak prevention: access-failures vertalen naar "niet gevonden", net als
`updateIssueAction` in de issues-feature.

| File         | Exports                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `topics.ts`  | `createTopicAction`, `updateTopicAction`, `updateTopicStatusAction`, `deleteTopicAction`               |
| `linking.ts` | `linkIssueAction`, `unlinkIssueAction`, `searchProjectIssuesAction` (cap 50, server-side ilike-search) |

### `components/`

Plat — naamgeving (`topic-*`) doet het werk van sub-foldering.

| File                      | Rol                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `topic-list.tsx`          | Server Component — list-view voor `/topics?project=…`, filters via form-action.                       |
| `topic-card.tsx`          | Hairline-row in de list. Type-badge mono uppercase, priority text-only met tone (P0 rood…P3 grijs).   |
| `topic-form.tsx`          | Client Component — create + edit (geen status-veld; type immutable bij edit).                         |
| `topic-status-select.tsx` | Client Component — 7 statuses (geen `wont_do_proposed_by_client`); inline reason-input bij `wont_do`. |
| `linked-issues-panel.tsx` | Client Component — gekoppelde issues + debounced searchable picker (250ms) met cap 50.                |
| `topic-delete-button.tsx` | Client Component — inline confirm; toont waarschuwing als `linked_issues > 0`.                        |
| `topic-detail.tsx`        | Server Component — detail-page body, combineert bovenstaande + breadcrumb + meta-rij.                 |

### `validations/`

| File       | Exports                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `topic.ts` | Re-export van `@repo/database/validations/topics` plus `updateTopicWithIdSchema`, `updateTopicStatusActionSchema`, `deleteTopicSchema`. |

## Gerelateerde packages

| Pad                                 | Rol                                                             |
| ----------------------------------- | --------------------------------------------------------------- |
| `@repo/database/queries/topics`     | List/detail/linked-issue-helpers (PR-002).                      |
| `@repo/database/mutations/topics`   | Insert/update/delete/status/linking-helpers (PR-002).           |
| `@repo/database/validations/topics` | Zod-schemas (PR-002).                                           |
| `@repo/database/constants/topics`   | `TOPIC_LIFECYCLE_STATUSES`, `TOPIC_TYPES`, bucket-map (PR-001). |

## Design decisions

- **Routes flat (`/topics`), niet `(dashboard)/projects/[id]/topics`.** DevHub-conventie volgt
  `/issues?project=<id>` — consistent met bestaande feature; sidebar projectId staat al in
  searchParams. Sprint-spec noemde een geneste route, maar dat is niet hoe DevHub momenteel
  routeert.
- **`fase_1_statuses` (7) i.p.v. alle 8.** `wont_do_proposed_by_client` zit niet in deze UI;
  die landt in PR-010 wanneer klanten via de Portal kunnen voorstellen niet door te zetten.
- **Status mutation gescheiden van CRUD.** `updateTopic` raakt geen status; `updateTopicStatus`
  doet dat én houdt `closed_at` synchroon. Dezelfde split als de DB-laag in PR-002.
- **Inline confirm bij delete, geen modal.** Modal stack-management in Next 16 is overkill
  voor één delete-actie; inline confirm voldoet.
- **Type immutable na create.** Bug ↔ Feature wissel komt later via splits/merge (PR-017),
  niet via een gewone edit-form — zo voorkomen we dat een topic stilletjes van categorie
  wisselt zonder dat de klant het merkt.
- **`searchProjectIssuesAction` cap = 50.** De picker is een hulp om te koppelen, niet de
  volledige lijst — `/issues` is daarvoor de plek.

## Tests

| Pad                                                            | Wat                                         |
| -------------------------------------------------------------- | ------------------------------------------- |
| `apps/devhub/__tests__/features/topics/topics-actions.test.ts` | Server actions — Zod + auth + DB-grens-mock |
