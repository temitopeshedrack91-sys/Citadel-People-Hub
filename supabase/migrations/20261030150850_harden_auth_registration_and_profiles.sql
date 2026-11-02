-- Restrict public account creation to the lowest-privilege role and protect
-- profile authorization fields from browser clients. Broader table/storage RLS
-- policies are handled separately after their ownership mappings are verified.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    'EMPLOYEE'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- The auth.users trigger still invokes this function, but clients cannot call
-- it as an RPC. Pinning search_path prevents object shadowing in definer code.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DO $migration$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('register_user', 'rls_auto_enable')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );

    IF function_row.proname = 'register_user' THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path TO pg_catalog, extensions',
        function_row.signature
      );
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_row.signature);
    END IF;
  END LOOP;
END;
$migration$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all prior profile policies, including duplicate/unconditional policies.
DO $migration$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', policy_row.policyname);
  END LOOP;
END;
$migration$;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE POLICY profiles_select_self
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);
