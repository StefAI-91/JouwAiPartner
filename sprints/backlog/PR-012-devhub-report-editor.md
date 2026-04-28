# Micro Sprint PR-012: DevHub Rapport-Editor

## Doel

In DevHub een compositiepagina waar het team een wekelijks rapport kan creëren als draft, de auto-gegenereerde content_snapshot kan reviewen, een handgeschreven narrative-noot kan toevoegen, optionele patterns kan invoeren, en het rapport kan publiceren. Mens-druk-op-knop is verplicht (geen auto-publish — vision-principe verification before truth).

## Requirements

| ID            | Beschrijving                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-120    | Pagina `apps/devhub/src/components/reports/page.tsx` toont lijst van rapporten per project (alle statuses) + "Maak rapport"-knop        |
| PR-REQ-121    | "Maak rapport"-knop creëert draft met `buildContentSnapshot` over default time-window (7 dagen)                                         |
| PR-REQ-122    | Rapport-editor `report-editor.tsx`: drie secties — narrative-noot (markdown editor), topics-snapshot (read-only preview), patterns-form |
| PR-REQ-123    | Markdown editor voor narrative-noot — gebruik bestaande markdown-editor uit Cockpit/DevHub of plain textarea met preview-tab            |
| PR-REQ-124    | Topics-snapshot-preview: per bucket de gegroepeerde topics (read-only, geen knoppen om te wijzigen — snapshot is bron-van-waarheid)     |
| PR-REQ-125    | Patterns-form: herhaalbaar form met "Patterns toevoegen"-knop; per pattern: title (text) + description (textarea)                       |
| PR-REQ-126    | "Publiceer"-knop → bevestiging-dialog → call `publishReport` Server Action; rapport wordt zichtbaar in Portal                           |
| PR-REQ-127    | "Sla op als draft"-knop → call `updateReport` Server Action; rapport blijft draft                                                       |
| PR-REQ-128    | Publish gepubliceerd: editor toont read-only view met "Archiveren"-knop (status published → archived)                                   |
| PR-REQ-129    | Reminder-systeem: lijst-pagina toont waarschuwing "Drafts wachten ≥7 dagen" met aantal                                                  |
| PR-REQ-130    | Pagina is `compositiepagina` (geen feature) per CLAUDE.md regel                                                                         |
| PR-DESIGN-040 | Editor heeft hairline borders en sober layout per §14.4; markdown-editor toont monospace voor code-blocks (Geist Mono)                  |

## Afhankelijkheden

- **PR-001** + **PR-002** + **PR-005** + **PR-009** (queries voor snapshot-build)
- **PR-011** (rapport-DB + queries + mutations)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- Geen — alle keuzes zijn in §9.3 vastgelegd

## Visuele referentie

- Geen aparte preview voor DevHub-editor; volg DevHub-issue-form als stijl-anchor
- Design-spec: §14.4 (component-systeem, editor-density)

## Taken

### 1. Compositiepagina

- Maak `apps/devhub/src/components/reports/`:

  ```
  apps/devhub/src/components/reports/
  ├── page.tsx                      # lijst + "Maak rapport"-knop
  ├── report-list.tsx               # tabel met alle reports per project
  ├── report-editor.tsx             # draft-bewerken (Server Component met Client child)
  ├── narrative-note-editor.tsx     # Client — markdown editor
  ├── topics-snapshot-preview.tsx   # Server — read-only render van content_snapshot
  ├── patterns-form.tsx             # Client — herhaalbaar form
  └── publish-confirm-dialog.tsx    # Client — bevestigingsmodal
  ```

### 2. Routes

- `apps/devhub/src/app/(dashboard)/projects/[projectId]/reports/page.tsx` → list
- `apps/devhub/src/app/(dashboard)/projects/[projectId]/reports/[reportId]/page.tsx` → editor (draft) of view (published)
- `apps/devhub/src/app/(dashboard)/projects/[projectId]/reports/new/page.tsx` → creates draft + redirects to /[id]
- `loading.tsx`, `error.tsx`

### 3. Server Actions

