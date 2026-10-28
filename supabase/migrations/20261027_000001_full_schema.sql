-- Supabase schema for Citadel People Hub
-- Place this file under supabase/migrations/ and run `supabase db push`

-- Profiles (extra data for Auth users)
create table public.profiles (
  id uuid primary key references auth.users (id),
  full_name text,
  role text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Departments
create table public.departments (
  id bigserial primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employees (optionally linked to a user)
create table public.employees (
  id bigserial primary key,
  user_id uuid references auth.users (id),
  department_id bigint references public.departments (id),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  position text,
  hired_at date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Attendance records
create table public.attendance_records (
  id bigserial primary key,
  employee_id bigint references public.employees (id),
  clock_in timestamp with time zone not null,
  clock_out timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leave requests
create table public.leave_requests (
  id bigserial primary key,
  employee_id bigint references public.employees (id),
  start_date date not null,
  end_date date not null,
  type text,
  status text default 'pending',
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit logs
create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users (id),
  action text not null,
  target_type text,
  target_id bigint,
  meta jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents (files stored in Supabase Storage)
create table public.documents (
  id bigserial primary key,
  employee_id bigint references public.employees (id),
  storage_path text not null,
  title text,
  mime_type text,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Simple todos table used by the demo page
create table public.todos (
  id bigserial primary key,
  name text not null,
  completed boolean default false,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security for all tables (adjust policies later)
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.documents enable row level security;
alter table public.todos enable row level security;

-- Basic open policies for the demo `todos` table (replace with stricter policies in production)
create policy "todos select" on public.todos for select using (true);
create policy "todos insert" on public.todos for insert with check (true);
create policy "todos update" on public.todos for update using (true);
create policy "todos delete" on public.todos for delete using (true);

-- You can add similar policies for the other tables as needed.

