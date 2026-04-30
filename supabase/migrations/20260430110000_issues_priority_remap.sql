-- Issues priority hernoemen naar drie-niveaus systeem (P1 / P2 / Nice to have).
--
-- Achtergrond: tot nu toe gebruikten issues vier waardes (urgent/high/medium/low).
-- We consolideren naar drie zodat de portal-presentatie ("heeft nu prio /
-- daarna / nice to have") 1-op-1 matcht en het triage-keuze-veld niet
-- nodeloos uitwaaiert.
--
-- Mapping:
--   urgent + high → p1
--   medium        → p2
--   low           → nice_to_have
--   (overige/null) → p2 (veilige default; gold-uit-band-issues)
--
-- Idempotent: dubbel draaien is veilig. De CASE controleert eerst of een
-- waarde al in de nieuwe set zit.

UPDATE issues
SET priority = CASE
  WHEN priority IN ('p1', 'p2', 'nice_to_have') THEN priority
  WHEN priority IN ('urgent', 'high') THEN 'p1'
  WHEN priority = 'medium' THEN 'p2'
  WHEN priority = 'low' THEN 'nice_to_have'
  ELSE 'p2'
END
WHERE priority IS NULL OR priority NOT IN ('p1', 'p2', 'nice_to_have');

-- Default voor nieuwe rows: p2 (= "heeft daarna prio"). Bewust niet p1 om
-- te voorkomen dat alle binnenkomende feedback automatisch op brand staat.
ALTER TABLE issues ALTER COLUMN priority SET DEFAULT 'p2';

-- Lichte CHECK zodat directe SQL-inserts niet alsnog een legacy waarde
-- introduceren. Bestaande rows zijn hierboven al geremapt.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_priority_check;
ALTER TABLE issues ADD CONSTRAINT issues_priority_check
  CHECK (priority IN ('p1', 'p2', 'nice_to_have'));
