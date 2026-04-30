-- PR-022: Klant-vragen (`client_questions`) — DB-foundation + RLS
-- PR-DATA-070..074, PR-SEC-030..032, PR-RULE-030
--
-- Achtergrond: docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md §15.4.3.
-- Eén tabel voor team→klant-vragen + replies via `parent_id`. Twee statussen
-- (`open` / `responded`). Geen aparte messages-tabel — YAGNI-pas na 3 reviews.
--
-- RLS volgt het bestaande patroon uit 20260417100002_portal_rls_policies.sql en
-- 20260418110000_issues_rls_client_hardening.sql: helpers `is_client(uid)` +
-- `has_portal_access(uid, pid)` (STABLE SECURITY DEFINER) doen het zware werk.
-- Extra t.o.v. issues: org-isolatie via `organization_id = profiles.organization_id`,
-- omdat één klant niet de vragen van een andere klant-org mag zien.

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
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT chk_question_xor_link
    CHECK (NOT (topic_id IS NOT NULL AND issue_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_client_questions_project_status
  ON client_questions(project_id, status);

ALTER TABLE client_questions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PR-SEC-030 — SELECT
-- Team (admin/member) ziet alles. Klant ziet alleen vragen van eigen project
-- (`portal_project_access`) én eigen organisatie. Org-check voorkomt dat een
-- klant die toegang tot een project heeft de vragen van een andere klant-org
-- op datzelfde project leest (multi-tenant binnen één project).
-- =============================================================================

DROP POLICY IF EXISTS "Client questions: select (role-aware)" ON client_questions;

CREATE POLICY "Client questions: select (role-aware)"
  ON client_questions FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      has_portal_access(auth.uid(), project_id)
      AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =============================================================================
-- PR-SEC-031 / PR-RULE-030 — INSERT
-- Root (`parent_id IS NULL`) alleen team. Reply (`parent_id IS NOT NULL`) door
-- team óf door klant-org-lid waarvan de parent zichtbaar is (zelfde org +
-- portal-access op project). De parent-zichtbaarheid wordt expliciet
-- geverifieerd om RLS-leakage via gegokte parent_id's te blokkeren.
-- =============================================================================

DROP POLICY IF EXISTS "Client questions: insert (root team / reply role-aware)" ON client_questions;

CREATE POLICY "Client questions: insert (root team / reply role-aware)"
  ON client_questions FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN parent_id IS NULL THEN
        NOT is_client(auth.uid())
      ELSE
        NOT is_client(auth.uid())
        OR EXISTS (
          SELECT 1 FROM client_questions p
          WHERE p.id = parent_id
            AND has_portal_access(auth.uid(), p.project_id)
            AND p.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    END
  );

-- =============================================================================
-- PR-SEC-032 — UPDATE
-- Alleen team. Status-overgang `open` → `responded` loopt via de
-- `replyToQuestion`-mutation, die met service-role draait en deze policy
-- daarmee niet raakt; klanten worden hier expliciet buitengehouden.
-- =============================================================================

DROP POLICY IF EXISTS "Client questions: update (admin/member only)" ON client_questions;

CREATE POLICY "Client questions: update (admin/member only)"
  ON client_questions FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

-- DELETE is bewust ongepolicyd (geen policy = geen toegang voor authenticated).
-- Hard-deletes lopen via service-role; zacht-archiveren is geen v1-feature.
