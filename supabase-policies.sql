-- Policies for the current frontend-only test flow.
-- The app uses the publishable key without Supabase Auth, so requests use role anon.
-- Replace these broad test policies with auth.uid()-based policies before production.

alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "employees anon select" on public.employees;
drop policy if exists "employees anon insert" on public.employees;
drop policy if exists "employees anon update" on public.employees;
drop policy if exists "attendance anon all" on public.attendance;
drop policy if exists "transactions anon all" on public.transactions;

create policy "employees anon select"
on public.employees for select to anon
using (true);

create policy "employees anon insert"
on public.employees for insert to anon
with check (true);

create policy "employees anon update"
on public.employees for update to anon
using (true)
with check (true);

create policy "attendance anon all"
on public.attendance for all to anon
using (true)
with check (true);

create policy "transactions anon all"
on public.transactions for all to anon
using (true)
with check (true);

-- Required for upsert(employee_id, work_date).
create unique index if not exists attendance_employee_work_date_key
on public.attendance (employee_id, work_date);
