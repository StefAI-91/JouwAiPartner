-- CP-010: Portal Briefing v2 — deploy-velden + test-instructies
-- CP-REQ-100, CP-REQ-101
--
-- projects krijgt 3 URL-velden voor de actiegerichte Briefing-page (preview-link,
-- productie-link, statische screenshot). topics krijgt een markdown text-veld
-- waarin het team uitlegt hoe de klant de feature kan testen — zonder gevulde
-- instructies verschijnt het topic niet in "Klaar om te testen".
--
-- Geen RLS-aanpassingen nodig: bestaande policies dekken de nieuwe kolommen.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preview_url    text,
  ADD COLUMN IF NOT EXISTS production_url text,
  ADD COLUMN IF NOT EXISTS screenshot_url text;

ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS client_test_instructions text;
