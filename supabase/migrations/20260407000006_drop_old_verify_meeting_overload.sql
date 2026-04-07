-- Fix: Drop the old 3-param verify_meeting overload that conflicts with the
-- newer 5-param version (which has defaults). PostgreSQL cannot resolve the
-- ambiguity when called with 3 arguments because both signatures match.

DROP FUNCTION IF EXISTS verify_meeting(uuid, uuid, jsonb);