- `apps/devhub/src/components/reports/actions/reports.ts`:

  ```typescript
  "use server";
  export async function createReportDraft(input: { project_id: string }) {
    const client = await getServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: "Unauthenticated" };
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await buildContentSnapshot(
      input.project_id,
      { from: weekAgo.toISOString(), to: now.toISOString() },
      client,
    );
    const draft = await insertReport(
      {
        project_id: input.project_id,
        template: "weekly",
        compiled_at: now.toISOString(),
        compiled_by: user.id,
        content_snapshot: snapshot,
        narrative_note: null,
        patterns_section: [],
      },
      client,
    );
    revalidatePath(`/projects/${input.project_id}/reports`);
    return { success: true, data: draft };
  }

  export async function saveReportDraft(
    reportId: string,
    input: { narrative_note?: string; patterns_section?: any[] },
  ) {
    /* ... */
  }
  export async function publishDraft(reportId: string) {
    /* publishReport + revalidate */
  }
  export async function archiveReport(reportId: string) {
    /* ... */
  }
  ```

### 4. UI components

- `report-list.tsx`:
  - Server Component, props: `projectId`
  - Fetch `listReports({ projectId, includeUnpublished: true })`
  - Tabel: Naam ("Wekelijks rapport — 23 april 2026"), `compiled_by`, `published_at`, status, actie-link
  - Bovenaan: "Drafts wachten >7 dagen" warning als applicable

- `report-editor.tsx`:
  - Server Component
  - Fetch `getReportById(reportId)`
  - Als status `published`/`archived`: render read-only view + archive-knop
  - Als `draft`: render `<NarrativeNoteEditor>`, `<TopicsSnapshotPreview>`, `<PatternsForm>`, `<PublishButton>`, `<SaveDraftButton>`

- `narrative-note-editor.tsx` (`"use client"`):
  - Textarea (of MD-editor zoals `react-markdown` met preview-tab)
  - Auto-save bij blur of debounced typing? In v1: handmatig "Sla op"-knop (kortste pad)

- `topics-snapshot-preview.tsx`:
  - Server Component
  - Render content_snapshot.topics_by_bucket: per bucket lijst met titel + 1-zin samenvatting + bucket-label

- `patterns-form.tsx` (`"use client"`):
  - Array-state met `[{ title, description }]`
  - "+ Pattern toevoegen"-knop voegt rij toe; "X" verwijdert
  - Op blur of bij submit: `saveReportDraft` Server Action

- `publish-confirm-dialog.tsx` (`"use client"`):
  - Modal: "Eenmaal gepubliceerd kan dit rapport niet meer bewerkt worden."
  - "Bevestig" → `publishDraft` Server Action

### 5. Reminder-systeem

- Op `report-list.tsx`: query `listReports({ projectId, status: 'draft' })`, filter `created_at < now - 7 dagen`
- Toon "X drafts wachten ≥7 dagen" in een warning-banner

### 6. CLAUDE.md update

- Voeg `reports` toe aan DevHub Compositiepagina's-rij

## Acceptatiecriteria

- [ ] PR-REQ-120 t/m PR-REQ-122: lijst, knop, editor zichtbaar
- [ ] PR-REQ-123: markdown-editor werkt; bold/lists/links zichtbaar in preview
- [ ] PR-REQ-124: snapshot toont 4 buckets met topics
- [ ] PR-REQ-125: patterns-form add/remove werkt
- [ ] PR-REQ-126/127: publish/save acties werken; published is read-only
- [ ] PR-REQ-128: archiveer-flow werkt
- [ ] PR-REQ-129: drafts >7 dagen worden gewaarschuwd
- [ ] PR-REQ-130: structuur correct
- [ ] PR-DESIGN-040: editor visueel sober
- [ ] Type-check + lint + check:queries slagen
- [ ] Vitest: smoke-tests voor publish-flow

## Risico's

| Risico                                           | Mitigatie                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| Rapport-schrijven kost te veel tijd              | Tijd meten in week 1 — als >30 min/rapport, pas patterns-form vereenvoudigen |
| Drafts blijven liggen, worden nooit gepubliceerd | Reminder-banner; eventueel email-reminder in v2                              |
| Markdown rendering kwetsbaar voor injectie       | Hergebruik bestaande markdown-renderer uit Portal/Cockpit met sanitization   |
| Auto-save zonder debounce → veel network-calls   | Handmatig "Sla op"-knop in v1; auto-save in v2                               |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/09-fase-4-narratief.md` §9.3.2, §9.3.3, §9.3.7 (DevHub editor + templates + patterns)

## Vision-alignment

Vision §2.4 + verification-before-truth: een AI-gegenereerd rapport publiceren zonder mens-review schendt het kernprincipe. Editor dwingt mens-druk-op-knop af.
