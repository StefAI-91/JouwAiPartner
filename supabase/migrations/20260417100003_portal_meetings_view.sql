-- CP-001 follow-up: portal_meetings view zonder transcript/raw kolommen
-- RLS-P03 (transcript-afscherming voor client users)
--
-- In plaats van kolom-level GRANTs (vereist aparte Postgres rol) gebruiken we
-- een view met `security_invoker = true`. De view erft de RLS van de
-- onderliggende `meetings` tabel — dus het meetings SELECT-policy uit
-- 20260417100002 (clients: verified + portal projects) geldt nog steeds.
--
-- Portal queries MOETEN uit `portal_meetings` lezen in plaats van `meetings`,
-- zodat transcript-kolommen fysiek niet in de response zitten.

CREATE OR REPLACE VIEW portal_meetings
WITH (security_invoker = true)
AS
SELECT
  id,
  title,
  date,
  meeting_type,
  party_type,
  summary,
  ai_briefing,
  participants,
  organizer_email,
  organization_id,
  unmatched_organization_name,
  verification_status,
  verified_at,
  created_at,
  updated_at
FROM meetings;

-- authenticated mag de view lezen; RLS op meetings filtert de rijen.
GRANT SELECT ON portal_meetings TO authenticated;
