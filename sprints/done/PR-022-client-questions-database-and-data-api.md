# Micro Sprint PR-022: Klant-vragen DB + queries + mutations

## Doel

Eén tabel `client_questions` voor team→klant-vragen + replies (via
`parent_id`). Twee statussen (`open` / `responded`). Twee mutations
(`sendQuestion`, `replyToQuestion`). Eén query (`listOpenQuestionsForProject`).
Geen UI in deze sprint.

> Achtergrond: zie [`docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md`](../../docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md)
> §15.4.3 (post-YAGNI schema). Eerdere `client_messages`-versie met types
> `announcement`/`action_request` is geschrapt — alleen "vraag" overleeft v1.

## Requirements

| ID          | Beschrijving                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR-DATA-070 | Tabel `client_questions` met velden: `id`, `project_id`, `organization_id`, `sender_profile_id`, `parent_id`, `topic_id`, `issue_id`, `body`, `due_date`, `status`, `created_at`, `responded_at` |
| PR-DATA-071 | CHECK: `status IN ('open','responded')`                                                                                                                                                          |
| PR-DATA-072 | CHECK: `chk_question_xor_link` — hooguit één van `topic_id` of `issue_id`                                                                                                                        |
| PR-DATA-073 | FK `parent_id REFERENCES client_questions(id) ON DELETE CASCADE`                                                                                                                                 |
| PR-DATA-074 | Index `(project_id, status)` — andere indexes uitstellen tot performance vraagt                                                                                                                  |
| PR-SEC-030  | RLS SELECT: org-leden zien op eigen project (`portal_project_access`); team (admin/member) ziet altijd                                                                                           |
| PR-SEC-031  | RLS INSERT: root (`parent_id IS NULL`) alleen door team; reply (`parent_id IS NOT NULL`) door team óf klant-org-lid                                                                              |
| PR-SEC-032  | RLS UPDATE: alleen team (status-wijziging gebeurt via mutation)                                                                                                                                  |
| PR-REQ-240  | Query `listOpenQuestionsForProject(projectId, organizationId, client?)` — root-questions met status='open' + replies inline (één call met nested select)                                         |
| PR-REQ-241  | Mutation `sendQuestion({ project_id, organization_id, body, topic_id?, issue_id?, due_date? }, sender, client?)` — root only                                                                     |
| PR-REQ-242  | Mutation `replyToQuestion({ parent_id, body }, sender, client?)` — bij eerste klant-reply zet parent `status='responded'` + `responded_at`                                                       |
| PR-REQ-243  | Zod-schemas: `sendQuestionSchema`, `replySchema`                                                                                                                                                 |
| PR-RULE-030 | Hard-regel: klant-rol mag geen root-INSERT (alleen replies) — afgedwongen via RLS                                                                                                                |

## Afhankelijkheden

- **Bestaand**: `projects`, `organizations`, `profiles`, `portal_project_access`, `topics` (PR-001), `issues` (DH-001)
- **PR-002** (queries/mutations basis-patroon)

### Open vragen

Geen blokkerende open vragen. Status- en types-discussie is afgesloten met YAGNI-pas (zie §15.4.3 + §15.6).

## Taken

### 1. Migratie — `client_questions` + RLS

`supabase/migrations/<datum>_client_questions.sql`:

```sql
CREATE TABLE IF NOT EXISTS client_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES profiles(id),
  parent_id uuid REFERENCES client_questions(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  issue_id uuid REFERENCES issues(id) ON DELETE SET NULL,
  body text NOT NULL,
  due_date timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','responded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT chk_question_xor_link
    CHECK (NOT (topic_id IS NOT NULL AND issue_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_questions_project_status
  ON client_questions(project_id, status);

ALTER TABLE client_questions ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "questions_select" ON client_questions FOR SELECT
  TO authenticated
  USING (
    -- team
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member'))
    OR
    -- klant-org-lid op zelfde project
    (
      organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM portal_project_access ppa
        WHERE ppa.project_id = client_questions.project_id
          AND ppa.profile_id = auth.uid()
      )
    )
  );

-- INSERT — split op root vs reply
CREATE POLICY "questions_insert" ON client_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      -- root: alleen team
      WHEN parent_id IS NULL THEN
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member'))
      -- reply: team óf klant-org-lid waarvan parent zichtbaar is
      ELSE
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member'))
        OR EXISTS (
          SELECT 1 FROM client_questions p
          WHERE p.id = client_questions.parent_id
            AND p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            AND EXISTS (
              SELECT 1 FROM portal_project_access ppa
              WHERE ppa.project_id = p.project_id AND ppa.profile_id = auth.uid()
            )
        )
    END
  );

-- UPDATE — alleen team
CREATE POLICY "questions_update_team" ON client_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','member'))
  );
```

