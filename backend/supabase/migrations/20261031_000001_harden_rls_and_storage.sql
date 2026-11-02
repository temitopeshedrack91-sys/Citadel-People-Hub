-- ============================================================================
-- Citadel People Hub - Stage 2 Security Hardening Migration
-- RLS Policies, Grants, Functions, and Storage Security for Supabase
-- ============================================================================

-- Step 1: Create private schema for identity crosswalk (non-exposed to browsers)
CREATE SCHEMA IF NOT EXISTS identity;

-- Step 2: Identity Links Table (server-managed crosswalk)
CREATE TABLE identity.identity_links (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'supabase',
    provider_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    verification_method TEXT NOT NULL DEFAULT 'staff_id_manual',
    verification_evidence TEXT,
    verified_by_user_id UUID REFERENCES auth.users (id),
    verified_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES auth.users (id),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX identity_links_provider_idx ON identity.identity_links (provider, status);
CREATE INDEX identity_links_user_idx ON identity.identity_links (user_id);
CREATE INDEX identity_links_employee_idx ON identity.identity_links (employee_id);
CREATE UNIQUE INDEX identity_links_unique_provider ON identity.identity_links (provider, provider_user_id) WHERE status = 'verified' AND revoked_at IS NULL;
CREATE UNIQUE INDEX identity_links_unique_user ON identity.identity_links (provider, user_id) WHERE status = 'verified' AND revoked_at IS NULL;
CREATE UNIQUE INDEX identity_links_unique_employee ON identity.identity_links (provider, employee_id) WHERE status = 'verified' AND revoked_at IS NULL;

-- Step 3: Helper function to resolve employee from authenticated user
CREATE OR REPLACE FUNCTION identity.current_employee_id()
RETURNS BIGINT AS $$
    SELECT il.employee_id
    FROM identity.identity_links il
    WHERE il.user_id = auth.uid()
      AND il.provider = 'supabase'
      AND il.status = 'verified'
      AND il.revoked_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Step 4: Helper function to get user role from auth metadata (server-managed)
CREATE OR REPLACE FUNCTION identity.current_user_role()
RETURNS TEXT AS $$
    SELECT ua.role
    FROM auth.users au
    LEFT JOIN public.users ua ON ua.id = CAST(au.id AS BIGINT)
    WHERE au.id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Step 5: Grant schema access (service_role only)
REVOKE ALL ON SCHEMA identity FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA identity TO service_role;

-- Step 6: Revoke broad table grants for browser roles
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'employees', 'leave_requests', 'attendance_records', 'tasks', 'projects',
        'documents', 'audit_logs', 'notifications', 'events', 'birthdays', 'approvals',
        'onboarding_journeys', 'recruitment_requisitions', 'entities', 'departments',
        'todos', 'profiles'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC, anon, authenticated;', t);
    END LOOP;
END $$;

-- Step 7: Revoke public access to storage objects
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO authenticated;

-- Step 8: Drop public storage policies
DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

-- Step 9: Create RLS enabled tables with restrictive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 10: Profile policies - users can only see their own profile
CREATE POLICY profiles_select_self ON public.profiles
    FOR SELECT TO authenticated USING ((SELECT id FROM auth.users WHERE id = auth.uid()) = id);

CREATE POLICY profiles_insert_self ON public.profiles
    FOR INSERT TO authenticated WITH CHECK ((SELECT id FROM auth.users WHERE id = auth.uid()) = id);

-- Step 11: Employee policies
CREATE POLICY employees_show_own ON public.employees
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM identity.identity_links il
            WHERE il.user_id = auth.uid()
              AND il.provider = 'supabase'
              AND il.status = 'verified'
              AND il.revoked_at IS NULL
              AND il.employee_id = employees.id
        )
    );

CREATE POLICY employees_admin_all ON public.employees
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN', 'HR_STAFF', 'HR_MANAGER')
        )
    );

-- Step 12: Leave requests policies
CREATE POLICY leave_requests_my_requests ON public.leave_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM identity.identity_links il
            WHERE il.user_id = auth.uid()
              AND il.employee_id = leave_requests.employee_id
              AND il.status = 'verified'
              AND il.revoked_at IS NULL
        )
    );

CREATE POLICY leave_requests_admin_all ON public.leave_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN', 'HR_STAFF', 'HR_MANAGER')
        )
    );

-- Step 13: Attendance records policies
CREATE POLICY attendance_my_records ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM identity.identity_links il
            WHERE il.user_id = auth.uid()
              AND il.status = 'verified'
              AND il.revoked_at IS NULL
              AND (il.employee_id = attendance_records.employee_id OR il.employee_id IN (
                  SELECT e.id FROM employees e WHERE e.entity_id IN (
                      SELECT u.entity_id FROM public.users u WHERE u.id = CAST(auth.uid() AS BIGINT) AND u.role IN ('BUSINESS_HEAD', 'DEPARTMENT_HEAD', 'HR_STAFF', 'ADMIN')
                  ) OR e.department_id IN (
                      SELECT u.department_id FROM public.users u WHERE u.id = CAST(auth.uid() AS BIGINT) AND u.role IN ('DEPARTMENT_HEAD', 'HR_STAFF', 'ADMIN')
                  )
              ))
        )
    );

-- Step 14: Document policies
CREATE POLICY documents_my_employees ON public.documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM identity.identity_links il
            WHERE il.user_id = auth.uid()
              AND il.status = 'verified'
              AND il.revoked_at IS NULL
              AND (il.employee_id = documents.employee_id OR
                   (documents.access_level = 'Public' AND documents.is_sensitive = false) OR
                   (documents.entity_scope IS NOT NULL AND documents.entity_scope = (
                       SELECT e.name FROM employees e, public.users u
                       WHERE e.id = il.employee_id AND u.id = CAST(auth.uid() AS BIGINT) AND u.entity_id = e.entity_id
                   )) OR
                   (documents.department_scope IS NOT NULL AND documents.department_scope = (
                       SELECT d.name FROM employees e, departments d, public.users u
                       WHERE e.id = il.employee_id AND e.department_id = d.id AND u.id = CAST(auth.uid() AS BIGINT) AND u.department_id = d.id
                   )))
        )
    );

-- Step 15: Admin-only access for sensitive documents
CREATE POLICY documents_admin_sensitive ON public.documents
    FOR SELECT TO authenticated
    USING (
        documents.access_level IN ('Restricted_PCCM_Only', 'PCCM_Only', 'Departmental')
        AND documents.is_sensitive = true
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN', 'HR_STAFF', 'HR_MANAGER')
        )
    );

-- Step 16: Storage bucket policies - private default
CREATE POLICY storage_select_private ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.users u
            JOIN identity.identity_links il ON il.user_id = CAST(u.id AS UUID)
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN', 'HR_STAFF', 'HR_MANAGER')
        )
    );

CREATE POLICY storage_insert_documents ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN', 'HR_STAFF')
        )
    );

-- Step 17: Audit logs - admin only
CREATE POLICY audit_logs_admin_only ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = CAST(auth.uid() AS BIGINT)
              AND u.role IN ('ADMIN', 'PCCM_SUPER_ADMIN')
        )
    );

-- Step 18: Default privilege revocation
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Step 19: Ensure SECURITY DEFINER functions are not executable by browser roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 20: Set role for service functions
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, extensions;