-- PW-02 stap 2: breid extractions.type CHECK uit naar de 14 MeetingStructurer-types.
-- Tier-1 (volledig getuned, op project-werkblad zichtbaar):
--   action_item, decision, risk, need, commitment, question, signal, context, vision
-- Tier-2 (best-effort, alleen admin-zichtbaar tot consumer komt):
--   idea, insight, client_sentiment, pricing_signal, milestone
--
-- Bestaande types ('decision', 'action_item', 'need', 'insight') blijven geldig
-- — geen backfill nodig. Bestaande rijen staan al in de toegestane set.

ALTER TABLE extractions
  DROP CONSTRAINT extractions_type_check;

ALTER TABLE extractions
  ADD CONSTRAINT extractions_type_check CHECK (
    type IN (
      -- Tier 1
      'action_item',
      'decision',
      'risk',
      'need',
      'commitment',
      'question',
      'signal',
      'context',
      'vision',
      -- Tier 2
      'idea',
      'insight',
      'client_sentiment',
      'pricing_signal',
      'milestone'
    )
  );
