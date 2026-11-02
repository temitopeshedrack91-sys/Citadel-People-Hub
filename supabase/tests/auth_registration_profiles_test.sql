BEGIN;

SELECT plan(10);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'register_user'
      AND (
        has_function_privilege('anon', procedure.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
      )
  ),
  'anonymous and authenticated clients cannot execute the role-assigning registration RPC'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anonymous clients cannot invoke the auth trigger function as an RPC'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated clients cannot invoke the auth trigger function as an RPC'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous clients cannot read profiles'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated clients retain profile reads subject to row policies'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated clients cannot change their profile role'
);

SELECT is(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  true,
  'row level security remains enabled on profiles'
);

SELECT policies_are(
  'public',
  'profiles',
  ARRAY['profiles_select_self']
);

SELECT like(
  pg_get_functiondef('public.handle_new_user()'::regprocedure),
  '%''EMPLOYEE''%',
  'new auth users receive the employee role regardless of user metadata'
);

SELECT unlike(
  pg_get_functiondef('public.handle_new_user()'::regprocedure),
  '%raw_user_meta_data%role%',
  'new auth users cannot choose an authorization role through user metadata'
);

SELECT * FROM finish();

ROLLBACK;
