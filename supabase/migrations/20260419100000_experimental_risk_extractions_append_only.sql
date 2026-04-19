-- PW-QC-02 (D3): fix misleidende UNIQUE-constraint op experimental_risk_extractions.
--
-- Oorspronkelijk: UNIQUE (meeting_id, prompt_version, created_at). Omdat
-- created_at default `now()` is, is elke row automatisch uniek en dwingt
-- de constraint feitelijk niets af. De comment boven de tabel ("één rij
-- per (meeting, prompt_version)") klopt dus niet met de semantiek.
--
-- Keuze: **append-only** (zie PW-QC-02 sprint, optie b). Past bij het
-- A/B-experimentele karakter van deze tabel — elke run is een datapunt
-- dat we willen bewaren om prompt-versies naast elkaar te kunnen zetten.
-- Geen upsert nodig, mutation blijft een simpele INSERT.
--
-- Resultaat: constraint weg, tabel expliciet als append-only
-- gedocumenteerd. Bestaande rijen blijven staan (niet-destructief).
--
-- De oorspronkelijke constraint-naam is door Postgres auto-gegenereerd en
-- mogelijk getrunceerd naar NAMEDATALEN (63). Voor robuustheid zoeken we
-- de UNIQUE-constraint op (meeting_id, prompt_version, created_at) via
-- pg_constraint en droppen we die bij naam.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class cls ON cls.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE nsp.nspname = 'public'
    AND cls.relname = 'experimental_risk_extractions'
    AND con.contype = 'u'
    AND con.conkey = (
      SELECT array_agg(attnum ORDER BY attnum)
      FROM pg_attribute
      WHERE attrelid = cls.oid
        AND attname IN ('meeting_id', 'prompt_version', 'created_at')
    );

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE experimental_risk_extractions DROP CONSTRAINT %I',
      constraint_name
    );
    RAISE NOTICE 'Dropped misleading UNIQUE constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No matching UNIQUE constraint found — already dropped or never created';
  END IF;
END
$$;

COMMENT ON TABLE experimental_risk_extractions IS
  'A/B-experiment: RiskSpecialist-agent output naast de MeetingStructurer-pipeline. '
  'APPEND-ONLY — elke run maakt een nieuwe rij. Query "laatste run" via '
  '.order(created_at desc).limit(1) binnen (meeting_id, prompt_version). '
  'Tijdelijk — drop zodra besloten is welk pad in productie blijft.';
