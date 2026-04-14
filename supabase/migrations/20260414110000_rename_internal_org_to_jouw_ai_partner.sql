-- Sprint 033 follow-up: eigen bedrijfsentiteit hernoemen
-- Rij a0000000-0000-0000-0000-000000000001 (type='internal') krijgt
-- de naam "Jouw AI Partner" en lege aliases. De oude naam "Flowwijs"
-- verdwijnt volledig — geen behoud in aliases.
--
-- Let op: aliases worden gebruikt door entity-resolution in de AI
-- pipeline om organisaties in meetings/e-mails terug te vinden.
-- Door deze wijziging matcht historische content die "Flowwijs" noemt
-- niet langer automatisch op deze rij.

UPDATE organizations
  SET name = 'Jouw AI Partner',
      aliases = ARRAY[]::TEXT[],
      updated_at = NOW()
  WHERE id = 'a0000000-0000-0000-0000-000000000001';
