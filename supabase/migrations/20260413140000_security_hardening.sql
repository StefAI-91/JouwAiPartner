-- Security hardening: fix 5 critical RLS gaps found in DevHub security review
-- Fixes: issues DELETE, issue_comments DELETE, issue_attachments, project_reviews

-- =============================================================================
-- 1. Issues: replace permissive DELETE policy with project-scoped one
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can delete issues" ON issues;

CREATE POLICY "Members delete accessible issues, admins all"
  ON issues FOR DELETE TO authenticated
  USING (has_project_access(auth.uid(), project_id));

-- =============================================================================
-- 2. Issue comments: add missing DELETE policy (author-only + project access)
-- =============================================================================

CREATE POLICY "Authors delete own comments on accessible issues"
  ON issue_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_comments.issue_id
        AND has_project_access(auth.uid(), i.project_id)
    )
  );

-- =============================================================================
-- 3. Issue attachments: replace permissive policies with project-scoped ones
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read issue attachments" ON issue_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert issue attachments" ON issue_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete issue attachments" ON issue_attachments;

CREATE POLICY "Attachments visible via issue access"
  ON issue_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_attachments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

CREATE POLICY "Insert attachments on accessible issues"
  ON issue_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_attachments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

CREATE POLICY "Delete attachments on accessible issues"
  ON issue_attachments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i
    WHERE i.id = issue_attachments.issue_id
      AND has_project_access(auth.uid(), i.project_id)
  ));

-- =============================================================================
-- 4. Project reviews: replace permissive policies with project-scoped ones
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read project reviews" ON project_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert project reviews" ON project_reviews;

CREATE POLICY "Reviews visible via project access"
  ON project_reviews FOR SELECT TO authenticated
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Insert reviews on accessible projects"
  ON project_reviews FOR INSERT TO authenticated
  WITH CHECK (has_project_access(auth.uid(), project_id));
