-- HF-001: Portal-RLS op emails + email_projects + email_extractions
--
-- Sluit bestaande security-gap: emails/email_projects/email_extractions hebben
-- sinds hun initiele migraties alleen permissive `USING (true)` policies.
-- Dat betekent dat een portal-client (role='client') alle emails in het systeem
-- kan lezen, ongeacht hun portal_project_access.
--
-- Deze migratie spiegelt het patroon uit `20260417100002_portal_rls_policies.sql`
-- dat meetings/extractions/summaries al heeft afgehandeld. We gebruiken de
-- bestaande helpers `is_client(auth.uid())` en `has_portal_access(user, pid)`
-- — geen nieuwe helpers nodig.
--
-- Admin/member gedrag blijft identiek (NOT is_client evalueert TRUE voor hen).
-- Alleen clients krijgen fijnmazige filtering.

-- =============================================================================
-- emails — clients zien alleen verified emails gelinkt aan hun portal-projecten
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all emails" ON emails;
DROP POLICY IF EXISTS "Authenticated users can manage emails" ON emails;

CREATE POLICY "Emails: select (clients: verified + portal projects)"
  ON emails FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      verification_status = 'verified'
      AND EXISTS (
        SELECT 1 FROM email_projects ep
        WHERE ep.email_id = emails.id
          AND has_portal_access(auth.uid(), ep.project_id)
      )
    )
  );

CREATE POLICY "Emails: insert (admin/member only)"
  ON emails FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Emails: update (admin/member only)"
  ON emails FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Emails: delete (admin/member only)"
  ON emails FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- email_projects — clients zien alleen rijen voor projecten met portal-access
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users can read all email_projects" ON email_projects;
DROP POLICY IF EXISTS "Authenticated users can manage email_projects" ON email_projects;

CREATE POLICY "Email projects: select (clients: own portal projects)"
  ON email_projects FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR has_portal_access(auth.uid(), project_id)
  );

CREATE POLICY "Email projects: insert (admin/member only)"
  ON email_projects FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Email projects: update (admin/member only)"
  ON email_projects FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Email projects: delete (admin/member only)"
  ON email_projects FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));

-- =============================================================================
-- email_extractions — clients zien alleen verified extracties op portal-projecten
-- =============================================================================
-- email_extractions heeft een directe `project_id` kolom (zie
-- 20260408000004_email_extractions.sql) — we filteren daar direct op, net als
-- de meetings-extractions policy.

DROP POLICY IF EXISTS "Authenticated users can read all email_extractions" ON email_extractions;
DROP POLICY IF EXISTS "Authenticated users can manage email_extractions" ON email_extractions;

CREATE POLICY "Email extractions: select (clients: verified + portal projects)"
  ON email_extractions FOR SELECT TO authenticated
  USING (
    NOT is_client(auth.uid())
    OR (
      verification_status = 'verified'
      AND project_id IS NOT NULL
      AND has_portal_access(auth.uid(), project_id)
    )
  );

CREATE POLICY "Email extractions: insert (admin/member only)"
  ON email_extractions FOR INSERT TO authenticated
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Email extractions: update (admin/member only)"
  ON email_extractions FOR UPDATE TO authenticated
  USING (NOT is_client(auth.uid()))
  WITH CHECK (NOT is_client(auth.uid()));

CREATE POLICY "Email extractions: delete (admin/member only)"
  ON email_extractions FOR DELETE TO authenticated
  USING (NOT is_client(auth.uid()));
