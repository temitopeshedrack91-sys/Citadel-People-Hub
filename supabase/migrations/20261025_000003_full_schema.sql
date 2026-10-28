-- Full Supabase schema for Citadel People Hub
-- This migration creates tables covering the main domain models
-- that currently exist in the Laravel backend.

-- Users (Supabase Auth already creates a "auth.users" table, but we keep a profile table)
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

-- Organizations (if you have multi‑tenant)
create table public.organizations (
  id bigserial primary key,
  name text not null,
  domain text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Employees – link to a user (optional) and a department
create table public.employees (
  id bigserial primary key,
  user_id uuid references auth.users (id),
  department_id bigint references public.departments (id),
  first_name text not null,
  last_name text not null,
  email text not null,
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

-- Documents – files stored in Supabase Storage
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

-- Enable Row Level Security for all public tables
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.organizations enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.documents enable row level security;
alter table public.todos enable row level security;

-- Policies – allow authenticated users to read/write their own data (simplified)
create policy "allow select all" on public.todos for select using (true);
create policy "allow insert" on public.todos for insert with check (true);
create policy "allow update" on public.todos for update using (true);
create policy "allow delete" on public.todos for delete using (true);

-- You can add more granular policies for the other tables as needed.

-- Storage bucket creation is done via CLI (see instructions below).

