-- ====================================================================
-- Citadel People Hub - Complete Supabase Sync Migration
-- Database synchronization: Schema, Auth, Storage, Realtime, and RLS
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'Employee',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENTITIES TABLE
CREATE TABLE IF NOT EXISTS public.entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  head_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  hod_name TEXT,
  hod_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  staff_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  gender TEXT DEFAULT 'Male',
  position TEXT,
  job_title TEXT,
  department_id BIGINT REFERENCES public.departments (id) ON DELETE SET NULL,
  department_name TEXT,
  entity_name TEXT DEFAULT 'Citadel Global Community Church',
  status TEXT DEFAULT 'Active',
  employment_type TEXT DEFAULT 'Full-Time',
  hired_at DATE,
  avatar_bg TEXT,
  avatar_text TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure missing columns exist in employees if table was already created
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS entity_name TEXT DEFAULT 'Citadel Global Community Church';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-Time';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_bg TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_text TEXT;

-- 5. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES public.employees (id) ON DELETE CASCADE,
  employee_staff_id TEXT,
  employee_name TEXT,
  date DATE DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  status TEXT DEFAULT 'Present',
  verification_source TEXT DEFAULT 'Web_Biometric',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS employee_staff_id TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Present';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT 'Web_Biometric';

-- 6. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES public.employees (id) ON DELETE CASCADE,
  employee_staff_id TEXT,
  employee_name TEXT,
  department_name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INT DEFAULT 1,
  type TEXT,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS employee_staff_id TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS days_requested INT DEFAULT 1;

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  module TEXT DEFAULT 'Core',
  target_type TEXT,
  target_id BIGINT,
  meta JSONB,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'Core';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '127.0.0.1';

-- 8. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES public.employees (id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'Policy',
  mime_type TEXT,
  file_size TEXT DEFAULT '1.2 MB',
  access_level TEXT DEFAULT 'All_Staff',
  download_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Policy';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size TEXT DEFAULT '1.2 MB';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'All_Staff';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS download_url TEXT;

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT,
  sender_id TEXT,
  sender_name TEXT,
  task_id TEXT,
  task_title TEXT,
  type TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  timestamp TEXT DEFAULT 'Just now',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. EVENTS (CALENDAR) TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ NOT NULL,
  location TEXT,
  category TEXT DEFAULT 'Meeting',
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. BIRTHDAYS TABLE
CREATE TABLE IF NOT EXISTS public.birthdays (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES public.employees (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  department TEXT,
  avatar_bg TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. APPROVALS TABLE
CREATE TABLE IF NOT EXISTS public.approvals (
  id BIGSERIAL PRIMARY KEY,
  request_type TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  department TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  days_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. PROJECTS / TRELLIS TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'To do',
  labels TEXT[] DEFAULT '{}',
  due_date TEXT,
  due_tag TEXT,
  assignee_id TEXT,
  assigner_id TEXT,
  assignment_status TEXT DEFAULT 'accepted',
  decline_reason TEXT,
  reviewer_id TEXT,
  hours INT DEFAULT 8,
  pr_tag TEXT,
  image_url TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. TODOS TABLE
CREATE TABLE IF NOT EXISTS public.todos (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  inserted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ====================================================================
DO $$ 
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'entities', 'departments', 'employees',
    'attendance_records', 'leave_requests', 'audit_logs',
    'documents', 'notifications', 'events', 'birthdays',
    'approvals', 'tasks', 'todos'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Drop existing permissive policies if any
    EXECUTE format('DROP POLICY IF EXISTS "%s select" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s insert" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s update" ON public.%I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s delete" ON public.%I;', t, t);
    
    -- Create open policies for seamless client and server access
    EXECUTE format('CREATE POLICY "%s select" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "%s insert" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "%s update" ON public.%I FOR UPDATE USING (true);', t, t);
    EXECUTE format('CREATE POLICY "%s delete" ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;

-- ====================================================================
-- SUPABASE STORAGE BUCKETS & POLICIES
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('citadel', 'citadel', true),
  ('documents', 'documents', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for documents & avatars
DROP POLICY IF EXISTS "Public Storage Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (true);
CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE USING (true);

-- ====================================================================
-- AUTH TRIGGER: Automatically sync new users to public.profiles
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Employee')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- REALTIME REPLICATION SETUP
-- ====================================================================
DO $$
DECLARE
  t TEXT;
  rt_tables TEXT[] := ARRAY[
    'tasks', 'employees', 'attendance_records', 'leave_requests',
    'documents', 'notifications', 'events', 'todos'
  ];
BEGIN
  FOREACH t IN ARRAY rt_tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    EXCEPTION
      WHEN duplicate_object THEN
        -- already in publication, ignore
        NULL;
    END;
  END LOOP;
END $$;

-- Set REPLICA IDENTITY FULL for real-time deletes & updates payload delivery
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.todos REPLICA IDENTITY FULL;

