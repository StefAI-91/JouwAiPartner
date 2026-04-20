-- HF-001: Helper RPC voor drift-contract-test
--
-- De `party-type-drift.test.ts` contract-test moet CHECK constraint
-- definities kunnen uitlezen. PostgREST exposeert `pg_catalog` niet,
-- dus we wrappen `pg_get_constraintdef` in een `SECURITY DEFINER`
-- functie die via supabase-js RPC aangeroepen kan worden.
--
-- Functie is STABLE + SECURITY DEFINER zodat ze werkt ongeacht de
-- aanroepende rol. Alleen authenticated users mogen 'm uitvoeren
-- (gelijk patroon als `is_client` / `has_portal_access`).

CREATE OR REPLACE FUNCTION public.pg_get_check_constraint_def(
    p_table TEXT,
    p_constraint TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = p_table
      AND c.conname = p_constraint
      AND c.contype = 'c'
      AND n.nspname = 'public'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.pg_get_check_constraint_def(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pg_get_check_constraint_def(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pg_get_check_constraint_def(TEXT, TEXT) TO service_role;
