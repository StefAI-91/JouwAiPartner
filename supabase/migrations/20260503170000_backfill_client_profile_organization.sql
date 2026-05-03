-- Backfill: zet `profiles.organization_id` voor bestaande klanten op basis
-- van hun (eerste) `portal_project_access`-rij.
--
-- Achtergrond
-- -----------
-- De invite-flow `inviteProjectClientAction` (CC-006) creëerde tot vandaag
-- een klant-profile via `upsertProfile({ id, email, role: 'client' })` —
-- zonder `organization_id` te zetten. Het profile bleef daardoor met
-- `organization_id IS NULL`, waardoor de RLS-policy
-- `Client questions: select (role-aware)` (uit
-- 20260430110000_client_questions.sql, PR-SEC-030) elke klant-SELECT
-- blokkeerde:
--
--     organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
--
-- Een NULL aan de rechterkant maakt de gelijkheid permanent FALSE → klant
-- zag GEEN team-berichten, maar admin/member ("NOT is_client") zag wel
-- alles → user-rapport: "ik zie als admin de berichten in de portal maar
-- als klant niet".
--
-- Strategie
-- ---------
-- Voor elke klant zonder `organization_id` pakken we de organization_id
-- van een (willekeurig) project waar zij portal-access op hebben. Klanten
-- zijn single-tenant by design, dus wanneer er meerdere portal-access-
-- rijen zijn met verschillende org's loggen we een NOTICE en slaan we
-- die klant over — dat is een data-incident dat een mens moet beslissen.
--
-- Idempotent: WHERE organization_id IS NULL — re-run heeft geen effect
-- voor klanten die al gesynced zijn.

DO $$
DECLARE
  client_record RECORD;
  derived_org UUID;
  distinct_count INTEGER;
  fixed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  FOR client_record IN
    SELECT id, email
    FROM profiles
    WHERE role = 'client'
      AND organization_id IS NULL
  LOOP
    -- Postgres heeft geen `MIN(uuid)` aggregate, dus splitsen we de check
    -- (count) en de pick (LIMIT 1) in twee queries. Voor de skip-paden
    -- hieronder maakt de exacte gepickte UUID niet uit.
    SELECT COUNT(DISTINCT pr.organization_id)
      INTO distinct_count
    FROM portal_project_access pa
    JOIN projects pr ON pr.id = pa.project_id
    WHERE pa.profile_id = client_record.id;

    IF distinct_count IS NULL OR distinct_count = 0 THEN
      -- Klant zonder portal-access: niets om aan te koppelen. Profile blijft
      -- met NULL — invite-flow zal hem alsnog koppelen bij eerste access.
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    IF distinct_count > 1 THEN
      RAISE NOTICE 'Skipping client %: portal-access spans % distinct organizations — manual review needed',
        client_record.email, distinct_count;
      skipped_count := skipped_count + 1;
      CONTINUE;
    END IF;

    SELECT pr.organization_id
      INTO derived_org
    FROM portal_project_access pa
    JOIN projects pr ON pr.id = pa.project_id
    WHERE pa.profile_id = client_record.id
    LIMIT 1;

    UPDATE profiles
       SET organization_id = derived_org
     WHERE id = client_record.id;
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % clients linked to org, % skipped (no access or multi-org)',
    fixed_count, skipped_count;
END $$;
