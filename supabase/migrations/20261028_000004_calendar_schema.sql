-- Calendar related tables
-- Events table
create table if not exists public.events (
  id bigserial primary key,
  title text not null,
  description text,
  start_timestamp timestamp with time zone not null,
  end_timestamp timestamp with time zone not null,
  location text,
  category text default 'Meeting',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Birthdays table (derived from employee birthdate, but we keep a lightweight view)
create table if not exists public.birthdays (
  id bigserial primary key,
  employee_id bigint references public.employees (id) on delete cascade,
  name text not null,
  birth_date date not null,
  department text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Approvals queue table
create table if not exists public.approvals (
  id bigserial primary key,
  request_type text not null,
  requester_name text not null,
  department text,
  description text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.events enable row level security;
alter table public.birthdays enable row level security;
alter table public.approvals enable row level security;

drop policy if exists "events select" on public.events;
create policy "events select" on public.events for select using (true);
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events for insert with check (true);
drop policy if exists "events update" on public.events;
create policy "events update" on public.events for update using (true);
drop policy if exists "events delete" on public.events;
create policy "events delete" on public.events for delete using (true);

drop policy if exists "birthdays select" on public.birthdays;
create policy "birthdays select" on public.birthdays for select using (true);
drop policy if exists "birthdays insert" on public.birthdays;
create policy "birthdays insert" on public.birthdays for insert with check (true);
drop policy if exists "birthdays update" on public.birthdays;
create policy "birthdays update" on public.birthdays for update using (true);
drop policy if exists "birthdays delete" on public.birthdays;
create policy "birthdays delete" on public.birthdays for delete using (true);

drop policy if exists "approvals select" on public.approvals;
create policy "approvals select" on public.approvals for select using (true);
drop policy if exists "approvals insert" on public.approvals;
create policy "approvals insert" on public.approvals for insert with check (true);
drop policy if exists "approvals update" on public.approvals;
create policy "approvals update" on public.approvals for update using (true);
drop policy if exists "approvals delete" on public.approvals;
create policy "approvals delete" on public.approvals for delete using (true);