### 2. Query

`packages/database/src/queries/client-questions.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export async function listOpenQuestionsForProject(
  projectId: string,
  organizationId: string,
  client?: SupabaseClient,
) {
  // Root + replies in één call via nested select
  return await (client ?? getAdminClient())
    .from("client_questions")
    .select(
      `
      id, body, due_date, status, created_at, responded_at, sender_profile_id,
      topic_id, issue_id,
      replies:client_questions!parent_id (
        id, body, sender_profile_id, created_at
      )
    `,
    )
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .is("parent_id", null)
    .eq("status", "open")
    .order("created_at", { ascending: false });
}
```

### 3. Mutations

`packages/database/src/mutations/client-questions.ts`:

```typescript
export async function sendQuestion(
  input: unknown,
  sender_profile_id: string,
  client: SupabaseClient,
) {
  const parsed = sendQuestionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  return await client
    .from("client_questions")
    .insert({ ...parsed.data, sender_profile_id, status: "open" })
    .select()
    .single();
}

export async function replyToQuestion(
  input: unknown,
  sender: { profile_id: string; role: "team" | "client" },
  client: SupabaseClient,
) {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  // 1. Insert reply
  const { data: reply, error } = await client
    .from("client_questions")
    .insert({
      parent_id: parsed.data.parent_id,
      body: parsed.data.body,
      sender_profile_id: sender.profile_id,
      // project_id en organization_id afleiden uit parent — query of trigger
      // Simpler: laat caller doorgeven of haal op in mutation via SELECT parent
    })
    .select()
    .single();
  if (error) return { error };

  // 2. Bij eerste klant-reply: parent.status → responded
  if (sender.role === "client") {
    await client
      .from("client_questions")
      .update({ status: "responded", responded_at: new Date().toISOString() })
      .eq("id", parsed.data.parent_id)
      .eq("status", "open");
  }

  return { data: reply };
}
```

> Detail: `project_id` + `organization_id` op reply-rij worden afgeleid uit
> parent. Twee opties: (a) doorgeven vanuit caller, (b) trigger BEFORE INSERT
> die parent leest. Voor v1 is (a) simpler — caller stuurt mee.

### 4. Zod-schemas

`packages/database/src/validations/client-questions.ts`:

```typescript
import { z } from "zod";

export const sendQuestionSchema = z
  .object({
    project_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    body: z.string().min(10).max(2000),
    topic_id: z.string().uuid().nullable().optional(),
    issue_id: z.string().uuid().nullable().optional(),
    due_date: z.string().datetime().nullable().optional(),
  })
  .refine((data) => !(data.topic_id && data.issue_id), {
    message: "Vraag aan topic OF issue, niet beide",
  });

export const replySchema = z.object({
  parent_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
  // project_id + organization_id afgeleid in mutation
});
```

### 5. Tests (minimaal)

- `sendQuestion` als team → row in DB, status=open
- `replyToQuestion` als klant op open vraag → reply-row + parent.status=responded
- `replyToQuestion` als team → reply-row, parent.status BLIJFT open
- XOR-constraint: insert met topic_id én issue_id → DB-error
- RLS: andere-org-klant SELECT op andere-org-vraag → leeg
- RLS: klant probeert root-INSERT (parent_id NULL) → 403

## Acceptatiecriteria

- [ ] PR-DATA-070..074: migratie idempotent, CHECK-constraints actief
- [ ] PR-SEC-030..032: RLS-tests groen
- [ ] PR-REQ-240..243: query/mutations werken
- [ ] PR-RULE-030: klant-root-INSERT geblokkeerd
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                                        | Mitigatie                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Reply-insert moet project_id + organization_id meenemen (afgeleid uit parent) | Caller stuurt mee in v1; trigger pas bij volume                       |
| Klant kan via reply een eigen vraag formuleren ("ja maar X")                  | Acceptabel — team leest reply, kan eigen nieuwe vraag stellen         |
| `due_date` is vrije timestamp zonder enforcement                              | Bewuste keuze — tekst-of-datum, geen reminder-systeem in v1           |
| RLS UPDATE-policy laat team alles wijzigen                                    | Mutations zijn de gatekeepers; team-UI biedt geen wilde edit-functies |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md` §15.4.3
- Bestaand RLS-pattern: `supabase/migrations/20260418110000_issues_rls_client_hardening.sql`

## Vision-alignment

Vision §2.4 — `client_questions` is het minimale gespreksspoor team↔klant.
Database als communication bus, één tabel met threading via `parent_id`.
