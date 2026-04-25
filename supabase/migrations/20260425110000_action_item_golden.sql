-- Golden dataset voor de Action Item Specialist (v1).
--
-- Doel: handmatig-gecodeerde "ground truth" per meeting waartegen we de
-- agent-output kunnen meten (precision/recall/lane-accuracy). Twee tabellen
-- omdat een meeting waarin "0 action items" zitten ook een geldige
-- coding-state is — anders kun je geen recall meten op leeg-correcte meetings.
--
-- Niet experimenteel zoals experimental_risk_extractions: dit is een stabiele
-- evaluatie-laag die we ook bij latere specialists (commitments, sentiment)
-- hergebruiken — vandaar `golden_*` prefix in plaats van `experimental_*`.

-- ============================================================================
-- 1. Coding-state per meeting
-- ============================================================================

CREATE TABLE IF NOT EXISTS action_item_golden_meetings (
  meeting_id UUID PRIMARY KEY REFERENCES meetings(id) ON DELETE CASCADE,
  encoded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  encoded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- coded:   coder heeft deze meeting beoordeeld; items staan in
  --          action_item_golden_items (kan ook 0 zijn = expliciete leegheid)
  -- skipped: coder heeft deze meeting bewust overgeslagen (niet-NL,
  --          corrupt transcript, niet representatief, etc.)
  status TEXT NOT NULL CHECK (status IN ('coded', 'skipped')),

  notes TEXT
);

COMMENT ON TABLE action_item_golden_meetings IS
  'Coding-state per meeting voor de Action Item Specialist golden dataset. ' ||
  'Een rij hier betekent: deze meeting is door een mens beoordeeld. status=coded ' ||
  'met 0 items in action_item_golden_items = expliciete "geen action items" — ' ||
  'cruciaal voor recall-meting op lege meetings.';

-- ============================================================================
-- 2. Per-item golden ground truth
-- ============================================================================

CREATE TABLE IF NOT EXISTS action_item_golden_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Inhoudelijk
  content TEXT NOT NULL,             -- NL, max ~30 woorden, naam-eerst
  follow_up_contact TEXT NOT NULL,   -- verplicht (sectie 8 van de prompt)
  assignee TEXT,                     -- mag verschillen van follow_up_contact
  source_quote TEXT,                 -- letterlijk uit transcript, max 200 chars
  project_context TEXT,              -- v1: vrije tekst; later FK naar projects

  -- Classificatie
  category TEXT CHECK (category IN ('wachten_op_extern', 'wachten_op_beslissing')),
  deadline DATE,
  lane TEXT NOT NULL CHECK (lane IN ('A', 'B', 'none')),
  type_werk TEXT NOT NULL CHECK (type_werk IN ('A', 'B', 'C', 'D', 'E')),

  -- Toelichting van de coder (waarom is dit het juiste antwoord) — optioneel
  -- maar zeer waardevol bij latere prompt-tuning. "Lane A want geen email-kanaal"
  coder_notes TEXT
);

COMMENT ON TABLE action_item_golden_items IS
  'Handmatig-gecodeerde action items per meeting voor evaluatie van de ' ||
  'Action Item Specialist. Per item leg je vast wat de agent IDEALITER zou ' ||
  'moeten produceren — content, contact, lane, type_werk. coder_notes legt ' ||
  'uit waarom dit het juiste antwoord is, zodat prompt-tuning herleidbaar is.';

-- ============================================================================
-- 3. Indices voor harness-queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS action_item_golden_items_meeting_idx
  ON action_item_golden_items(meeting_id);

CREATE INDEX IF NOT EXISTS action_item_golden_meetings_status_idx
  ON action_item_golden_meetings(status);

-- ============================================================================
-- 4. updated_at-trigger zodat we coding-revisies kunnen volgen
--    Hergebruikt de generieke set_updated_at() uit eerdere migraties
--    (20260409100005, 20260422100000).
-- ============================================================================

CREATE TRIGGER action_item_golden_meetings_updated_at
  BEFORE UPDATE ON action_item_golden_meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER action_item_golden_items_updated_at
  BEFORE UPDATE ON action_item_golden_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 5. RLS: authenticated mag lezen (harness toont metrics aan team), schrijven
--    via service role (de coding-UI gaat via een server action met admin client).
--    Geen fine-grained permissions — interne evaluatie-data, niet client-facing.
-- ============================================================================

ALTER TABLE action_item_golden_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_item_golden_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_item_golden_meetings_read
  ON action_item_golden_meetings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY action_item_golden_items_read
  ON action_item_golden_items
  FOR SELECT
  TO authenticated
  USING (true);
