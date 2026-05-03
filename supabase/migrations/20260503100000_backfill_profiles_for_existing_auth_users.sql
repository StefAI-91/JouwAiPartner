-- Backfill: maak profiles-rijen aan voor bestaande auth.users die er geen
-- hebben.
--
-- Achtergrond
-- -----------
-- De `handle_new_user` trigger op `auth.users` (zie 20260329000003_profiles.sql
-- + 20260413130000_invite_flow.sql) maakt automatisch een profiel aan bij
-- signup. Maar gebruikers die zijn aangemaakt vóór de trigger bestond, of
-- via een pad dat de trigger niet triggert (bv. legacy admin-imports),
-- zitten nu zonder profile-rij.
--
-- Symptomen die hierdoor ontstonden:
-- - Comment plaatsen faalt met FK violation `issue_comments_author_id_fkey`
--   (auth.users.id bestaat niet in profiles → comment kan niet inserten).
-- - "Lege avatars" in dashboard: issues toegewezen aan een user zonder
--   profile-rij worden anoniem gerenderd.
-- - Activity feed toont "heeft status gewijzigd" zonder actor-naam.
--
-- Strategie
-- ---------
-- Voor elke auth.users die nog geen profile heeft, maak een rij aan met de
-- email + meta-velden uit Supabase auth. Idempotent via ON CONFLICT DO
-- NOTHING zodat een rerun veilig is.
--
-- Email wordt lowercased zodat de UNIQUE INDEX `profiles_email_unique_lower`
-- (uit 20260413130000_invite_flow.sql) niet wordt geschonden door legacy
-- mixed-case emails.

INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  lower(u.email),
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)  -- fallback: de gebruikersnaam vóór @ in email
  ),
  COALESCE(u.raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.email IS NOT NULL  -- defensief: zonder email kunnen we niet inserten (NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Defensieve raise notice: rapporteer hoeveel rijen zijn aangevuld zodat we
-- in de Supabase logs kunnen zien of er backfill nodig was.
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL;

  IF remaining_count > 0 THEN
    RAISE NOTICE 'Backfill complete, but % auth.users still without profile (likely email NULL or duplicate-email conflict)', remaining_count;
  ELSE
    RAISE NOTICE 'Backfill complete — alle auth.users hebben nu een profile';
  END IF;
END $$;
