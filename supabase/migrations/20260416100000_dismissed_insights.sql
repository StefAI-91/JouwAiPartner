-- Dismissed insights: gebruikers kunnen individuele AI-inzichten wegklikken (sprint 037)

CREATE TABLE dismissed_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  insight_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, insight_key)
);

ALTER TABLE dismissed_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own dismissed insights"
  ON dismissed_insights FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissed insights"
  ON dismissed_insights FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dismissed insights"
  ON dismissed_insights FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Extend summaries CHECK constraint to include 'management_insights'
ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_summary_type_check;
ALTER TABLE summaries ADD CONSTRAINT summaries_summary_type_check
  CHECK (summary_type IN ('context', 'briefing', 'weekly', 'management_insights'));
