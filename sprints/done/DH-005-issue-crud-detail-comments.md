# Micro Sprint DH-005: Issue CRUD, detail pagina en comments

## Doel

De volledige issue lifecycle bouwen: aanmaken (formulier), detail bekijken (met sidebar metadata en comments/activity feed), bewerken, verwijderen, en comments plaatsen. Inclusief alle Server Actions met Zod validatie en activity logging. Na deze sprint kan een gebruiker issues aanmaken, bekijken, bewerken, comments plaatsen en de volledige activiteitshistorie zien.

## Requirements

| ID       | Beschrijving                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| FUNC-101 | Issue aanmaken: titel, beschrijving, type, priority                                                                                  |
| FUNC-102 | Issue aanmaken: optioneel component, assigned_to, labels                                                                             |
| FUNC-105 | Issue bewerken: alle velden wijzigbaar                                                                                               |
| FUNC-106 | Issue verwijderen                                                                                                                    |
| FUNC-107 | Issue status wijzigen (triage/backlog/todo/in_progress/done/cancelled)                                                               |
| FUNC-145 | Triage acties: accepteer (→ backlog), accepteer + toewijzen (→ todo), afwijzen (→ cancelled), mergen (→ cancelled + duplicate_of_id) |
| FUNC-146 | Bij mergen: sla duplicate_of_id en similarity_score op, activity log met action='merged'                                             |
| FUNC-108 | Issue toewijzen aan developer                                                                                                        |
| FUNC-109 | Wanneer status naar done/cancelled: closed_at invullen                                                                               |
| FUNC-110 | Comment plaatsen op issue                                                                                                            |
| FUNC-111 | Comment bewerken (eigen comments)                                                                                                    |
| FUNC-112 | Comment verwijderen                                                                                                                  |
| FUNC-113 | Activity log: elke wijziging wordt gelogd                                                                                            |
| FUNC-114 | Issue nummering: auto-increment per project (#1, #2, #3)                                                                             |
| FUNC-139 | Server Action: createIssue met Zod validatie                                                                                         |
| FUNC-140 | Server Action: updateIssue met Zod validatie                                                                                         |
| FUNC-141 | Server Action: deleteIssue                                                                                                           |
| UI-110   | Issue detail: beschrijving, AI classificatie, comments, activity log                                                                 |
| UI-111   | Issue detail sidebar: status, priority, type, component, severity, assigned, labels, bron, datum                                     |
| UI-112   | Issue detail: status/priority/assigned_to wijzigbaar via dropdowns                                                                   |
| UI-113   | Issue detail: AI reproductiestappen sectie                                                                                           |
| UI-114   | Issue detail: comments en activity samengevoegd in chronologische feed                                                               |
| UI-115   | Issue detail: "Voeg comment toe" invoerveld onderaan                                                                                 |
| UI-116   | Nieuw issue formulier op /issues/new                                                                                                 |

## Bronverwijzingen

- PRD: `docs/specs/prd-devhub.md` -> sectie "Flow 2: Handmatig issue aanmaken" (regels 165-178)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Flow 4: Developer pakt issue op" (regels 198-210)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Issue Detail" (regels 743-781)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Issue Nummering" (regels 789-799)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Server Actions (signatures)" (regels 985-999)
- PRD: `docs/specs/prd-devhub.md` -> sectie "Zod schemas" (regels 1001-1035)

## Context

### Zod schemas

```typescript
// createIssueSchema
const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(["bug", "feature_request", "question"]).default("bug"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  component: z.enum(["frontend", "backend", "api", "database", "prompt_ai", "unknown"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigned_to: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
});

// updateIssueSchema
const updateIssueSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(["bug", "feature_request", "question"]).optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done", "cancelled"]).optional(),
  priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
  component: z.enum(["frontend", "backend", "api", "database", "prompt_ai", "unknown"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
});

// createCommentSchema
const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
});
```

### Server Actions

```typescript
// apps/devhub/src/actions/issues.ts
async function createIssue(data): Promise<{ success: true; data: Issue } | { error: string }>;
async function updateIssue(id, data): Promise<{ success: true } | { error: string }>;
async function deleteIssue(id): Promise<{ success: true } | { error: string }>;
```

Elke Server Action:

1. Valideert input met Zod
2. Roept de mutation aan
3. Logt activity (insertActivity)
4. Revalidate paths
5. Retourneert `{ success, data }` of `{ error }`

### Issue nummering

Bij `createIssue`: het volgende issue_number wordt opgehaald via de `issue_number_seq` tabel met een atomaire upsert (voorkomt race conditions bij concurrent inserts):

```sql
INSERT INTO issue_number_seq (project_id, last_number)
  VALUES ($1, 1)
  ON CONFLICT (project_id)
  DO UPDATE SET last_number = issue_number_seq.last_number + 1
  RETURNING last_number;
```

Dit wordt in de insertIssue mutation gedaan, binnen dezelfde transactie als de issue insert.

### Closed_at logica

Bij status wijziging naar 'done' of 'cancelled': zet `closed_at = now()`.
Bij status wijziging weg van 'done'/'cancelled': zet `closed_at = null`.

### Activity logging

Elke wijziging genereert een activity entry:

- `createIssue` -> action: 'created'
- Status wijziging -> action: 'status_changed', field: 'status', old_value, new_value
- Priority wijziging -> action: 'priority_changed', field: 'priority', old_value, new_value
- Toewijzing -> action: 'assigned', field: 'assigned_to', old_value, new_value
- Comment -> action: 'commented'
- Label toevoegen -> action: 'label_added', new_value: label naam
- Label verwijderen -> action: 'label_removed', old_value: label naam

### Issue detail layout

```
┌──────────────────────────────────────┬───────────────────┐
│                                      │                   │
│  Login page crash on Safari          │ Status            │
│  ─────────────────────────────       │ [In Progress v]   │
│                                      │                   │
│  Beschrijving                        │ Priority          │
│  ──────────────                      │ [Urgent v]        │
│  Als je op de login pagina komt...   │                   │
│                                      │ Type              │
│  AI Reproductiestappen               │ Bug               │
│  ──────────────────────              │                   │
│  1. Open Safari 18.2                 │ Component         │
│  2. Navigeer naar /login             │ Frontend          │
│  3. Pagina crashed met wit scherm    │                   │
│                                      │ Severity          │
│  ═══════════════════════════════     │ Critical          │
│                                      │                   │
│  Comments & Activiteit               │ Toegewezen aan    │
│  ─────────────────────               │ [Kenji v]         │
│  > Status: backlog -> in_progress    │                   │
│    Stef - 3 uur geleden             │ Labels            │
│                                      │ [Safari] [Login]  │
│  Kenji - 2 uur geleden              │                   │
│  "Fixed in commit abc123"            │ Bron              │
│                                      │ Userback          │
│  [Voeg comment toe...]              │                   │
└──────────────────────────────────────┴───────────────────┘
```

Comments en activity worden samengevoegd in een chronologische feed. Activity entries zijn visueel anders (kleiner, grijs) dan comments (volledige tekst).

### AI classificatie weergave

Het issue detail toont de AI reproductiestappen uit `ai_classification.repro_steps`. Dit is read-only in deze sprint. De "Herclassificeer" knop wordt in DH-006 toegevoegd.

## Prerequisites

- [ ] Micro Sprint DH-002: Queries en mutations
- [ ] Micro Sprint DH-003: DevHub app setup + auth + layout
- [ ] Micro Sprint DH-004: Issue list + filters (voor navigatie)

## Taken

- [ ] Maak Zod schemas in `src/lib/validations/issues.ts` (createIssueSchema, updateIssueSchema, createCommentSchema)
- [ ] Maak Server Actions in `src/actions/issues.ts` (createIssue, updateIssue, deleteIssue) met activity logging
- [ ] Maak Server Actions in `src/actions/comments.ts` (createComment, updateComment, deleteComment)
- [ ] Maak `src/app/issues/new/page.tsx` met issue formulier (create)
- [ ] Maak `src/app/issues/[id]/page.tsx` met issue detail (beschrijving, sidebar, comments/activity feed, comment formulier)
- [ ] Maak `src/components/issues/issue-form.tsx`, `issue-detail.tsx`, `src/components/comments/comment-list.tsx`, `comment-form.tsx`

## Acceptatiecriteria

- [ ] [FUNC-101] Nieuw issue aanmaken met titel, beschrijving, type, priority werkt
- [ ] [FUNC-102] Optionele velden (component, assigned_to, labels) worden correct opgeslagen
- [ ] [FUNC-105] Issue bewerken via detail pagina werkt voor alle velden
- [ ] [FUNC-106] Issue verwijderen werkt met bevestigingsdialoog
- [ ] [FUNC-107] Status dropdown in detail wijzigt de status
- [ ] [FUNC-108] Assigned_to dropdown wijst issue toe aan teamlid
- [ ] [FUNC-109] Status naar done/cancelled vult closed_at in, terug weg maakt het null
- [ ] [FUNC-110] Comment plaatsen verschijnt direct in de feed
- [ ] [FUNC-113] Elke wijziging genereert een activity entry in de chronologische feed
- [ ] [FUNC-114] Nieuw issue krijgt automatisch het volgende issue_number per project
- [ ] [FUNC-139] createIssue valideert input met Zod, retourneert error bij ongeldige data
- [ ] [UI-110] Detail pagina toont beschrijving, AI classificatie en comments/activity feed
- [ ] [UI-111] Sidebar toont alle metadata velden
- [ ] [UI-112] Status, priority en assigned_to zijn wijzigbaar via dropdowns
- [ ] [UI-114] Comments en activity zijn chronologisch samengevoegd
- [ ] [UI-116] /issues/new toont het aanmaak formulier

## Geraakt door deze sprint

- `apps/devhub/src/lib/validations/issues.ts` (nieuw)
- `apps/devhub/src/actions/issues.ts` (nieuw)
- `apps/devhub/src/actions/comments.ts` (nieuw)
- `apps/devhub/src/app/issues/new/page.tsx` (nieuw)
- `apps/devhub/src/app/issues/[id]/page.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-form.tsx` (nieuw)
- `apps/devhub/src/components/issues/issue-detail.tsx` (nieuw)
- `apps/devhub/src/components/comments/comment-list.tsx` (nieuw)
- `apps/devhub/src/components/comments/comment-form.tsx` (nieuw)
