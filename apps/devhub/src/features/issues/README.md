# Feature: Issues (DevHub)

Tickets/issues — het hart van DevHub. Bevat issue-CRUD, AI-classificatie, attachments, activity log, en comments (comments zitten altijd op een issue).

## Menu per laag

### `actions/`

Server actions voor CRUD, AI-classificatie en comments.

| File             | Exports                                                                               | Gebruikt door                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `issues.ts`      | `createIssueAction`, `updateIssueAction`, `deleteIssueAction`, `getIssueCountsAction` | `issue-form`, `issue-detail`, `issue-row`, `sidebar-delete`, `components/layout/issue-count-store` |
| `classify.ts`    | `classifyIssueAction`, `classifyIssueBackground`, `bulkReclassifyAction`              | `sidebar-ai-classification`, `app/api/ingest/userback/route`, de horizontale import-action         |
| `comments.ts`    | `createCommentAction`, `updateCommentAction`, `deleteCommentAction`                   | `comment-form`                                                                                     |
| `attachments.ts` | `createIssueAttachmentUploadUrlAction`, `recordIssueAttachmentAction`                 | `issue-form` (signed-upload-flow naar Supabase Storage)                                            |

### `validations/`

Re-export van `@repo/database/validations/issues` plus DevHub-only action-schemas (classify, attachment-upload). Patroon volgt `features/topics/validations/`.

| File       | Exports                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issue.ts` | Re-export: `createIssueSchema`, `updateIssueSchema`, `deleteIssueSchema`, `createCommentSchema`, `updateCommentSchema`, `deleteCommentSchema`. DevHub-eigen: `projectIdSchema`, `classifySchema`, `bulkClassifySchema`, attachment-schema's. |

### `components/`

UI voor issue-lijsten, detail, formulieren, sidebar, attachments, en comments. Platte map — de naamgeving (`issue-*`, `comment-*`, `sidebar-*`) doet het werk van sub-foldering. Geen barrel.

**Issue-UI:**

| File                             | Rol                                                                                                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `issue-list.tsx`                 | Lijst met issue-rows op `/issues`.                                                                                                                                                       |
| `issue-row.tsx`                  | Rij in de lijst — titel, status, labels, menu.                                                                                                                                           |
| `issue-filters/`                 | Filter-bar boven de lijst (status, project, type, assignee). Sub-folder met `index.tsx` (main), `filter-dropdown.tsx`, `sort-dropdown.tsx`, `use-issue-filters-url.ts` (URL-state hook). |
| `pagination-controls.tsx`        | Paginering onder de lijst.                                                                                                                                                               |
| `issue-detail.tsx`               | Volledige detail-pagina op `/issues/[id]` — combineert header, sidebar, attachments, AI-panel, comments.                                                                                 |
| `issue-header.tsx`               | Titel + status-badge + meta op detail-pagina.                                                                                                                                            |
| `issue-form.tsx`                 | Formulier voor nieuw issue op `/issues/new`.                                                                                                                                             |
| `issue-attachments.tsx`          | Attachments-sectie op detail-pagina (screenshots, videos).                                                                                                                               |
| `image-upload.tsx`               | Drag-and-drop / file-picker voor screenshots in `issue-form` (preview + dimensies-detectie).                                                                                             |
| `client-translation-section.tsx` | Optionele klant-titel + klant-beschrijving editor op detail-pagina (CP-007). Save via `updateIssueAction`; leeg = portal valt terug op interne titel/beschrijving.                       |

**Sidebar (gebruikt binnen `issue-detail`):**

| File                            | Rol                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `issue-sidebar.tsx`             | Container die de sidebar-blokken samenbrengt.                                                        |
| `sidebar-fields.tsx`            | Select-velden voor status/priority/type/assignee (`FormSelect`, `SidebarSelect`, `SidebarAssignee`). |
| `sidebar-ai-classification.tsx` | Knop om AI-classificatie (opnieuw) te draaien.                                                       |
| `sidebar-delete.tsx`            | Delete-knop met confirmatie.                                                                         |
| `label-input.tsx`               | Chip-input voor labels.                                                                              |

**AI-execution:**

| File                     | Rol                                                                   |
| ------------------------ | --------------------------------------------------------------------- |
| `ai-execution-panel.tsx` | Panel dat AI-execution status en logs toont (deel van detail-pagina). |

**Comments:**

| File                  | Rol                                                                          |
| --------------------- | ---------------------------------------------------------------------------- |
| `comment-section.tsx` | Container — combineert activity-feed + form. Gebruikt vanuit `issue-detail`. |
| `comment-list.tsx`    | Chronologische feed (`CommentActivityFeed`) met comments + activity.         |
| `comment-form.tsx`    | Nieuwe-comment formulier onder de feed.                                      |

## Gerelateerde packages (NIET in deze feature)

| Pad                                         | Rol                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `@repo/database/queries/issues`             | Read-helpers: `listIssues`, `getIssueById`, filters, counts.                     |
| `@repo/database/queries/issues/comments`    | `listCommentsByIssue`, `IssueCommentRow`-type.                                   |
| `@repo/database/queries/issues/activity`    | `listActivityByIssue`, `IssueActivityRow`-type.                                  |
| `@repo/database/queries/issues/attachments` | `listAttachmentsByIssue`, `getIssueThumbnails`, `IssueAttachmentRow`-type.       |
| `@repo/database/mutations/issues`           | Write-helpers voor issues.                                                       |
| `@repo/database/mutations/comments`         | Write-helpers voor comments.                                                     |
| `@repo/database/integrations/userback-sync` | Userback → issue ingest-pipeline (gebruikt vanuit de horizontale import-action). |

## Design decisions

- **Comments zijn géén aparte feature.** Ze bestaan alleen in de context van een issue (FK naar `issues.id`). `comment-*` files wonen daarom in `features/issues/components/`, niet in een eigen top-level feature. Zelfde principe als extractions onder meetings (cockpit).
- **Platte `components/`-map i.p.v. sub-folders per sub-domein.** Naamgeving-prefixen (`issue-*`, `comment-*`, `sidebar-*`) geven al visuele scheiding; sub-folders zouden extra indirection zijn zonder waarde. **Uitzondering** (SRP-008): `issue-filters/` is een sub-folder omdat de oude monolitische file 494 regels werd met twee inline subcomponenten (`FilterDropdown`, `SortDropdown`) plus een URL-state hook. Sub-folder met `index.tsx` resolution houdt het externe import-pad onveranderd.
- **`classify.ts` hoort bij issues, niet losstaand.** Classificatie classificeert issues op type/priority/project op basis van AI. Daarbuiten geen toepassing.
- **De import-action hoort NIET bij deze feature.** Dat is de Userback sync-pipeline op `/settings/import/` — een admin-instelling, niet issue-UI. Hij gebruikt wel `classifyIssueBackground` uit deze feature (async classificatie nadat Userback-data binnenkomt).
- **Review- en slack-settings-actions blijven horizontaal.** Review genereert een project-review, slack-settings is config-UI. Beide page-lokaal zonder eigen domein-logica.
- **Geen barrel-file.** Per zelfde reden als cockpit: Next.js client-bundle inflation. Consumers importeren specifiek.
- **`issue-count-store` (shared live-count) blijft in `components/layout/`.** Het is een cross-feature layout-concern (de sidebar toont issue-counts), geen issue-UI. Hij leest wel `getIssueCountsAction` uit deze feature.
