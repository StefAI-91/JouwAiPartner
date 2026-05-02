-- CC-005: per-user preferences (dismissed onboarding) in profiles.preferences
-- Sprint: docs/sprints/done/CC-005-inbox-tab-onboarding.md
--
-- Free-form jsonb zodat we toekomstige UI-state-keys kunnen toevoegen zonder
-- nieuwe migratie. Read/write loopt altijd via Zod-gevalideerde helpers in
-- packages/database/src — ruwe `from('profiles').update({preferences})` is
-- bewust niet toegestaan (zou schema-drift veroorzaken).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.preferences IS
  'Per-user UI-state: dismissed onboarding, theme, notification-prefs. Free-form jsonb om sprint-na-sprint nieuwe keys toe te voegen zonder migratie. Wijzig alleen via gevalideerde helpers in packages/database (Zod-gevalideerd).';

-- Atomic dismiss-helper. jsonb_set met create_missing=true voorkomt
-- read-modify-write races wanneer een gebruiker tegelijk twee onboarding-
-- cards dismissed (bv. portal + cockpit-tab op verschillende devices) en
-- bewaart andere keys in `preferences`.
--
-- p_key wordt server-side gevalideerd door de Zod-schema in
-- packages/database/src/validations/profiles.ts; deze RPC accepteert dus
-- alleen bekende keys via die helper. SECURITY DEFINER is bewust niet
-- gebruikt — RLS op profiles regelt al dat een gebruiker alleen z'n eigen
-- rij mag updaten.
CREATE OR REPLACE FUNCTION dismiss_onboarding_key(
  p_profile_id uuid,
  p_key text,
  p_timestamp text
) RETURNS jsonb
LANGUAGE sql
AS $$
  UPDATE profiles
  SET preferences = jsonb_set(
    coalesce(preferences, '{}'::jsonb),
    ARRAY['dismissed_onboarding', p_key],
    to_jsonb(p_timestamp),
    true
  )
  WHERE id = p_profile_id
  RETURNING preferences;
$$;
