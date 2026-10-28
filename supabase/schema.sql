-- ====================================================================
-- Citadel People Hub - Complete PostgreSQL & Supabase Database Schema
-- ====================================================================
-- Description: Multi-entity HR & People Operations schema for:
--  1. Citadel Global Community Church (CGCC)
--  2. Citadel School of Government (CSOG)
--  3. Citadel Holdings
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENTITIES TABLE (Multi-Entity Organizations)
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    short_code VARCHAR(30),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    country VARCHAR(100) DEFAULT 'Nigeria',
    state VARCHAR(100) DEFAULT 'Lagos State',
    city VARCHAR(100) DEFAULT 'Ikeja',
    address TEXT DEFAULT '30 Kudirat Abiola Way, Oregun, Ikeja, Lagos',
    tax_id VARCHAR(100),
    cac_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'NGN',
    work_week VARCHAR(50) DEFAULT 'Monday - Friday',
    business_head_name VARCHAR(255),
    business_head_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_name VARCHAR(255),
    hod_email VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EMPLOYEES MASTER TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20) DEFAULT 'Male',
    date_of_birth DATE,
    address TEXT,
    profile_photo TEXT,
    
    -- Placement
    entity_id VARCHAR(100),
    entity_name VARCHAR(255),
    department_id VARCHAR(100),
    department_name VARCHAR(255),
    job_title VARCHAR(255) NOT NULL,
    grade_level VARCHAR(50) DEFAULT 'Grade Level 08',
    employment_type VARCHAR(50) DEFAULT 'Full-Time',
    employment_date DATE DEFAULT CURRENT_DATE,
    confirmation_date DATE,
    manager_id VARCHAR(100),
    manager_name VARCHAR(255),
    contract_status VARCHAR(50) DEFAULT 'Permanent',
    years_of_service INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Active',
    
    -- Structured JSON payloads for comprehensive dossiers
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    next_of_kin JSONB DEFAULT '{}'::jsonb,
    qualifications JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    bank_payroll JSONB DEFAULT '{}'::jsonb,
    pension_hmo JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(100) NOT NULL,
    employee_staff_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),
    entity_name VARCHAR(255),
    leave_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL DEFAULT 1,
    total_days INT NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    handover_colleague VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Submitted',
    approver_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTENDANCE & BIOMETRIC LOGS
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(100) NOT NULL,
    employee_staff_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255),
    department_name VARCHAR(255),
    date DATE DEFAULT CURRENT_DATE,
    clock_in_time VARCHAR(50),
    clock_out_time VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Present',
    verification_source VARCHAR(100) DEFAULT 'Web_SelfService',
    device_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOGS (Compliance & Security Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    record_id VARCHAR(100),
    record_title VARCHAR(255),
    previous_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    severity VARCHAR(50) DEFAULT 'Info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DOCUMENTS & POLICIES
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) DEFAULT 'PDF',
    file_size VARCHAR(50) DEFAULT '1.2 MB',
    access_level VARCHAR(50) DEFAULT 'All_Staff',
    department_id VARCHAR(100),
    entity_id VARCHAR(100),
    uploaded_by VARCHAR(255),
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'System',
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- No browser-facing policies are created. Laravel accesses PostgreSQL over its
-- server-side database connection; anon/authenticated clients must not access HR data.

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_employees_staff_id ON public.employees(staff_id);
CREATE INDEX IF NOT EXISTS idx_employees_entity_id ON public.employees(entity_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_emp_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
