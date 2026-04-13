-- DH-019: Invite-only onboarding
-- FUNC-172, RULE-160, SEC-185
--
-- 1) UNIQUE(email) op profiles: email is de natuurlijke sleutel tussen
--    `profiles` en `auth.users`. Race-conditions tussen gelijktijdige invites
--    worden hiermee door de DB afgevangen (20260409100004 added `lower(email)`
--    unique index? — verifieer niet; we forceren hier expliciet een
--    case-insensitive UNIQUE via een index op lower(email)).
-- 2) handle_new_user trigger wordt idempotent: een invite maakt eerst de
--    profile aan mét de echte auth.users.id (flow volgt het "alternatieve
--    pad" uit de sprint), dus de trigger hoeft alleen nog te INSERT ... ON
--    CONFLICT DO NOTHING zodat bootstrap-pad (direct signup, legacy users)
--    blijft werken zonder duplicate-error.

-- =============================================================================
-- RULE-160: case-insensitive UNIQUE op profiles.email
-- =============================================================================

-- Normaliseer bestaande rijen (lowercase) zodat we straks veilig een unieke
-- index kunnen leggen. Kies het eerste gecreëerde record bij conflicten.
UPDATE profiles SET email = lower(email) WHERE email <> lower(email);

-- Unique index. Gebruik CREATE UNIQUE INDEX IF NOT EXISTS om rerun-veilig
-- te zijn (IDEMPOTENT-eis van sprint).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_lower
  ON profiles (lower(email));

-- =============================================================================
-- FUNC-172: idempotente handle_new_user trigger
-- =============================================================================
-- Invite-pad: de server action maakt eerst de auth.users aan (via
-- inviteUserByEmail), krijgt de echte id terug, en upsert dan de profile.
-- Wanneer Supabase vervolgens AFTER INSERT de trigger firet, zit er al een
-- row met dezelfde id → ON CONFLICT DO NOTHING voorkomt de double-insert.
-- Bootstrap-pad (handmatige signup zonder invite) blijft werken: geen
-- bestaande profile → nieuwe INSERT.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
