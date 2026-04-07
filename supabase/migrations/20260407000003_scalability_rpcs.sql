-- Fix W1: getVerifiedMeetingsWithoutSegments naar DB-level filtering
-- Fix W6: Participant-filter naar DB-level in plaats van JS full table scan

-- W1: Verified meetings zonder segmenten (voor batch migration)
CREATE OR REPLACE FUNCTION get_meetings_without_segments(
  max_results INT DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  transcript TEXT,
  date TIMESTAMPTZ,
  organization_id UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT m.id, m.title, m.summary, m.transcript, m.date, m.organization_id
  FROM meetings m
  WHERE m.verification_status = 'verified'
    AND NOT EXISTS (
      SELECT 1 FROM meeting_project_summaries mps WHERE mps.meeting_id = m.id
    )
  ORDER BY m.date DESC
  LIMIT max_results;
$$;

-- W6: Meetings zoeken op participant naam (case-insensitive partial match)
-- Combineert twee strategieën: linked people + raw participants array
CREATE OR REPLACE FUNCTION search_meetings_by_participant(
  p_name TEXT,
  max_results INT DEFAULT 500
)
RETURNS TABLE (meeting_id UUID)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  -- Strategy 1: Via linked people (meeting_participants join)
  SELECT DISTINCT mp.meeting_id
  FROM meeting_participants mp
  JOIN people p ON p.id = mp.person_id
  WHERE p.name ILIKE '%' || p_name || '%'

  UNION

  -- Strategy 2: Via raw participants array (Fireflies names)
  SELECT m.id AS meeting_id
  FROM meetings m,
       LATERAL unnest(m.participants) AS participant_name
  WHERE lower(participant_name) LIKE '%' || lower(p_name) || '%'

  LIMIT max_results;
$$;
