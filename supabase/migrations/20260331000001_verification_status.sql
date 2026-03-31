-- Sprint 009: Add verification_status to meetings and extractions
-- Zero-downtime safe: ADD COLUMN with DEFAULT is non-blocking in PostgreSQL 11+

-- ============================================================
-- Meetings: verification columns
-- ============================================================
ALTER TABLE meetings
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'rejected')),
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_meetings_verification_status ON meetings(verification_status);

-- Migrate existing meetings to 'verified' (RULE-004)
UPDATE meetings SET
  verification_status = 'verified',
  verified_at = now()
WHERE verification_status = 'draft';

-- ============================================================
-- Extractions: verification columns
-- ============================================================
ALTER TABLE extractions
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN ('draft', 'verified', 'rejected')),
  ADD COLUMN verified_by UUID REFERENCES profiles(id),
  ADD COLUMN verified_at TIMESTAMPTZ;

CREATE INDEX idx_extractions_verification_status ON extractions(verification_status);

-- Migrate existing extractions to 'verified' (RULE-004)
UPDATE extractions SET
  verification_status = 'verified',
  verified_at = now()
WHERE verification_status = 'draft';
