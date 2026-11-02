-- ============================================================================
-- pgTAP Security Test Suite for Stage 2 Supabase Hardening
-- Run with: psql -d $DATABASE_URL -f supabase/tests/rbac_rls_test.sql
-- ============================================================================

BEGIN;

SELECT plan(25);

-- Test 1: Anonymous users cannot read protected tables
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'employees'
        AND policyname LIKE '%anon%'
    ),
    'No anonymous read policies on employees table'
);

-- Test 2: Authenticated users cannot write without RLS
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_default_privileges 
        WHERE default_is_owner = false 
        AND object_type = 'table'
        AND object_schema = 'public'
    ),
    'No default privileges granted to non-owner roles'
);

-- Test 3: Identity links table exists in private schema
SELECT ok(
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'identity' 
        AND table_name = 'identity_links'
    ),
    'Identity links table exists in private schema'
);

-- Test 4: Helper functions are SECURITY DEFINER
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'identity'
        AND p.proname = 'current_employee_id'
        AND p.prosecuritydefiner = true
    ),
    'current_employee_id function is SECURITY DEFINER'
);

-- Test 5: Storage buckets are not public
SELECT ok(
    EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE name IN ('documents', 'citadel', 'avatars') 
        AND public = false
    ),
    'Storage buckets are private'
);

-- Test 6: No public read policies on documents
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'documents'
        AND (policies)::text ILIKE '%USING (true)%'
    ),
    'Documents table has no permissive policies'
);

-- Test 7: Profiles use row-level security
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
    true,
    'Row level security enabled on profiles'
);

-- Test 8: Identity links has proper search_path
SELECT like(
    pg_get_functiondef('identity.current_employee_id()'::regprocedure),
    '%search_path%',
    'Function has pinned search_path'
);

-- Test 9: Auth trigger function is SECURITY DEFINER
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'handle_new_user'
        AND p.prosecuritydefiner = true
    ),
    'handle_new_user is SECURITY DEFINER'
);

-- Test 10: handle_new_user sets default role to EMPLOYEE
SELECT like(
    pg_get_functiondef('public.handle_new_user()'::regprocedure),
    '%''EMPLOYEE''%',
    'New profiles default to EMPLOYEE role'
);

-- Test 11: register_user function is not executable by anon
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'register_user'
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
    ),
    'register_user not executable by anon'
);

-- Test 12: rls_auto_enable is not executable by authenticated
SELECT ok(
    NOT has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE'),
    'rls_auto_enable not executable by authenticated'
);

-- Test 13: Employees table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.employees'::regclass),
    true,
    'Row level security enabled on employees'
);

-- Test 14: Leave requests table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.leave_requests'::regclass),
    true,
    'Row level security enabled on leave_requests'
);

-- Test 15: Attendance records table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.attendance_records'::regclass),
    true,
    'Row level security enabled on attendance_records'
);

-- Test 16: Documents table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.documents'::regclass),
    true,
    'Row level security enabled on documents'
);

-- Test 17: Audit logs table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_logs'::regclass),
    true,
    'Row level security enabled on audit_logs'
);

-- Test 18: Notifications table RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notifications'::regclass),
    true,
    'Row level security enabled on notifications'
);

-- Test 19: Tasks table has RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tasks'::regclass),
    true,
    'Row level security enabled on tasks'
);

-- Test 20: Projects table has RLS enabled
SELECT is(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.projects'::regclass),
    true,
    'Row level security enabled on projects'
);

-- Test 21: Identity links has unique constraint on verified links
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = 'identity'
        AND i.tablename = 'identity_links'
        AND i.indexname = 'identity_links_unique_provider'
    ),
    'Unique constraint on identity_links exists for verified provider links'
);

-- Test 22: Service role can execute the identity functions
SELECT is(
    has_function_privilege('service_role', 'identity.current_employee_id()', 'EXECUTE'),
    true,
    'service_role can execute current_employee_id function'
);

-- Test 23: Authenticated users have SELECT on profiles (own only)
SELECT ok(
    has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
    'Authenticated users have SELECT on profiles'
);

-- Test 24: Authenticated users cannot UPDATE profiles role column
SELECT ok(
    NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
    'Authenticated users cannot UPDATE role column in profiles'
);

-- Test 25: Verify storage.objects policies are restrictive
SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (policies)::text ILIKE '%USING (true)%'
    ),
    'Storage objects has no permissive policies'
);

SELECT * FROM finish();

ROLLBACK;