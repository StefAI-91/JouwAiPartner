-- Backfill profiles for existing auth.users that were created before the trigger
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
    COALESCE(u.raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
